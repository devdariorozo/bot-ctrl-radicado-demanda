// Responsabilidad: representar conceptos inmutables del dominio, validando reglas básicas.

export const DAYS_OF_WEEK_EN = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

export type DayOfWeekEn = (typeof DAYS_OF_WEEK_EN)[number];

export class TblAttentionScheduleId {
  private constructor(public readonly value: number) {}

  static create(value: unknown): TblAttentionScheduleId {
    const n = Number(value);
    if (!Number.isInteger(n) || n <= 0) {
      throw new Error('atsh_id must be a positive integer');
    }
    return new TblAttentionScheduleId(n);
  }
}
