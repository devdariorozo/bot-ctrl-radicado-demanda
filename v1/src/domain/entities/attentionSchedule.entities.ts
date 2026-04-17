// Responsabilidad: la entidad de dominio, con su identidad y comportamiento.

export class AttentionSchedule {
  id: number;
  portfolio_type_id: number; // FK al portfolio_type.id
  portfolio_type_name?: string;
  days: string[]; // Array de días en español: ["Lunes", "Martes", ...]
  start_time: string; // HH:mm
  start_recess: string; // HH:mm
  end_recess: string; // HH:mm
  end_time: string; // HH:mm
  detail: string;
  state_type_id: number; // FK al state_type.id
  state_type_name?: string;
  created_at: Date;
  updated_at: Date;
  responsible: string;
}

