// Responsabilidad: la entidad de dominio para gestión de demandas pendientes.

export class ManagementDemandsOnline {
  id: number;
  /** Cartera a la que pertenece la demanda (portfolio_type.id). */
  portfolio_type_id: number;
  name_data_base: string;
  portfolio_city_config_id: number;
  /** Derivado de portfolio_city_config.id_city_views */
  id_city_views?: number;
  /** Derivado de portfolio_city_config.city */
  city?: string;
  /** Derivado de portfolio_city_config.id_data_bases */
  id_data_bases?: number;
  /** Derivado de data_bases.environment_type_id */
  environment_type_id?: number;
  /** Derivado de environment_type.type */
  environment_type_name?: string;
  /** Derivado de portfolio_type.type */
  portfolio_type_name?: string;
  campaign_id: number;
  lawsuit_id: number;
  lawsuit_court_assignments_id: number;
  client_id: number;
  path_law_doc: string;
  lawsuit_status: string;
  amount_type_id: number;
  user_id: number;
  user_name: string;
  number_filed: string;
  /** Estado de gestión (ej. Abierta, Cerrada). */
  management_status: string;
  detail: string;
  state_type_id: number;
  state_type_name?: string;
  created_at: Date;
  updated_at: Date;
  responsible: string;
}
