// Responsabilidad: entidad de dominio para el control del bot.

export class BotControl {
  bctrl_id: number;
  bctrl_data_bases_id: number;
  bctrl_running: boolean;
  bctrl_last_started_at: Date | null;
  bctrl_last_stopped_at: Date | null;
  bctrl_reason: string | null;
  bctrl_detail: string | null;
  bctrl_created_at: Date;
  bctrl_updated_at: Date;
  bctrl_responsible: string;
  environment_type_name?: string;
  portfolio_type_name?: string;
}
