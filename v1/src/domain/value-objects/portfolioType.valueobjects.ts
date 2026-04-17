// Responsabilidad: representar conceptos inmutables del dominio, validando reglas básicas.

export enum PortfolioType {
  PROPIAS = 'Propias',
  SUDA_MERIS = 'Sudameris',
}

/** Value Object para la FK a portfolio_type: garantiza que sea un número entero > 0. */
export class PortfolioTypeId {
  private constructor(public readonly value: number) {}

  static create(value: unknown): PortfolioTypeId {
    const n = Number(value);
    if (!Number.isInteger(n) || n <= 0) {
      throw new Error('portfolio_type_id must be a positive integer');
    }
    return new PortfolioTypeId(n);
  }
}