// Responsabilidad:
//   A) Job periódico: descarga correos de bandeja y persiste en tbl_automation_email
//      (idempotencia por autm_message_id, sin eliminar mensajes del servidor).
//   B) Cruza tbl_management_ctrl_filed_demand contra tbl_automation_email
//      por autm_document_number_2 = identification del cliente.

import { Injectable, Inject, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EMAIL_INBOX_PORT, EmailInboxPort } from '@domain/ports/emailInbox.ports';
import {
  AUTOMATION_EMAIL_REPOSITORY,
  AutomationEmailRepository,
  CreateAutomationEmailInput,
} from '@domain/ports/automationEmail.ports';
import { ManagementCtrlFiledDemand } from '@domain/entities/managementCtrlFiledDemand.entities';
import { AppLogger } from '@infrastructure/logging/appLogger.service';

const THREE_WEEKS_MS = 21 * 24 * 60 * 60 * 1000;
const DEFAULT_STATE_TYPE_ID = 1;

export interface EmailAutomationResult {
  found: boolean;
  autmId?: number;
  managementStatus: string;
  detail: string;
}

@Injectable()
export class EmailInboxAutomationService implements OnModuleInit, OnModuleDestroy {
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(
    @Inject(EMAIL_INBOX_PORT)
    private readonly emailInboxPort: EmailInboxPort,
    @Inject(AUTOMATION_EMAIL_REPOSITORY)
    private readonly automationEmailRepository: AutomationEmailRepository,
    private readonly configService: ConfigService,
    private readonly appLogger: AppLogger,
  ) {}

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  onModuleInit(): void {
    const minutes = this.getSyncIntervalMinutes();
    this.intervalId = setInterval(() => void this.syncInbox(), minutes * 60 * 1000);
    this.appLogger.structured({
      level: 'log',
      context: EmailInboxAutomationService.name,
      type: 'EMAIL_SYNC',
      status: 'OK',
      message: `Sync de bandeja programado cada ${minutes} minuto(s).`,
      meta: { intervalMinutes: minutes },
    });
    setImmediate(() => void this.syncInbox());
  }

  onModuleDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  // ─── Part A: descarga periódica de bandeja → tbl_automation_email ─────────

  async syncInbox(): Promise<void> {
    this.appLogger.structured({
      level: 'debug',
      context: EmailInboxAutomationService.name,
      type: 'EMAIL_SYNC',
      status: 'OK',
      message: 'Iniciando sincronización de bandeja de entrada.',
    });

    let emails: Awaited<ReturnType<EmailInboxPort['fetchMatchingEmails']>>;
    try {
      // bodyMustContain='' → sin filtro de cuerpo; se descargan todos los que coincidan con el asunto
      emails = await this.emailInboxPort.fetchMatchingEmails(this.getSubjectKeywords(), '');
    } catch (err) {
      this.appLogger.structured({
        level: 'warn',
        context: EmailInboxAutomationService.name,
        type: 'EMAIL_SYNC',
        status: 'Warning',
        message: 'No se pudo conectar a la bandeja de entrada. Se reintentará en el próximo ciclo.',
        meta: { error: extractErrorMessage(err) },
      });
      return;
    }

    let created = 0;
    let skipped = 0;

    for (const email of emails) {
      try {
        const existing = await this.automationEmailRepository.findByMessageId(email.messageId);
        if (existing) {
          skipped++;
          continue;
        }

        const input: CreateAutomationEmailInput = {
          autm_message_id: email.messageId,
          autm_from_email: email.from,
          autm_to_email: email.to,
          autm_date_received: email.dateReceived,
          autm_subject: email.subject,
          autm_departament: email.parsed.departament ?? '-',
          autm_city: email.parsed.city ?? '-',
          autm_locality: email.parsed.locality ?? '-',
          autm_specialty: email.parsed.specialty ?? '-',
          autm_process_class: email.parsed.process_class ?? '-',
          autm_subject_demanding: email.parsed.subject_demanding ?? '-',
          autm_artificial_person: email.parsed.artificial_person ?? '-',
          autm_document_type_1: email.parsed.document_type_1 ?? '-',
          autm_document_number_1: email.parsed.document_number_1 ?? '-',
          autm_email_1: email.parsed.email_1 ?? '-',
          autm_address_1: email.parsed.address_1 ?? '-',
          autm_phone_number_1: email.parsed.phone_number_1 ?? '-',
          autm_subject_defendant: email.parsed.subject_defendant ?? '-',
          autm_natural_person: email.parsed.natural_person ?? '-',
          autm_document_type_2: email.parsed.document_type_2 ?? '-',
          autm_document_number_2: email.parsed.document_number_2 ?? '-',
          autm_email_2: email.parsed.email_2 ?? '-',
          autm_address_2: email.parsed.address_2 ?? '-',
          autm_phone_number_2: email.parsed.phone_number_2 ?? '-',
          autm_number_filed: email.parsed.number_filed ?? '-',
          autm_automation_status: 'Correo recibido',
          autm_detail: 'Correo recibido y almacenado desde sincronización',
          autm_status_type_id: DEFAULT_STATE_TYPE_ID,
          autm_responsible: 'BOT ctrl radicado demanda',
        };

        await this.automationEmailRepository.create(input);
        created++;

        this.appLogger.structured({
          level: 'debug',
          context: EmailInboxAutomationService.name,
          type: 'EMAIL_SYNC',
          status: 'OK',
          message: 'Correo persistido en tbl_automation_email.',
          meta: { messageId: email.messageId, subject: email.subject },
        });
      } catch (err) {
        this.appLogger.structured({
          level: 'warn',
          context: EmailInboxAutomationService.name,
          type: 'EMAIL_SYNC',
          status: 'Warning',
          message: 'Error al procesar correo en sincronización.',
          meta: { messageId: email.messageId, error: (err as Error).message },
        });
      }
    }

    this.appLogger.structured({
      level: 'log',
      context: EmailInboxAutomationService.name,
      type: 'EMAIL_SYNC',
      status: 'OK',
      message: 'Sincronización de bandeja completada.',
      meta: { total: emails.length, created, skipped },
    });
  }

  // ─── Part B: cruce contra tbl_automation_email por documento del cliente ──

  async processEmailForRecord(
    mcfdRecord: ManagementCtrlFiledDemand,
    identification: string,
  ): Promise<EmailAutomationResult> {
    const now = new Date();

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

    const automationRecord =
      await this.automationEmailRepository.findByDocumentNumber2(identification);

    if (!automationRecord) {
      this.appLogger.structured({
        level: 'debug',
        context: EmailInboxAutomationService.name,
        type: 'EMAIL_AUTOMATION',
        status: 'Info',
        message: 'No se encontró correo en tbl_automation_email para el documento.',
        meta: { mcfd_id: mcfdRecord.mcfd_id, identification },
      });
      return {
        found: false,
        managementStatus: 'Novedad correo',
        detail: 'Correo no encontrado en base; se debe reintentar',
      };
    }

    try {
      await this.automationEmailRepository.update({
        ...automationRecord,
        autm_automation_status: 'Correo gestionado',
        autm_detail: 'Correo asociado a la gestión del radicado',
        autm_updated_at: now,
      });
    } catch (err) {
      this.appLogger.structured({
        level: 'warn',
        context: EmailInboxAutomationService.name,
        type: 'EMAIL_AUTOMATION',
        status: 'Warning',
        message: 'No se pudo actualizar tbl_automation_email a Correo gestionado.',
        meta: { autm_id: automationRecord.autm_id, error: (err as Error).message },
      });
    }

    this.appLogger.structured({
      level: 'debug',
      context: EmailInboxAutomationService.name,
      type: 'EMAIL_AUTOMATION',
      status: 'Success',
      message: 'Correo encontrado y gestionado desde tbl_automation_email.',
      meta: { mcfd_id: mcfdRecord.mcfd_id, autm_id: automationRecord.autm_id, identification },
    });

    return {
      found: true,
      autmId: automationRecord.autm_id,
      managementStatus: 'Correo Automatizado',
      detail: 'Correo recibido y automatizado correctamente',
    };
  }

  private getSubjectKeywords(): string[] {
    const raw = this.configService.get<string>(
      'MAIL_SUBJECT_KEYWORDS',
      'Generación de la Demanda,ACTA REPARTO N°,RADICACIÓN DEMANDA,RADICACION DE DEMANDA',
    );
    return raw.split(',').map((k) => k.trim()).filter(Boolean);
  }

  private getSyncIntervalMinutes(): number {
    const v = this.configService.get<number>('AUTOMATION_EMAIL_SYNC_INTERVAL_MINUTES', 30);
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : 30;
  }
}

function extractErrorMessage(err: unknown): string {
  if (err instanceof AggregateError) {
    const sub = (err.errors ?? [])
      .map((e: unknown) => (e instanceof Error ? `${e.constructor.name}: ${e.message}` : String(e)))
      .filter(Boolean)
      .join(' | ');
    return sub || err.message || 'AggregateError sin detalles';
  }
  if (err instanceof Error) return err.message || err.constructor.name;
  return String(err);
}
