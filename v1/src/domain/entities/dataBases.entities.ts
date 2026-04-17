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
    id: number;
    environment_type_id: number; // FK al environment_type.id
    environment_type_name?: string; // Nombre del tipo de entorno
    portfolio_type_id: number; // FK al portfolio_type.id
    portfolio_type_name?: string; // Nombre del tipo de portfolio
    bases: BasesConfig; // JSON con bases de datos y sus configuraciones de servicios
    detail: string;
    state_type_id: number;   // FK al state_type.id
    state_type_name?: string; // Nombre del tipo de estado (de data_bases)
    /** Estado de la cartera (portfolio_type): type en state_type para portfolio_type.state_type_id. Se usa para validar si la cartera está activa. */
    portfolio_state_type_name?: string;
    /** Solo en respuestas de listado: "portfolio_type_name environment_type_name" o solo portfolio si env es "pro". */
    label_data_base?: string;
    created_at: Date;
    updated_at: Date;
    responsible: string;
}