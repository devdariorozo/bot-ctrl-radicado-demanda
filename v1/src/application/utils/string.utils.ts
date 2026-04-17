/**
 * Deja la primera letra del texto en mayúscula (capital).
 * Ejemplo: "este es un nuevo registro" → "Este es un nuevo registro"
 */
export function capitalizeFirstWord(value: string): string {
  if (value == null || typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (trimmed.length === 0) return trimmed;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}
