// Responsabilidad: genera combinaciones de nombre para búsqueda en portal judicial.
// Incluye variantes S↔Z, normalización de acentos y combinaciones de tokens.

export function generateNameVariants(fullName: string): string[] {
  if (!fullName?.trim() || fullName.trim() === '-') return [];

  const normalized = normalize(fullName.trim().toUpperCase());
  const parts = normalized.split(/\s+/).filter(Boolean);

  if (parts.length === 0) return [];

  const base = new Set<string>();
  base.add(parts.join(' '));

  if (parts.length === 2) {
    base.add(`${parts[0]} ${parts[1]}`);
  } else if (parts.length === 3) {
    // Puede ser: nombre apellido1 apellido2  |  nombre1 nombre2 apellido
    base.add(`${parts[0]} ${parts[2]}`);
    base.add(`${parts[0]} ${parts[1]}`);
    base.add(`${parts[0]} ${parts[1]} ${parts[2]}`);
  } else if (parts.length >= 4) {
    // Asume: nombre1 nombre2 apellido1 apellido2
    base.add(`${parts[0]} ${parts[2]}`);
    base.add(`${parts[0]} ${parts[3]}`);
    base.add(`${parts[0]} ${parts[1]} ${parts[2]}`);
    base.add(`${parts[0]} ${parts[2]} ${parts[3]}`);
    base.add(`${parts[0]} ${parts[1]} ${parts[2]} ${parts[3]}`);
  }

  const withSZ: string[] = [];
  for (const name of base) {
    withSZ.push(name);
    for (const v of szVariants(name)) withSZ.push(v);
  }

  const unique = [...new Set(withSZ)].filter(Boolean);
  const fullNorm = parts.join(' ');

  unique.sort((a, b) => {
    if (a === fullNorm) return -1;
    if (b === fullNorm) return 1;
    return b.length - a.length;
  });

  return unique;
}

function szVariants(name: string): string[] {
  const variants: string[] = [];
  if (/S/.test(name)) variants.push(name.replace(/S/g, 'Z'));
  if (/Z/.test(name)) variants.push(name.replace(/Z/g, 'S'));
  return variants.filter((v) => v !== name);
}

export function normalize(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractYear(dateReceived: string): string {
  const m = dateReceived?.match(/\b(20\d{2})\b/);
  return m ? m[1] : new Date().getFullYear().toString();
}

export function extractProcessCode(processClass: string): string {
  const m = processClass?.match(/^(\d[\d\-]+\d|\d+)/);
  return m ? m[1].replace(/\D/g, '') : '';
}
