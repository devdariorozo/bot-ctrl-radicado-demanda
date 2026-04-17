// Responsabilidad: representar conceptos inmutables del dominio, validando reglas básicas.

export enum EnvironmentTypeEnum {
  dev = 'dev',
  qa = 'qa',
  pro = 'pro',
}

/** Value Object para la FK a environment_type: garantiza que sea un número entero > 0. */
export class EnvironmentTypeId {
  private constructor(public readonly value: number) {}

  static create(value: unknown): EnvironmentTypeId {
    const n = Number(value);
    if (!Number.isInteger(n) || n <= 0) {
      throw new Error('environment_type_id must be a positive integer');
    }
    return new EnvironmentTypeId(n);
  }
}

