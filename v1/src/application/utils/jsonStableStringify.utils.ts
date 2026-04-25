// Responsabilidad: comparar objetos JSON de forma independiente del orden de claves.

/**
 * Serializa de forma determinística (claves de objeto ordenadas en todos los niveles)
 * para comparar el valor de un campo JSON al detectar duplicados.
 */
export function jsonStableStringify(value: unknown): string {
  if (value === null || value === undefined) {
    return JSON.stringify(value);
  }
  if (typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => jsonStableStringify(v)).join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys
    .map((k) => JSON.stringify(k) + ':' + jsonStableStringify(obj[k]))
    .join(',')}}`;
}
