// Responsabilidad: adaptador POP3 para la bandeja de entrada de correo.
// Implementación directa sobre tls.connect() — compatible con servidores corporativos
// que usan certificados autofirmados o versiones modernas de TLS no soportadas por poplib.
// Los correos NUNCA se eliminan del servidor (no se envía DELE).
// Solo se descargan (RETR) para persistirlos en tbl_automation_email.

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as tls from 'tls';
import { simpleParser } from 'mailparser';
import type { ParsedMail } from 'mailparser';
import { EmailInboxPort, FetchedEmail } from '@domain/ports/emailInbox.ports';
import { AppLogger } from '@infrastructure/logging/appLogger.service';
import { parseEmailFields } from '@application/utils/emailParser.utils';
import { extractMatchingPdfs } from '@application/utils/pdfAttachment.utils';
import { parsePdfActaReparto, mergeWithPdfFields } from '@application/utils/pdfActaReparto.parser';

class Pop3Session {
  private buffer = '';
  private waiters: Array<(line: string) => void> = [];

  constructor(private readonly socket: tls.TLSSocket) {
    socket.on('data', (chunk: Buffer) => {
      this.buffer += chunk.toString();
      this.flush();
    });
  }

  private flush(): void {
    while (this.waiters.length > 0) {
      const idx = this.buffer.indexOf('\r\n');
      if (idx === -1) break;
      const line = this.buffer.slice(0, idx);
      this.buffer = this.buffer.slice(idx + 2);
      this.waiters.shift()!(line);
    }
  }

  readLine(): Promise<string> {
    return new Promise((resolve) => {
      const idx = this.buffer.indexOf('\r\n');
      if (idx !== -1) {
        const line = this.buffer.slice(0, idx);
        this.buffer = this.buffer.slice(idx + 2);
        resolve(line);
      } else {
        this.waiters.push(resolve);
      }
    });
  }

  async readMultiLine(): Promise<string> {
    const lines: string[] = [];
    while (true) {
      const line = await this.readLine();
      if (line === '.') break;
      lines.push(line.startsWith('..') ? line.slice(1) : line);
    }
    return lines.join('\r\n');
  }

  send(cmd: string): void {
    this.socket.write(cmd + '\r\n');
  }
}

@Injectable()
export class Pop3InboxAdapter implements EmailInboxPort {
  constructor(
    private readonly configService: ConfigService,
    private readonly appLogger: AppLogger,
  ) {}

  async fetchMatchingEmails(
    subjectKeywords: string[],
    bodyMustContain: string,
    pdfAttachmentPatterns: string[],
  ): Promise<FetchedEmail[]> {
    const host = this.configService.get<string>('MAIL_HOST', '');
    const port = this.configService.get<number>('MAIL_PORT', 995);
    const user = this.configService.get<string>('MAIL_USER', '');
    const pass = this.configService.get<string>('MAIL_PASSWORD', '');

    const connectPromise = new Promise<FetchedEmail[]>((resolve, reject) => {
      let settled = false;
      const settle = (fn: () => void) => {
        if (!settled) { settled = true; fn(); }
      };

      const socket = tls.connect({
        host,
        port: Number(port),
        rejectUnauthorized: false,
      });

      socket.on('error', (err) => settle(() => reject(err)));

      socket.on('secureConnect', () => {
        void this.runSession(socket, user, pass, subjectKeywords, bodyMustContain, pdfAttachmentPatterns)
          .then((r) => settle(() => resolve(r)))
          .catch((e: Error) => settle(() => reject(e)))
          .finally(() => { try { socket.destroy(); } catch { /* ignore */ } });
      });
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error('POP3 timeout: sin respuesta del servidor en 8 minutos')),
        480_000,
      ),
    );

    return Promise.race([connectPromise, timeoutPromise]);
  }

  private async runSession(
    socket: tls.TLSSocket,
    user: string,
    pass: string,
    subjectKeywords: string[],
    bodyMustContain: string,
    pdfAttachmentPatterns: string[],
  ): Promise<FetchedEmail[]> {
    const session = new Pop3Session(socket);
    const results: FetchedEmail[] = [];

    const greeting = await session.readLine();
    if (!greeting.startsWith('+OK')) throw new Error(`POP3 greeting failed: ${greeting}`);

    session.send(`USER ${user}`);
    const userResp = await session.readLine();
    if (!userResp.startsWith('+OK')) throw new Error(`POP3 USER rejected: ${userResp}`);

    session.send(`PASS ${pass}`);
    const passResp = await session.readLine();
    if (!passResp.startsWith('+OK')) throw new Error('POP3 login failed: credenciales inválidas');

    session.send('STAT');
    const statResp = await session.readLine();
    if (!statResp.startsWith('+OK')) throw new Error(`POP3 STAT failed: ${statResp}`);

    const statMatch = statResp.match(/\+OK (\d+)/);
    const msgCount = statMatch ? parseInt(statMatch[1], 10) : 0;

    for (let i = 1; i <= msgCount; i++) {
      // Descarga solo headers primero (TOP n 0) para filtrar por asunto sin bajar el cuerpo
      session.send(`TOP ${i} 0`);
      const topResp = await session.readLine();
      if (!topResp.startsWith('+OK')) continue;

      const headerRaw = await session.readMultiLine();

      const subjectLine = headerRaw.match(/^Subject:\s*(.+)$/im);
      const subject = subjectLine ? decodeEncodedWord(subjectLine[1].trim()) : '';

      // Descartar NDRs / rebotes antes de comparar keywords
      const fromLine = headerRaw.match(/^From:\s*(.+)$/im)?.[1]?.trim() ?? '';
      if (
        /^(undelivered|undeliverable)/i.test(subject) ||
        /\b(postmaster|mailer-daemon|mail.?delivery.?system)\b/i.test(fromLine)
      ) continue;

      // La frase completa de la keyword debe aparecer en el asunto en el mismo orden (subcadena exacta normalizada)
      const subjectNorm = normalizeText(subject);
      const matchesKeyword = subjectKeywords.some((kw) =>
        subjectNorm.includes(normalizeText(kw)),
      );
      if (!matchesKeyword) continue;

      // Solo descarga el mensaje completo si el asunto coincide
      session.send(`RETR ${i}`);
      const retrResp = await session.readLine();
      if (!retrResp.startsWith('+OK')) continue;

      const rawMsg = await session.readMultiLine();

      try {
        const parsed: ParsedMail = await simpleParser(Buffer.from(rawMsg));

        const bodyText = parsed.text ?? '';
        const bodyHtml = typeof parsed.html === 'string' ? parsed.html : '';
        const emailContent = bodyText || this.stripHtml(bodyHtml);

        if (bodyMustContain && !emailContent.toLowerCase().includes(bodyMustContain.toLowerCase())) {
          continue;
        }

        const pdfs = await extractMatchingPdfs(parsed.attachments ?? [], pdfAttachmentPatterns);

        const from = parsed.from?.text?.trim() ?? '';
        const to = Array.isArray(parsed.to)
          ? parsed.to.map((a) => a.text).join('; ')
          : (parsed.to?.text?.trim() ?? '');
        const dateReceived = parsed.date ? this.formatDateReceived(parsed.date) : '';
        const messageId = parsed.messageId ?? '';

        let parsedFields = parseEmailFields(emailContent, from);
        for (const pdf of pdfs) {
          parsedFields = mergeWithPdfFields(parsedFields, parsePdfActaReparto(pdf.text, pdf.filename));
        }

        results.push({
          uid: String(i),
          messageId,
          from,
          to,
          subject: parsed.subject ?? subject,
          dateReceived,
          parsed: parsedFields,
        });
      } catch {
        // correo malformado, se omite
      }
    }

    session.send('QUIT');
    await session.readLine();

    return results;
  }

  // POP3 no gestiona flags de lectura: la coincidencia ya quedó registrada en BD.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async markAsRead(_uid: string): Promise<void> {
    // no-op
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

// Decodifica encoded-words RFC 2047 (=?UTF-8?B?...?= y =?UTF-8?Q?...?=)
function decodeEncodedWord(s: string): string {
  return s.replace(/=\?([^?]+)\?([BQbq])\?([^?]*)\?=/gi, (_, _charset, enc, text: string) => {
    try {
      let buf: Buffer;
      if (enc.toUpperCase() === 'B') {
        buf = Buffer.from(text, 'base64');
      } else {
        const bytes = text
          .replace(/_/g, ' ')
          .replace(/=([0-9A-Fa-f]{2})/g, (_m: string, hex: string) =>
            String.fromCharCode(parseInt(hex, 16)),
          );
        buf = Buffer.from(bytes, 'binary');
      }
      return buf.toString('utf8');
    } catch {
      return text;
    }
  });
}
