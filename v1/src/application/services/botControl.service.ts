// Responsabilidad: servicio de aplicación para botControl (CRUD + estado de ejecución del bot).

import {
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';

import {
  TBL_ATTENTION_SCHEDULE_REPOSITORY,
  TblAttentionScheduleRepository,
} from '@domain/ports/attentionSchedule.ports';
import {
  BOT_CONTROL_REPOSITORY,
  BotControlRepository,
  CreateBotControlInput,
  FindAllBotControlFilters,
} from '@domain/ports/botControl.ports';
import { BotControl } from '@domain/entities/botControl.entities';
import { HOLIDAY_REPOSITORY, HolidayRepository } from '@domain/ports/holiday.ports';
import { AppLogger } from '@infrastructure/logging/appLogger.service';
import { DataBasesService } from './dataBases.service';
import { userMsg } from '@application/utils/apiUserMessages.utils';

export interface BotStatus extends Record<string, unknown> {
  running: boolean;
  reason?: string;
  timestamp: string;
  bctrl_data_bases_id?: number;
  label_data_base?: string;
  responsible?: string;
}

@Injectable()
export class BotControlService implements OnModuleInit {
  private running = false;
  private currentDataBasesId: number | null = null;

  constructor(
    @Inject(TBL_ATTENTION_SCHEDULE_REPOSITORY)
    private readonly attentionScheduleRepository: TblAttentionScheduleRepository,
    private readonly dataBasesService: DataBasesService,
    private readonly appLogger: AppLogger,
    @Inject(BOT_CONTROL_REPOSITORY)
    private readonly botControlRepository: BotControlRepository,
    @Inject(HOLIDAY_REPOSITORY)
    private readonly holidayRepository: HolidayRepository,
  ) {}

  async onModuleInit(): Promise<void> {
    const runningIds = await this.botControlRepository.findRunningIds();
    if (runningIds.length >= 1) {
      this.running = true;
      this.currentDataBasesId = runningIds[0];
      this.appLogger.structured({
        level: 'log',
        context: BotControlService.name,
        type: 'BOT_STATE',
        status: 'OK',
        message: 'Estado del bot rehidratado desde tbl_bot_control',
        meta: { bctrl_data_bases_id: this.currentDataBasesId },
      });
    }
  }

  // ─── Métodos para automatización (usados por DemandsPendingSyncService) ────

  isRunning(): boolean {
    return this.running;
  }

  getCurrentDataBasesId(): number | null {
    return this.currentDataBasesId;
  }

  async checkRuntimeConditions(
    data_bases_id?: number,
  ): Promise<{ ok: boolean; reason?: string }> {
    const now = new Date();
    const dayEn = this.getCurrentDayEn(now);
    const minutesNow = this.timeToMinutes(
      `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`,
    );

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

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    try {
      const holiday = await this.holidayRepository.findByDateAndCountry(today, 'CO');
      if (holiday && !holiday.hldy_is_working_day) {
        return {
          ok: false,
          reason: `Hoy (${today.toISOString().slice(0, 10)}) es festivo no laborable: ${holiday.hldy_name}`,
        };
      }
    } catch {
      // Si falla la consulta de festivos, continuamos con validación de horarios.
    }

    const schedules = await this.attentionScheduleRepository.findByPortfolioType(db.db_portfolio_type_id);
    const activeSchedules = schedules.filter(
      (sc) => sc.state_type_name && sc.state_type_name.toLowerCase() === 'active',
    );

    const hasValidSchedule = activeSchedules.some((sc) => {
      const includesDay = Array.isArray(sc.atsh_days) && sc.atsh_days.includes(dayEn);
      if (!includesDay) return false;
      const start = this.timeToMinutes(sc.atsh_start_time);
      const startRecess = this.timeToMinutes(sc.atsh_start_recess_time);
      const endRecess = this.timeToMinutes(sc.atsh_end_recess_time);
      const end = this.timeToMinutes(sc.atsh_end_time);
      if ([start, startRecess, endRecess, end].some((v) => !Number.isFinite(v))) return false;
      return (minutesNow >= start && minutesNow < startRecess) ||
             (minutesNow >= endRecess && minutesNow <= end);
    });

    if (!hasValidSchedule) {
      const reason = this.getStandbyReason(activeSchedules, dayEn, minutesNow, now);
      return { ok: false, reason };
    }

    return { ok: true };
  }

  // ─── CRUD: Iniciar / Detener / Estado / Listar / Filtrar ──────────────────

  async iniciar(input: CreateBotControlInput): Promise<BotControl> {
    const running = await this.botControlRepository.findRunningByDataBasesId(input.bctrl_data_bases_id);
    if (running) {
      throw new ConflictException({
        message: 'El bot ya está en ejecución',
        bctrl_data_bases_id: input.bctrl_data_bases_id,
      });
    }

    const now = new Date();
    let record: BotControl;
    try {
      const existing = await this.botControlRepository.findLastByDataBasesId(input.bctrl_data_bases_id);
      if (existing) {
        await this.botControlRepository.update({
          ...existing,
          bctrl_running: true,
          bctrl_last_started_at: now,
          bctrl_last_stopped_at: null,
          bctrl_reason: input.bctrl_reason ?? 'Bot iniciado',
          bctrl_detail: input.bctrl_detail ?? 'Bot iniciado correctamente.',
          bctrl_responsible: input.bctrl_responsible,
          bctrl_updated_at: now,
        });
        record = await this.botControlRepository.findById(existing.bctrl_id);
      } else {
        record = await this.botControlRepository.create({
          bctrl_data_bases_id: input.bctrl_data_bases_id,
          bctrl_running: true,
          bctrl_last_started_at: now,
          bctrl_last_stopped_at: null,
          bctrl_reason: input.bctrl_reason ?? 'Bot iniciado',
          bctrl_detail: input.bctrl_detail ?? 'Bot iniciado correctamente.',
          bctrl_responsible: input.bctrl_responsible,
        });
      }
    } catch {
      throw new InternalServerErrorException(userMsg.noCrear);
    }

    this.running = true;
    this.currentDataBasesId = input.bctrl_data_bases_id;
    this.appLogger.structured({
      level: 'log',
      context: BotControlService.name,
      type: 'BOT_STATE',
      status: 'OK',
      message: 'Bot iniciado via endpoint /botControl/iniciar',
      meta: { bctrl_data_bases_id: input.bctrl_data_bases_id },
    });

    try {
      const db = await this.dataBasesService.findById(input.bctrl_data_bases_id);
      record.environment_type_name = db.environment_type_name;
      record.portfolio_type_name = db.portfolio_type_name;
    } catch {
      // Sin JOIN si la db no se encuentra; el record igual se devuelve.
    }

    return record;
  }

  async detener(bctrl_data_bases_id: number, bctrl_reason: string, bctrl_responsible: string, bctrl_detail?: string): Promise<void> {
    const running = await this.botControlRepository.findRunningByDataBasesId(bctrl_data_bases_id);
    if (!running) {
      throw new NotFoundException({
        message: 'No hay un bot en ejecución para esta base de datos',
        bctrl_data_bases_id,
      });
    }

    const now = new Date();
    try {
      await this.botControlRepository.update({
        ...running,
        bctrl_running: false,
        bctrl_last_stopped_at: now,
        bctrl_reason: bctrl_reason ?? 'Bot detenido',
        bctrl_detail: bctrl_detail ?? 'Bot detenido correctamente.',
        bctrl_responsible,
        bctrl_updated_at: now,
      });
    } catch {
      throw new InternalServerErrorException(userMsg.noActualizar);
    }

    if (this.currentDataBasesId === bctrl_data_bases_id) {
      this.running = false;
      this.currentDataBasesId = null;
    }
    this.appLogger.structured({
      level: 'log',
      context: BotControlService.name,
      type: 'BOT_STATE',
      status: 'OK',
      message: 'Bot detenido via endpoint /botControl/detener',
      meta: { bctrl_data_bases_id },
    });
  }

  async getEstado(bctrl_data_bases_id: number): Promise<BotControl | null> {
    try {
      return await this.botControlRepository.findLastByDataBasesId(bctrl_data_bases_id);
    } catch {
      throw new InternalServerErrorException(userMsg.noCargar);
    }
  }

  async findAll(filters: FindAllBotControlFilters = {}): Promise<BotControl[]> {
    try {
      return await this.botControlRepository.findAll(filters);
    } catch {
      throw new InternalServerErrorException(userMsg.noListar);
    }
  }

  async findById(id: number): Promise<BotControl> {
    try {
      return await this.botControlRepository.findById(id);
    } catch {
      throw new NotFoundException({ message: 'Registro no encontrado', id });
    }
  }

  async actualizarDetail(data_bases_id: number, detail: string): Promise<void> {
    try {
      await this.botControlRepository.updateDetail(data_bases_id, detail);
    } catch {
      // No crítico: el detail es informativo, no bloqueamos el flujo si falla.
    }
  }

  // ─── Helpers privados ─────────────────────────────────────────────────────

  private getStandbyReason(
    activeSchedules: Array<{
      atsh_days?: string[];
      atsh_start_time?: string;
      atsh_start_recess_time?: string;
      atsh_end_recess_time?: string;
      atsh_end_time?: string;
    }>,
    dayEn: string,
    minutesNow: number,
    now: Date,
  ): string {
    const daysEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // ── 1. Fuera de días laborables ───────────────────────────────────────────
    const anyIncludesDay = activeSchedules.some(
      (sc) => Array.isArray(sc.atsh_days) && sc.atsh_days.includes(dayEn),
    );
    if (!anyIncludesDay) {
      const scheduleDays = new Set(activeSchedules.flatMap((sc) => sc.atsh_days ?? []));
      const todayIdx = now.getDay();
      let daysAhead = 0;
      for (let i = 1; i <= 7; i++) {
        if (scheduleDays.has(daysEn[(todayIdx + i) % 7] ?? '')) {
          daysAhead = i;
          break;
        }
      }
      const when = daysAhead === 1 ? 'mañana' : daysAhead > 1 ? `en ${daysAhead} días` : '';
      return `Fuera de días de atención.${when ? ` Próximo día hábil ${when}.` : ''}`;
    }

    // ── 2. En receso ──────────────────────────────────────────────────────────
    for (const sc of activeSchedules) {
      if (!Array.isArray(sc.atsh_days) || !sc.atsh_days.includes(dayEn)) continue;
      const startRecess = this.timeToMinutes(sc.atsh_start_recess_time ?? '');
      const endRecess = this.timeToMinutes(sc.atsh_end_recess_time ?? '');
      if (!Number.isFinite(startRecess) || !Number.isFinite(endRecess)) continue;
      if (minutesNow >= startRecess && minutesNow < endRecess) {
        return `En receso. Reanuda en ${this.minutesToHuman(endRecess - minutesNow)}.`;
      }
    }

    // ── 3. Antes del inicio de jornada ────────────────────────────────────────
    let earliestStartIn: number | null = null;
    for (const sc of activeSchedules) {
      if (!Array.isArray(sc.atsh_days) || !sc.atsh_days.includes(dayEn)) continue;
      const start = this.timeToMinutes(sc.atsh_start_time ?? '');
      if (!Number.isFinite(start)) continue;
      if (minutesNow < start) {
        const diff = start - minutesNow;
        if (earliestStartIn === null || diff < earliestStartIn) earliestStartIn = diff;
      }
    }
    if (earliestStartIn !== null) {
      return `Fuera de horario de atención. Inicia en ${this.minutesToHuman(earliestStartIn)}.`;
    }

    // ── 4. Después del fin de jornada ─────────────────────────────────────────
    return 'Fuera de horario de atención. Reanuda mañana al inicio de jornada.';
  }

  private minutesToHuman(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0 && m > 0) return `${h}h ${m}min`;
    if (h > 0) return `${h}h`;
    return `${m}min`;
  }

  private getCurrentDayEn(date: Date): string {
    const daysEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return daysEn[date.getDay()] ?? 'Monday';
  }

  private timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }
}
