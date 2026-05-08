// Responsabilidad: adaptador IMAP para la bandeja de entrada de correo.
// "Marcar como leído" = añadir flag \Seen al mensaje (no lo elimina del servidor).

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import type { ParsedMail } from 'mailparser';
import { EmailInboxPort, FetchedEmail } from '@domain/ports/emailInbox.ports';
import { AppLogger } from '@infrastructure/logging/appLogger.service';
import { parseEmailFields } from '@application/utils/emailParser.utils';

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

          const subject = parsed.subject ?? '';
          const dateReceived = parsed.date ? this.formatDateReceived(parsed.date) : '';
          const messageId = parsed.messageId ?? '';

          // Re-verificación local con normalización (el servidor no normaliza tildes)
          const subjectNorm = normalizeText(subject);
          if (!subjectKeywords.some((kw) => subjectNorm.includes(normalizeText(kw)))) continue;

          const from = parsed.from?.text?.trim() ?? '';
          const to = Array.isArray(parsed.to)
            ? parsed.to.map((a) => a.text).join('; ')
            : (parsed.to?.text?.trim() ?? '');

          results.push({
            uid: String(uid),
            messageId,
            from,
            to,
            subject,
            dateReceived,
            parsed: parseEmailFields(content, from),
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
}

function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}
