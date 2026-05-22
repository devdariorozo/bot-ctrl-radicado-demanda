// Responsabilidad: entidad de dominio para gestión de control radicado demanda.

export class ManagementCtrlFiledDemand {
  mcfd_id: number;
  mcfd_portfolio_type_id: number;
  portfolio_type_name?: string;
  mcfd_name_data_base: string;
  mcfd_lawsuit_id: number;
  mcfd_lawsuits_filings_id: number;
  mcfd_client_id: number;
  mcfd_data_courts: number | null;
  court_department?: string | null;
  court_city?: string | null;
  court_name?: string | null;
  mcfd_automation_email_id: number | null;
  mcfd_last_execution: Date | null;
  mcfd_retries: number;
  mcfd_filing_date: Date | null;
  mcfd_filing_date_action: Date | null;
  mcfd_number_filed: string | null;
  mcfd_management_status: string;
  mcfd_detail: string | null;
  mcfd_state_type_id: number;
  state_type_name?: string;
  mcfd_created_at: Date;
  mcfd_updated_at: Date;
  mcfd_responsible: string;
}
