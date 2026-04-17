// Responsabilidad: representar conceptos inmutables del dominio, validando reglas básicas.

export enum StateType {
  ACTIVE = 'Active',
  INACTIVE = 'Inactive',
}

/** Value Object para la FK a state_type: garantiza que sea un número entero > 0. */
export class StateTypeId {
  private constructor(public readonly value: number) {}

  static create(value: unknown): StateTypeId {
    const n = Number(value);
    if (!Number.isInteger(n) || n <= 0) {
      throw new Error('state_type_id must be a positive integer');
    }
    return new StateTypeId(n);
  }
}