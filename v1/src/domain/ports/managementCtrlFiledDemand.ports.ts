// Responsabilidad: contratos de dominio para managementCtrlFiledDemand.

import { ManagementCtrlFiledDemand } from '@domain/entities/managementCtrlFiledDemand.entities';

export const MANAGEMENT_CTRL_FILED_DEMAND_REPOSITORY = Symbol('MANAGEMENT_CTRL_FILED_DEMAND_REPOSITORY');

export type CreateManagementCtrlFiledDemandInput = {
  mcfd_portfolio_type_id: number;
  mcfd_name_data_base: string;
  mcfd_lawsuit_id: number;
  mcfd_lawsuits_filings_id: number;
  mcfd_client_id: number;
  mcfd_filing_date?: Date | null;
  mcfd_number_filed?: string | null;
  mcfd_management_status: string;
  mcfd_detail?: string | null;
  mcfd_state_type_id: number;
  mcfd_responsible: string;
};

export type FindAllManagementCtrlFiledDemandFilters = {
  start_date?: Date;
  end_date?: Date;
  mcfd_portfolio_type_id?: number;
  mcfd_name_data_base?: string;
  mcfd_lawsuit_id?: number;
  mcfd_lawsuits_filings_id?: number;
  mcfd_client_id?: number;
  mcfd_automation_email_id?: number;
  mcfd_number_filed?: string;
  mcfd_management_status?: string;
  mcfd_state_type_id?: number;
};

export interface ManagementCtrlFiledDemandRepository {
  create(data: CreateManagementCtrlFiledDemandInput): Promise<ManagementCtrlFiledDemand>;
  findAll(filters?: FindAllManagementCtrlFiledDemandFilters): Promise<ManagementCtrlFiledDemand[]>;
  findById(id: number): Promise<ManagementCtrlFiledDemand>;
  findActiveForDemand(portfolio_type_id: number, lawsuit_id: number, lawsuits_filings_id: number): Promise<ManagementCtrlFiledDemand | null>;
  findOpciones(): Promise<{ mcfd_management_status: string }[]>;
  findOpcionesActivas(): Promise<{ mcfd_management_status: string }[]>;
  update(data: ManagementCtrlFiledDemand): Promise<void>;
  delete(id: number): Promise<void>;
}
