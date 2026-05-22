// Responsabilidad: contrato de dominio para la bandeja de entrada de correo.

export const EMAIL_INBOX_PORT = Symbol('EMAIL_INBOX_PORT');

export interface ParsedEmailFields {
  departament: string | null;
  city: string | null;
  locality: string | null;
  court_name: string | null;
  specialty: string | null;
  office_name: string | null;
  process_class: string | null;
  subject_demanding: string | null;
  artificial_person: string | null;
  document_type_1: string | null;
  document_number_1: string | null;
  email_1: string | null;
  address_1: string | null;
  phone_number_1: string | null;
  subject_defendant: string | null;
  natural_person: string | null;
  document_type_2: string | null;
  document_number_2: string | null;
  email_2: string | null;
  address_2: string | null;
  phone_number_2: string | null;
  number_filed: string | null;
}

export interface FetchedEmail {
  uid: string;
  messageId: string;
  from: string;
  to: string;
  dateReceived: string;
  subject: string;
  parsed: ParsedEmailFields;
}

export interface EmailInboxPort {
  /**
   * Busca correos cuyo asunto contenga alguna de las palabras clave
   * Y cuyo cuerpo contenga bodyMustContain.
   * pdfAttachmentPatterns: substrings a buscar en nombres de archivo PDF adjunto.
   * knownIds: Message-IDs ya persistidos en BD; el adaptador los omite sin descargar el cuerpo.
   * batchSize: máximo de mensajes nuevos (no presentes en knownIds) a escanear por ciclo.
   * Devuelve de más reciente a más antiguo dentro del lote procesado.
   */
  fetchMatchingEmails(
    subjectKeywords: string[],
    bodyMustContain: string,
    pdfAttachmentPatterns: string[],
    knownIds?: Set<string>,
    batchSize?: number,
  ): Promise<FetchedEmail[]>;

  markAsRead(uid: string): Promise<void>;
}
