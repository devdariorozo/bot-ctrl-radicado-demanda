// Responsabilidad: adaptador IMAP para la bandeja de entrada de correo.
// "Marcar como leído" = añadir flag \Seen al mensaje (no lo elimina del servidor).

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import type { ParsedMail } from 'mailparser';
import { EmailInboxPort, FetchedEmail, ParsedEmailFields } from '@domain/ports/emailInbox.ports';
import { AppLogger } from '@infrastructure/logging/appLogger.service';

@Injectable()
export class ImapInboxAdapter implements EmailInboxPort {
  constructor(
    private readonly configService: ConfigService,
    private readonly appLogger: AppLogger,
  ) {}

  private buildClient(): ImapFlow {
    return new ImapFlow({
      host: this.configService.get<string>('MAIL_HOST', ''),
      port: this.configService.get<number>('MAIL_PORT', 993),
      secure: true,
      auth: {
        user: this.configService.get<string>('MAIL_USER', ''),
        pass: this.configService.get<string>('MAIL_PASSWORD', ''),
      },
      logger: false,
    });
  }

  async fetchMatchingEmails(
    subjectKeywords: string[],
    bodyMustContain: string,
  ): Promise<FetchedEmail[]> {
    const folder = this.configService.get<string>('MAIL_FOLDER', 'INBOX');
    const client = this.buildClient();
    const results: FetchedEmail[] = [];

    try {
      await client.connect();
      await client.mailboxOpen(folder);

      let uids: number[] = [];
      for (const keyword of subjectKeywords) {
        const found = await client.search({ subject: keyword }, { uid: true });
        if (Array.isArray(found)) {
          uids = [...uids, ...(found as number[])];
        }
      }
      uids = [...new Set(uids)].sort((a, b) => a - b);

      if (uids.length === 0) return results;

      for (const uid of uids) {
        try {
          const fetchResult = await client.fetchOne(
            String(uid),
            { source: true },
            { uid: true },
          );
          if (!fetchResult) continue;
          const fetchMsg = fetchResult as unknown as { source?: Buffer };
          if (!fetchMsg.source) continue;

          const parsed: ParsedMail = await simpleParser(fetchMsg.source);
          const bodyText = parsed.text ?? '';
          const bodyHtml = typeof parsed.html === 'string' ? parsed.html : '';
          const content = bodyText || this.stripHtml(bodyHtml);

          if (!content.toLowerCase().includes(bodyMustContain.toLowerCase())) continue;

          const from = parsed.from?.text?.trim() ?? '';
          const to = Array.isArray(parsed.to)
            ? parsed.to.map((a) => a.text).join('; ')
            : (parsed.to?.text?.trim() ?? '');
          const subject = parsed.subject ?? '';
          const dateReceived = parsed.date ? this.formatDateReceived(parsed.date) : '';
          const messageId = parsed.messageId ?? '';

          results.push({
            uid: String(uid),
            messageId,
            from,
            to,
            subject,
            dateReceived,
            parsed: this.parseEmailFields(content),
          });
        } catch (err) {
          this.appLogger.structured({
            level: 'warn',
            context: ImapInboxAdapter.name,
            type: 'IMAP_FETCH',
            status: 'Warning',
            message: `No se pudo parsear el correo UID ${uid}`,
            meta: { error: (err as Error).message },
          });
        }
      }
    } finally {
      try { await client.logout(); } catch { /* ignore */ }
    }

    return results;
  }

  async markAsRead(uid: string): Promise<void> {
    const folder = this.configService.get<string>('MAIL_FOLDER', 'INBOX');
    const client = this.buildClient();
    try {
      await client.connect();
      await client.mailboxOpen(folder);
      await client.messageFlagsAdd(
        { uid: Number(uid) } as unknown as Parameters<typeof client.messageFlagsAdd>[0],
        ['\\Seen'],
        { uid: true },
      );
    } catch (err) {
      this.appLogger.structured({
        level: 'warn',
        context: ImapInboxAdapter.name,
        type: 'IMAP_MARK_READ',
        status: 'Warning',
        message: `No se pudo marcar como leído el correo UID ${uid}`,
        meta: { error: (err as Error).message },
      });
    } finally {
      try { await client.logout(); } catch { /* ignore */ }
    }
  }

  private formatDateReceived(date: Date): string {
    return date.toLocaleString('es-CO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private cleanValue(raw: string | undefined | null): string | null {
    if (!raw) return null;
    const v = raw.trim();
    if (!v || v === '-') return null;
    return v;
  }

  private extractField(text: string, label: string): string | null {
    const regex = new RegExp(`${label}[:\\s]+([^\\n\\r]+)`, 'i');
    const match = text.match(regex);
    return match ? this.cleanValue(match[1]) : null;
  }

  private extractSectionContent(text: string, startPattern: string, endPatterns: string[]): string {
    const startIdx = text.search(new RegExp(startPattern, 'i'));
    if (startIdx < 0) return '';
    let endIdx = text.length;
    for (const pattern of endPatterns) {
      const idx = text.search(new RegExp(pattern, 'i'));
      if (idx > startIdx && idx < endIdx) endIdx = idx;
    }
    return text.slice(startIdx, endIdx);
  }

  // Extrae tipo y número desde "Documento: CC - 72261493" o "Documento: NIT - 9000975439"
  private extractDocumentFields(text: string): { type: string | null; number: string | null } {
    const match = text.match(/Documento:\s*([A-Z]+)\s*[-–]\s*(\d+)/i);
    if (!match) return { type: null, number: null };
    return { type: this.cleanValue(match[1]), number: this.cleanValue(match[2]) };
  }

  private parseEmailFields(content: string): ParsedEmailFields {
    const demandanteSection = this.extractSectionContent(content, 'DEMANDANTE|SOLICITANTE', ['DEMANDADO']);
    const demandadoSection = this.extractSectionContent(content, 'DEMANDADO', []);

    const demandanteDoc = this.extractDocumentFields(demandanteSection);
    const demandadoDoc = this.extractDocumentFields(demandadoSection);

    return {
      departament: this.extractField(content, 'Departamento'),
      city: this.extractField(content, 'Ciudad'),
      locality: this.extractField(content, 'Localidad'),
      specialty: this.extractField(content, 'Especialidad'),
      process_class: this.extractField(content, 'Clase de proceso'),
      subject_demanding: demandanteSection ? 'DEMANDANTE O SOLICITANTE' : null,
      artificial_person:
        this.extractField(demandanteSection, 'Persona Jurídica') ??
        this.extractField(demandanteSection, 'Persona Juridica'),
      document_type_1: demandanteDoc.type,
      document_number_1: demandanteDoc.number,
      email_1: this.extractField(demandanteSection, 'Correo Electrónico'),
      address_1:
        this.extractField(demandanteSection, 'Dirección') ??
        this.extractField(demandanteSection, 'Direccion'),
      phone_number_1:
        this.extractField(demandanteSection, 'Teléfono') ??
        this.extractField(demandanteSection, 'Telefono'),
      subject_defendant: demandadoSection ? 'DEMANDADO' : null,
      natural_person: this.extractField(demandadoSection, 'Persona Natural'),
      document_type_2: demandadoDoc.type,
      document_number_2: demandadoDoc.number,
      email_2: this.extractField(demandadoSection, 'Correo Electrónico'),
      address_2:
        this.extractField(demandadoSection, 'Dirección') ??
        this.extractField(demandadoSection, 'Direccion'),
      phone_number_2:
        this.extractField(demandadoSection, 'Teléfono') ??
        this.extractField(demandadoSection, 'Telefono'),
      number_filed: null,
    };
  }
}
