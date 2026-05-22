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

  async uidl(): Promise<Map<number, string>> {
    this.send('UIDL');
    const resp = await this.readLine();
    if (!resp.startsWith('+OK')) return new Map();
    const raw = await this.readMultiLine();
    const map = new Map<number, string>();
    for (const line of raw.split('\r\n')) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 2) {
        const num = parseInt(parts[0], 10);
        if (!isNaN(num)) map.set(num, parts[1]);
      }
    }
    return map;
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
    knownIds: Set<string> = new Set(),
    batchSize?: number,
  ): Promise<FetchedEmail[]> {
    const host = this.configService.get<string>('MAIL_HOST', '');
    const port = this.configService.get<number>('MAIL_PORT', 995);
    const user = this.configService.get<string>('MAIL_USER', '');
    const pass = this.configService.get<string>('MAIL_PASSWORD', '');
    const timeoutMs = this.getTimeoutMs();
    const resolvedBatchSize = batchSize ?? this.getBatchSize();

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
        void this.runSession(socket, user, pass, subjectKeywords, bodyMustContain, pdfAttachmentPatterns, knownIds, resolvedBatchSize)
          .then((r) => settle(() => resolve(r)))
          .catch((e: Error) => settle(() => reject(e)))
          .finally(() => { try { socket.destroy(); } catch { /* ignore */ } });
      });
    });

    const timeoutMinutes = Math.round(timeoutMs / 60_000);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`POP3 timeout: sin respuesta del servidor en ${timeoutMinutes} minutos`)),
        timeoutMs,
      ),
    );

    return Promise.race([connectPromise, timeoutPromise]);
  }

  private getTimeoutMs(): number {
    const v = this.configService.get<number>('MAIL_POP3_TIMEOUT_MS', 480_000);
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : 480_000;
  }

  private getBatchSize(): number {
    const v = this.configService.get<number>('MAIL_POP3_BATCH_SIZE', 100);
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : 100;
  }

  private async runSession(
    socket: tls.TLSSocket,
    user: string,
    pass: string,
    subjectKeywords: string[],
    bodyMustContain: string,
    pdfAttachmentPatterns: string[],
    knownIds: Set<string>,
    batchSize: number,
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

    // UIDL → lista estable de UIDs del servidor ordenada de más antiguo a más reciente
    const uidlMap = await session.uidl();
    const msgNumbers: number[] =
      uidlMap.size > 0
        ? [...uidlMap.keys()].sort((a, b) => a - b)
        : Array.from({ length: msgCount }, (_, i) => i + 1);

    // Partición en lotes de batchSize para procesamiento incremental con log por lote
    const totalLotes = Math.max(1, Math.ceil(msgNumbers.length / batchSize));

    this.appLogger.structured({
      level: 'log',
      context: 'Pop3InboxAdapter',
      type: 'EMAIL_SYNC',
      status: 'OK',
      message: `Bandeja: ${msgNumbers.length} mensaje(s) en servidor. Procesando en ${totalLotes} lote(s) de ${batchSize}.`,
      meta: { totalMensajes: msgNumbers.length, totalLotes, batchSize },
    });

    for (let loteIdx = 0; loteIdx < totalLotes; loteIdx++) {
      const lote = msgNumbers.slice(loteIdx * batchSize, (loteIdx + 1) * batchSize);
      let loteNuevos = 0;
      let loteOmitidos = 0;

      for (const i of lote) {
        // Descarga solo headers (TOP n 0) para leer Message-ID y asunto sin bajar el cuerpo
        session.send(`TOP ${i} 0`);
        const topResp = await session.readLine();
        if (!topResp.startsWith('+OK')) continue;

        const headerRaw = await session.readMultiLine();

        // Extraer Message-ID del header para verificar si ya está en BD
        const msgIdLine = headerRaw.match(/^Message-ID:\s*(.+)$/im);
        const msgIdHeader = msgIdLine
          ? msgIdLine[1].trim().replace(/^<|>$/g, '').trim()
          : '';

        // Si ya existe en BD, omitir sin descargar el cuerpo
        if (msgIdHeader && knownIds.has(msgIdHeader)) {
          loteOmitidos++;
          continue;
        }

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

        // Solo descarga el mensaje completo si el asunto coincide y no estaba en BD
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

          let parsedFields = parseEmailFields(emailContent, from, to);
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
          loteNuevos++;
        } catch {
          // correo malformado, se omite
        }
      } // fin for (const i of lote)

      this.appLogger.structured({
        level: 'log',
        context: 'Pop3InboxAdapter',
        type: 'EMAIL_SYNC',
        status: 'OK',
        message: `Lote ${loteIdx + 1}/${totalLotes} completado.`,
        meta: {
          lote: loteIdx + 1,
          totalLotes,
          mensajesEnLote: lote.length,
          nuevos: loteNuevos,
          omitidos: loteOmitidos,
        },
      });
    } // fin for loteIdx

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
