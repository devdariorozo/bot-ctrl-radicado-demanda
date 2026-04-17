// Responsabilidad: representar conceptos inmutables del dominio, validando reglas básicas.

/** Value Object para id_city_views: garantiza que sea un número entero >= 0. */
export class CityViewsId {
  private constructor(public readonly value: number) {}

  static create(value: unknown): CityViewsId {
    const n = Number(value);
    if (!Number.isInteger(n) || n < 0) {
      throw new Error('id_city_views must be a non-negative integer');
    }
    return new CityViewsId(n);
  }
}
