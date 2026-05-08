// Responsabilidad: extracción de campos estructurados desde el cuerpo de correos judiciales.
// Soporta dos formatos:
//   Formato A — correo inline de juzgado (DEMANDANTE/DEMANDADO en línea, SEÑOR JUZGADO...)
//   Formato B — correo estructurado "Demanda en Línea" (Tipo Sujeto:, Departamento:, ...)

import { ParsedEmailFields } from '@domain/ports/emailInbox.ports';

// ─── Punto de entrada público ─────────────────────────────────────────────────

export function parseEmailFields(content: string, from?: string): ParsedEmailFields {
  const fields = isStructuredFormat(content)
    ? parseStructuredFormat(content)
    : parseInlineFormat(content, from);

  if (!fields.number_filed) {
    fields.number_filed = extractFiledNumber(content);
  }

  return fields;
}

// ─── Detección de formato ─────────────────────────────────────────────────────

function isStructuredFormat(content: string): boolean {
  return /Tipo\s+Sujeto\s*:/i.test(content);
}

// ─── Formato B: "Demanda en Línea" — campos etiquetados ──────────────────────

function parseStructuredFormat(content: string): ParsedEmailFields {
  const demandanteIdx = content.search(/Tipo\s+Sujeto\s*:\s*DEMANDANTE/i);
  const demandadoIdx  = content.search(/Tipo\s+Sujeto\s*:\s*DEMANDADO/i);

  const demandanteSection =
    demandanteIdx >= 0
      ? content.slice(demandanteIdx, demandadoIdx > demandanteIdx ? demandadoIdx : content.length)
      : '';
  const demandadoSection = demandadoIdx >= 0 ? content.slice(demandadoIdx) : '';

  const demandanteDoc = extractDocumentFields(demandanteSection);
  const demandadoDoc  = extractDocumentFields(demandadoSection);

  return {
    departament:      extractField(content, 'Departamento'),
    city:             extractField(content, 'Ciudad'),
    locality:         extractField(content, 'Localidad') ?? 'SIN LOCALIDAD',
    specialty:        extractField(content, 'Especialidad'),
    process_class:    extractField(content, 'Clase de Proceso'),
    subject_demanding:  demandanteSection ? 'DEMANDANTE O SOLICITANTE' : null,
    artificial_person:  extractField(demandanteSection, 'Persona Jur[ií]dica'),
    document_type_1:    demandanteDoc.type,
    document_number_1:  demandanteDoc.number,
    email_1:            extractField(demandanteSection, 'Correo Electr[oó]nico'),
    address_1:          extractField(demandanteSection, 'Direcci[oó]n'),
    phone_number_1:     extractField(demandanteSection, 'Tel[eé]fono'),
    subject_defendant:  demandadoSection ? 'DEMANDADO' : null,
    natural_person:     extractField(demandadoSection, 'Persona Natural'),
    document_type_2:    demandadoDoc.type,
    document_number_2:  demandadoDoc.number,
    email_2:            extractField(demandadoSection, 'Correo Electr[oó]nico'),
    address_2:          extractField(demandadoSection, 'Direcci[oó]n'),
    phone_number_2:     extractField(demandadoSection, 'Tel[eé]fono'),
    number_filed:       null,
  };
}

// ─── Formato A: correo inline/reenviado de juzgado ────────────────────────────

function parseInlineFormat(content: string, from?: string): ParsedEmailFields {
  // Ciudad y departamento desde "... CIUDAD - DEPARTAMENTO (REPARTO)"
  // Paso 1: buscar patrón "DE CIUDAD - DEPTO (REPARTO)" — descarta prefijos largos como "CAUSAS MULTIPLES DE"
  // Paso 2: si no hay DE, buscar patrón simple "CIUDAD - DEPTO (REPARTO)" con límite de 3 palabras
  let city: string | null = null;
  let departament: string | null = null;
  const repMatchDE = content.match(
    /\bDE\s+([A-ZÁÉÍÓÚÜÑ]+(?:[ \t][A-ZÁÉÍÓÚÜÑ]+){0,2})[ \t]*-[ \t]*([A-ZÁÉÍÓÚÜÑ]+(?:[ \t][A-ZÁÉÍÓÚÜÑ]+){0,2})[ \t]*\(REPARTO\)/i,
  );
  const repMatchSimple = !repMatchDE
    ? content.match(
        /\b([A-ZÁÉÍÓÚÜÑ]+(?:[ \t][A-ZÁÉÍÓÚÜÑ]+){0,2})[ \t]*-[ \t]*([A-ZÁÉÍÓÚÜÑ]+(?:[ \t][A-ZÁÉÍÓÚÜÑ]+){0,2})[ \t]*\(REPARTO\)/i,
      )
    : null;
  const repMatch = repMatchDE ?? repMatchSimple;
  if (repMatch) {
    city        = cleanValue(repMatch[1]);
    departament = cleanValue(repMatch[2]);
  } else if (from) {
    // Fallback: extraer de nombre del remitente "NOMBRE - DEPTO - CIUDAD <email>"
    const fallback = extractCityDeptFromFrom(from);
    city        = fallback.city;
    departament = fallback.departament;
  }

  // Especialidad desde firma "Juzgado NN [tipo] de [Ciudad]" + cuantía en asunto/cuerpo
  let specialty: string | null = null;
  // (?:de\s+)? salta el "de" cuando aparece entre número y tipo (ej. "Juzgado 01 de Pequeñas Causas...")
  const juzgadoMatch = content.match(/Juzgado\s+\d+\s+(?:de\s+)?(.+?)\s+de\s+[A-ZÁÉÍÓÚÜ][a-záéíóú]/);
  if (juzgadoMatch) {
    const juzgadoType = juzgadoMatch[1].trim().toUpperCase();
    const cuantiaMatch = content.match(/\b(M[ÍI]NIMA|MENOR|MAYOR|[ÚU]NICA)\s+CUANT[ÍI]A/i);
    if (cuantiaMatch) {
      const cuantia = cuantiaMatch[0]
        .toUpperCase()
        .replace(/\bMINIMA\b/, 'MÍNIMA')
        .replace(/\bUNICA\b/, 'ÚNICA');
      specialty = `${juzgadoType} – ${cuantia}`; // – en-dash
    } else {
      specialty = juzgadoType;
    }
  }

  // Partes inline: "DEMANDANTE: NOMBRE TIPO_DOC NUM" / "DEMANDADO: ..."
  const demandanteLine = content.match(/^DEMANDANTE:\s*(.+)/im);
  const demandadoLine  = content.match(/^DEMANDADO:\s*(.+)/im);

  const demandanteParty = demandanteLine ? parseInlineParty(demandanteLine[1]) : null;
  const demandadoParty  = demandadoLine  ? parseInlineParty(demandadoLine[1])  : null;

  // email_1: mención explícita "correo: usuario@dominio" en el cuerpo
  const email1Match = content.match(
    /correo[:\s]+([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/i,
  );

  return {
    departament,
    city,
    locality:           'SIN LOCALIDAD',
    specialty,
    process_class:      null,
    subject_demanding:  demandanteLine ? 'DEMANDANTE O SOLICITANTE' : null,
    artificial_person:  demandanteParty?.name    ?? null,
    document_type_1:    demandanteParty?.docType  ?? null,
    document_number_1:  demandanteParty?.docNumber ?? null,
    email_1:            email1Match?.[1] ?? null,
    address_1:          null,
    phone_number_1:     null,
    subject_defendant:  demandadoLine ? 'DEMANDADO' : null,
    natural_person:     demandadoParty?.name    ?? null,
    document_type_2:    demandadoParty?.docType  ?? null,
    document_number_2:  demandadoParty?.docNumber ?? null,
    email_2:            null,
    address_2:          null,
    phone_number_2:     null,
    number_filed:       null,
  };
}

// ─── Extracción de parte inline "NOMBRE TIPO DOC" ────────────────────────────

function parseInlineParty(text: string): {
  name: string | null;
  docType: string | null;
  docNumber: string | null;
} {
  const docPattern = /\b(C\.?C\.?|NIT|C\.?E\.?|T\.?I\.?|P\.?A\.?|P\.?P\.?)\s*\.?\s*([\d.,\-]+)/i;
  const match = text.match(docPattern);
  if (!match) return { name: cleanValue(text), docType: null, docNumber: null };

  const name    = cleanValue(text.slice(0, match.index!).trim()) ?? null;
  const rawType = match[1].replace(/\./g, '').toUpperCase();
  const rawNum  = match[2];
  const docNumber = rawType === 'NIT' ? formatNitNumber(rawNum) : cleanValue(rawNum);

  return { name, docType: rawType, docNumber };
}

// ─── Helpers compartidos ──────────────────────────────────────────────────────

// Extrae ciudad y departamento del nombre del remitente: "NOMBRE - DEPTO - CIUDAD <email>"
function extractCityDeptFromFrom(from: string): { city: string | null; departament: string | null } {
  const displayName = from.replace(/<[^>]+>/g, '').replace(/"/g, '').trim();
  const parts = displayName.split(/\s*-\s*/);
  if (parts.length >= 3) {
    return {
      departament: cleanValue(parts[parts.length - 2]),
      city: cleanValue(parts[parts.length - 1]),
    };
  }
  return { city: null, departament: null };
}

function extractField(text: string, label: string): string | null {
  // [ \t]* en lugar de \s* para que un campo vacío (solo newline tras el colon) devuelva null
  // y no capture la etiqueta de la siguiente línea como valor.
  const regex = new RegExp(`${label}[^:\\n\\r]*:[ \\t]*([^\\n\\r]+)`, 'i');
  const match = text.match(regex);
  return match ? cleanValue(match[1]) : null;
}

function extractDocumentFields(text: string): { type: string | null; number: string | null } {
  // Formato estructurado: "Documento: NIT - 9000975439," o "Documento: CC - 73006178"
  const structured = text.match(/Documento:\s*([A-Z]+)\s*[-–]\s*([\d.,\-]+)/i);
  if (structured) {
    const rawType = structured[1].trim().toUpperCase();
    const rawNum  = structured[2];
    return {
      type:   rawType,
      number: rawType === 'NIT' ? formatNitNumber(rawNum) : cleanValue(rawNum),
    };
  }
  // Formato inline: "C.C 72261493" o "NIT 9000975439" sueltos
  const inline = text.match(/\b(C\.?C\.?|NIT|C\.?E\.?|T\.?I\.?|P\.?A\.?)\s*\.?\s*(\d{5,})/i);
  if (inline) {
    const rawType = inline[1].replace(/\./g, '').toUpperCase();
    const rawNum  = inline[2];
    return {
      type:   rawType,
      number: rawType === 'NIT' ? formatNitNumber(rawNum) : cleanValue(rawNum),
    };
  }
  return { type: null, number: null };
}

// NIT colombiano: 10 dígitos → XXX.XXX.XXX-X  (9 dígitos base + 1 dígito verificador)
function formatNitNumber(raw: string): string {
  if (/[.\-]/.test(raw)) return raw; // ya tiene formato
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }
  return raw;
}

// ─── Extracción: número de radicado ──────────────────────────────────────────
// Variante A — 23 dígitos directos: "radicado asignado ... es el 05001418900620260027500"
// Variante B — con guiones (sin guiones = 23 dígitos): "radicación 255944089001-2026-00038-00"
// Variante C — con etiqueta explícita: "El radicado de la demanda es: 63001400300420260032000"
// Fallback   — cualquier secuencia de exactamente 23 dígitos en el texto

function extractFiledNumber(content: string): string | null {
  // Busca "radicado" o "radicación" + hasta 60 chars no-dígito + número (con o sin guiones)
  const contextRe = /\b(?:radicad[oa]|radicaci[oó]n)\b[^0-9\n\r]{0,60}([0-9][0-9\-]{18,30})/gi;
  for (const m of content.matchAll(contextRe)) {
    const digits = m[1].replace(/\D/g, '');
    if (digits.length === 23) return digits;
  }

  // Fallback: primer número de exactamente 23 dígitos en el texto
  const standalone = content.match(/\b(\d{23})\b/);
  if (standalone) return standalone[1];

  return null;
}

function cleanValue(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const v = raw.trim().replace(/,$/, '').trim(); // elimina coma final de campos como "9000975439,"
  if (!v || v === '-') return null;
  return v;
}
