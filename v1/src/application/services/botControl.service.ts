// Responsabilidad: controlar el estado de ejecución del bot (start/stop/status)
// y validar si existen carteras activas y estamos dentro de días/horarios de atención.

import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';

import {
  ATTENTION_SCHEDULE_REPOSITORY,
  AttentionScheduleRepository,
} from '@domain/ports/attentionSchedule.ports';
import {
  BOT_CONTROL_REPOSITORY,
  BotControlRepository,
} from '@domain/ports/botControl.ports';
import { HOLIDAY_REPOSITORY, HolidayRepository } from '@domain/ports/holiday.ports';
import { AppLogger } from '@infrastructure/logging/appLogger.service';
import { DataBasesService } from './dataBases.service';

export interface BotStatus extends Record<string, unknown> {
  running: boolean;
  reason?: string;
  timestamp: string;
  data_bases_id?: number;
  label_data_base?: string;
  responsible?: string;
  portfolio_type_name?: string;
  environment_type_id?: number;
  environment_type_name?: string;
  data_bases?: Array<{
    id: number;
    bases: import('@domain/entities/dataBases.entities').BasesConfig;
    label_data_base?: string;
  }>;
}

@Injectable()
export class BotControlService implements OnModuleInit {
  private running = false;
  private currentDataBasesId: number | null = null;

  constructor(
    @Inject(ATTENTION_SCHEDULE_REPOSITORY)
    private readonly attentionScheduleRepository: AttentionScheduleRepository,
    private readonly dataBasesService: DataBasesService,
    private readonly appLogger: AppLogger,
    @Inject(BOT_CONTROL_REPOSITORY)
    private readonly botControlRepository: BotControlRepository,
    @Inject(HOLIDAY_REPOSITORY)
    private readonly holidayRepository: HolidayRepository,
  ) {}

  async onModuleInit(): Promise<void> {
    const runningIds = await this.botControlRepository.findRunningIds();
    if (runningIds.length === 1) {
      this.running = true;
      this.currentDataBasesId = runningIds[0];
      this.appLogger.structured({
        level: 'log',
        context: BotControlService.name,
        type: 'BOT_STATE',
        status: 'OK',
        message: 'Estado del bot rehidratado desde base de datos',
        meta: { data_bases_id: this.currentDataBasesId },
      });
    } else if (runningIds.length > 1) {
      this.appLogger.structured({
        level: 'warn',
        context: BotControlService.name,
        type: 'BOT_STATE',
        status: 'WARN',
        message:
          'Varios bots marcados como en ejecución en BD; el job de sync usará el primero',
        meta: { running_ids: runningIds },
      });
      this.running = true;
      this.currentDataBasesId = runningIds[0];
    }
  }

  isRunning(): boolean {
    return this.running;
  }

  getCurrentDataBasesId(): number | null {
    return this.currentDataBasesId;
  }

  async start(data_bases_id?: number): Promise<BotStatus> {
    const dbId = Number(data_bases_id);
    if (!Number.isInteger(dbId) || dbId <= 0) {
      const status = this.buildStatus(false, 'data_bases_id inválido o no proporcionado');
      this.appLogger.structured({
        level: 'warn',
        context: BotControlService.name,
        type: 'BOT_STATE',
        status: 'WARN',
        message: 'Intento de iniciar el bot sin data_bases_id válido',
        meta: status,
      });
      return status;
    }

    // Si ya hay un registro en bot_control con este data_bases_id en ejecución,
    // no permitimos volver a iniciarlo: respondemos con conflicto 409.
    const existingForId = await this.botControlRepository.findByDataBasesId(dbId);
    if (existingForId?.running) {
      const reason = 'Ya existe un bot en ejecución para esta configuración de data_bases';
      this.appLogger.structured({
        level: 'warn',
        context: BotControlService.name,
        type: 'BOT_STATE',
        status: 'WARN',
        message:
          'Intento de iniciar el bot para una configuración que ya está marcada como en ejecución',
        meta: {
          data_bases_id: dbId,
          reason,
        },
      });
      throw new ConflictException(reason);
    }

    const check = await this.checkRuntimeConditions(dbId);
    if (!check.ok) {
      this.running = false;
      this.currentDataBasesId = null;
      const reason = check.reason;
      const status = this.buildStatus(false, reason);
      await this.persistState(dbId, false, reason);
      this.appLogger.structured({
        level: 'warn',
        context: BotControlService.name,
        type: 'BOT_STATE',
        status: 'WARN',
        message: 'Intento de iniciar el bot pero no se cumplen condiciones de ejecución',
        meta: status,
      });
      return status;
    }

    // Regla de seguridad: solo un bot en ejecución por cartera (portfolio).
    const targetDb = await this.dataBasesService.findById(dbId);
    const conflictId = await this.findConflictWithSamePortfolio(
      dbId,
      targetDb.portfolio_type_id,
    );
    if (conflictId) {
      const reason =
        'Ya existe un bot en ejecución para esta cartera en otra configuración de data_bases';
      this.appLogger.structured({
        level: 'warn',
        context: BotControlService.name,
        type: 'BOT_STATE',
        status: 'WARN',
        message:
          'Intento de iniciar el bot para una cartera que ya tiene otro bot en ejecución',
        meta: {
          data_bases_id: dbId,
          conflicting_data_bases_id: conflictId,
          reason,
        },
      });
      throw new ConflictException(reason);
    }

    const now = new Date();
    this.running = true;
    this.currentDataBasesId = dbId;
    const reason = 'Bot iniciado y listo para procesar demandas pendientes';
    const status = this.buildStatus(true, reason, dbId, now);
    await this.persistState(dbId, true, reason);
    this.appLogger.structured({
      level: 'log',
      context: BotControlService.name,
      type: 'BOT_STATE',
      status: 'OK',
      message: 'Bot iniciado',
      meta: status,
    });
    return status;
  }

  async stop(data_bases_id?: number): Promise<BotStatus> {
    const rawTargetId = data_bases_id ?? this.currentDataBasesId ?? undefined;
    const targetId = typeof rawTargetId === 'number' ? rawTargetId : Number(rawTargetId);

    if (!Number.isInteger(targetId) || targetId <= 0) {
      throw new NotFoundException('La configuración seleccionada no existe');
    }

    // Validamos que la configuración data_bases exista.
    try {
      await this.dataBasesService.findById(targetId);
    } catch {
      throw new NotFoundException('La configuración seleccionada no existe');
    }

    // Validamos que haya un registro en bot_control y que esté en ejecución.
    const existing = await this.botControlRepository.findByDataBasesId(targetId);
    if (!existing || !existing.running) {
      const reason = 'El bot ya se encuentra detenido para esta configuración de data_bases';
      this.appLogger.structured({
        level: 'warn',
        context: BotControlService.name,
        type: 'BOT_STATE',
        status: 'WARN',
        message:
          'Intento de detener el bot para una configuración que no está en ejecución o no tiene registro de control',
        meta: {
          data_bases_id: targetId,
          reason,
        },
      });
      throw new ConflictException(reason);
    }

    this.running = false;
    this.currentDataBasesId = null;
    const now = new Date();
    const reason = 'Bot detenido';
    const status = this.buildStatus(false, reason, targetId, now);
    await this.persistState(targetId, false, reason);

    this.appLogger.structured({
      level: 'log',
      context: BotControlService.name,
      type: 'BOT_STATE',
      status: 'OK',
      message: 'Bot detenido',
      meta: status,
    });
    return status;
  }

  async status(data_bases_id?: number): Promise<BotStatus[]> {
    try {
      const hasValidFilter =
        typeof data_bases_id === 'number' &&
        Number.isInteger(data_bases_id) &&
        data_bases_id > 0;

      const buildFromRecord = async (record: {
        data_bases_id: number;
        running: boolean;
        reason?: string | null;
        last_started_at?: Date | null;
        last_stopped_at?: Date | null;
        created_at?: Date;
        updated_at?: Date;
        responsible?: string;
      }): Promise<BotStatus> => {
        const runningForId = !!record.running;

        // Motivo base persistido en bot_control (start/stop).
        let effectiveReason =
          record.reason ?? (runningForId ? 'Bot en ejecución' : 'Bot detenido');

        // Si el bot está marcado como en ejecución, enriquecemos el motivo
        // con el estado actual de las condiciones de runtime (horario, festivos, etc.).
        if (runningForId) {
          try {
            const rt = await this.checkRuntimeConditions(record.data_bases_id);
            if (rt.ok) {
              effectiveReason =
                'Bot iniciado y listo para procesar demandas pendientes';
            } else if (rt.reason) {
              effectiveReason = `Bot en ejecución (standby): ${rt.reason}`;
            }
          } catch {
            // Si falla la validación en caliente, conservamos el motivo persistido.
          }
        }

        const tsSource = runningForId
          ? record.last_started_at ?? record.updated_at ?? record.created_at
          : record.last_stopped_at ?? record.updated_at ?? record.created_at;

        let label_data_base: string | undefined;
        try {
          const db = await this.dataBasesService.findById(record.data_bases_id);
          label_data_base = db.label_data_base;
        } catch {
          label_data_base = undefined;
        }

        const timestamp = this.formatDateTime(tsSource ?? new Date());

        const status: BotStatus = {
          data_bases_id: record.data_bases_id,
          label_data_base,
          running: runningForId,
          reason: effectiveReason,
          timestamp,
          responsible: record.responsible,
        };

        this.appLogger.structured({
          level: 'debug',
          context: BotControlService.name,
          type: 'BOT_STATE',
          status: status.running ? 'OK' : 'WARN',
          message: 'Consulta de estado del bot',
          meta: status,
        });
        return status;
      };

      if (hasValidFilter) {
        const id = data_bases_id as number;
        let record = await this.botControlRepository.findByDataBasesId(id);

        if (!record) {
          // Si no existe registro para este data_bases_id, lo creamos detenido.
          await this.persistState(id, false, 'Bot detenido');
          record = await this.botControlRepository.findByDataBasesId(id);
        }

        if (record) {
          const one = await buildFromRecord(record);
          return [one];
        }

        // Si no hay registro, devolvemos un estado básico sin contexto adicional.
        let label_data_base: string | undefined;
        try {
          const db = await this.dataBasesService.findById(id);
          label_data_base = db.label_data_base;
        } catch {
          label_data_base = undefined;
        }
        const now = new Date();
        const fallback: BotStatus = {
          data_bases_id: id,
          label_data_base,
          running: false,
          reason: 'Bot detenido',
          timestamp: this.formatDateTime(now),
          responsible: 'BOT demands online',
        };
        return [fallback];
      }

      // Sin data_bases_id: listar únicamente lo que exista en la tabla bot_control
      // con el formato simplificado que necesitas para UI.
      const all = await this.botControlRepository.findAll();
      const results: BotStatus[] = [];
      for (const record of all) {
        const status = await buildFromRecord(record);
        results.push(status);
      }
      return results;
    } catch (err) {
      const error = err as Error;
      this.appLogger.structured({
        level: 'error',
        context: BotControlService.name,
        type: 'BOT_STATE',
        status: 'ERROR',
        message: 'Error al obtener el estado del bot',
        meta: {
          data_bases_id,
          error: error.message,
        },
        stack: error.stack,
      });
      // Degradamos a lista vacía para evitar 500 en el endpoint.
      return [];
    }
  }

  /**
   * Valida si existen carteras activas y si estamos dentro de los días/horarios de atención.
   * No modifica el flag interno de running.
   */
  async checkRuntimeConditions(
    data_bases_id?: number,
  ): Promise<{ ok: boolean; reason?: string }> {
    const now = new Date();
    const dayEs = this.getCurrentDayEs(now);
    const minutesNow = this.timeToMinutes(`${now.getHours().toString().padStart(2, '0')}:${now
      .getMinutes()
      .toString()
      .padStart(2, '0')}`);

    const targetDbId = data_bases_id ?? this.currentDataBasesId;
    if (!targetDbId) {
      return { ok: false, reason: 'No hay configuración data_bases seleccionada para el bot' };
    }

    let db;
    try {
      db = await this.dataBasesService.findById(targetDbId);
    } catch {
      return { ok: false, reason: 'La configuración data_bases seleccionada no existe' };
    }

    if (!db.state_type_name || db.state_type_name.toLowerCase() !== 'active') {
      return { ok: false, reason: 'La configuración data_bases seleccionada no está activa' };
    }

    // Validar que hoy no sea festivo no laborable según tabla holiday (país CO)
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    try {
      const holiday = await this.holidayRepository.findByDateAndCountry(today, 'CO');
      if (holiday && !holiday.is_working_day) {
        return {
          ok: false,
          reason: `Hoy (${today.toISOString().slice(0, 10)}) es festivo no laborable para el bot: ${holiday.name}`,
        };
      }
    } catch {
      // Si falla la consulta de festivos, no bloqueamos al bot; se continúa con validación de horarios.
    }

    const schedules = await this.attentionScheduleRepository.findByPortfolio(db.portfolio_type_id);
    const activeSchedules = schedules.filter(
      (sc) => sc.state_type_name && sc.state_type_name.toLowerCase() === 'active',
    );

    const hasValidSchedule = activeSchedules.some((sc) => {
      const includesDay = Array.isArray(sc.days) && sc.days.includes(dayEs);
      if (!includesDay) return false;
      const start = this.timeToMinutes(sc.start_time);
      const startRecess = this.timeToMinutes((sc as any).start_recess);
      const endRecess = this.timeToMinutes((sc as any).end_recess);
      const end = this.timeToMinutes(sc.end_time);
      if ([start, startRecess, endRecess, end].some((v) => !Number.isFinite(v))) return false;

      const inMorning = minutesNow >= start && minutesNow < startRecess;
      const inAfternoon = minutesNow >= endRecess && minutesNow <= end;
      return inMorning || inAfternoon;
    });

    if (!hasValidSchedule) {
      const reason = this.getStandbyReason(activeSchedules, dayEs, minutesNow);
      return { ok: false, reason };
    }

    return { ok: true };
  }

  /**
   * Determina el motivo de standby cuando no se cumple el horario de atención:
   * fuera de días (ej. sábado/domingo), en receso, o fuera de horario (antes de start / después de end).
   */
  private getStandbyReason(
    activeSchedules: Array<{
      days?: string[];
      start_time?: string;
      start_recess?: string;
      end_recess?: string;
      end_time?: string;
    }>,
    dayEs: string,
    minutesNow: number,
  ): string {
    const anyIncludesDay = activeSchedules.some(
      (sc) => Array.isArray(sc.days) && sc.days.includes(dayEs),
    );
    if (!anyIncludesDay) {
      return 'Fuera de días de atención.';
    }

    const inRecessOfAny = activeSchedules.some((sc) => {
      const startRecess = this.timeToMinutes((sc as any).start_recess);
      const endRecess = this.timeToMinutes((sc as any).end_recess);
      if (!Number.isFinite(startRecess) || !Number.isFinite(endRecess)) return false;
      return minutesNow >= startRecess && minutesNow < endRecess;
    });
    if (inRecessOfAny) {
      return 'En receso.';
    }

    return 'Fuera de horario de atención.';
  }

  private async findConflictWithSamePortfolio(
    currentDataBasesId: number,
    portfolio_type_id: number,
  ): Promise<number | null> {
    const runningIds = await this.botControlRepository.findRunningIds();
    const otherIds = runningIds.filter((id) => id !== currentDataBasesId);
    if (otherIds.length === 0) {
      return null;
    }

    for (const id of otherIds) {
      try {
        const db = await this.dataBasesService.findById(id);
        if (db.portfolio_type_id === portfolio_type_id) {
          return id;
        }
      } catch {
        // Si la configuración data_bases no existe para ese id, ignoramos ese registro "huérfano".
        continue;
      }
    }

    return null;
  }

  private buildStatus(
    running: boolean,
    reason?: string,
    data_bases_id?: number,
    baseDate?: Date,
  ): BotStatus {
    const ref = baseDate ?? new Date();
    return {
      running,
      reason,
      data_bases_id,
      timestamp: this.formatDateTime(ref),
    };
  }

  /**
   * Persiste en la tabla bot_control el último estado conocido del bot
   * para una configuración concreta de data_bases.
   */
  private async persistState(
    data_bases_id: number,
    running: boolean,
    reason?: string,
  ): Promise<void> {
    const now = new Date();
    try {
      await this.botControlRepository.upsertForDataBases({
        data_bases_id,
        running,
        responsible: 'BOT demands online',
        reason,
        ...(running ? { last_started_at: now } : { last_stopped_at: now }),
      });
    } catch (err) {
      const error = err as Error;
      this.appLogger.structured({
        level: 'error',
        context: BotControlService.name,
        type: 'BOT_STATE',
        status: 'ERROR',
        message: 'No se pudo persistir el estado del bot en bot_control',
        meta: {
          data_bases_id,
          running,
          error: error.message,
        },
        stack: error.stack,
      });
    }
  }

  /**
   * Construye un resumen del entorno/cartera actual:
   * - environment_type_id / environment_type_name
   * - portfolio_type_id / portfolio_type_name
   * - data_bases asociadas (id y bases)
   */
  private async buildCurrentContextSummary(
    data_bases_id: number | undefined,
    hadRecord: boolean,
  ): Promise<
    Pick<
      BotStatus,
      'environment_type_id' | 'environment_type_name' | 'portfolio_type_name' | 'data_bases'
    >
  > {
    const targetId = data_bases_id;
    if (!targetId) {
      return {};
    }

    let db;
    try {
      db = await this.dataBasesService.findById(targetId);
    } catch {
      return {};
    }

    return {
      environment_type_id: db.environment_type_id,
      environment_type_name: db.environment_type_name,
      portfolio_type_name: db.portfolio_type_name,
      data_bases: hadRecord
        ? [
            {
              id: db.id,
              bases: db.bases,
              label_data_base: db.label_data_base,
            },
          ]
        : [],
    };
  }

  private getCurrentDayEs(date: Date): string {
    // JS: 0 = Domingo, 1 = Lunes, ...
    const daysEs = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return daysEs[date.getDay()] ?? 'Lunes';
  }

  private timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  private formatDateTime(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }
}

