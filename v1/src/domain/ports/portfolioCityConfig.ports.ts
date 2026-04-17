// Responsabilidad: contratos del dominio (interfaces) que la infraestructura debe implementar.

import { PortfolioCityConfig } from '@domain/entities/portfolioCityConfig.entities';

/** Token para inyección del repositorio (las interfaces no existen en runtime en NestJS). */
export const PORTFOLIO_CITY_CONFIG_REPOSITORY = Symbol('PORTFOLIO_CITY_CONFIG_REPOSITORY');

/** Datos mínimos para crear una configuración (id y fechas son opcionales). */
export type CreatePortfolioCityConfigInput = Pick<
  PortfolioCityConfig,
  | 'id_data_bases'
  | 'id_city_views'
  | 'name_departament'
  | 'city'
  | 'name_city'
  | 'detail'
  | 'state_type_id'
  | 'responsible'
> &
  Partial<PortfolioCityConfig>;

export interface PortfolioCityConfigRepository {
  create(input: CreatePortfolioCityConfigInput): Promise<PortfolioCityConfig>;
  findAll(): Promise<PortfolioCityConfig[]>;
  findById(id: number): Promise<PortfolioCityConfig>;
  findByDataBasesAndCityViews(
    id_data_bases: number,
    id_city_views: number,
  ): Promise<PortfolioCityConfig | null>;
  /** Todas las configuraciones para un id_data_bases (para cruce con BDs externas). */
  findByDataBases(id_data_bases: number): Promise<PortfolioCityConfig[]>;
  update(config: PortfolioCityConfig): Promise<PortfolioCityConfig>;
  delete(id: number): Promise<void>;
}
