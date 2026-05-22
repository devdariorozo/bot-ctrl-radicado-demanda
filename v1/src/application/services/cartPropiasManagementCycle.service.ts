// Responsabilidad: ciclo de gestión unificado para Carteras Propias.
// Prioridad de cola (orden económico: más cerca de facturar = mayor prioridad):
//   0. Radicado encontrado / Radicado construido → solo runEndCycle → facturación inmediata
//   1. Correo Automatizado / En proceso          → tiene correo, va al portal ahora
//   2. Novedad portal  — ≥2h (portal caído, reintentar)
//   3. Abierto                                   → registro nuevo, iniciar pipeline
//   4. Novedad correo  — round-robin por last_execution (sin correo aún)
// Cada prioridad: más antiguo por last_execution primero.

import { Injectable, Inject, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ManagementCtrlFiledDemand } from '@domain/entities/managementCtrlFiledDemand.entities';
import { AutomationEmail } from '@domain/entities/automationEmail.entities';
import {
  MANAGEMENT_CTRL_FILED_DEMAND_REPOSITORY,
  ManagementCtrlFiledDemandRepository,
} from '@domain/ports/managementCtrlFiledDemand.ports';
import {
  AUTOMATION_EMAIL_REPOSITORY,
  AutomationEmailRepository,
} from '@domain/ports/automationEmail.ports';
import { DATABASES_REPOSITORY, DataBasesRepository } from '@domain/ports/dataBases.ports';
import type { Phase1Params, Phase2Params, Phase3Params } from '@domain/ports/portalQueries.ports';
import { PortalQueriesAutomationService } from './portalQueriesAutomation.service';
import { EmailInboxAutomationService } from './emailInboxAutomation.service';
import { BotControlService } from './botControl.service';
import { AppLogger } from '@infrastructure/logging/appLogger.service';

const THREE_WEEKS_MS = 21 * 24 * 60 * 60 * 1000;
const FILING_NUMBER_MIN_LENGTH = 23;

@Injectable()
export class CartPropiasManagementCycleService implements OnModuleInit, OnModuleDestroy {
  private stopped = false;
  private isLoopRunning = false;

  constructor(
    @Inject(MANAGEMENT_CTRL_FILED_DEMAND_REPOSITORY)
    private readonly mcfdRepository: ManagementCtrlFiledDemandRepository,
    @Inject(AUTOMATION_EMAIL_REPOSITORY)
    private readonly automationEmailRepository: AutomationEmailRepository,
    @Inject(DATABASES_REPOSITORY)
    private readonly dataBasesRepository: DataBasesRepository,
    private readonly portalService: PortalQueriesAutomationService,
    private readonly emailInboxAutomationService: EmailInboxAutomationService,
    private readonly botControlService: BotControlService,
    private readonly configService: ConfigService,
    private readonly appLogger: AppLogger,
  ) {}

  onModuleInit(): void {
    if (this.botControlService.isRunning()) {
      this.appLogger.structured({
        level: 'log',
        context: CartPropiasManagementCycleService.name,
        type: 'CART_PROPIAS_CYCLE',
        status: 'OK',
        message: 'Bot marcado como activo al arrancar — reanudando ciclo de gestión automáticamente.',
      });
      setImmediate(() => void this.tick());
    }
  }

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

  // ─── Main loop ─────────────────────────────────────────────────────────────

  private async runLoop(): Promise<void> {
    const idleMs = this.getIdleSleepSec() * 1000;
    const betweenMs = this.getBetweenDemandsSec() * 1000;

    while (!this.stopped && this.botControlService.isRunning()) {
      try {
        const check = await this.botControlService.checkRuntimeConditions();
        if (!check.ok) {
          this.appLogger.structured({
            level: 'debug',
            context: CartPropiasManagementCycleService.name,
            type: 'CART_PROPIAS_CYCLE',
            status: 'Info',
            message: `Ciclo en espera: ${check.reason ?? 'Fuera de condiciones de ejecución'}`,
            meta: { reason: check.reason },
          });
          await this.sleep(idleMs);
          continue;
        }

        const currentDataBasesId = this.botControlService.getCurrentDataBasesId();
        if (!currentDataBasesId) {
          this.appLogger.structured({
            level: 'debug',
            context: CartPropiasManagementCycleService.name,
            type: 'CART_PROPIAS_CYCLE',
            status: 'Info',
            message: 'Ciclo en espera: no hay data_bases seleccionada.',
          });
          await this.sleep(idleMs);
          continue;
        }

        let dbRecord: Awaited<ReturnType<DataBasesRepository['findById']>>;
        try {
          dbRecord = await this.dataBasesRepository.findById(currentDataBasesId);
        } catch {
          this.appLogger.structured({
            level: 'warn',
            context: CartPropiasManagementCycleService.name,
            type: 'CART_PROPIAS_CYCLE',
            status: 'Warning',
            message: 'Ciclo en espera: no se pudo cargar la configuración data_bases.',
            meta: { currentDataBasesId },
          });
          await this.sleep(idleMs);
          continue;
        }

        const portfolioState = dbRecord.portfolio_state_type_name?.trim().toLowerCase();
        if (!portfolioState || portfolioState !== 'active') {
          this.appLogger.structured({
            level: 'debug',
            context: CartPropiasManagementCycleService.name,
            type: 'CART_PROPIAS_CYCLE',
            status: 'Info',
            message: 'Ciclo en espera: la cartera no está activa.',
            meta: { portfolio_state_type_name: dbRecord.portfolio_state_type_name ?? null, currentDataBasesId },
          });
          await this.sleep(idleMs);
          continue;
        }

        const processed = await this.processNext(dbRecord.db_portfolio_type_id);
        if (!processed) {
          this.appLogger.structured({
            level: 'debug',
            context: CartPropiasManagementCycleService.name,
            type: 'CART_PROPIAS_CYCLE',
            status: 'Info',
            message: 'Sin registros accionables en este ciclo. En espera.',
            meta: { portfolioTypeId: dbRecord.db_portfolio_type_id, idleSec: this.getIdleSleepSec() },
          });
        }
        await this.sleep(processed ? betweenMs : idleMs);
      } catch (err) {
        this.appLogger.structured({
          level: 'error',
          context: CartPropiasManagementCycleService.name,
          type: 'CART_PROPIAS_CYCLE',
          status: 'Error',
          message: 'Error inesperado en ciclo de gestión.',
          meta: { error: (err as Error).message },
          stack: (err as Error).stack,
        });
        await this.sleep(this.getIdleSleepSec() * 1000);
      }
    }
  }

  // ─── Process one record (email + portal según estado) ─────────────────────

  async processNext(portfolioTypeId: number): Promise<boolean> {
    let record = await this.mcfdRepository.findNextForManagement(portfolioTypeId);
    if (!record) return false;

    if (record.mcfd_data_courts && record.mcfd_name_data_base) {
      try {
        const courtRows = await this.dataBasesRepository.runQueryOnBase(
          record.mcfd_name_data_base,
          `SELECT department, city, name FROM \`${record.mcfd_name_data_base}\`.data_courts WHERE id = ? LIMIT 1`,
          [record.mcfd_data_courts],
        );
        if (courtRows?.[0]) {
          const cr = courtRows[0] as Record<string, unknown>;
          record = {
            ...record,
            court_department: String(cr.department ?? '').trim() || null,
            court_city: String(cr.city ?? '').trim() || null,
            court_name: String(cr.name ?? '').trim() || null,
          };
        }
      } catch {
        // court fields remain null; portal phase uses autm values as primary source
      }
    }


    const now = new Date();

    this.appLogger.structured({
      level: 'debug',
      context: CartPropiasManagementCycleService.name,
      type: 'CART_PROPIAS_CYCLE',
      status: 'Info',
      message: 'Procesando registro en ciclo de gestión.',
      meta: {
        mcfd_id: record.mcfd_id,
        mcfd_management_status: record.mcfd_management_status,
        mcfd_data_courts: record.mcfd_data_courts ?? null,
        court_department: record.court_department ?? null,
        court_city: record.court_city ?? null,
        court_name: record.court_name ?? null,
      },
    });

    // Marcar inmediatamente como "En proceso" al tomar el registro — solo DB, no la variable
    // local para que el enrutamiento por estado original (Abierto, Correo Automatizado, etc.)
    // siga funcionando correctamente en los checks de needsEmailPhase / readyForPortal.
    await this.mcfdRepository.update({
      ...record,
      mcfd_management_status: 'En proceso',
      mcfd_detail: 'Registro tomado por el bot para gestión',
      mcfd_updated_at: now,
    });

    // Control de antigüedad >3 semanas
    const createdAt = record.mcfd_created_at instanceof Date
      ? record.mcfd_created_at
      : new Date(record.mcfd_created_at);

    if (now.getTime() - createdAt.getTime() > THREE_WEEKS_MS) {
      await this.mcfdRepository.update({
        ...record,
        mcfd_last_execution: now,
        mcfd_retries: (record.mcfd_retries ?? 0) + 1,
        mcfd_management_status: 'Para control manual',
        mcfd_detail: 'Demanda pendiente por procesar radicado manualmente',
        mcfd_updated_at: now,
      });
      return true;
    }

    // Pre-check: Fase 2 con datos directos de BD (antes del flujo de correo/portal).
    // Si encuentra el radicado aquí se cierra el ciclo sin pasar por email ni las demás fases.
    // Si no encuentra (not_found) o hay múltiples sin desambiguar, continúa el flujo normal.
    // Si el portal está caído (portal_down) el registro ya quedó en 'Novedad portal'.
    const preCheck = await this.runPhase2PreCheck(record, now);
    if (preCheck !== 'not_found') return true;

    // Enrutamiento según estado
    // Abierto siempre pasa por email (independiente de si ya tiene email_id: corrige inconsistencias).
    // Novedad correo / En proceso pasan por email solo si aún no tienen email_id.
    const needsEmailPhase =
      record.mcfd_management_status === 'Abierto' ||
      (['Novedad correo', 'En proceso'].includes(record.mcfd_management_status) && !record.mcfd_automation_email_id);

    let currentRecord = record;

    if (needsEmailPhase) {
      currentRecord = await this.runEmailPhase(record, now);

      if (currentRecord.mcfd_management_status !== 'Correo Automatizado') {
        return true;
      }
    }

    // Fase portal
    const readyForPortal =
      currentRecord.mcfd_management_status === 'Correo Automatizado' ||
      currentRecord.mcfd_management_status === 'Novedad portal' ||
      (currentRecord.mcfd_management_status === 'En proceso' && !!currentRecord.mcfd_automation_email_id);

    if (readyForPortal) {
      // Intentar Fase 2 (NombreRazonSocial) con datos del correo antes del ciclo completo.
      // Si resuelve → caso concluido. Si portal caído → Novedad portal.
      // Si no encuentra → cae al ciclo completo (Fase 1 → 2 → 3) que es el flujo anterior.
      const p2EmailResult = await this.runPhase2WithEmailData(currentRecord, new Date());
      if (p2EmailResult !== 'not_found') return true;

      await this.runPortalPhases(currentRecord, new Date());
      return true;
    }

    // Red de seguridad: estado no accionable → corregir y avanzar al siguiente
    const correctedStatus = record.mcfd_automation_email_id ? 'Correo Automatizado' : 'Novedad correo';
    this.appLogger.structured({
      level: 'warn',
      context: CartPropiasManagementCycleService.name,
      type: 'CART_PROPIAS_CYCLE',
      status: 'Warning',
      message: `Estado no accionable '${record.mcfd_management_status}' corregido a '${correctedStatus}'.`,
      meta: { mcfd_id: record.mcfd_id, from: record.mcfd_management_status, to: correctedStatus },
    });
    await this.mcfdRepository.update({
      ...record,
      mcfd_last_execution: now,
      mcfd_retries: (record.mcfd_retries ?? 0) + 1,
      mcfd_management_status: correctedStatus,
      mcfd_detail: `Estado inconsistente corregido automáticamente desde '${record.mcfd_management_status}'`,
      mcfd_updated_at: now,
    });
    return true;
  }

  // ─── Email phase ───────────────────────────────────────────────────────────

  private async runEmailPhase(
    record: ManagementCtrlFiledDemand,
    now: Date,
  ): Promise<ManagementCtrlFiledDemand> {
    await this.mcfdRepository.update({
      ...record,
      mcfd_management_status: 'En proceso',
      mcfd_detail: 'Iniciando automatización de correo',
      mcfd_updated_at: now,
    });

    let identification: string | null = null;
    try {
      const rows = await this.dataBasesRepository.runQueryOnBase(
        record.mcfd_name_data_base,
        `SELECT identification FROM \`${record.mcfd_name_data_base}\`.clients WHERE id = ? LIMIT 1`,
        [record.mcfd_client_id],
      );
      if (rows?.[0]) {
        identification = String((rows[0] as Record<string, unknown>).identification ?? '').trim() || null;
      }
    } catch (err) {
      this.appLogger.structured({
        level: 'warn',
        context: CartPropiasManagementCycleService.name,
        type: 'CART_PROPIAS_CYCLE',
        status: 'Warning',
        message: 'No se pudo obtener identification del cliente desde BD externa.',
        meta: { mcfd_id: record.mcfd_id, error: (err as Error).message },
      });
    }

    if (!identification) {
      const updated: ManagementCtrlFiledDemand = {
        ...record,
        mcfd_last_execution: now,
        mcfd_retries: (record.mcfd_retries ?? 0) + 1,
        mcfd_management_status: 'Novedad correo',
        mcfd_detail: 'No se encontró identificación del cliente en BD externa',
        mcfd_updated_at: now,
      };
      await this.mcfdRepository.update(updated);
      return updated;
    }

    const result = await this.emailInboxAutomationService.processEmailForRecord(record, identification);

    const updated: ManagementCtrlFiledDemand = {
      ...record,
      mcfd_automation_email_id: result.autmId ?? record.mcfd_automation_email_id,
      mcfd_last_execution: now,
      mcfd_retries: (record.mcfd_retries ?? 0) + 1,
      mcfd_management_status: result.managementStatus,
      mcfd_detail: result.detail,
      mcfd_updated_at: now,
    };
    await this.mcfdRepository.update(updated);
    return updated;
  }

  // ─── Portal phases (1 → 2 → 3) ────────────────────────────────────────────

  private async runPortalPhases(record: ManagementCtrlFiledDemand, now: Date): Promise<void> {
    if (!record.mcfd_automation_email_id) {
      await this.mcfdRepository.update({
        ...record,
        mcfd_last_execution: now,
        mcfd_retries: (record.mcfd_retries ?? 0) + 1,
        mcfd_management_status: 'Novedad correo',
        mcfd_detail: 'Sin correo asociado; se debe reintentar desde correo',
        mcfd_updated_at: now,
      });
      return;
    }

    // Control de antigüedad antes de procesar portal
    const createdAt = record.mcfd_created_at instanceof Date
      ? record.mcfd_created_at
      : new Date(record.mcfd_created_at);
    if (now.getTime() - createdAt.getTime() > THREE_WEEKS_MS) {
      await this.mcfdRepository.update({
        ...record,
        mcfd_last_execution: now,
        mcfd_retries: (record.mcfd_retries ?? 0) + 1,
        mcfd_management_status: 'Para control manual',
        mcfd_detail: 'Demanda pendiente por procesar radicado manualmente',
        mcfd_updated_at: now,
      });
      return;
    }

    let autmEmail: AutomationEmail;
    try {
      autmEmail = await this.automationEmailRepository.findById(record.mcfd_automation_email_id);
    } catch {
      await this.mcfdRepository.update({
        ...record,
        mcfd_last_execution: now,
        mcfd_retries: (record.mcfd_retries ?? 0) + 1,
        mcfd_management_status: 'Novedad correo',
        mcfd_detail: 'Correo asociado no encontrado en BD; se debe reintentar',
        mcfd_updated_at: now,
      });
      return;
    }

    // Marcar como "En proceso" al iniciar automatización del portal
    let wr: ManagementCtrlFiledDemand = {
      ...record,
      mcfd_management_status: 'En proceso',
      mcfd_detail: 'Iniciando automatización del portal de consultas',
      mcfd_updated_at: now,
    };
    await this.mcfdRepository.update(wr);

    // companyName se resuelve una sola vez: lo usan Fase 1 (validar demandante)
    // y Fase 2 (desambiguar múltiples resultados).
    const companyName = await this.fetchCompanyName(record.mcfd_name_data_base, record.mcfd_lawsuit_id);

    // Fase 1: por número de radicado (solo si autm_number_filed tiene valor)
    const hasFilingNumber =
      autmEmail.autm_number_filed &&
      autmEmail.autm_number_filed !== '-' &&
      autmEmail.autm_number_filed.trim() !== '';

    if (hasFilingNumber) {
      const p1 = await this.portalService.runPhase1({
        filingNumber: autmEmail.autm_number_filed!,
        companyName: companyName ?? '-',
      });

      if (!p1.available) {
        await this.updateNovedadPortal(wr, now, p1.errorDetail ?? 'Portal no disponible en fase 1');
        return;
      }

      if (p1.found && p1.filingNumber?.trim() === autmEmail.autm_number_filed?.trim()) {
        const updated = await this.applyFoundResult(wr, now, p1,
          'Radicado encontrado', 'Radicado consultado y automatizado correctamente /NumeroRadicacion');
        const endOk = await this.runEndCycle(updated);
        if (!endOk) {
          await this.mcfdRepository.update({
            ...updated,
            mcfd_management_status: 'Correo Automatizado',
            mcfd_detail: 'Error al actualizar BD externa; se reintentará en el próximo ciclo',
            mcfd_updated_at: new Date(),
          });
        }
        return;
      }

      // Fase 1 no encontró coincidencia → dejar En proceso, registrar en detalle y continuar
      wr = {
        ...wr,
        mcfd_detail: 'Radicado no visible en Fase 1 (/NumeroRadicacion), consultando por nombre (Fase 2)',
        mcfd_updated_at: now,
      };
      await this.mcfdRepository.update(wr);
    }

    // Fase 2: por nombre
    // departament/city: usa valor del correo; si vacío usa data_courts como fallback.
    const p2Params: Phase2Params = {
      naturalPerson: autmEmail.autm_natural_person ?? '-',
      departament: this.firstValid(autmEmail.autm_departament, record.court_department),
      city: this.firstValid(autmEmail.autm_city, record.court_city),
      courtName: record.court_name ?? '-',
      companyName: companyName ?? '-',
    };

    const naturalPersonOk =
      p2Params.naturalPerson && p2Params.naturalPerson !== '-' && p2Params.naturalPerson.trim() !== '';

    if (naturalPersonOk) {
      const p2 = await this.portalService.runPhase2(p2Params);

      if (!p2.available) {
        await this.updateNovedadPortal(wr, now, p2.errorDetail ?? 'Portal no disponible en fase 2');
        return;
      }
      if (p2.multipleResults) {
        await this.mcfdRepository.update({
          ...wr,
          mcfd_last_execution: now,
          mcfd_retries: (wr.mcfd_retries ?? 0) + 1,
          mcfd_management_status: 'Para control manual',
          mcfd_detail: 'Cliente con mas de una demanda en el portal; se debe consultar manualmente',
          mcfd_updated_at: now,
        });
        return;
      }
      if (p2.found) {
        const updated = await this.applyFoundResult(wr, now, p2,
          'Radicado encontrado', 'Radicado consultado y automatizado correctamente /NombreRazonSocial');
        const endOk = await this.runEndCycle(updated);
        if (!endOk) {
          await this.mcfdRepository.update({
            ...updated,
            mcfd_management_status: 'Correo Automatizado',
            mcfd_detail: 'Error al actualizar BD externa; se reintentará en el próximo ciclo',
            mcfd_updated_at: new Date(),
          });
        }
        return;
      }

      // Fase 2 no encontró → dejar En proceso, registrar en detalle y continuar a Fase 3
      wr = {
        ...wr,
        mcfd_detail: 'Radicado no visible en Fases 1-2 (/NombreRazonSocial), construyendo número (Fase 3)',
        mcfd_updated_at: now,
      };
      await this.mcfdRepository.update(wr);
    }

    // Fase 3: validar campos requeridos antes de construir el número de radicado
    const p3RequiredFields: [string, string | null | undefined][] = [
      ['autm_departament', autmEmail.autm_departament],
      ['autm_city', autmEmail.autm_city],
      ['autm_locality', autmEmail.autm_locality],
      ['autm_court_name', autmEmail.autm_court_name],
      ['autm_specialty', autmEmail.autm_specialty],
      ['autm_office_name', autmEmail.autm_office_name],
      ['autm_year', autmEmail.autm_year],
      ['autm_process_code', autmEmail.autm_process_code],
      ['autm_resource_process', autmEmail.autm_resource_process],
    ];
    const p3Missing = p3RequiredFields
      .filter(([, v]) => !v || v.trim() === '' || v.trim() === '-')
      .map(([k]) => k);
    if (p3Missing.length > 0) {
      await this.updateNovedadPortal(
        wr,
        now,
        'No se puede construir el numero de radicado porque no se garantizan los valores de la fase 3',
      );
      return;
    }

    // Fase 3: construir número de radicado
    const p3Params: Phase3Params = {
      departament: autmEmail.autm_departament!,
      city: autmEmail.autm_city!,
      locality: autmEmail.autm_locality!,
      courtName: autmEmail.autm_court_name!,
      specialty: autmEmail.autm_specialty!,
      officeName: autmEmail.autm_office_name!,
      year: autmEmail.autm_year!,
      processCode: autmEmail.autm_process_code!,
      processResource: autmEmail.autm_resource_process!,
    };

    const p3 = await this.portalService.runPhase3(p3Params);

    if (!p3.available) {
      await this.updateNovedadPortal(wr, now, p3.errorDetail ?? 'Portal no disponible en fase 3');
      return;
    }
    if (p3.multipleResults) {
      await this.mcfdRepository.update({
        ...wr,
        mcfd_last_execution: now,
        mcfd_retries: (wr.mcfd_retries ?? 0) + 1,
        mcfd_management_status: 'Para control manual',
        mcfd_detail: 'Cliente con mas de una demanda en el portal; se debe consultar manualmente',
        mcfd_updated_at: now,
      });
      return;
    }
    if (p3.found) {
      const updated = await this.applyFoundResult(wr, now, p3,
        'Radicado construido', 'Radicado construido y automatizado correctamente /ConstruirNumeroRadicacion');
      const endOk = await this.runEndCycle(updated);
      if (!endOk) {
        await this.mcfdRepository.update({
          ...updated,
          mcfd_management_status: 'Correo Automatizado',
          mcfd_detail: 'Error al actualizar BD externa; se reintentará en el próximo ciclo',
          mcfd_updated_at: new Date(),
        });
      }
      return;
    }

    await this.mcfdRepository.update({
      ...wr,
      mcfd_last_execution: now,
      mcfd_retries: (wr.mcfd_retries ?? 0) + 1,
      mcfd_management_status: 'Radicado no visible',
      mcfd_detail: 'No encuentra radicado en portal; se debe construir radicado automaticamente /ConstruirNumeroRadicacion',
      mcfd_updated_at: now,
    });
  }

  // ─── End cycle ─────────────────────────────────────────────────────────────

  private async runEndCycle(record: ManagementCtrlFiledDemand): Promise<boolean> {
    if (
      !record.mcfd_number_filed ||
      record.mcfd_number_filed.length < FILING_NUMBER_MIN_LENGTH ||
      (record.mcfd_management_status !== 'Radicado encontrado' &&
        record.mcfd_management_status !== 'Radicado construido')
    ) {
      return true;
    }

    const base = record.mcfd_name_data_base;
    try {
      await this.dataBasesRepository.runQueryOnBase(
        base,
        `UPDATE \`${base}\`.lawsuits_filings
           SET filing_number = ?, filing_date = ?, updater_user = ?, comments = ?
         WHERE id = ?`,
        [
          record.mcfd_number_filed,
          record.mcfd_filing_date ? this.toDateStr(record.mcfd_filing_date) : null,
          record.mcfd_responsible,
          record.mcfd_detail,
          record.mcfd_lawsuits_filings_id,
        ],
      );
      await this.dataBasesRepository.runQueryOnBase(
        base,
        `UPDATE \`${base}\`.lawsuits SET lawsuit_status = 'Radicada', user_id = 1, user_name = ? WHERE id = ?`,
        [record.mcfd_responsible, record.mcfd_lawsuit_id],
      );
      this.appLogger.structured({
        level: 'log',
        context: CartPropiasManagementCycleService.name,
        type: 'CART_PROPIAS_CYCLE',
        status: 'Success',
        message: 'Ciclo completado: lawsuits_filings y lawsuits actualizados.',
        meta: { mcfd_id: record.mcfd_id, mcfd_number_filed: record.mcfd_number_filed },
      });
      return true;
    } catch (err) {
      this.appLogger.structured({
        level: 'warn',
        context: CartPropiasManagementCycleService.name,
        type: 'CART_PROPIAS_CYCLE',
        status: 'Warning',
        message: 'Error al actualizar BD externa en cierre de ciclo. Se reintentará vía Correo Automatizado.',
        meta: { mcfd_id: record.mcfd_id, error: (err as Error).message },
      });
      return false;
    }
  }

  // ─── Helpers de actualización ──────────────────────────────────────────────

  private async applyFoundResult(
    record: ManagementCtrlFiledDemand,
    now: Date,
    result: { filingNumber?: string; filingDate?: string; filingDateAction?: string },
    status: string,
    detail: string,
  ): Promise<ManagementCtrlFiledDemand> {
    const updated: ManagementCtrlFiledDemand = {
      ...record,
      mcfd_number_filed: result.filingNumber ?? record.mcfd_number_filed,
      mcfd_filing_date: result.filingDate ? new Date(result.filingDate) : record.mcfd_filing_date,
      mcfd_filing_date_action: result.filingDateAction
        ? new Date(result.filingDateAction)
        : record.mcfd_filing_date_action,
      mcfd_last_execution: now,
      mcfd_retries: (record.mcfd_retries ?? 0) + 1,
      mcfd_management_status: status,
      mcfd_detail: detail,
      mcfd_updated_at: now,
    };
    await this.mcfdRepository.update(updated);
    return updated;
  }

  private async updateNovedadPortal(
    record: ManagementCtrlFiledDemand,
    now: Date,
    detail: string,
  ): Promise<void> {
    await this.mcfdRepository.update({
      ...record,
      mcfd_last_execution: now,
      mcfd_retries: (record.mcfd_retries ?? 0) + 1,
      mcfd_management_status: 'Novedad portal',
      mcfd_detail: detail,
      mcfd_updated_at: now,
    });
  }

  /** Retorna el primer valor no vacío de la lista, o '-' si ninguno tiene valor. */
  private firstValid(...values: (string | null | undefined)[]): string {
    for (const v of values) {
      if (v && v.trim() !== '' && v.trim() !== '-') return v.trim();
    }
    return '-';
  }

  private toDateStr(d: Date | null): string | null {
    if (!d) return null;
    const dt = d instanceof Date ? d : new Date(d);
    return isNaN(dt.getTime()) ? null : dt.toISOString().slice(0, 10);
  }

  // ─── Fase 2 con datos del correo (NombreRazonSocial — paso previo al ciclo completo) ─────

  /**
   * Intenta Fase 2 (NombreRazonSocial) usando los datos del correo automatizado.
   * Se ejecuta DESPUÉS de obtener el correo y ANTES del ciclo completo de portal (Fases 1/2/3).
   * - found       → cierra el ciclo (runEndCycle).
   * - portal_down → deja Novedad portal; el ciclo completo NO se ejecuta este turno.
   * - not_found   → retorna 'not_found' para que processNext llame a runPortalPhases.
   */
  private async runPhase2WithEmailData(
    record: ManagementCtrlFiledDemand,
    now: Date,
  ): Promise<'found' | 'portal_down' | 'not_found'> {
    if (!record.mcfd_automation_email_id) return 'not_found';

    let autmEmail: AutomationEmail;
    try {
      autmEmail = await this.automationEmailRepository.findById(record.mcfd_automation_email_id);
    } catch {
      return 'not_found';
    }

    const naturalPerson = autmEmail.autm_natural_person;
    if (!naturalPerson || naturalPerson === '-' || naturalPerson.trim() === '') {
      return 'not_found';
    }

    const companyName = await this.fetchCompanyName(record.mcfd_name_data_base, record.mcfd_lawsuit_id);
    const p2Params: Phase2Params = {
      naturalPerson,
      departament: this.firstValid(autmEmail.autm_departament, record.court_department),
      city: this.firstValid(autmEmail.autm_city, record.court_city),
      courtName: record.court_name ?? '-',
      companyName: companyName ?? '-',
    };

    this.appLogger.structured({
      level: 'debug',
      context: CartPropiasManagementCycleService.name,
      type: 'CART_PROPIAS_CYCLE',
      status: 'Info',
      message: 'Ejecutando Fase 2 con datos del correo (NombreRazonSocial).',
      meta: {
        mcfd_id: record.mcfd_id,
        naturalPerson: p2Params.naturalPerson,
        departament: p2Params.departament,
        city: p2Params.city,
        companyName: companyName ?? null,
      },
    });

    // Marcar "En proceso" antes de la consulta al portal (puede tardar 30+ seg)
    await this.mcfdRepository.update({
      ...record,
      mcfd_management_status: 'En proceso',
      mcfd_detail: 'Consultando portal de procesos con datos del correo (fase 2)',
      mcfd_updated_at: now,
    });

    const p2 = await this.portalService.runPhase2(p2Params);

    if (!p2.available) {
      await this.updateNovedadPortal(record, now, p2.errorDetail ?? 'Portal no disponible en Fase 2 (correo)');
      return 'portal_down';
    }

    if (p2.found) {
      const updated = await this.applyFoundResult(
        record, now, p2,
        'Radicado encontrado',
        'Radicado consultado y automatizado correctamente /NombreRazonSocial (correo)',
      );
      const endOk = await this.runEndCycle(updated);
      if (!endOk) {
        await this.mcfdRepository.update({
          ...updated,
          mcfd_management_status: 'Correo Automatizado',
          mcfd_detail: 'Error al actualizar BD externa; se reintentará en el próximo ciclo',
          mcfd_updated_at: new Date(),
        });
      }
      return 'found';
    }

    return 'not_found';
  }

  // ─── Pre-check Fase 2 (datos directos de BD, sin correo) ──────────────────

  /**
   * Intenta la Fase 2 del portal usando datos directos de la BD externa:
   *   - naturalPerson: clients.first_name + second_name? + first_last_name + second_last_name?
   *   - departament / city: lawsuit_court_assignments → v_cities
   * Si encuentra el radicado cierra el ciclo. Si no, retorna 'not_found' para que el flujo
   * normal continúe (email → portal fases 1/2/3).
   */
  private async runPhase2PreCheck(
    record: ManagementCtrlFiledDemand,
    now: Date,
  ): Promise<'found' | 'portal_down' | 'not_found'> {
    const clientData = await this.fetchClientLocationData(record);

    if (!clientData.naturalPerson || clientData.naturalPerson === '-') {
      this.appLogger.structured({
        level: 'debug',
        context: CartPropiasManagementCycleService.name,
        type: 'CART_PROPIAS_CYCLE',
        status: 'Info',
        message: 'Pre-check Fase 2 omitido: no se pudo obtener nombre del cliente.',
        meta: { mcfd_id: record.mcfd_id },
      });
      return 'not_found';
    }

    const companyName = await this.fetchCompanyName(record.mcfd_name_data_base, record.mcfd_lawsuit_id);

    const p2Params: Phase2Params = {
      naturalPerson: clientData.naturalPerson,
      departament: clientData.departament,
      city: clientData.city,
      courtName: record.court_name ?? '-',
      companyName: companyName ?? '-',
    };

    this.appLogger.structured({
      level: 'debug',
      context: CartPropiasManagementCycleService.name,
      type: 'CART_PROPIAS_CYCLE',
      status: 'Info',
      message: 'Ejecutando pre-check Fase 2 con datos directos de BD.',
      meta: {
        mcfd_id: record.mcfd_id,
        naturalPerson: clientData.naturalPerson,
        departament: clientData.departament,
        city: clientData.city,
        companyName: companyName ?? null,
      },
    });

    const p2 = await this.portalService.runPhase2(p2Params);

    if (!p2.available) {
      await this.updateNovedadPortal(record, now, p2.errorDetail ?? 'Portal no disponible en pre-check Fase 2');
      return 'portal_down';
    }

    if (p2.found) {
      const updated = await this.applyFoundResult(
        record, now, p2,
        'Radicado encontrado',
        'Radicado consultado y automatizado correctamente /NombreRazonSocial (datos BD)',
      );
      const endOk = await this.runEndCycle(updated);
      if (!endOk) {
        await this.mcfdRepository.update({
          ...updated,
          mcfd_management_status: record.mcfd_automation_email_id ? 'Correo Automatizado' : 'Abierto',
          mcfd_detail: 'Error al actualizar BD externa tras pre-check; se reintentará en el próximo ciclo',
          mcfd_updated_at: new Date(),
        });
      }
      return 'found';
    }

    if (p2.multipleResults) {
      await this.mcfdRepository.update({
        ...record,
        mcfd_last_execution: now,
        mcfd_retries: (record.mcfd_retries ?? 0) + 1,
        mcfd_management_status: 'Para control manual',
        mcfd_detail: 'Se han encontrado varios registros con el mismo nombre o razón social. Por favor consulte todos sus procesos.',
        mcfd_updated_at: now,
      });
      return 'found';
    }

    // Sin resultados → continúa al flujo principal (correo → fases portal)
    return 'not_found';
  }

  /**
   * Obtiene nombre del cliente desde la BD externa y ubicación del juzgado desde el record
   * (court_department / court_city ya fueron resueltos en processNext vía data_courts).
   * Fuente nombre: clients.first_name + second_name? + first_last_name + second_last_name?
   */
  private async fetchClientLocationData(
    record: ManagementCtrlFiledDemand,
  ): Promise<{ naturalPerson: string; departament: string; city: string }> {
    let naturalPerson = '-';

    try {
      const clientRows = await this.dataBasesRepository.runQueryOnBase(
        record.mcfd_name_data_base,
        `SELECT first_name, second_name, first_last_name, second_last_name
         FROM \`${record.mcfd_name_data_base}\`.clients
         WHERE id = ? LIMIT 1`,
        [record.mcfd_client_id],
      );
      if (clientRows?.[0]) {
        const c = clientRows[0] as Record<string, unknown>;
        const parts = [
          String(c.first_name ?? '').trim(),
          String(c.second_name ?? '').trim(),
          String(c.first_last_name ?? '').trim(),
          String(c.second_last_name ?? '').trim(),
        ].filter((p) => p.length > 0);
        naturalPerson = parts.join(' ') || '-';
      }
    } catch (err) {
      this.appLogger.structured({
        level: 'warn',
        context: CartPropiasManagementCycleService.name,
        type: 'CART_PROPIAS_CYCLE',
        status: 'Warning',
        message: 'No se pudo obtener nombre del cliente para pre-check Fase 2.',
        meta: { mcfd_id: record.mcfd_id, error: (err as Error).message },
      });
    }

    return {
      naturalPerson,
      departament: record.court_department ?? '-',
      city: record.court_city ?? '-',
    };
  }

  // ─── Company name lookup (Fase 2 multi-resultado) ─────────────────────────

  /**
   * Obtiene el nombre de empresa para el filtro Fase 2.
   * Flujo: lawsuits.id → campaign_id → campaigns.format → lookup en env var.
   * COMPANY_NAMES_PORTFOLIO_PROPIAS formato: "1:CONTACTO SOLUTIONS,2:NOVARTEC"
   * Si campaigns.format = "1" → retorna "CONTACTO SOLUTIONS", etc.
   * Retorna '' si no se puede resolver (el filtro queda desactivado).
   */
  private async fetchCompanyName(baseName: string, lawsuitId: number): Promise<string> {
    try {
      const rows = await this.dataBasesRepository.runQueryOnBase(
        baseName,
        `SELECT c.format
         FROM \`${baseName}\`.lawsuits l
         INNER JOIN \`${baseName}\`.campaigns c ON c.id = l.campaign_id
         WHERE l.id = ? LIMIT 1`,
        [lawsuitId],
      );
      if (!rows?.[0]) return '';
      const format = String((rows[0] as Record<string, unknown>).format ?? '').trim();
      if (!format) return '';

      const raw = this.configService.get<string>('COMPANY_NAMES_PORTFOLIO_PROPIAS', '');
      for (const entry of raw.split(',')) {
        const colonIdx = entry.indexOf(':');
        if (colonIdx === -1) continue;
        const key = entry.slice(0, colonIdx).trim();
        const name = entry.slice(colonIdx + 1).trim();
        if (key === format && name) return name;
      }
      return '';
    } catch {
      return '';
    }
  }

  // ─── Config ────────────────────────────────────────────────────────────────

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
