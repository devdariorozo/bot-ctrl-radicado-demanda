// Responsabilidad: contratos del dominio para company_type (interfaces que la infraestructura debe implementar).

import { CompanyType } from '@domain/entities/companyType.entities';

/** Token para inyección del repositorio (las interfaces no existen en runtime en NestJS). */
export const COMPANY_TYPE_REPOSITORY = Symbol('COMPANY_TYPE_REPOSITORY');

/** Datos mínimos para crear un registro en company_type. */
export type CreateCompanyTypeInput = Pick<
  CompanyType,
  | 'portfolio_type_id'
  | 'campaings_format'
  | 'document_type'
  | 'document_name'
  | 'document_number'
  | 'company_name'
  | 'address'
  | 'contact_number'
  | 'email_notifications'
  | 'detail'
  | 'state_type_id'
> &
  Partial<CompanyType>;

export interface CompanyTypeRepository {
  // Crear un nuevo registro
  create(data: CreateCompanyTypeInput): Promise<CompanyType>;

  // Buscar duplicado por combinación (portfolio_type_id + campaings_format + document_number)
  findByDuplicate(
    portfolio_type_id: number,
    campaings_format: number,
    document_number: string,
  ): Promise<CompanyType | null>;

  // Obtener el primer registro por combinación (portfolio_type_id + campaings_format)
  findFirstByPortfolioAndFormat(
    portfolio_type_id: number,
    campaings_format: number,
  ): Promise<CompanyType | null>;

  // Obtener todos los registros
  findAll(): Promise<CompanyType[]>;

  // Obtener un registro por su id
  findById(id: number): Promise<CompanyType>;

  // Actualizar un registro
  update(data: CompanyType): Promise<CompanyType>;

  // Eliminar un registro
  delete(id: number): Promise<void>;
}

