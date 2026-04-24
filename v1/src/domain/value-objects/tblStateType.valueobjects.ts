// Responsabilidad: representar conceptos inmutables del dominio, validando reglas básicas.

export enum TblStateTypeEnum {
  ACTIVE = 'Active',
  INACTIVE = 'Inactive',
}

/** Value Object para la FK a tbl_state_type: garantiza que sea un número entero > 0. */
export class TblStateTypeId {
  private constructor(public readonly value: number) {}

  static create(value: unknown): TblStateTypeId {
    const n = Number(value);
    if (!Number.isInteger(n) || n <= 0) {
      throw new Error('stty_id must be a positive integer');
    }
    return new TblStateTypeId(n);
  }
}