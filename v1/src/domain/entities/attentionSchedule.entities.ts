// Responsabilidad: la entidad de dominio, con su identidad y comportamiento.

export class TblAttentionSchedule {
  atsh_id: number;
  atsh_portfolio_type_id: number;
  portfolio_type_name?: string;
  atsh_days: string[];
  atsh_start_time: string;
  atsh_start_recess_time: string;
  atsh_end_recess_time: string;
  atsh_end_time: string;
  atsh_detail: string;
  atsh_state_type_id: number;
  state_type_name?: string;
  atsh_created_at: Date;
  atsh_updated_at: Date;
  atsh_responsible: string;
}
