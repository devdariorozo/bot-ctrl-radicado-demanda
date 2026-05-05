// Responsabilidad: contratos de dominio para automationEmail.

import { AutomationEmail } from '@domain/entities/automationEmail.entities';

export const AUTOMATION_EMAIL_REPOSITORY = Symbol('AUTOMATION_EMAIL_REPOSITORY');

export type CreateAutomationEmailInput = {
  autm_message_id: string;
  autm_from_email: string;
  autm_to_email: string;
  autm_date_received: string;
  autm_subject: string;
  autm_departament?: string | null;
  autm_city?: string | null;
  autm_locality?: string | null;
  autm_specialty?: string | null;
  autm_process_class?: string | null;
  autm_subject_demanding?: string | null;
  autm_artificial_person?: string | null;
  autm_document_type_1?: string | null;
  autm_document_number_1?: string | null;
  autm_email_1?: string | null;
  autm_address_1?: string | null;
  autm_phone_number_1?: string | null;
  autm_subject_defendant?: string | null;
  autm_natural_person?: string | null;
  autm_document_type_2?: string | null;
  autm_document_number_2?: string | null;
  autm_email_2?: string | null;
  autm_address_2?: string | null;
  autm_phone_number_2?: string | null;
  autm_number_filed?: string | null;
  autm_automation_status: string;
  autm_detail?: string | null;
  autm_status_type_id: number;
  autm_responsible: string;
};

export type FindAllAutomationEmailFilters = {
  start_date?: Date;
  end_date?: Date;
  autm_date_received?: string;
  autm_from_email?: string;
  autm_to_email?: string;
  autm_departament?: string;
  autm_city?: string;
  autm_locality?: string;
  autm_specialty?: string;
  autm_process_class?: string;
  autm_subject_demanding?: string;
  autm_artificial_person?: string;
  autm_document_number_1?: string;
  autm_email_1?: string;
  autm_address_1?: string;
  autm_phone_number_1?: string;
  autm_natural_person?: string;
  autm_document_number_2?: string;
  autm_email_2?: string;
  autm_address_2?: string;
  autm_phone_number_2?: string;
  autm_number_filed?: string;
  autm_automation_status?: string;
  autm_status_type_id?: number;
};

export interface AutomationEmailRepository {
  create(data: CreateAutomationEmailInput): Promise<AutomationEmail>;
  findAll(filters?: FindAllAutomationEmailFilters): Promise<AutomationEmail[]>;
  findById(id: number): Promise<AutomationEmail>;
  findByMessageId(messageId: string): Promise<AutomationEmail | null>;
  findByDocumentNumber2(identification: string): Promise<AutomationEmail | null>;
  findOpciones(): Promise<{ autm_automation_status: string }[]>;
  findOpcionesActivas(): Promise<{ autm_automation_status: string }[]>;
  update(data: AutomationEmail): Promise<void>;
  delete(id: number): Promise<void>;
}
