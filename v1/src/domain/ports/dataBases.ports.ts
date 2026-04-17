// Responsabilidad: contratos del dominio (interfaces) que la infraestructura debe implementar.

import { DataBases } from '@domain/entities/dataBases.entities';

/** Token para inyección del repositorio (las interfaces no existen en runtime en NestJS). */
export const DATABASES_REPOSITORY = Symbol('DATABASES_REPOSITORY');

/** Fila devuelta por la vista v_cities. */
export interface VCitiesRow {
  id: number;
  city_name: string;
  department: string;
  city: string;
}

/** Datos mínimos para crear un registro de bases (id y fechas son opcionales). */
export type CreateDataBasesInput = Pick<
  DataBases,
  'environment_type_id' | 'portfolio_type_id' | 'bases' | 'detail' | 'state_type_id' | 'responsible'
> & Partial<DataBases>;

export interface DataBasesRepository {
  // Crear un nuevo registro de bases
  create(input: CreateDataBasesInput): Promise<DataBases>;
  // Obtener todos los registros de bases
  findAll(): Promise<DataBases[]>;
  // Obtener un registro por su id
  findById(id: number): Promise<DataBases>;
  // Actualizar un registro de bases
  update(dataBases: DataBases): Promise<DataBases>;
  // Eliminar un registro de bases
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

