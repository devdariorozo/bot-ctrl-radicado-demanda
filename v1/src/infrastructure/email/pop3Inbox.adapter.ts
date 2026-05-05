// Responsabilidad: adaptador POP3 para la bandeja de entrada de correo.
// "Marcar como leído" en POP3 = DELE (borrar del servidor al hacer QUIT).
// Si no hay coincidencia, el correo permanece intacto en el servidor.

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { simpleParser } from 'mailparser';
import type { ParsedMail } from 'mailparser';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const POP3Client = require('poplib') as new (
  port: number,
  host: string,
  opts: { enabletls?: boolean; ignoretlserrs?: boolean; debug?: boolean },
) => NodeJS.EventEmitter & {
  login(user: string, pass: string): void;
  list(msgNumber?: number): void;
  retr(msgNumber: number): void;
  dele(msgNumber: number): void;
  quit(): void;
};

import { EmailInboxPort, FetchedEmail, ParsedEmailFields } from '@domain/ports/emailInbox.ports';
import { AppLogger } from '@infrastructure/logging/appLogger.service';

@Injectable()
export class Pop3InboxAdapter implements EmailInboxPort {
  constructor(
    private readonly configService: ConfigService,
    private readonly appLogger: AppLogger,
  ) {}

  async fetchMatchingEmails(
    subjectKeywords: string[],
    bodyMustContain: string,
  ): Promise<FetchedEmail[]> {
    const host = this.configService.get<string>('MAIL_HOST', '');
    const port = this.configService.get<number>('MAIL_PORT', 995);
    const user = this.configService.get<string>('MAIL_USER', '');
    const pass = this.configService.get<string>('MAIL_PASSWORD', '');

    return new Promise<FetchedEmail[]>((resolve, reject) => {
      const results: FetchedEmail[] = [];
      let msgNumbers: number[] = [];
      let currentIndex = 0;

      const client = new POP3Client(Number(port), host, {
        enabletls: true,
        ignoretlserrs: false,
        debug: false,
      });

      const finish = () => client.quit();

      client.on('error', (err: Error) => reject(err));

      client.on('connect', (status: boolean) => {
        if (!status) return reject(new Error('POP3 connect failed'));
        client.login(user, pass);
      });

      client.on('login', (status: boolean) => {
        if (!status) return reject(new Error('POP3 login failed'));
        client.list();
      });

      // list() sin argumento → status, msgcount, undefined, returnValue (array indexado por nro mensaje), rawdata
      client.on(
        'list',
        (status: boolean, msgcount: number, _msgnumber: unknown, returnValue: unknown[]) => {
          if (!status || msgcount === 0) return finish();

          // Construir lista de números de mensaje de menor a mayor (más antiguo primero)
          msgNumbers = [];
          for (let i = 1; i <= returnValue.length; i++) {
            if (returnValue[i] !== undefined) msgNumbers.push(i);
          }
          if (msgNumbers.length === 0) return finish();

          currentIndex = 0;
          client.retr(msgNumbers[currentIndex]);
        },
      );

      client.on(
        'retr',
        (status: boolean, msgnumber: number, data: string) => {
          const processNext = () => {
            currentIndex++;
            if (currentIndex < msgNumbers.length) {
              client.retr(msgNumbers[currentIndex]);
            } else {
              finish();
            }
          };

          if (!status || !data) return processNext();

          // Parsear el correo de forma asíncrona, luego continuar
          simpleParser(Buffer.from(data))
            .then((parsed: ParsedMail) => {
              const subject = parsed.subject ?? '';
              const matchesKeyword = subjectKeywords.some((kw) =>
                subject.toLowerCase().includes(kw.toLowerCase()),
              );
              if (!matchesKeyword) return processNext();

              const bodyText = parsed.text ?? '';
              const bodyHtml = typeof parsed.html === 'string' ? parsed.html : '';
              const content = bodyText || this.stripHtml(bodyHtml);

              if (!content.toLowerCase().includes(bodyMustContain.toLowerCase())) {
                return processNext();
              }

              const from = parsed.from?.text?.trim() ?? '';
              const to = Array.isArray(parsed.to)
                ? parsed.to.map((a) => a.text).join('; ')
                : (parsed.to?.text?.trim() ?? '');
              const dateReceived = parsed.date ? this.formatDateReceived(parsed.date) : '';
              const messageId = parsed.messageId ?? '';

              results.push({
                uid: String(msgnumber),
                messageId,
                from,
                to,
                subject,
                dateReceived,
                parsed: this.parseEmailFields(content),
              });

              processNext();
            })
            .catch(() => processNext());
        },
      );

      client.on('quit', (_status: boolean) => resolve(results));
    });
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

  private extractSectionContent(
    text: string,
    startPattern: string,
    endPatterns: string[],
  ): string {
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
    const demandanteSection = this.extractSectionContent(
      content,
      'DEMANDANTE|SOLICITANTE',
      ['DEMANDADO'],
    );
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
