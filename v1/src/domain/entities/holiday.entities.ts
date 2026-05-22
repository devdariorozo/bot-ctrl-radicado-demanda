// Responsabilidad: entidad de dominio para días festivos.

export class Holiday {
  hldy_id: number;
  hldy_date: Date;
  hldy_name: string;
  hldy_country_code: string;
  hldy_type: string;
  hldy_is_working_day: boolean;
  hldy_detail: string;
  hldy_state_type_id: number;
  state_type_name?: string;
  hldy_created_at: Date;
  hldy_updated_at: Date;
  hldy_responsible: string;
}
