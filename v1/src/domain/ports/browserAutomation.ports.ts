import { ManagementDemandsOnline } from '@domain/entities/managementDemandsOnline.entities';

export const BROWSER_AUTOMATION_PORT = Symbol('BROWSER_AUTOMATION_PORT');

export interface LugarEnvioYProcesoInput {
  demanda: ManagementDemandsOnline;
  departamento: string;
  ciudad: string;
  /** Lista de especialidades a intentar en orden de prioridad. */
  especialidades: string[];
  /** Lista de clases de proceso a intentar en orden de prioridad. */
  clasesProceso: string[];
  /** Datos del demandante (tomados de company_type). */
  demandante?: {
    nit: string;
    company_name: string;
    address: string;
    contact_number: string;
    email_notifications: string;
  };
  /** Datos del demandado (tomados de clients, type_identifications, phones, lawsuit_court_assignments). */
  demandado?: {
    /** type_identifications.name ya normalizado a texto humano (ej. "Cédula de Ciudadanía"). */
    document_type_name: string;
    /** Número de identificación del demandado (clients.identification). */
    identification: string;
    /** Primer nombre (clients.first_name). */
    first_name: string;
    /** Segundo nombre (clients.second_name). */
    second_name: string;
    /** Primer apellido (clients.first_last_name). */
    first_last_name: string;
    /** Segundo apellido (clients.second_last_name). */
    second_last_name: string;
    /** Nombre completo tal como viene en completed_name. */
    completed_name: string;
    /** Dirección del demandado en mayúsculas (lawsuit_court_assignments.client_address). */
    address: string;
    /** Teléfono principal del demandado (phones.telephone). */
    phone: string;
  };
  /** Apoderado (lawyer_data por portfolio_type_id de la demanda). Solo fase 3. */
  apoderado?: {
    document_name: string;
    document_number: string;
    first_name: string;
    second_name: string;
    first_last_name: string;
    second_last_name: string;
    address: string;
    contact_number: string;
    email_notifications: string;
  };
  /**
   * Configuración del servicio PDF para esta demanda.
   * Se obtiene de data_bases.bases[name_data_base].generate_pdf_demand_service.
   */
  pdfServiceConfig: { url: string; api_key: string };
}

/** Resultado del flujo en el portal (para mensaje final en DB y logs). */
export interface ProcesarLugarEnvioResult {
  /** true si se llegó a la sección Archivos adjuntos y tipo DEMANDA quedó seleccionado. */
  reachedArchivosAdjuntos: boolean;
  /** true si se generó path_law_doc, se descargó el PDF y se subió al input file del portal. */
  pdfDemandaAdjuntado?: boolean;
  /**
   * true si, tras adjuntar el PDF y pasar por reCAPTCHA, el flujo de ENVIAR
   * se considera exitoso (puede ser real o simulado según el adapter).
   */
  demandaRegistrada?: boolean;

  /** true si el reCAPTCHA se resolvió exitosamente y el token se generó en el DOM. */
  captchaResolved?: boolean;
  /** true si se dio click en el botón ENVIAR (#enviar). */
  enviarClicked?: boolean;
  /** true si el modal "Confirmar Datos" se abrió. */
  confirmarDatosModalOpened?: boolean;
  /** true si se presionó el botón "NO" en el modal (simulación final). */
  confirmarDatosNoClicked?: boolean;
  /** true si se presionó el botón "SI" en el modal (producción real). */
  confirmarDatosSiClicked?: boolean;
  /** Acción concreta tomada en el modal de confirmación: 'SI' o 'NO'. */
  confirmarDatosAction?: 'SI' | 'NO';
  /** Número de radicado asignado por el portal tras confirmar con SI (ej. '1636923'). */
  numberFiled?: string;
  /** Código corto de la falla para armar mensajes finales coherentes. */
  failureStage?:
    | 'recaptcha'
    | 'jconfirm_confirmar_datos_timeout'
    /** El portal mostró jConfirm de error (ConfirmaDatos) al enviar: adjunto no registrado, validación, etc. */
    | 'portal_enviar_validation_error'
    /** Tras «Agregar Archivo» no apareció fila en #tblFiles (PDF no quedó en grilla del portal). */
    | 'portal_adjunto_no_en_grilla'
    | 'pdf_generate'
    | 'pdf_download'
    | 'pdf_attach'
    /** No se encontró el botón Si en el modal «Confirmar Datos» (producción). */
    | 'confirmar_datos_si'
    /** No apareció o no se pudo confirmar el modal de doble confirmación («¿Está seguro?»). */
    | 'doble_confirmacion'
    /** No apareció el modal Finalizar con el radicado, o no se encontró el botón Finalizar. */
    | 'finalizar'
    | 'unknown';
}

export interface BrowserAutomationPort {
  procesarLugarEnvioYEspecialidadYClase(
    input: LugarEnvioYProcesoInput,
  ): Promise<ProcesarLugarEnvioResult>;
}
