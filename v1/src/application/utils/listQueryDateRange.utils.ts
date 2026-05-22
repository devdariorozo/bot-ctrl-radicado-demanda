// Responsabilidad: `start_date` / `end_date` (YYYY-MM-DD) de listar queryParams.
// Filtro por rango: solo aplica si ambas vienen; si no envías ninguna, no filtra.
// Si envías solo una, 400. Mensajes en español, breves, para toasts.
// (No mezclar con paginación.)

import { BadRequestException } from '@nestjs/common';

const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;

const FIELD_USER_LABEL: Record<'start_date' | 'end_date', string> = {
  start_date: 'Fecha inicial',
  end_date: 'Fecha final',
};

function isCalendarDateConsistent(d: Date, y: number, month0: number, day: number): boolean {
  if (Number.isNaN(d.getTime())) return false;
  return d.getFullYear() === y && d.getMonth() === month0 && d.getDate() === day;
}

function isPresent(value: string | undefined): boolean {
  if (value === undefined || value === null) return false;
  return value.trim().length > 0;
}

/**
 * Listar: sin ambas query params (vacías) no aplica filtro de fechas.
 * Con solo una, 400; con ambas, rango y validación completa.
 */
export function getListQueryDateRange(
  startStr: string | undefined,
  endStr: string | undefined,
): { start: Date | undefined; end: Date | undefined } {
  const hasStart = isPresent(startStr);
  const hasEnd = isPresent(endStr);

  if (!hasStart && !hasEnd) {
    return { start: undefined, end: undefined };
  }
  if (hasStart && !hasEnd) {
    toStartOfListDayOr400(startStr, 'start_date');
    throw new BadRequestException('Falta la fecha final.');
  }
  if (!hasStart && hasEnd) {
    toEndOfListDayOr400(endStr, 'end_date');
    throw new BadRequestException('Falta la fecha inicial.');
  }

  const start = toStartOfListDayOr400(startStr, 'start_date')!;
  const end = toEndOfListDayOr400(endStr, 'end_date')!;
  if (start.getTime() > end.getTime()) {
    throw new BadRequestException('La fecha final no puede ser menor a la fecha inicial.');
  }
  return { start, end };
}

function toStartOfListDayOr400(
  value: string | undefined,
  field: 'start_date' | 'end_date',
): Date | undefined {
  if (value === undefined || value === null) return undefined;
  const t = value.trim();
  if (t.length === 0) return undefined;
  const m = t.match(YMD);
  if (!m) {
    throw new BadRequestException(
      `${FIELD_USER_LABEL[field]}: use el formato AAAA-MM-DD.`,
    );
  }
  const y = Number(m[1]);
  const month0 = Number(m[2]) - 1;
  const d = Number(m[3]);
  const out = new Date(y, month0, d, 0, 0, 0, 0);
  if (!isCalendarDateConsistent(out, y, month0, d)) {
    throw new BadRequestException(`${FIELD_USER_LABEL[field]} no es válida.`);
  }
  return out;
}

function toEndOfListDayOr400(
  value: string | undefined,
  field: 'start_date' | 'end_date',
): Date | undefined {
  if (value === undefined || value === null) return undefined;
  const t = value.trim();
  if (t.length === 0) return undefined;
  const m = t.match(YMD);
  if (!m) {
    throw new BadRequestException(
      `${FIELD_USER_LABEL[field]}: use el formato AAAA-MM-DD.`,
    );
  }
  const y = Number(m[1]);
  const month0 = Number(m[2]) - 1;
  const d = Number(m[3]);
  const mid = new Date(y, month0, d, 12, 0, 0, 0);
  if (!isCalendarDateConsistent(mid, y, month0, d)) {
    throw new BadRequestException(`${FIELD_USER_LABEL[field]} no es válida.`);
  }
  return new Date(y, month0, d, 23, 59, 59, 999);
}
