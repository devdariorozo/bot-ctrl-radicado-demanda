// Responsabilidad: entidad de dominio para el control del bot por configuración de data_bases.

export class BotControl {
  id: number;
  data_bases_id: number;
  running: boolean;
  last_started_at: Date | null;
  last_stopped_at: Date | null;
   /** Motivo o contexto del último estado guardado (ej: "Bot detenido"). */
  reason?: string | null;
  created_at: Date;
  updated_at: Date;
  responsible: string;
}

