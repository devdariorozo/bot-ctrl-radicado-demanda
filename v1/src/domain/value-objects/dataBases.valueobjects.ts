// Responsabilidad: representar conceptos inmutables del dominio, validando reglas básicas.

/** Value Object para la FK a data_bases: garantiza que sea un número entero > 0. */
export class DataBasesId {
    private constructor(public readonly value: number) {}
  
    static create(value: unknown): DataBasesId {
      const n = Number(value);
      if (!Number.isInteger(n) || n <= 0) {
        throw new Error('data_bases_id must be a positive integer');
      }
      return new DataBasesId(n);
    }
  }