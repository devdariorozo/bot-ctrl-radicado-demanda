// Responsabilidad: contratos de dominio para el servicio de automatización del portal de consultas.

export interface Phase1Params {
  filingNumber: string;
  /**
   * Nombres de empresa separados por coma (mismo formato que Phase2Params.companyName).
   * Si se provee, el resultado único se descarta si el demandante no coincide con ninguno.
   */
  companyName?: string;
}

export interface Phase2Params {
  naturalPerson: string;
  /** autm_departament con fallback a data_courts.department */
  departament: string;
  /** autm_city con fallback a data_courts.city */
  city: string;
  /** data_courts.name — referencia, no se usa como filtro en Fase 2 */
  courtName: string;
  /**
   * Nombres de empresa separados por coma (env COMPANY_NAMES_PORTFOLIO_PROPIAS).
   * Ej: "CONTACTO SOLUTIONS,NOVARTEC". Se quita sufijo jurídico antes de buscar.
   * Si exactamente una fila coincide → se toma; si hay más → Para control manual.
   */
  companyName?: string;
}

export interface Phase3Params {
  departament: string;
  city: string;
  locality: string;
  /** autm_court_name — Entidad, selector ddlJuzgado del portal */
  courtName: string;
  specialty: string;
  /** autm_office_name — Despacho, selector ddlDespacho del portal */
  officeName: string;
  year: string;
  processCode: string;
  processResource: string;
}

export interface PortalPhaseResult {
  available: boolean;
  found: boolean;
  multipleResults: boolean;
  filingNumber?: string;
  filingDate?: string;
  filingDateAction?: string;
  errorDetail?: string;
}
