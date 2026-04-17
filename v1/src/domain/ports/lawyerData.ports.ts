// Responsabilidad: contratos de dominio para lawyer_data.

import { LawyerData } from '@domain/entities/lawyerData.entities';

export const LAWYER_DATA_REPOSITORY = Symbol('LAWYER_DATA_REPOSITORY');

export type CreateLawyerDataInput = Pick<
  LawyerData,
  | 'portfolio_type_id'
  | 'document_type'
  | 'document_name'
  | 'document_number'
  | 'first_name'
  | 'second_name'
  | 'first_last_name'
  | 'second_last_name'
  | 'address'
  | 'contact_number'
  | 'email_notifications'
  | 'detail'
  | 'state_type_id'
> &
  Partial<LawyerData>;

export interface LawyerDataRepository {
  create(data: CreateLawyerDataInput): Promise<LawyerData>;

  // Duplicado por combinación portfolio_type_id + document_type + document_number
  findByDuplicate(
    portfolio_type_id: number,
    document_type: string,
    document_number: string,
  ): Promise<LawyerData | null>;

  /** Primer registro activo por cartera (automatización fase apoderado). */
  findFirstByPortfolioTypeId(portfolio_type_id: number): Promise<LawyerData | null>;

  findAll(): Promise<LawyerData[]>;

  findById(id: number): Promise<LawyerData>;

  update(data: LawyerData): Promise<LawyerData>;

  delete(id: number): Promise<void>;
}

