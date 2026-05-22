// Responsabilidad: orquestador del flujo de automatización de correo para Carteras Propias.
// Ciclo continuo: toma el registro más antiguo (Abierto / Novedad correo), lo procesa y
// avanza al siguiente. Usa AUTOMATION_BETWEEN_DEMANDS_SEC entre registros y
// AUTOMATION_IDLE_SLEEP_SEC cuando no hay registros pendientes.

import { Injectable, Inject, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  MANAGEMENT_CTRL_FILED_DEMAND_REPOSITORY,
  ManagementCtrlFiledDemandRepository,
} from '@domain/ports/managementCtrlFiledDemand.ports';
import { DATABASES_REPOSITORY, DataBasesRepository } from '@domain/ports/dataBases.ports';
import { EmailInboxAutomationService } from './emailInboxAutomation.service';
import { BotControlService } from './botControl.service';
import { AppLogger } from '@infrastructure/logging/appLogger.service';

@Injectable()
export class CartPropiasEmailAutomationService implements OnModuleDestroy {
  private isLoopRunning = false;
  private stopped = false;

  constructor(
    @Inject(MANAGEMENT_CTRL_FILED_DEMAND_REPOSITORY)
    private readonly managementCtrlFiledDemandRepository: ManagementCtrlFiledDemandRepository,
    @Inject(DATABASES_REPOSITORY)
    private readonly dataBasesRepository: DataBasesRepository,
    private readonly emailInboxAutomationService: EmailInboxAutomationService,
    private readonly botControlService: BotControlService,
    private readonly configService: ConfigService,
    private readonly appLogger: AppLogger,
  ) {}

  onModuleDestroy(): void {
    this.stopped = true;
  }

  async tick(): Promise<void> {
    if (this.isLoopRunning) return;
    this.isLoopRunning = true;
    try {
      await this.runLoop();
    } finally {
      this.isLoopRunning = false;
    }
  }

  private async runLoop(): Promise<void> {
    const idleMs = this.getIdleSleepSec() * 1000;
    const betweenMs = this.getBetweenDemandsSec() * 1000;

    while (!this.stopped && this.botControlService.isRunning()) {
      try {
        const check = await this.botControlService.checkRuntimeConditions();
        if (!check.ok) {
          this.appLogger.structured({
            level: 'debug',
            context: CartPropiasEmailAutomationService.name,
            type: 'CART_PROPIAS_EMAIL',
            status: 'Warning',
            message: 'Bot fuera de horario/condiciones: automatización de correo en espera.',
            meta: { reason: check.reason },
          });
          await this.sleep(idleMs);
          continue;
        }

        const currentDataBasesId = this.botControlService.getCurrentDataBasesId();
        if (!currentDataBasesId) {
          await this.sleep(idleMs);
          continue;
        }

        let dbRecord: Awaited<ReturnType<DataBasesRepository['findById']>>;
        try {
          dbRecord = await this.dataBasesRepository.findById(currentDataBasesId);
        } catch {
          await this.sleep(idleMs);
          continue;
        }

        const portfolioState = dbRecord.portfolio_state_type_name?.trim().toLowerCase();
        if (!portfolioState || portfolioState !== 'active') {
          await this.sleep(idleMs);
          continue;
        }

        const processed = await this.runOnce(dbRecord.db_portfolio_type_id);
        await this.sleep(processed ? betweenMs : idleMs);
      } catch (err) {
        this.appLogger.structured({
          level: 'error',
          context: CartPropiasEmailAutomationService.name,
          type: 'CART_PROPIAS_EMAIL',
          status: 'Error',
          message: 'Error inesperado en ciclo de automatización de correo.',
          meta: { error: (err as Error).message },
          stack: (err as Error).stack,
        });
        await this.sleep(idleMs);
      }
    }
  }

  async runOnce(portfolioTypeId: number): Promise<boolean> {
    const record =
      await this.managementCtrlFiledDemandRepository.findNextForEmailProcessing(portfolioTypeId);

    if (!record) {
      this.appLogger.structured({
        level: 'debug',
        context: CartPropiasEmailAutomationService.name,
        type: 'CART_PROPIAS_EMAIL',
        status: 'Success',
        message: 'No hay registros pendientes para automatización de correo.',
        meta: { portfolioTypeId },
      });
      return false;
    }

    const now = new Date();

    await this.managementCtrlFiledDemandRepository.update({
      ...record,
      mcfd_management_status: 'En proceso',
      mcfd_detail: 'Iniciando automatización de correo',
      mcfd_updated_at: now,
    });

    this.appLogger.structured({
      level: 'debug',
      context: CartPropiasEmailAutomationService.name,
      type: 'CART_PROPIAS_EMAIL',
      status: 'Success',
      message: 'Procesando registro para automatización de correo',
      meta: {
        mcfd_id: record.mcfd_id,
        mcfd_client_id: record.mcfd_client_id,
        mcfd_name_data_base: record.mcfd_name_data_base,
        mcfd_management_status: record.mcfd_management_status,
      },
    });

    let identification: string | null = null;
    try {
      const rows = await this.dataBasesRepository.runQueryOnBase(
        record.mcfd_name_data_base,
        `SELECT identification FROM \`${record.mcfd_name_data_base}\`.clients WHERE id = ? LIMIT 1`,
        [record.mcfd_client_id],
      );
      if (rows?.[0]) {
        identification =
          String((rows[0] as Record<string, unknown>).identification ?? '').trim() || null;
      }
    } catch (err) {
      this.appLogger.structured({
        level: 'warn',
        context: CartPropiasEmailAutomationService.name,
        type: 'CART_PROPIAS_EMAIL',
        status: 'Warning',
        message: 'No se pudo obtener identification del cliente desde BD externa',
        meta: {
          mcfd_id: record.mcfd_id,
          baseName: record.mcfd_name_data_base,
          client_id: record.mcfd_client_id,
          error: (err as Error).message,
        },
      });
    }

    if (!identification) {
      await this.managementCtrlFiledDemandRepository.update({
        ...record,
        mcfd_last_execution: now,
        mcfd_retries: (record.mcfd_retries ?? 0) + 1,
        mcfd_management_status: 'Novedad correo',
        mcfd_detail: 'No se encontró identificación del cliente en BD externa',
        mcfd_updated_at: now,
      });
      return true;
    }

    const result = await this.emailInboxAutomationService.processEmailForRecord(
      record,
      identification,
    );

    await this.managementCtrlFiledDemandRepository.update({
      ...record,
      mcfd_automation_email_id: result.autmId ?? record.mcfd_automation_email_id,
      mcfd_last_execution: now,
      mcfd_retries: (record.mcfd_retries ?? 0) + 1,
      mcfd_management_status: result.managementStatus,
      mcfd_detail: result.detail,
      mcfd_updated_at: now,
    });

    this.appLogger.structured({
      level: 'debug',
      context: CartPropiasEmailAutomationService.name,
      type: 'CART_PROPIAS_EMAIL',
      status: 'Success',
      message: `Registro actualizado: ${result.managementStatus}`,
      meta: {
        mcfd_id: record.mcfd_id,
        autm_id: result.autmId ?? null,
        managementStatus: result.managementStatus,
      },
    });

    return true;
  }

  private getIdleSleepSec(): number {
    const v = this.configService.get<number>('AUTOMATION_IDLE_SLEEP_SEC', 15);
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : 15;
  }

  private getBetweenDemandsSec(): number {
    const v = this.configService.get<number>('AUTOMATION_BETWEEN_DEMANDS_SEC', 1);
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : 1;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
