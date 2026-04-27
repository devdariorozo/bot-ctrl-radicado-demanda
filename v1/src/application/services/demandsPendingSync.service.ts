// Responsabilidad: job de sincronización de demandas pendientes desde BDs externas a management_demands_online.

import { Injectable, Inject, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { DATABASES_REPOSITORY, DataBasesRepository } from '@domain/ports/dataBases.ports';
import {
  PORTFOLIO_CITY_CONFIG_REPOSITORY,
  PortfolioCityConfigRepository,
} from '@domain/ports/portfolioCityConfig.ports';
import {
  MANAGEMENT_DEMANDS_ONLINE_REPOSITORY,
  ManagementDemandsOnlineRepository,
  CreateManagementDemandsOnlineInput,
} from '@domain/ports/managementDemandsOnline.ports';
import { AMOUNT_TYPE_REPOSITORY, AmountTypeRepository } from '@domain/ports/amountType.ports';
import { BotControlService } from './botControl.service';
import { AppLogger } from '@infrastructure/logging/appLogger.service';
import { DemandsOnlineAutomationService } from './demandsOnlineAutomation.service';

const DEFAULT_STATE_TYPE_ID = 1;
const LAWSUITS_PK = 'id'; // lawsuits se consulta por id = lawsuit_id

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

@Injectable()
export class DemandsPendingSyncService implements OnModuleInit, OnModuleDestroy {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private automationLoopAborted = false;

  constructor(
    @Inject(DATABASES_REPOSITORY)
    private readonly dataBasesRepository: DataBasesRepository,
    @Inject(PORTFOLIO_CITY_CONFIG_REPOSITORY)
    private readonly portfolioCityConfigRepository: PortfolioCityConfigRepository,
    @Inject(MANAGEMENT_DEMANDS_ONLINE_REPOSITORY)
    private readonly managementDemandsOnlineRepository: ManagementDemandsOnlineRepository,
    @Inject(AMOUNT_TYPE_REPOSITORY)
    private readonly amountTypeRepository: AmountTypeRepository,
    private readonly configService: ConfigService,
    private readonly botControlService: BotControlService,
    private readonly appLogger: AppLogger,
    private readonly demandsOnlineAutomationService: DemandsOnlineAutomationService,
  ) {}

  /** Ejecuta el sync: por cada data_bases y cada base, cruce lawsuits × lca × pcc, resolución amount_type, creación en management_demands_online. */
  async runSync(): Promise<{ processed: number; created: number; skipped: number }> {
    let created = 0;
    let skipped = 0;
    let processed = 0;

    const currentDataBasesId = this.botControlService.getCurrentDataBasesId();
    if (!currentDataBasesId) {
      this.appLogger.structured({
        level: 'debug',
        context: DemandsPendingSyncService.name,
        type: 'SYNC_JOB',
        status: 'WARN',
        message:
          'runSync no se ejecuta porque no hay configuración data_bases seleccionada en el bot.',
      });
      return { processed, created, skipped };
    }

    let dbRecord;
    try {
      dbRecord = await this.dataBasesRepository.findById(currentDataBasesId);
    } catch {
      this.appLogger.structured({
        level: 'warn',
        context: DemandsPendingSyncService.name,
        type: 'SYNC_JOB',
        status: 'WARN',
        message:
          'runSync no se ejecuta porque la configuración data_bases seleccionada no existe.',
        meta: { data_bases_id: currentDataBasesId },
      });
      return { processed, created, skipped };
    }

    // Validar que la cartera (portfolio_type) esté activa según state_type
    const portfolioState = dbRecord.portfolio_state_type_name?.trim().toLowerCase();
    if (!portfolioState || portfolioState !== 'active') {
      this.appLogger.structured({
        level: 'warn',
        context: DemandsPendingSyncService.name,
        type: 'SYNC_JOB',
        status: 'WARN',
        message:
          'runSync no se ejecuta porque la cartera (portfolio) de la configuración data_bases seleccionada no está activa.',
        meta: {
          data_bases_id: currentDataBasesId,
          portfolio_type_id: dbRecord.db_portfolio_type_id,
          portfolio_state_type_name: dbRecord.portfolio_state_type_name ?? null,
        },
      });
      return { processed, created, skipped };
    }

    const dbList = [dbRecord];
    this.appLogger.structured({
      level: 'debug',
      context: DemandsPendingSyncService.name,
      type: 'SYNC_JOB',
      status: 'OK',
      message: 'Iniciando runSync',
      meta: { dataBasesCount: dbList.length },
    });

    for (const dbRecord of dbList) {
      if (!dbRecord.db_bases || typeof dbRecord.db_bases !== 'object' || Object.keys(dbRecord.db_bases).length === 0) {
        continue;
      }
      const configs = await this.portfolioCityConfigRepository.findByDataBases(dbRecord.db_id);
      if (configs.length === 0) {
        continue;
      }
      const idCityViews = configs.map((c) => c.id_city_views);
      const configByCityId = new Map(configs.map((c) => [c.id_city_views, c]));

      this.appLogger.structured({
        level: 'debug',
        context: DemandsPendingSyncService.name,
        type: 'SYNC_JOB',
        status: 'OK',
        message: 'Procesando registro de data_bases',
        meta: {
          dataBasesId: dbRecord.db_id,
          portfolio_type_id: dbRecord.db_portfolio_type_id,
          state_type_name: dbRecord.state_type_name,
          bases: dbRecord.db_bases,
          portfolioCityConfigs: configs.length,
          idCityViews,
        },
      });

      for (const baseName of Object.keys(dbRecord.db_bases)) {
        try {
          // 1) Consultar primero lawsuits pendientes (status Pendiente y sin deleted_at)
          //    y cruzarlas con lawsuit_court_assignments por lawsuit_id y city_id ∈ idCityViews.
          const pendingRows = await this.fetchPendingLawSuitsWithAssignments(
            baseName,
            idCityViews,
          );
          this.appLogger.structured({
            level: 'debug',
            context: DemandsPendingSyncService.name,
            type: 'SYNC_JOB',
            status: 'OK',
            message:
              'Resultado de lawsuits pendientes con lawsuit_court_assignments por base',
            meta: {
              dataBasesId: dbRecord.db_id,
              baseName,
              pendingCount: pendingRows.length,
            },
          });

          for (const row of pendingRows) {
            processed++;
            const lawsuitCourtAssignmentsId = Number(
              row.lawsuit_court_assignments_id ?? row.id,
            );
            const lawsuitId = Number(row.lawsuit_id);
            const clientId = Number(
              (row.assignment_client_id as number | undefined) ??
                (row.lawsuit_client_id as number | undefined) ??
                (row.client_id as number),
            );
            const cityId = Number(row.city_id);
            const pcc = configByCityId.get(cityId);
            if (!pcc) {
              this.appLogger.structured({
                level: 'debug',
                context: DemandsPendingSyncService.name,
                type: 'SYNC_JOB',
                status: 'WARN',
                message: 'Sin configuración de ciudad para este city_id; se omite registro',
                meta: {
                  baseName,
                  dataBasesId: dbRecord.db_id,
                  lawsuitCourtAssignmentsId,
                  lawsuitId,
                  clientId,
                  cityId,
                },
              });
              skipped++;
              continue;
            }
            const existing = await this.managementDemandsOnlineRepository.findByLawsuitCourtAssignmentsIdAndBase(
              lawsuitCourtAssignmentsId,
              baseName,
            );
            if (existing) {
              this.appLogger.structured({
                level: 'debug',
                context: DemandsPendingSyncService.name,
                type: 'SYNC_JOB',
                status: 'OK',
                message: 'Registro ya existe en management_demands_online para esta base; se omite',
                meta: {
                  baseName,
                  dataBasesId: dbRecord.db_id,
                  lawsuitCourtAssignmentsId,
                  existingId: existing.id,
                },
              });
              skipped++;
              continue;
            }
            const typeQuantity =
              row.type_quantity != null ? String(row.type_quantity) : null;
            const amountType = typeQuantity
              ? await this.amountTypeRepository.findByDuplicate(typeQuantity)
              : null;
            if (!amountType) {
              this.appLogger.structured({
                level: 'debug',
                context: DemandsPendingSyncService.name,
                type: 'SYNC_JOB',
                status: 'WARN',
                message: 'No se encontró amount_type para el type_quantity; se omite',
                meta: {
                  baseName,
                  dataBasesId: dbRecord.db_id,
                  lawsuitCourtAssignmentsId,
                  lawsuitId,
                  typeQuantity,
                },
              });
              skipped++;
              continue;
            }
            const input: CreateManagementDemandsOnlineInput = {
              portfolio_type_id: dbRecord.db_portfolio_type_id,
              name_data_base: baseName,
              portfolio_city_config_id: pcc.id,
              campaign_id: Number(row.campaign_id ?? 0),
              lawsuit_id: lawsuitId,
              lawsuit_court_assignments_id: lawsuitCourtAssignmentsId,
              client_id: clientId,
              path_law_doc: String(row.path_law_doc ?? ''),
              lawsuit_status: String(row.lawsuit_status ?? ''),
              amount_type_id: amountType.id,
              state_type_id: DEFAULT_STATE_TYPE_ID,
              user_id: 1,
              user_name: 'BOT ctrl filed demand',
              number_filed: '-',
              management_status: 'Abierta',
              detail: 'Demanda pendiente para registro en linea',
              responsible: 'BOT ctrl filed demand',
            };
            this.appLogger.structured({
              level: 'debug',
              context: DemandsPendingSyncService.name,
              type: 'SYNC_JOB',
              status: 'OK',
              message: 'Creando registro en management_demands_online',
              meta: {
                baseName,
                dataBasesId: dbRecord.db_id,
                lawsuitCourtAssignmentsId,
                lawsuitId,
                clientId,
                portfolio_city_config_id: pcc.id,
                amount_type_id: amountType.id,
              },
            });
            await this.managementDemandsOnlineRepository.create(input);
            created++;
          }
        } catch (err) {
          const error = err as Error;
          this.appLogger.structured({
            level: 'warn',
            context: DemandsPendingSyncService.name,
            type: 'SYNC_JOB',
            status: 'WARN',
            message: `Sync base "${baseName}" (data_bases id ${dbRecord.db_id}) falló`,
            meta: { error: error.message },
          });
        }
      }
    }
    return { processed, created, skipped };
  }

  /**
   * Consulta lawsuits (solo Pendiente y sin deleted_at) cruzada con lawsuit_court_assignments
   * y dues (por client_id), aplicando filtros de monto mínimo y estado de cuota.
   *
   * Condiciones fijas:
   *   - l.lawsuit_status = 'Pendiente'
   *   - l.deleted_at IS NULL
   *   - lca.city_id IN (idCityViews)
   *   - d.current_capital_balance > DEMANDS_PENDING_SYNC_MINIMUM_AMOUNT
   *   - d.state IN (DEMANDS_PENDING_SYNC_DUES_STATE)
   *
   * Modo automático (DEMANDS_PENDING_SYNC_MANUAL=false o no definida):
   *   Retorna todas las demandas que cumplen las condiciones anteriores.
   *
   * Modo manual (DEMANDS_PENDING_SYNC_MANUAL=true):
   *   Además restringe por CLIENT_ID y LAWSUIT_ID del .env.
   */
  private async fetchPendingLawSuitsWithAssignments(
    baseName: string,
    idCityViews: number[],
  ): Promise<Record<string, unknown>[]> {
    if (idCityViews.length === 0) return [];

    // --- Parámetros de ciudad ---
    const cityPlaceholders = idCityViews.map(() => '?').join(',');

    // --- Monto mínimo (DEMANDS_PENDING_SYNC_MINIMUM_AMOUNT) ---
    const minimumAmount =
      Number(this.configService.get<string>('DEMANDS_PENDING_SYNC_MINIMUM_AMOUNT', '0')) || 0;

    // --- Estados de dues (DEMANDS_PENDING_SYNC_DUES_STATE, ej. "186,195") ---
    const duesStatesRaw = this.configService.get<string>('DEMANDS_PENDING_SYNC_DUES_STATE', '');
    const duesStates = duesStatesRaw
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => !isNaN(n) && n > 0);
    const statePlaceholders = duesStates.length > 0 ? duesStates.map(() => '?').join(',') : null;

    // --- Modo manual: filtros adicionales por CLIENT_ID / LAWSUIT_ID ---
    const isManual =
      this.configService.get<string>('DEMANDS_PENDING_SYNC_MANUAL', 'false').trim().toLowerCase() === 'true';
    let extraWhere = '';
    const extraParams: number[] = [];
    if (isManual) {
      const clientId = this.configService.get<string>('CLIENT_ID', '');
      const lawsuitId = this.configService.get<string>('LAWSUIT_ID', '');
      if (clientId && !isNaN(Number(clientId))) {
        extraWhere += `\n        AND l.client_id = ?`;
        extraParams.push(Number(clientId));
      }
      if (lawsuitId && !isNaN(Number(lawsuitId))) {
        extraWhere += `\n        AND l.id = ?`;
        extraParams.push(Number(lawsuitId));
      }
    }

    // Orden de parámetros: ciudades → monto mínimo → estados dues → filtros manuales.
    const queryParams: number[] = [
      ...idCityViews,
      minimumAmount,
      ...(duesStates.length > 0 ? duesStates : []),
      ...extraParams,
    ];

    const duesStateCondition = statePlaceholders
      ? `\n        AND d.state IN (${statePlaceholders})`
      : '';

    const fromJoin = `
      FROM \`${baseName}\`.lawsuits l
      INNER JOIN \`${baseName}\`.lawsuit_court_assignments lca
        ON lca.lawsuit_id = l.id
      INNER JOIN \`${baseName}\`.dues d
        ON d.client_id = l.client_id
      WHERE l.lawsuit_status = 'Pendiente'
        AND l.deleted_at IS NULL
        AND lca.city_id IN (${cityPlaceholders})
        AND d.current_capital_balance >= ?${duesStateCondition}${extraWhere}
    `;

    const sqlWithPath = `
      SELECT DISTINCT
        l.id AS lawsuit_id,
        l.client_id AS lawsuit_client_id,
        l.path_law_doc,
        l.lawsuit_status,
        l.type_quantity,
        l.user_id,
        l.user_name,
        l.campaign_id,
        lca.id AS lawsuit_court_assignments_id,
        lca.client_id AS assignment_client_id,
        lca.city_id
      ${fromJoin}
    `;
    const sqlWithoutPath = `
      SELECT DISTINCT
        l.id AS lawsuit_id,
        l.client_id AS lawsuit_client_id,
        l.lawsuit_status,
        l.type_quantity,
        l.user_id,
        l.user_name,
        l.campaign_id,
        lca.id AS lawsuit_court_assignments_id,
        lca.client_id AS assignment_client_id,
        lca.city_id
      ${fromJoin}
    `;
    try {
      return await this.dataBasesRepository.runQueryOnBase(baseName, sqlWithPath, queryParams);
    } catch (err) {
      const msg = String((err as Error)?.message ?? '');
      if (!/path_law_doc|Unknown column/i.test(msg)) throw err;
      const rows = await this.dataBasesRepository.runQueryOnBase(
        baseName,
        sqlWithoutPath,
        queryParams,
      );
      return rows.map((r) => ({ ...r, path_law_doc: '' }));
    }
  }

  getIntervalMinutes(): number {
    const v = this.configService.get<number>('DEMANDS_PENDING_SYNC_INTERVAL_MINUTES', 30);
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : 30;
  }

  /** Número de navegadores (workers) en paralelo para gestión de demandas (BROWSERLESS_CONCURRENT_BROWSERS). */
  getConcurrentBrowsers(): number {
    const v = this.configService.get<number>('BROWSERLESS_CONCURRENT_BROWSERS', 1);
    const n = Number(v);
    return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
  }

  /** Segundos de espera cuando no hay demanda procesada (AUTOMATION_IDLE_SLEEP_SEC). */
  private getIdleSleepSec(): number {
    const v = this.configService.get<number>('AUTOMATION_IDLE_SLEEP_SEC', 15);
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 15;
  }

  /** Segundos entre demandas cuando sí se procesó una (AUTOMATION_BETWEEN_DEMANDS_SEC). */
  private getBetweenDemandsSleepSec(): number {
    const v = this.configService.get<number>('AUTOMATION_BETWEEN_DEMANDS_SEC', 2);
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 2;
  }

  /** Segundos en standby (AUTOMATION_STANDBY_SLEEP_SEC). */
  private getStandbySleepSec(): number {
    const v = this.configService.get<number>('AUTOMATION_STANDBY_SLEEP_SEC', 60);
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 60;
  }

  /** Segundos cuando el bot está detenido (AUTOMATION_BOT_STOPPED_SLEEP_SEC). */
  private getBotStoppedSleepSec(): number {
    const v = this.configService.get<number>('AUTOMATION_BOT_STOPPED_SLEEP_SEC', 5);
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 5;
  }

  onModuleInit(): void {
    const minutes = this.getIntervalMinutes();
    const ms = minutes * 60 * 1000;
    this.intervalId = setInterval(() => this.tick(), ms);
    this.appLogger.structured({
      level: 'log',
      context: DemandsPendingSyncService.name,
      type: 'SYNC_JOB',
      status: 'OK',
      message: `Demands pending sync scheduled every ${minutes} minute(s).`,
      meta: { intervalMinutes: minutes },
    });
    setImmediate(() => this.tick());

    this.automationLoopAborted = false;
    const concurrentBrowsers = this.getConcurrentBrowsers();
    for (let i = 0; i < concurrentBrowsers; i++) {
      setImmediate(() => this.runWorkerLoop());
    }
    this.appLogger.structured({
      level: 'log',
      context: DemandsPendingSyncService.name,
      type: 'AUTOMATION_LOOP',
      status: 'OK',
      message: `Bucle de gestión continua iniciado con ${concurrentBrowsers} navegador(es) en paralelo (BROWSERLESS_CONCURRENT_BROWSERS).`,
      meta: { concurrentBrowsers },
    });
  }

  onModuleDestroy(): void {
    this.automationLoopAborted = true;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async tick(): Promise<void> {
    if (!this.botControlService.isRunning()) {
      this.appLogger.structured({
        level: 'debug',
        context: DemandsPendingSyncService.name,
        type: 'SYNC_JOB',
        status: 'WARN',
        message: 'Bot detenido: no se ejecuta la sincronización de demandas pendientes.',
      });
      return;
    }
    try {
      const check = await this.botControlService.checkRuntimeConditions();
      if (!check.ok) {
        this.appLogger.structured({
          level: 'debug',
          context: DemandsPendingSyncService.name,
          type: 'SYNC_JOB',
          status: 'WARN',
          message: 'Bot no puede trabajar en este momento',
          meta: { reason: check.reason },
        });
        return;
      }
      const result = await this.runSync();
      this.appLogger.structured({
        level: 'debug',
        context: DemandsPendingSyncService.name,
        type: 'SYNC_JOB',
        status: 'OK',
        message: 'Sync done',
        meta: {
          processed: result.processed,
          created: result.created,
          skipped: result.skipped,
        },
      });
    } catch (err) {
      const error = err as Error;
      this.appLogger.structured({
        level: 'error',
        context: DemandsPendingSyncService.name,
        type: 'SYNC_JOB',
        status: 'ERROR',
        message: 'Sync failed',
        meta: { error: error.message },
        stack: error.stack,
      });
    }
  }

  /**
   * Un worker del bucle de gestión: mientras el bot esté en ejecución, procesa demandas.
   * Se lanzan tantos workers como BROWSERLESS_CONCURRENT_BROWSERS.
   */
  private async runWorkerLoop(): Promise<void> {
    while (!this.automationLoopAborted) {
      if (!this.botControlService.isRunning()) {
        await sleep(this.getBotStoppedSleepSec() * 1000);
        continue;
      }

      const runtime = await this.botControlService.checkRuntimeConditions();
      if (!runtime.ok) {
        this.appLogger.structured({
          level: 'debug',
          context: DemandsPendingSyncService.name,
          type: 'AUTOMATION_LOOP',
          status: 'WARN',
          message: 'Bot en standby (fuera de horario o festivo); se reintentará más tarde.',
          meta: { reason: runtime.reason },
        });
        await sleep(this.getStandbySleepSec() * 1000);
        continue;
      }

      try {
        const result = await this.demandsOnlineAutomationService.runOnce();
        if (result.processed) {
          await sleep(this.getBetweenDemandsSleepSec() * 1000);
        } else {
          await sleep(this.getIdleSleepSec() * 1000);
        }
      } catch (err) {
        const error = err as Error;
        const msg = (error.message ?? '').toLowerCase();
        const isPortalScheduleRestriction =
          msg.includes('horario_no_disponible') ||
          msg.includes('restriccion') ||
          msg.includes('restricción');

        if (isPortalScheduleRestriction) {
          this.appLogger.structured({
            level: 'warn',
            context: DemandsPendingSyncService.name,
            type: 'AUTOMATION_LOOP',
            status: 'WARN',
            message:
              'Restricción de horario del portal para esta ciudad; la demanda se marcó como Novedad. El bot continúa con la siguiente.',
            meta: { error: error.message },
          });
          await sleep(this.getIdleSleepSec() * 1000);
        } else {
          this.appLogger.structured({
            level: 'error',
            context: DemandsPendingSyncService.name,
            type: 'AUTOMATION_LOOP',
            status: 'ERROR',
            message: 'Error en gestión de una demanda; se reintentará más tarde.',
            meta: { error: error.message },
            stack: error.stack,
          });
          await sleep(this.getStandbySleepSec() * 1000);
        }
      }
    }
  }
}
