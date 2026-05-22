// Responsabilidad: representar conceptos inmutables del dominio, validando reglas básicas.

export enum TblEnvironmentTypeEnum {
  dev = 'dev',
  qa = 'qa',
  pro = 'pro',
}

/** Value Object para la FK a tbl_environment_type: garantiza que sea un número entero > 0. */
export class TblEnvironmentTypeId {
  private constructor(public readonly value: number) {}

  static create(value: unknown): TblEnvironmentTypeId {
    const n = Number(value);
    if (!Number.isInteger(n) || n <= 0) {
      throw new Error('env_id must be a positive integer');
    }
    return new TblEnvironmentTypeId(n);
  }
}

