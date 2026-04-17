// Responsabilidad: la entidad de dominio para tipos de cuantía.

export class AmountType {
  id: number;
  type: string;
  specialty_process: string[];
  class_process: string[];
  detail: string;
  state_type_id: number;
  state_type_name?: string;
  created_at: Date;
  updated_at: Date;
  responsible: string;
}
