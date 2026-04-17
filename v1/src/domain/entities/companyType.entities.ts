// Responsabilidad: la entidad de dominio company_type, con su identidad y datos principales.

export class CompanyType {
  id: number;
  portfolio_type_id: number; // FK a portfolio_type.id
  portfolio_type_name?: string;
  campaings_format: number;
  document_type: string;
  document_name: string;
  document_number: string;
  company_name: string;
  address: string;
  contact_number: string;
  email_notifications: string;
  detail: string;
  state_type_id: number; // FK a state_type.id
  state_type_name?: string;
  created_at: Date;
  updated_at: Date;
  responsible: string;
}

