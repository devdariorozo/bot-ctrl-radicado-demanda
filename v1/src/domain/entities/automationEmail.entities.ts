// Responsabilidad: entidad de dominio para automationEmail.

export class AutomationEmail {
  autm_id: number;
  autm_message_id: string;
  autm_from_email: string;
  autm_to_email: string;
  // Campo informativo (texto) tal como viene del correo.
  autm_date_received: string;
  autm_subject: string;
  autm_departament: string | null;
  autm_city: string | null;
  autm_locality: string | null;
  autm_specialty: string | null;
  autm_process_class: string | null;
  autm_subject_demanding: string | null;
  autm_artificial_person: string | null;
  autm_document_type_1: string | null;
  autm_document_number_1: string | null;
  autm_email_1: string | null;
  autm_address_1: string | null;
  autm_phone_number_1: string | null;
  autm_subject_defendant: string | null;
  autm_natural_person: string | null;
  autm_document_type_2: string | null;
  autm_document_number_2: string | null;
  autm_email_2: string | null;
  autm_address_2: string | null;
  autm_phone_number_2: string | null;
  autm_number_filed: string | null;
  autm_automation_status: string;
  autm_detail: string | null;
  autm_status_type_id: number;
  state_type_name?: string;
  autm_created_at: Date;
  autm_updated_at: Date;
  autm_responsible: string;
}
