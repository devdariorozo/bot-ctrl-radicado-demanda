import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ManagementDemandsOnline } from '@domain/entities/managementDemandsOnline.entities';
import {
  MANAGEMENT_DEMANDS_ONLINE_REPOSITORY,
  ManagementDemandsOnlineRepository,
} from '@domain/ports/managementDemandsOnline.ports';
import {
  PORTFOLIO_CITY_CONFIG_REPOSITORY,
  PortfolioCityConfigRepository,
} from '@domain/ports/portfolioCityConfig.ports';
import { AMOUNT_TYPE_REPOSITORY, AmountTypeRepository } from '@domain/ports/amountType.ports';
import { BROWSER_AUTOMATION_PORT, BrowserAutomationPort } from '@domain/ports/browserAutomation.ports';
import { BotControlService } from './botControl.service';
import { DataBasesService } from './dataBases.service';
import { AppLogger } from '@infrastructure/logging/appLogger.service';
import { DATABASES_REPOSITORY, DataBasesRepository } from '@domain/ports/dataBases.ports';
import { COMPANY_TYPE_REPOSITORY, CompanyTypeRepository } from '@domain/ports/companyType.ports';
import {
  LAWYER_DATA_REPOSITORY,
  LawyerDataRepository,
} from '@domain/ports/lawyerData.ports';

@Injectable()
export class DemandsOnlineAutomationService {
  private currentRunning = 0;
  private readonly maxConcurrent: number;

  constructor(
    @Inject(MANAGEMENT_DEMANDS_ONLINE_REPOSITORY)
    private readonly managementDemandsOnlineRepository: ManagementDemandsOnlineRepository,
    @Inject(PORTFOLIO_CITY_CONFIG_REPOSITORY)
    private readonly portfolioCityConfigRepository: PortfolioCityConfigRepository,
    @Inject(AMOUNT_TYPE_REPOSITORY)
    private readonly amountTypeRepository: AmountTypeRepository,
    @Inject(BROWSER_AUTOMATION_PORT)
    private readonly browserAutomationPort: BrowserAutomationPort,
    @Inject(DATABASES_REPOSITORY)
    private readonly dataBasesRepository: DataBasesRepository,
    @Inject(COMPANY_TYPE_REPOSITORY)
    private readonly companyTypeRepository: CompanyTypeRepository,
    @Inject(LAWYER_DATA_REPOSITORY)
    private readonly lawyerDataRepository: LawyerDataRepository,
    private readonly botControlService: BotControlService,
    private readonly dataBasesService: DataBasesService,
    private readonly appLogger: AppLogger,
    private readonly configService: ConfigService,
  ) {
    const v = this.configService.get<number>('BROWSERLESS_CONCURRENT_BROWSERS', 1);
    const n = Number(v);
    this.maxConcurrent = Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
  }

  private async resolveDemandadoForDemanda(
    demanda: ManagementDemandsOnline,
  ): Promise<
    | {
        document_type_name: string;
        identification: string;
        first_name: string;
        second_name: string;
        first_last_name: string;
        second_last_name: string;
        completed_name: string;
        address: string;
        phone: string;
      }
    | null
  > {
    const baseName = demanda.name_data_base;
    const clientId = demanda.client_id;
    const lawsuitCourtAssignmentsId = demanda.lawsuit_court_assignments_id;

    if (!baseName || !clientId || !lawsuitCourtAssignmentsId) {
      return null;
    }

    const sql = `
      SELECT
        c.identification AS identification,
        c.first_name AS first_name,
        c.second_name AS second_name,
        c.first_last_name AS first_last_name,
        c.second_last_name AS second_last_name,
        c.completed_name AS completed_name,
        'Cédula de Ciudadanía' AS document_type_name,
        lca.client_address AS address,
        (
          SELECT p.telephone
          FROM \`${baseName}\`.phones p
          WHERE p.client_id = c.id
          ORDER BY p.id ASC
          LIMIT 1
        ) AS phone
      FROM \`${baseName}\`.clients c
      LEFT JOIN \`${baseName}\`.lawsuit_court_assignments lca
        ON lca.id = ?
      WHERE c.id = ?
      LIMIT 1
    `;

    const rows = await this.dataBasesRepository.runQueryOnBase(baseName, sql, [
      lawsuitCourtAssignmentsId,
      clientId,
    ]);

    if (!rows || !rows[0]) {
      this.appLogger.structured({
        level: 'debug',
        context: DemandsOnlineAutomationService.name,
        type: 'AUTOMATION_JOB',
        status: 'WARN',
        message:
          'No se encontraron datos de demandado (clients/type_identifications/phones/lawsuit_court_assignments) para esta demanda.',
        meta: {
          management_demands_online_id: demanda.id,
          baseName,
          client_id: clientId,
          lawsuit_court_assignments_id: lawsuitCourtAssignmentsId,
        },
      });
      return null;
    }

    const row = rows[0] as Record<string, unknown>;
    const identification = String(row.identification ?? '').trim();
    const first_name = String(row.first_name ?? '').trim();
    const second_name = String(row.second_name ?? '').trim();
    const first_last_name = String(row.first_last_name ?? '').trim();
    const second_last_name = String(row.second_last_name ?? '').trim();
    const completed_name = String(row.completed_name ?? '').trim();

    // Para el portal del DEMANDADO necesitamos al menos el primer nombre y el primer apellido.
    if (!identification || !first_name || !first_last_name) {
      this.appLogger.structured({
        level: 'debug',
        context: DemandsOnlineAutomationService.name,
        type: 'AUTOMATION_JOB',
        status: 'WARN',
        message:
          'Datos de demandado incompletos (identification o first_name/first_last_name vacío); se omite la fase de Demandado.',
        meta: {
          management_demands_online_id: demanda.id,
          baseName,
          client_id: clientId,
          lawsuit_court_assignments_id: lawsuitCourtAssignmentsId,
        },
      });
      return null;
    }

    return {
      document_type_name: String(row.document_type_name ?? '').trim(),
      identification,
      first_name,
      second_name,
      first_last_name,
      second_last_name,
      completed_name,
      address: String(row.address ?? ''),
      phone: String(row.phone ?? ''),
    };
  }

  private async resolveCompanyTypeForDemanda(demanda: import('@domain/entities/managementDemandsOnline.entities').ManagementDemandsOnline) {
    const baseName = demanda.name_data_base;
    const campaignId = demanda.campaign_id;

    if (!baseName || !campaignId) {
      return null;
    }

    const sql = `
      SELECT format
      FROM \`${baseName}\`.campaigns
      WHERE id = ?
      ORDER BY id ASC
      LIMIT 1
    `;

    const rows = await this.dataBasesRepository.runQueryOnBase(baseName, sql, [campaignId]);
    const rawFormat = rows && rows[0] ? (rows[0] as Record<string, unknown>).format : undefined;
    if (rawFormat == null) {
      return null;
    }

    const formatNumber = Number(rawFormat);
    if (!Number.isFinite(formatNumber)) {
      return null;
    }

    return this.companyTypeRepository.findFirstByPortfolioAndFormat(
      demanda.portfolio_type_id,
      formatNumber,
    );
  }

  private normalizeNit(documentNumber: string): string {
    return (documentNumber ?? '').replace(/\D+/g, '');
  }

  private normalizePhoneDigits(value: string): string {
    return (value ?? '').replace(/\D+/g, '');
  }

  /**
   * Indica si el detail corresponde a una restricción de horario del portal (ej. ciudad).
   */
  private isPortalRestrictionDetail(detail: string | undefined): boolean {
    if (!detail || typeof detail !== 'string') return false;
    const d = detail.trim();
    return (
      d.includes('Restricción de horario en demandaenlinea') && d.includes('Horario:')
    );
  }

  /**
   * Parsea Horario y opcionalmente Receso del detail del portal.
   * Ej: "Horario: 8:00-17:00." y "Receso: 12:00-13:00."
   * Devuelve minutos desde medianoche (0-1439) o null si no hay coincidencia.
   */
  private parsePortalSchedule(detail: string | undefined): {
    start: number;
    end: number;
    recessStart?: number;
    recessEnd?: number;
  } | null {
    if (!detail || typeof detail !== 'string') return null;
    const horarioMatch = detail.match(/Horario:\s*(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})/i);
    if (!horarioMatch) return null;
    const start = parseInt(horarioMatch[1], 10) * 60 + parseInt(horarioMatch[2], 10);
    const end = parseInt(horarioMatch[3], 10) * 60 + parseInt(horarioMatch[4], 10);
    const recessMatch = detail.match(/Receso:\s*(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})/i);
    let recessStart: number | undefined;
    let recessEnd: number | undefined;
    if (recessMatch) {
      recessStart = parseInt(recessMatch[1], 10) * 60 + parseInt(recessMatch[2], 10);
      recessEnd = parseInt(recessMatch[3], 10) * 60 + parseInt(recessMatch[4], 10);
    }
    return { start, end, recessStart, recessEnd };
  }

  /**
   * True si la hora actual está dentro del horario permitido por el portal (fuera de receso).
   * Si no hay restricción en el detail, devuelve true (se puede intentar).
   */
  private isCurrentTimeAllowedForPortalRestriction(detail: string | undefined): boolean {
    const schedule = this.parsePortalSchedule(detail);
    if (!schedule) return true;
    const now = new Date();
    const minutesNow =
      now.getHours() * 60 + now.getMinutes();
    const { start, end, recessStart, recessEnd } = schedule;
    if (minutesNow < start || minutesNow > end) return false;
    if (
      recessStart != null &&
      recessEnd != null &&
      minutesNow >= recessStart &&
      minutesNow < recessEnd
    ) {
      return false;
    }
    return true;
  }

  /**
   * Procesa una sola demanda pendiente (si hay y se cumplen condiciones).
   * Permite hasta maxConcurrent ejecuciones simultáneas (BROWSERLESS_CONCURRENT_BROWSERS).
   * @returns { processed: true } si se tomó y procesó una demanda; { processed: false } en caso contrario.
   */
  async runOnce(): Promise<{ processed: boolean }> {
    if (this.currentRunning >= this.maxConcurrent) {
      return { processed: false };
    }
    this.currentRunning++;

    try {
      if (!this.botControlService.isRunning()) {
        this.appLogger.structured({
          level: 'debug',
          context: DemandsOnlineAutomationService.name,
          type: 'AUTOMATION_JOB',
          status: 'WARN',
          message: 'Bot detenido: no se ejecuta la automatización de demandas en línea.',
        });
        return { processed: false };
      }

      const runtime = await this.botControlService.checkRuntimeConditions();
      if (!runtime.ok) {
        this.appLogger.structured({
          level: 'debug',
          context: DemandsOnlineAutomationService.name,
          type: 'AUTOMATION_JOB',
          status: 'WARN',
          message: 'Bot no puede trabajar en este momento para automatizar demandas.',
          meta: { reason: runtime.reason },
        });
        return { processed: false };
      }

      const currentDataBasesId = this.botControlService.getCurrentDataBasesId();
      if (!currentDataBasesId) {
        this.appLogger.structured({
          level: 'debug',
          context: DemandsOnlineAutomationService.name,
          type: 'AUTOMATION_JOB',
          status: 'WARN',
          message:
            'No hay configuración data_bases seleccionada; no se puede determinar la cartera para automatizar demandas.',
        });
        return { processed: false };
      }

      let portfolioTypeId: number;
      let dbBases: import('@domain/entities/dataBases.entities').BasesConfig;
      try {
        const dbRecord = await this.dataBasesService.findById(currentDataBasesId);
        portfolioTypeId = dbRecord.portfolio_type_id;
        dbBases = dbRecord.bases;
      } catch {
        this.appLogger.structured({
          level: 'debug',
          context: DemandsOnlineAutomationService.name,
          type: 'AUTOMATION_JOB',
          status: 'WARN',
          message:
            'La configuración data_bases seleccionada no existe; no se puede determinar la cartera para automatizar demandas.',
          meta: { data_bases_id: currentDataBasesId },
        });
        return { processed: false };
      }

      const excludeIds: number[] = [];
      const maxCandidates = 100;
      let demanda: ManagementDemandsOnline | null = null;

      for (let i = 0; i < maxCandidates; i++) {
        const candidate = await this.managementDemandsOnlineRepository.findNextPending(
          portfolioTypeId,
          excludeIds,
        );
        if (!candidate) break;

        if (
          candidate.management_status === 'Novedad' &&
          this.isPortalRestrictionDetail(candidate.detail) &&
          !this.isCurrentTimeAllowedForPortalRestriction(candidate.detail)
        ) {
          this.appLogger.structured({
            level: 'debug',
            context: DemandsOnlineAutomationService.name,
            type: 'AUTOMATION_JOB',
            status: 'OK',
            message:
              'Registro en Novedad con restricción de horario del portal; hora actual no permite gestionarlo. Se toma el siguiente sin abrir navegador.',
            meta: {
              management_demands_online_id: candidate.id,
              detail: candidate.detail?.slice(0, 100),
            },
          });
          excludeIds.push(candidate.id);
          continue;
        }

        const marked = await this.managementDemandsOnlineRepository.markInProcess(candidate.id);
        if (marked) {
          demanda = { ...candidate, management_status: 'En proceso' };
          break;
        }
        excludeIds.push(candidate.id);
      }

      if (!demanda) {
        this.appLogger.structured({
          level: 'debug',
          context: DemandsOnlineAutomationService.name,
          type: 'AUTOMATION_JOB',
          status: 'OK',
          message:
            'No se encontraron demandas con estado Abierta o Novedad para automatizar en este ciclo.',
        });
        return { processed: false };
      }

    this.appLogger.structured({
      level: 'debug',
      context: DemandsOnlineAutomationService.name,
      type: 'AUTOMATION_JOB',
      status: 'OK',
      message: 'Demanda tomada para automatización en demandaenlinea.',
      meta: {
        management_demands_online_id: demanda.id,
        management_status: demanda.management_status,
      },
    });

    // Resolver configuración del servicio PDF según la base de datos de la demanda
    const pdfServiceConfig = dbBases[demanda.name_data_base]?.generate_pdf_demand_service;
    if (!pdfServiceConfig?.url) {
      const noConfigDetail =
        `Sin configuración de generate_pdf_demand_service para la base "${demanda.name_data_base}". ` +
        `Verifique el campo bases en el registro data_bases correspondiente.`;
      await this.managementDemandsOnlineRepository.update({
        ...demanda,
        management_status: 'Novedad',
        detail: noConfigDetail,
        updated_at: new Date(),
      });
      this.appLogger.structured({
        level: 'warn',
        context: DemandsOnlineAutomationService.name,
        type: 'AUTOMATION_JOB',
        status: 'WARN',
        message: noConfigDetail,
        meta: {
          management_demands_online_id: demanda.id,
          name_data_base: demanda.name_data_base,
          data_bases_id: currentDataBasesId,
        },
      });
      return { processed: false };
    }

    try {
      const cityConfig = await this.portfolioCityConfigRepository.findById(
        demanda.portfolio_city_config_id,
      );
      const amountType = await this.amountTypeRepository.findById(demanda.amount_type_id);

      const companyType = await this.resolveCompanyTypeForDemanda(demanda);
      const demandadoData = await this.resolveDemandadoForDemanda(demanda);
      const lawyerRow = await this.lawyerDataRepository.findFirstByPortfolioTypeId(
        demanda.portfolio_type_id,
      );
      const apoderadoData =
        lawyerRow != null
          ? {
              document_name: String(lawyerRow.document_name ?? '').trim(),
              document_number: this.normalizeNit(lawyerRow.document_number),
              first_name: String(lawyerRow.first_name ?? '').trim(),
              second_name: String(lawyerRow.second_name ?? '').trim(),
              first_last_name: String(lawyerRow.first_last_name ?? '').trim(),
              second_last_name: String(lawyerRow.second_last_name ?? '').trim(),
              address: String(lawyerRow.address ?? '').trim(),
              contact_number: this.normalizePhoneDigits(lawyerRow.contact_number),
              email_notifications: String(lawyerRow.email_notifications ?? '')
                .trim()
                .toUpperCase(),
            }
          : undefined;

      const demandanteData =
        companyType != null
          ? {
              nit: this.normalizeNit(companyType.document_number),
              company_name: companyType.company_name,
              address: companyType.address,
              contact_number: companyType.contact_number,
              email_notifications: companyType.email_notifications,
            }
          : undefined;

      const especialidades = Array.isArray(amountType.specialty_process)
        ? amountType.specialty_process
        : [amountType.specialty_process as unknown as string];
      const clasesProceso = Array.isArray(amountType.class_process)
        ? amountType.class_process
        : [amountType.class_process as unknown as string];

      const {
        reachedArchivosAdjuntos,
        pdfDemandaAdjuntado,
        demandaRegistrada,
        captchaResolved,
        enviarClicked,
        confirmarDatosModalOpened,
        confirmarDatosNoClicked,
        confirmarDatosSiClicked,
        confirmarDatosAction,
        numberFiled,
        failureStage,
      } = await this.browserAutomationPort.procesarLugarEnvioYEspecialidadYClase({
          demanda,
          departamento: cityConfig.name_departament,
          ciudad: cityConfig.name_city,
          especialidades,
          clasesProceso,
          demandante: demandanteData,
          demandado: demandadoData ?? undefined,
          apoderado: apoderadoData,
          pdfServiceConfig,
        });

      const refreshedDemanda =
        demandaRegistrada === true || pdfDemandaAdjuntado === true || reachedArchivosAdjuntos
          ? await this.managementDemandsOnlineRepository.findById(demanda.id)
          : demanda;

      if (demandaRegistrada === true) {
        let detailFinal: string;
        if (confirmarDatosAction === 'NO' && confirmarDatosNoClicked === true) {
          detailFinal =
            'Demanda en linea registrada con exito y sincronizada (modal Confirmar Datos: NO simulado).';
        } else if (confirmarDatosAction === 'SI' && confirmarDatosSiClicked === true) {
          detailFinal =
            'Demanda en linea registrada con exito y sincronizada (modal Confirmar Datos: SI).';
        } else {
          detailFinal = 'Demanda en linea registrada con exito y sincronizada con lawsuits externa.';
        }
        const updatedDemanda = await this.managementDemandsOnlineRepository.update({
          ...refreshedDemanda,
          lawsuit_status: 'Presentada por aplicativo',
          management_status: 'Registrada',
          number_filed: numberFiled ?? '-',
          detail: detailFinal,
          updated_at: new Date(),
        });

        /**
         * BD externa (cartera): actualiza la demanda judicial asociada.
         * Nota: en este repositorio no hay tabla tipo `lawsuit_assigned`; el vínculo
         * ciudad/asignación ya está en `lawsuit_court_assignments` vía sync previo.
         */
        if (updatedDemanda.name_data_base && updatedDemanda.lawsuit_id) {
          const baseName = updatedDemanda.name_data_base;
          const sql = `
            UPDATE \`${baseName}\`.lawsuits
            SET
              path_law_doc = ?,
              lawsuit_status = ?,
              user_id = ?,
              user_name = ?
            WHERE id = ?
          `;
          await this.dataBasesRepository.runQueryOnBase(baseName, sql, [
            updatedDemanda.path_law_doc ?? '',
            updatedDemanda.lawsuit_status ?? 'Presentada por aplicativo',
            updatedDemanda.user_id ?? 1,
            updatedDemanda.user_name ?? 'BOT demands online',
            updatedDemanda.lawsuit_id,
          ]);
        }

        this.appLogger.structured({
          level: 'debug',
          context: DemandsOnlineAutomationService.name,
          type: 'AUTOMATION_JOB',
          status: 'OK',
          message: detailFinal,
          meta: {
            management_demands_online_id: demanda.id,
            management_status: 'Registrada',
            lawsuit_status: 'Presentada por aplicativo',
            reachedArchivosAdjuntos,
            pdfDemandaAdjuntado: pdfDemandaAdjuntado === true,
            demandaRegistrada: true,
          },
        });
      } else {
        let detailFinal: string;
        let managementStatusFinal: 'Novedad' | 'En proceso';

        if (!reachedArchivosAdjuntos) {
          detailFinal =
            'Bot: demandante en grilla; complete demandado, apoderado y adjuntos manualmente.';
          managementStatusFinal = 'En proceso';
        } else if (pdfDemandaAdjuntado === true) {
          if (failureStage === 'recaptcha') {
            detailFinal =
              'Bot: DEMANDA adjuntada con éxito, pero no se pudo resolver el reCAPTCHA automáticamente. Revise el portal, resuelva el reCAPTCHA y haga clic en ENVIAR manualmente.';
            managementStatusFinal = 'Novedad';
          } else if (failureStage === 'jconfirm_confirmar_datos_timeout') {
            detailFinal =
              'Bot: tras ENVIAR no apareció a tiempo el div.jconfirm-open con span.jconfirm-title «Confirmar Datos» y Si/No en .jconfirm-buttons. Aumente CONFIRMAR_DATOS_MODAL_WAIT_MS o revise el portal.';
            managementStatusFinal = 'Novedad';
          } else if (failureStage === 'portal_enviar_validation_error') {
            detailFinal =
              'Bot: el portal mostró un mensaje de validación al ENVIAR (no el resumen «Confirmar Datos»). Suele indicar que el PDF no quedó en la grilla (valArray vacío), reCAPTCHA sin token, u otro requisito. Revise el detalle técnico y la sección Archivos adjuntos en el portal.';
            managementStatusFinal = 'Novedad';
          } else if (failureStage === 'portal_adjunto_no_en_grilla') {
            detailFinal =
              'Bot: tras «Agregar Archivo» el portal no registró el PDF en la grilla (#tblFiles). Revise tipo DEMANDA, nombre del archivo y mensaje #spnmsg en el portal; vuelva a adjuntar.';
            managementStatusFinal = 'Novedad';
          } else if (
            captchaResolved === true &&
            enviarClicked === true &&
            confirmarDatosModalOpened !== true
          ) {
            detailFinal =
              'Bot: ENVIAR ejecutado, pero no se detectó el div.jconfirm-open con «Confirmar Datos». Revise el portal y continúe manualmente.';
            managementStatusFinal = 'Novedad';
          } else if (failureStage === 'confirmar_datos_si') {
            detailFinal =
              'Bot: modal «Confirmar Datos» abierto pero no se encontró el botón Si. Revise el portal.';
            managementStatusFinal = 'Novedad';
          } else if (failureStage === 'doble_confirmacion') {
            detailFinal =
              'Bot: fallo en doble confirmación («¿Está seguro?»): modal no apareció o no se encontró el botón Si. Revise el portal.';
            managementStatusFinal = 'Novedad';
          } else if (failureStage === 'finalizar') {
            detailFinal =
              'Bot: fallo al obtener radicado — modal Finalizar no apareció o no se encontró el botón. Confirme el número de radicado manualmente en el portal.';
            managementStatusFinal = 'Novedad';
          } else if (confirmarDatosNoClicked === true) {
            // Normalmente esto debería ir por la rama demandaRegistrada === true,
            // pero lo dejamos por seguridad.
            detailFinal =
              'Bot: reCAPTCHA resuelto, div.jconfirm-open «Confirmar Datos» y simulación finalizada con No.';
            managementStatusFinal = 'Novedad';
          } else {
            detailFinal =
              'Bot: No se completo la automatización de la demanda. Revise el portal y continúe manualmente.';
            managementStatusFinal = 'Novedad';
          }
        } else {
          if (failureStage === 'pdf_generate') {
            detailFinal =
              'Bot: error al GENERAR PDF DEMANDA (servicio GENERATE_PDF_DEMAND_SERVICE); revise servicios y adjunte el PDF manualmente.';
          } else if (failureStage === 'pdf_download') {
            detailFinal =
              'Bot: error al DESCARGAR PDF DEMANDA (servicio DOWNLOAD_PDF_DEMAND_SERVICE); revise servicios y adjunte el PDF manualmente.';
          } else {
            detailFinal =
              'Bot: error al generar o adjuntar PDF DEMANDA; revise servicios y adjunte el PDF manualmente.';
          }
          managementStatusFinal = 'Novedad';
        }

        await this.managementDemandsOnlineRepository.update({
          ...refreshedDemanda,
          management_status: managementStatusFinal,
          detail: detailFinal,
          updated_at: new Date(),
        });

        this.appLogger.structured({
          level: 'debug',
          context: DemandsOnlineAutomationService.name,
          type: 'AUTOMATION_JOB',
          status: 'OK',
          message: detailFinal,
          meta: {
            management_demands_online_id: demanda.id,
            management_status: managementStatusFinal,
            reachedArchivosAdjuntos,
            pdfDemandaAdjuntado: pdfDemandaAdjuntado === true,
          },
        });
      }
      return { processed: true };
    } catch (err) {
      const error = err as Error;
      const lowerMsg = error.message.toLowerCase();
      const isRestriction =
        lowerMsg.includes('horario_no_disponible') || lowerMsg.includes('restriccion de horario');
      let fullDetail: string;

      if (isRestriction) {
        const msg = error.message;
        const idx = msg.indexOf(':');
        const portalMessage = idx >= 0 ? msg.slice(idx + 1).trim() : msg;

        let cityLabel = '';
        const cityMatch = portalMessage.match(/para la ciudad de\s+([A-ZÁÉÍÓÚÑ\s]+)/i);
        if (cityMatch?.[1]) {
          const rawCity = cityMatch[1].trim();
          const normCity = rawCity.charAt(0).toUpperCase() + rawCity.slice(1).toLowerCase();
          cityLabel = ` (${normCity})`;
        }

        const hours = portalMessage.match(/\d{1,2}:\d{2}/g) ?? [];
        let horarioPart = '';
        if (hours.length >= 2) {
          horarioPart = ` Horario: ${hours[0]}-${hours[1]}.`;
        }
        if (hours.length >= 4) {
          horarioPart += ` Receso: ${hours[2]}-${hours[3]}.`;
        }

        fullDetail = `Restricción de horario en demandaenlinea${cityLabel}.${horarioPart}`;
      } else if (lowerMsg.includes('waiting failed')) {
        fullDetail =
          'El portal de demandas en línea no respondió a tiempo o tardó demasiado en cargar. Revise la disponibilidad del portal y la conexión del bot.';
      } else if (lowerMsg.includes('departamento')) {
        fullDetail =
          'No se pudo seleccionar el departamento en el portal de demandas en línea. Valide la configuración de ciudades (portfolioCityConfig) frente al portal.';
      } else if (lowerMsg.includes('especialidad')) {
        fullDetail =
          'No se pudo seleccionar la especialidad. Verifique el campo specialty_process (amountType) frente al portal.';
      } else if (
        lowerMsg.includes('localidad_predeterminada_no_encontrada') ||
        lowerMsg.includes('ddllocalidad') ||
        (lowerMsg.includes('localidad') && lowerMsg.includes('desconocida'))
      ) {
        fullDetail =
          'El portal muestra el select de Localidad pero no contiene ninguna de las opciones requeridas: "00 - DESCONOCIDA / DUDOSA" ni "Sin Localidad".';
      } else {
        fullDetail =
          'Error automatizando demanda en demandaenlinea. Revise los logs técnicos del bot para más detalle.';
      }

      const truncatedDetail =
        fullDetail.length > 480 ? `${fullDetail.slice(0, 480)}...` : fullDetail;

      const refreshedDemanda = await this.managementDemandsOnlineRepository.findById(demanda.id);

      await this.managementDemandsOnlineRepository.update({
        ...refreshedDemanda,
        management_status: 'Novedad',
        detail: truncatedDetail,
        updated_at: new Date(),
      });

      this.appLogger.structured({
        level: 'error',
        context: DemandsOnlineAutomationService.name,
        type: 'AUTOMATION_JOB',
        status: 'ERROR',
        message: 'Falló la automatización de la demanda en demandaenlinea.',
        meta: {
          management_demands_online_id: demanda.id,
          error: error.message,
        },
        stack: error.stack,
      });
      if (isRestriction) {
        throw error;
      }
      return { processed: false };
    }
    } finally {
      this.currentRunning--;
    }
  }
}
