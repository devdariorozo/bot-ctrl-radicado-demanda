// Responsabilidad: entidad de dominio para lawyer_data.

export class LawyerData {
  id: number;
  portfolio_type_id: number;
  portfolio_type_name?: string;
  document_type: string;
  document_name: string;
  document_number: string;
  first_name: string;
  second_name?: string;
  first_last_name: string;
  second_last_name?: string;
  address: string;
  contact_number: string;
  email_notifications: string;
  detail: string;
  state_type_id: number;
  state_type_name?: string;
  created_at: Date;
  updated_at: Date;
  responsible: string;
}

