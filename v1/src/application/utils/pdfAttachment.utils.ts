// Responsabilidad: extracción de texto desde adjuntos PDF de correo.
// Coincidencia de nombre de archivo por substring insensible a mayúsculas.
// Ejemplo: patrón "Municipal.pdf" coincide con "1669Municipal.pdf";
//          patrón "ActaReparto"   coincide con "ActaReparto.pdf" y "ActaReparto23001...pdf".

import type { Attachment } from 'mailparser';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>;

export interface ExtractedPdf {
  filename: string;
  text: string;
}

export async function extractMatchingPdfs(
  attachments: Attachment[],
  patterns: string[],
): Promise<ExtractedPdf[]> {
  if (!patterns.length || !attachments.length) return [];

  const results: ExtractedPdf[] = [];

  for (const att of attachments) {
    const filename = att.filename ?? '';
    if (!filename.toLowerCase().endsWith('.pdf')) continue;

    const matches = patterns.some((p) => filename.toLowerCase().includes(p.toLowerCase()));
    if (!matches) continue;

    try {
      const buf = Buffer.isBuffer(att.content)
        ? att.content
        : Buffer.from(att.content as unknown as ArrayBuffer);
      const parsed = await pdfParse(buf);
      if (parsed.text?.trim()) {
        results.push({ filename, text: parsed.text.trim() });
      }
    } catch {
      // PDF ilegible o corrupto — se omite sin interrumpir el flujo
    }
  }

  return results;
}
