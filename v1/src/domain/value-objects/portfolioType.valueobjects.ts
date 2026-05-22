// Responsabilidad: representar conceptos inmutables del dominio, validando reglas básicas.

export enum TblPortfolioTypeEnum {
  PROPIAS = 'Propias',
  SUDAMERIS = 'Sudameris',
}

export class TblPortfolioTypeId {
  private constructor(public readonly value: number) {}

  static create(value: unknown): TblPortfolioTypeId {
    const n = Number(value);
    if (!Number.isInteger(n) || n <= 0) {
      throw new Error('porty_id must be a positive integer');
    }
    return new TblPortfolioTypeId(n);
  }
}
