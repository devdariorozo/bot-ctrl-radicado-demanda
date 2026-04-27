// Responsabilidad: la entidad de dominio, con su identidad y comportamiento.

/** Configuración de un servicio dentro de una base de datos. */
export interface DataBaseServiceConfig {
  url: string;
  api_key: string;
}

/** Servicios disponibles para una base de datos. */
export interface DataBaseServices {
  generate_pdf_demand_service: DataBaseServiceConfig;
}

/** Mapa de bases de datos con sus configuraciones de servicios. */
export type BasesConfig = Record<string, DataBaseServices>;

export class DataBases {
    db_id: number;
    db_environment_type_id: number;
    environment_type_name?: string;
    db_portfolio_type_id: number;
    portfolio_type_name?: string;
    db_bases: BasesConfig;
    db_detail: string;
    db_state_type_id: number;
    state_type_name?: string;
    /** Estado de la cartera (portfolio_type): stty_type para portfolio_type.porty_state_type_id. */
    portfolio_state_type_name?: string;
    /** "portfolio_type_name environment_type_name" o solo portfolio si env es "pro". */
    label_data_base?: string;
    db_created_at: Date;
    db_updated_at: Date;
    db_responsible: string;
}
