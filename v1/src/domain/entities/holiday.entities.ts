// Responsabilidad: entidad de dominio para días festivos.

export class Holiday {
  id: number;
  date: Date;
  name: string;
  country_code: string;
  type: string;
  is_working_day: boolean;
  detail: string;
  state_type_id: number;
  state_type_name?: string;
  created_at: Date;
  updated_at: Date;
  responsible: string;
}

