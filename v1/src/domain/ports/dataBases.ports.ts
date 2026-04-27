// Responsabilidad: contratos del dominio (interfaces) que la infraestructura debe implementar.

import { BasesConfig, DataBases } from '@domain/entities/dataBases.entities';

/** Token para inyección del repositorio (las interfaces no existen en runtime en NestJS). */
export const DATABASES_REPOSITORY = Symbol('DATABASES_REPOSITORY');

/** Fila devuelta por la vista v_cities. */
export interface VCitiesRow {
  id: number;
  city_name: string;
  department: string;
  city: string;
}

/** Datos mínimos para crear un registro de bases (db_id y fechas son opcionales). */
export type CreateDataBasesInput = Pick<
  DataBases,
  'db_environment_type_id' | 'db_portfolio_type_id' | 'db_bases' | 'db_detail' | 'db_state_type_id' | 'db_responsible'
> & Partial<DataBases>;

export interface DataBasesRepository {
  create(input: CreateDataBasesInput): Promise<DataBases>;
  /** Mismo valor JSON (orden de claves ignorado) que `db_bases`, o null. */
  findByDuplicateBases(bases: BasesConfig): Promise<DataBases | null>;
  /** Unicidad funcional: 1 registro por (entorno, cartera). */
  findByEnvAndPortfolio(
    db_environment_type_id: number,
    db_portfolio_type_id: number,
  ): Promise<DataBases | null>;
  findAll(): Promise<DataBases[]>;
  findById(id: number): Promise<DataBases>;
  update(dataBases: DataBases): Promise<DataBases>;
  delete(id: number): Promise<void>;
  /** Consultar la vista v_cities en la primera base del registro data_bases indicado. */
  fetchVCitiesFromFirstBase(idDataBases: number): Promise<VCitiesRow[]>;
  /** Ejecutar una consulta SQL en una base externa (nombre en backticks). Parámetros opcionales. */
  runQueryOnBase(
    baseName: string,
    sql: string,
    params?: unknown[],
  ): Promise<Record<string, unknown>[]>;
}
