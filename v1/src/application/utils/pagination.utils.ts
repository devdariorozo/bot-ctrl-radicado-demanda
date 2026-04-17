// Responsabilidad: utilidades de paginación reutilizables en los controllers.
//
// Nota: se implementa paginación en memoria a partir de un array completo.
// Para los tamaños de tablas que manejamos en este MVP es suficiente
// y simplifica mantener la lógica de dominio en los services.

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

function sanitizeNumber(value: unknown, defaultValue: number): number {
  const num = typeof value === 'string' ? Number(value) : (value as number);
  if (!Number.isFinite(num) || num <= 0) return defaultValue;
  return Math.floor(num);
}

export function paginateArray<T>(
  items: T[],
  page: number | string | undefined,
  limit: number | string | undefined,
  defaultPage = 1,
  defaultLimit = 10,
): PaginatedResult<T> {
  const safePage = sanitizeNumber(page, defaultPage);
  const safeLimit = sanitizeNumber(limit, defaultLimit);

  const start = (safePage - 1) * safeLimit;
  const end = start + safeLimit;

  const data = items.slice(start, end);

  return {
    data,
    meta: {
      total: items.length,
      page: safePage,
      limit: safeLimit,
    },
  };
}

