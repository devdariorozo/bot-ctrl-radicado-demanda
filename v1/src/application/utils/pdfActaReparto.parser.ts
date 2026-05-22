// Responsabilidad: extracción de campos desde texto de Acta Individual de Reparto.
// Soporta:
//   Formato 1 — Estándar Rama Judicial (tabla columnar: NÚMERO RADICACIÓN, partes con roles)
//   Formato 2 — LEYSOFT (Armenia y similares, filas con IDENTIFICACION/NOMBRE)
//   Radicado en nombre de archivo: ActaReparto23001418900620260040000.pdf (23 dígitos)

import type { ParsedEmailFields } from '@domain/ports/emailInbox.ports';

export function parsePdfActaReparto(text: string, filename: string): Partial<ParsedEmailFields> {
  const result: Partial<ParsedEmailFields> = {};

  extractRadicado(text, filename, result);
  extractProcessClass(text, result);
  extractCity(text, result);
  extractCourtNameAndSpecialty(text, result);
  extractOfficeNumber(text, result);
  extractDemandante(text, result);
  extractDemandado(text, result);

  return result;
}

// ─── Fusión: completa nulos del correo con datos del PDF ─────────────────────

export function mergeWithPdfFields(
  base: ParsedEmailFields,
  supplement: Partial<ParsedEmailFields>,
): ParsedEmailFields {
  const result = { ...base };
  for (const k of Object.keys(supplement) as (keyof ParsedEmailFields)[]) {
    if ((result[k] === null || result[k] === undefined) && supplement[k] != null) {
      (result as Record<string, unknown>)[k] = supplement[k];
    }
  }
  return result;
}

// ─── Extracción: radicado (number_filed) ─────────────────────────────────────

function extractRadicado(
  text: string,
  filename: string,
  result: Partial<ParsedEmailFields>,
): void {
  // Prioridad: nombre de archivo (ActaReparto23001418900620260040000.pdf)
  const fromFile = filename.match(/\b(\d{23})\b/);
  if (fromFile) { result.number_filed = fromFile[1]; return; }

  // Texto: primer número de exactamente 23 dígitos
  const fromText = text.match(/\b(\d{23})\b/);
  if (fromText) result.number_filed = fromText[1];
}

// ─── Extracción: clase de proceso ────────────────────────────────────────────

function extractProcessClass(text: string, result: Partial<ParsedEmailFields>): void {
  const m = text.match(
    /\b(EJECUTIVO SINGULAR|EJECUTIVO|VERBAL SUMARIO|VERBAL DE MAYOR CUANT[ÍI]A|VERBAL|MONITORIO|DECLARATIVO|ORDINARIO)\b/i,
  );
  if (m) result.process_class = m[1].toUpperCase();
}

// ─── Extracción: ciudad ───────────────────────────────────────────────────────
// Formato estándar: "COMPETENCIAS MÚLTIPLES - CIVIL 004 CARTAGENA"
//                   "COMPETENCIAS MÚLTIPLES 006 MONTERIA"
// Formato LEYSOFT:  "JUZGADOS MUNICIPALES ARMENIA"

function extractCity(text: string, result: Partial<ParsedEmailFields>): void {
  const compet = text.match(
    /COMPETENCIAS\s+M[ÚU]LTIPLES[^A-ZÁÉÍÓÚÜÑ\n\r]*\b([A-ZÁÉÍÓÚÜÑ]{4,}(?:\s+[A-ZÁÉÍÓÚÜÑ]{3,})*)\s*(?:\n|\r|$)/i,
  );
  if (compet) { result.city = compet[1].trim(); return; }

  const juzgMun = text.match(
    /JUZGADOS?\s+MUNICIPALES?\s+(?:DE\s+)?([A-ZÁÉÍÓÚÜÑ]{4,}(?:\s+[A-ZÁÉÍÓÚÜÑ]{3,})*)/i,
  );
  if (juzgMun) result.city = juzgMun[1].trim();
}

// ─── Extracción: nombre del juzgado (court_name) y especialidad (specialty) ──

function extractCourtNameAndSpecialty(text: string, result: Partial<ParsedEmailFields>): void {
  // "JUZGADO CUARTO CIVIL MUNICIPAL" / "JUZGADO PRIMERO DE PEQUEÑAS CAUSAS..."
  const m = text.match(
    /\b(JUZGADO\s+(?:\w+\s+){0,5}(?:CIVIL|PENAL|FAMILIA|LABORAL|MUNICIPAL|ADMINISTRATIVO|PEQUE[ÑN]AS?\s+CAUSAS?)\s*\w*)/i,
  );
  if (!m) return;
  const fullName = m[1].trim().toUpperCase().replace(/\s+/g, ' ');
  // court_name = nombre completo (ej. "JUZGADO CUARTO CIVIL MUNICIPAL")
  if (!result.court_name) result.court_name = fullName;
  // specialty = solo el tipo, sin número ordinal (ej. "CIVIL MUNICIPAL")
  const typeMatch = fullName.match(
    /JUZGADO\s+\w+\s+(?:DE\s+)?(CIVIL\b.*|PENAL\b.*|FAMILIA\b.*|LABORAL\b.*|PEQUE[ÑN]AS?\s+CAUSAS?.*|ADMINISTRATIVO\b.*)/i,
  );
  if (!result.specialty && typeMatch) result.specialty = typeMatch[1].trim();
}

// ─── Extracción: número de despacho (office_name) ────────────────────────────

function extractOfficeNumber(text: string, result: Partial<ParsedEmailFields>): void {
  const m = text.match(/N[ÚU]MERO\s+DESPACHO\s*[:=]?\s*([^\n\r]+)/i);
  if (m) result.office_name = m[1].trim() || null;
}

// ─── Extracción: demandante (NIT empresa) ────────────────────────────────────
// NIT colombiano: 9-10 dígitos que inician con 9, seguido del nombre de empresa

function extractDemandante(text: string, result: Partial<ParsedEmailFields>): void {
  // Captura: "9000975439 CONTACTO SOLUTIONS S.A.S" / "900097543 CONTACTO SOLUTIONS S.A.S."
  const m = text.match(
    /\b(9\d{8,9})\s+([A-ZÁÉÍÓÚÜÑ][A-ZÁÉÍÓÚÜÑ\s.,&]+?(?:S\.?\s*A\.?\s*S\.?|SAS\b|S\.?\s*A\.?\b|LTDA\.?|E\.?\s*U\.?)\.?)/i,
  );
  if (!m) return;

  result.document_type_1 = 'NIT';
  result.document_number_1 = m[1];
  result.artificial_person = m[2].trim().replace(/\s+/g, ' ');
  result.subject_demanding = 'DEMANDANTE O SOLICITANTE';
}

// ─── Extracción: demandado (CC persona) ──────────────────────────────────────
// Estrategia:
//   a) Formato estándar: el demandado es el CC que aparece DESPUÉS del NIT en el texto.
//      Sus nombres (primer nombre) están en la línea con el número;
//      los apellidos aparecen en el bloque posterior separado por "ARCHIVO" o roles.
//   b) Formato LEYSOFT: CC aparece después del NIT, con nombre completo en la misma línea.

function extractDemandado(text: string, result: Partial<ParsedEmailFields>): void {
  // Ancla: posición del NIT en el texto
  const nitMatch = text.match(/\b9\d{8,9}\b/);
  if (!nitMatch || nitMatch.index === undefined) return;
  const afterNit = text.slice(nitMatch.index + nitMatch[0].length);

  // Buscar CC (6-10 dígitos, NO empieza con 9) seguido de nombre
  const ccRe = /\b([1-8]\d{5,9})\s+([A-ZÁÉÍÓÚÜÑ][a-záéíóúüñA-ZÁÉÍÓÚÜÑ]+(?:\s+[A-ZÁÉÍÓÚÜÑ][a-záéíóúüñA-ZÁÉÍÓÚÜÑ]+)+)/;
  const ccMatch = afterNit.match(ccRe);
  if (!ccMatch || ccMatch.index === undefined) return;

  const docNumber = ccMatch[1];
  const firstNames = ccMatch[2].trim();

  // Intentar extraer apellidos del bloque posterior a los id+nombres (formato estándar)
  const afterCC = afterNit.slice(ccMatch.index + ccMatch[0].length);
  const lastName = extractLastName(afterCC);

  result.document_type_2 = 'CC';
  result.document_number_2 = docNumber;
  result.natural_person = lastName ? `${firstNames} ${lastName}` : firstNames;
  result.subject_defendant = 'DEMANDADO';
}

// Busca el primer apellido compuesto real después de la sección de id+nombres.
// Filtra encabezados, roles y líneas de sistema.
function extractLastName(text: string): string | null {
  const excluded =
    /DEFENSOR|DEMANDANTE|DEMANDADO|ARCHIVO|SERVIDOR|PARTE|FECHA|N[ÚU]MERO|NOMBRE|APELLIDO|ACCIONANTE|INDICIADO|C[ÓO]DIGO|JUDICIAL|P[ÁA]GINA|SECRETAR|EMPLEAD/i;

  // Busca primera línea limpia que parezca apellido (2+ palabras, solo letras/tildes)
  const lines = text.split(/[\r\n]+/);
  for (const line of lines) {
    const clean = line.trim();
    if (!clean) continue;
    if (/^\d/.test(clean)) continue; // línea comienza con número
    if (excluded.test(clean)) continue;
    if (/^[A-ZÁÉÍÓÚÜÑ][a-záéíóúüñA-ZÁÉÍÓÚÜÑ]+(?:\s+[A-ZÁÉÍÓÚÜÑ][a-záéíóúüñA-ZÁÉÍÓÚÜÑ]+)+$/.test(clean)) {
      return clean;
    }
  }
  return null;
}
