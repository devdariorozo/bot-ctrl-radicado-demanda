// Responsabilidad: servicio genérico de automatización de bandeja de entrada.
// Puede ser consumido por cualquier tipo de cartera.

import { Injectable, Inject } from '@nestjs/common';
import { EMAIL_INBOX_PORT, EmailInboxPort } from '@domain/ports/emailInbox.ports';
import {
  AUTOMATION_EMAIL_REPOSITORY,
  AutomationEmailRepository,
  CreateAutomationEmailInput,
} from '@domain/ports/automationEmail.ports';
import {
  MANAGEMENT_CTRL_FILED_DEMAND_REPOSITORY,
  ManagementCtrlFiledDemandRepository,
} from '@domain/ports/managementCtrlFiledDemand.ports';
import { ManagementCtrlFiledDemand } from '@domain/entities/managementCtrlFiledDemand.entities';
import { AppLogger } from '@infrastructure/logging/appLogger.service';

const SUBJECT_KEYWORDS = [
  'Generación de demanda',
  'Acta de reparto',
  'Radicación de demanda',
];
const THREE_WEEKS_MS = 21 * 24 * 60 * 60 * 1000;
const DEFAULT_STATE_TYPE_ID = 1;

export interface EmailAutomationResult {
  found: boolean;
  autmId?: number;
  managementStatus: string;
  detail: string;
}

@Injectable()
export class EmailInboxAutomationService {
  constructor(
    @Inject(EMAIL_INBOX_PORT)
    private readonly emailInboxPort: EmailInboxPort,
    @Inject(AUTOMATION_EMAIL_REPOSITORY)
    private readonly automationEmailRepository: AutomationEmailRepository,
    @Inject(MANAGEMENT_CTRL_FILED_DEMAND_REPOSITORY)
    private readonly managementCtrlFiledDemandRepository: ManagementCtrlFiledDemandRepository,
    private readonly appLogger: AppLogger,
  ) {}

  /**
   * Procesa la automatización de correo para un registro de gestión.
   * Genérico: puede usarse para cualquier tipo de cartera.
   */
  async processEmailForRecord(
    mcfdRecord: ManagementCtrlFiledDemand,
    identification: string,
  ): Promise<EmailAutomationResult> {
    const now = new Date();

    // Regla: más de 3 semanas sin procesar → control manual
    const createdAt =
      mcfdRecord.mcfd_created_at instanceof Date
        ? mcfdRecord.mcfd_created_at
        : new Date(mcfdRecord.mcfd_created_at);

    if (now.getTime() - createdAt.getTime() > THREE_WEEKS_MS) {
      this.appLogger.structured({
        level: 'warn',
        context: EmailInboxAutomationService.name,
        type: 'EMAIL_AUTOMATION',
        status: 'Warning',
        message: 'Registro supera 3 semanas. Se marca Para control manual.',
        meta: { mcfd_id: mcfdRecord.mcfd_id, mcfd_created_at: createdAt },
      });
      return {
        found: false,
        managementStatus: 'Para control manual',
        detail: 'Demanda pendiente por procesar radicado manualmente',
      };
    }

    const bodyMustContain = `CC - ${identification}`;

    this.appLogger.structured({
      level: 'debug',
      context: EmailInboxAutomationService.name,
      type: 'EMAIL_AUTOMATION',
      status: 'Success',
      message: 'Buscando correos en bandeja de entrada',
      meta: { mcfd_id: mcfdRecord.mcfd_id, identification, bodyMustContain },
    });

    let emails: Awaited<ReturnType<EmailInboxPort['fetchMatchingEmails']>>;
    try {
      emails = await this.emailInboxPort.fetchMatchingEmails(SUBJECT_KEYWORDS, bodyMustContain);
    } catch (err) {
      const error = err as Error;
      this.appLogger.structured({
        level: 'error',
        context: EmailInboxAutomationService.name,
        type: 'EMAIL_AUTOMATION',
        status: 'Error',
        message: 'Error al conectar con bandeja de entrada',
        meta: { mcfd_id: mcfdRecord.mcfd_id, error: error.message },
        stack: error.stack,
      });
      return {
        found: false,
        managementStatus: 'Novedad correo',
        detail: 'Error al conectar con bandeja de entrada. Se reintentará.',
      };
    }

    if (emails.length === 0) {
      this.appLogger.structured({
        level: 'debug',
        context: EmailInboxAutomationService.name,
        type: 'EMAIL_AUTOMATION',
        status: 'Success',
        message: 'No se encontró correo coincidente',
        meta: { mcfd_id: mcfdRecord.mcfd_id, identification },
      });
      return {
        found: false,
        managementStatus: 'Novedad correo',
        detail: 'Correo no recibido y se debe reintentar',
      };
    }

    // Tomar el primero (más antiguo por orden ascendente de UID)
    const email = emails[0];

    const createInput: CreateAutomationEmailInput = {
      autm_from_email: email.from,
      autm_to_email: email.to,
      autm_date_received: email.dateReceived,
      autm_subject: email.subject,
      autm_departament: email.parsed.departament,
      autm_city: email.parsed.city,
      autm_locality: email.parsed.locality,
      autm_specialty: email.parsed.specialty,
      autm_process_class: email.parsed.process_class,
      autm_subject_demanding: email.parsed.subject_demanding,
      autm_artificial_person: email.parsed.artificial_person,
      autm_document_type_1: email.parsed.document_type_1,
      autm_document_number_1: email.parsed.document_number_1,
      autm_email_1: email.parsed.email_1,
      autm_address_1: email.parsed.address_1,
      autm_phone_number_1: email.parsed.phone_number_1,
      autm_subject_defendant: email.parsed.subject_defendant,
      autm_natural_person: email.parsed.natural_person,
      autm_document_type_2: email.parsed.document_type_2,
      autm_document_number_2: email.parsed.document_number_2,
      autm_email_2: email.parsed.email_2 ?? '-',
      autm_address_2: email.parsed.address_2 ?? '-',
      autm_phone_number_2: email.parsed.phone_number_2 ?? '-',
      autm_number_filed: email.parsed.number_filed ?? '-',
      autm_automation_status: 'Correo recibido',
      autm_detail: 'Correo recibido y automatizado correctamente',
      autm_status_type_id: DEFAULT_STATE_TYPE_ID,
      autm_responsible: 'BOT ctrl radicado demanda',
    };

    let autmId: number;
    try {
      const created = await this.automationEmailRepository.create(createInput);
      autmId = created.autm_id;
    } catch (err) {
      const error = err as Error;
      this.appLogger.structured({
        level: 'error',
        context: EmailInboxAutomationService.name,
        type: 'EMAIL_AUTOMATION',
        status: 'Error',
        message: 'Error al guardar registro en tbl_automation_email',
        meta: { mcfd_id: mcfdRecord.mcfd_id, error: error.message },
        stack: error.stack,
      });
      return {
        found: false,
        managementStatus: 'Novedad correo',
        detail: 'Error al guardar correo automatizado. Se reintentará.',
      };
    }

    try {
      await this.emailInboxPort.markAsRead(email.uid);
    } catch (err) {
      this.appLogger.structured({
        level: 'warn',
        context: EmailInboxAutomationService.name,
        type: 'EMAIL_AUTOMATION',
        status: 'Warning',
        message: 'Correo guardado pero no se pudo marcar como leído',
        meta: { mcfd_id: mcfdRecord.mcfd_id, uid: email.uid },
      });
    }

    this.appLogger.structured({
      level: 'debug',
      context: EmailInboxAutomationService.name,
      type: 'EMAIL_AUTOMATION',
      status: 'Success',
      message: 'Correo encontrado y automatizado',
      meta: { mcfd_id: mcfdRecord.mcfd_id, autm_id: autmId, subject: email.subject },
    });

    return {
      found: true,
      autmId,
      managementStatus: 'Correo Automatizado',
      detail: 'Correo recibido y automatizado correctamente',
    };
  }
}
