// Responsabilidad: job de sincronización inicial de demandas "Presentada", "Presentada por aplicativo" y "Sin presentar"
// para el flujo exclusivo de Carteras Propias → crea registros en tbl_management_ctrl_filed_demand.

import { Injectable, Inject, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { DATABASES_REPOSITORY, DataBasesRepository } from '@domain/ports/dataBases.ports';
import {
  MANAGEMENT_CTRL_FILED_DEMAND_REPOSITORY,
  ManagementCtrlFiledDemandRepository,
  CreateManagementCtrlFiledDemandInput,
} from '@domain/ports/managementCtrlFiledDemand.ports';
import { BotControlService } from './botControl.service';
import { AppLogger } from '@infrastructure/logging/appLogger.service';

const DEFAULT_STATE_TYPE_ID = 1;
const FILING_NUMBER_MIN_LENGTH = 23;

@Injectable()
export class CartPropiasDemandsSyncService implements OnModuleInit, OnModuleDestroy {
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(
    @Inject(DATABASES_REPOSITORY)
    private readonly dataBasesRepository: DataBasesRepository,
    @Inject(MANAGEMENT_CTRL_FILED_DEMAND_REPOSITORY)
    private readonly managementCtrlFiledDemandRepository: ManagementCtrlFiledDemandRepository,
    private readonly configService: ConfigService,
    private readonly botControlService: BotControlService,
    private readonly appLogger: AppLogger,
  ) {}

  /**
   * Ejecuta el sync de Carteras Propias:
   * - Consulta tbl_lawsuits con status Presentada / Presentada por aplicativo / Sin presentar.
   * - Cruza con lawsuits_filings donde filing_number es null o < 23 caracteres.
   * - Crea el registro inicial en tbl_management_ctrl_filed_demand si no existe.
   */
  async runSync(): Promise<{ processed: number; created: number; skipped: number }> {
    let processed = 0;
    let created = 0;
    let skipped = 0;

    const currentDataBasesId = this.botControlService.getCurrentDataBasesId();
    if (!currentDataBasesId) {
      this.appLogger.structured({
        level: 'debug',
        context: CartPropiasDemandsSyncService.name,
        type: 'CART_PROPIAS_SYNC',
        status: 'WARN',
        message: 'runSync omitido: no hay data_bases seleccionada en el bot.',
      });
      return { processed, created, skipped };
    }

    let dbRecord;
    try {
      dbRecord = await this.dataBasesRepository.findById(currentDataBasesId);
    } catch {
      this.appLogger.structured({
        level: 'warn',
        context: CartPropiasDemandsSyncService.name,
        type: 'CART_PROPIAS_SYNC',
        status: 'WARN',
        message: 'runSync omitido: data_bases seleccionada no existe.',
        meta: { data_bases_id: currentDataBasesId },
      });
      return { processed, created, skipped };
    }

    const portfolioState = dbRecord.portfolio_state_type_name?.trim().toLowerCase();
    if (!portfolioState || portfolioState !== 'active') {
      this.appLogger.structured({
        level: 'warn',
        context: CartPropiasDemandsSyncService.name,
        type: 'CART_PROPIAS_SYNC',
        status: 'WARN',
        message: 'runSync omitido: la cartera no está activa.',
        meta: {
          data_bases_id: currentDataBasesId,
          portfolio_type_id: dbRecord.db_portfolio_type_id,
          portfolio_state_type_name: dbRecord.portfolio_state_type_name ?? null,
        },
      });
      return { processed, created, skipped };
    }

    if (
      !dbRecord.db_bases ||
      typeof dbRecord.db_bases !== 'object' ||
      Object.keys(dbRecord.db_bases).length === 0
    ) {
      this.appLogger.structured({
        level: 'warn',
        context: CartPropiasDemandsSyncService.name,
        type: 'CART_PROPIAS_SYNC',
        status: 'WARN',
        message: 'runSync omitido: db_bases está vacío.',
        meta: { data_bases_id: currentDataBasesId },
      });
      return { processed, created, skipped };
    }

    this.appLogger.structured({
      level: 'debug',
      context: CartPropiasDemandsSyncService.name,
      type: 'CART_PROPIAS_SYNC',
      status: 'OK',
      message: 'Iniciando sync Carteras Propias — demandas Presentada / Presentada por aplicativo / Sin presentar',
      meta: { dataBasesId: dbRecord.db_id, bases: Object.keys(dbRecord.db_bases) },
    });

    for (const baseName of Object.keys(dbRecord.db_bases)) {
      try {
        const rows = await this.fetchPresentedLawsuits(baseName);
        this.appLogger.structured({
          level: 'debug',
          context: CartPropiasDemandsSyncService.name,
          type: 'CART_PROPIAS_SYNC',
          status: 'OK',
          message: 'Demandas Presentada / Sin presentar encontradas en base',
          meta: { dataBasesId: dbRecord.db_id, baseName, total: rows.length },
        });

        for (const row of rows) {
          processed++;

          const lawsuitId = Number(row.lawsuit_id);
          const clientId = Number(row.client_id);
          const lawsuitsFilingsId = Number(row.lawsuits_filings_id ?? 0);

          const existing = await this.managementCtrlFiledDemandRepository.findActiveForDemand(
            dbRecord.db_portfolio_type_id,
            lawsuitId,
            lawsuitsFilingsId,
          );
          if (existing) {
            this.appLogger.structured({
              level: 'debug',
              context: CartPropiasDemandsSyncService.name,
              type: 'CART_PROPIAS_SYNC',
              status: 'OK',
              message: 'Registro ya existe en tbl_management_ctrl_filed_demand; se omite.',
              meta: { baseName, lawsuitId, lawsuitsFilingsId, existingId: existing.mcfd_id },
            });
            skipped++;
            continue;
          }

          const filingDateRaw = row.filing_date as string | null | undefined;
          const filingDate = filingDateRaw ? new Date(filingDateRaw) : null;
          const filingNumber = (row.filing_number as string | null | undefined) ?? null;

          const input: CreateManagementCtrlFiledDemandInput = {
            mcfd_portfolio_type_id: dbRecord.db_portfolio_type_id,
            mcfd_name_data_base: baseName,
            mcfd_lawsuit_id: lawsuitId,
            mcfd_lawsuits_filings_id: lawsuitsFilingsId,
            mcfd_client_id: clientId,
            mcfd_filing_date: filingDate,
            mcfd_number_filed: filingNumber,
            mcfd_management_status: 'Abierto',
            mcfd_detail: 'Demanda abierta para procesar numero de radicado',
            mcfd_state_type_id: DEFAULT_STATE_TYPE_ID,
            mcfd_responsible: 'BOT ctrl radicado demanda',
          };

          this.appLogger.structured({
            level: 'debug',
            context: CartPropiasDemandsSyncService.name,
            type: 'CART_PROPIAS_SYNC',
            status: 'OK',
            message: 'Creando registro en tbl_management_ctrl_filed_demand',
            meta: {
              baseName,
              lawsuitId,
              clientId,
              lawsuitsFilingsId,
              portfolioTypeId: dbRecord.db_portfolio_type_id,
            },
          });

          await this.managementCtrlFiledDemandRepository.create(input);
          created++;
        }
      } catch (err) {
        const error = err as Error;
        this.appLogger.structured({
          level: 'warn',
          context: CartPropiasDemandsSyncService.name,
          type: 'CART_PROPIAS_SYNC',
          status: 'WARN',
          message: `Sync falló para base "${baseName}" (data_bases id ${dbRecord.db_id})`,
          meta: { error: error.message },
        });
      }
    }

    return { processed, created, skipped };
  }

  /**
   * Consulta en la base externa las demandas con lawsuit_status 'Presentada',
   * 'Presentada por aplicativo' o 'Sin presentar', deleted_at IS NULL, cruzadas con lawsuits_filings
   * donde filing_number IS NULL o CHAR_LENGTH < 23.
   *
   * Modo manual (DEMANDS_PRESENTED_SYNC_MANUAL=true):
   *   Restringe además por CLIENT_ID y LAWSUIT_ID del .env.
   */
  private async fetchPresentedLawsuits(baseName: string): Promise<Record<string, unknown>[]> {
    const isManual =
      this.configService
        .get<string>('DEMANDS_PRESENTED_SYNC_MANUAL', 'false')
        .trim()
        .toLowerCase() === 'true';

    let extraWhere = '';
    const params: unknown[] = [];

    if (isManual) {
      const clientId = this.configService.get<string>('CLIENT_ID', '');
      const lawsuitId = this.configService.get<string>('LAWSUIT_ID', '');
      if (clientId && !isNaN(Number(clientId))) {
        extraWhere += `\n        AND l.client_id = ?`;
        params.push(Number(clientId));
      }
      if (lawsuitId && !isNaN(Number(lawsuitId))) {
        extraWhere += `\n        AND l.id = ?`;
        params.push(Number(lawsuitId));
      }
    }

    const sql = `
      SELECT DISTINCT
        l.id                          AS lawsuit_id,
        l.client_id,
        lf.id                         AS lawsuits_filings_id,
        lf.filing_date,
        lf.filing_number
      FROM \`${baseName}\`.lawsuits l
      INNER JOIN \`${baseName}\`.lawsuits_filings lf
        ON lf.lawsuit_id = l.id
      WHERE l.lawsuit_status IN ('Presentada', 'Presentada por aplicativo', 'Sin presentar')
        AND l.deleted_at IS NULL
        AND (
          lf.filing_number IS NULL
          OR CHAR_LENGTH(lf.filing_number) < ${FILING_NUMBER_MIN_LENGTH}
        )${extraWhere}
    `;

    return this.dataBasesRepository.runQueryOnBase(baseName, sql, params);
  }

  getIntervalMinutes(): number {
    const v = this.configService.get<number>('DEMANDS_PRESENTED_SYNC_INTERVAL_MINUTES', 30);
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : 30;
  }

  onModuleInit(): void {
    const minutes = this.getIntervalMinutes();
    this.intervalId = setInterval(() => this.tick(), minutes * 60 * 1000);
    this.appLogger.structured({
      level: 'log',
      context: CartPropiasDemandsSyncService.name,
      type: 'CART_PROPIAS_SYNC',
      status: 'OK',
      message: `Carteras Propias — sync programado cada ${minutes} minuto(s).`,
      meta: { intervalMinutes: minutes },
    });
    setImmediate(() => this.tick());
  }

  onModuleDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async tick(): Promise<void> {
    if (!this.botControlService.isRunning()) {
      this.appLogger.structured({
        level: 'debug',
        context: CartPropiasDemandsSyncService.name,
        type: 'CART_PROPIAS_SYNC',
        status: 'WARN',
        message: 'Bot detenido: sync de Carteras Propias omitido.',
      });
      return;
    }
    try {
      const check = await this.botControlService.checkRuntimeConditions();
      if (!check.ok) {
        this.appLogger.structured({
          level: 'debug',
          context: CartPropiasDemandsSyncService.name,
          type: 'CART_PROPIAS_SYNC',
          status: 'WARN',
          message: 'Bot fuera de horario/condiciones: sync omitido.',
          meta: { reason: check.reason },
        });
        return;
      }
      const result = await this.runSync();
      this.appLogger.structured({
        level: 'debug',
        context: CartPropiasDemandsSyncService.name,
        type: 'CART_PROPIAS_SYNC',
        status: 'OK',
        message: 'Sync Carteras Propias completado.',
        meta: { processed: result.processed, created: result.created, skipped: result.skipped },
      });
    } catch (err) {
      const error = err as Error;
      this.appLogger.structured({
        level: 'error',
        context: CartPropiasDemandsSyncService.name,
        type: 'CART_PROPIAS_SYNC',
        status: 'ERROR',
        message: 'Sync Carteras Propias falló.',
        meta: { error: error.message },
        stack: error.stack,
      });
    }
  }
}
