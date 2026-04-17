// Responsabilidad: representar conceptos inmutables del dominio, validando reglas básicas.

/** Días de la semana en español (almacenados en BD). */
export const DAYS_OF_WEEK_ES = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
] as const;

export type DayOfWeekEs = (typeof DAYS_OF_WEEK_ES)[number];

/** Value Object para el día de la semana: solo Lunes..Domingo. */
export class DayOfWeek {
  private constructor(public readonly value: DayOfWeekEs) {}

  static create(value: unknown): DayOfWeek {
    const s = typeof value === 'string' ? value.trim() : String(value);
    if (!DAYS_OF_WEEK_ES.includes(s as DayOfWeekEs)) {
      throw new Error(
        `days must be one of: ${DAYS_OF_WEEK_ES.join(', ')}`,
      );
    }
    return new DayOfWeek(s as DayOfWeekEs);
  }
}

/** Value Object para la FK a attention_schedule: garantiza que sea un número entero > 0. */
export class AttentionScheduleId {
  private constructor(public readonly value: number) {}

  static create(value: unknown): AttentionScheduleId {
    const n = Number(value);
    if (!Number.isInteger(n) || n <= 0) {
      throw new Error('attention_schedule_id must be a positive integer');
    }
    return new AttentionScheduleId(n);
  }
}