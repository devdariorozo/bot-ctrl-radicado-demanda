// Respuestas estándar de la API: todo lo que lleva datos se devuelve como { data: T[] }.

export interface DataResponse<T> {
  data: T[];
}

/** Envuelve un único ítem en la forma estándar { data: [item] }. */
export function dataOne<T>(item: T): DataResponse<T> {
  return { data: [item] };
}

/** Envuelve un listado en la forma estándar { data: items }. */
export function dataMany<T>(items: T[]): DataResponse<T> {
  return { data: items ?? [] };
}

/** Respuesta sin ítems (ej. después de DELETE). */
export function dataEmpty(): DataResponse<never> {
  return { data: [] };
}
