// Responsabilidad: contratos del dominio para management_demands_online.

import { ManagementDemandsOnline } from '@domain/entities/managementDemandsOnline.entities';

/** Token para inyección del repositorio (las interfaces no existen en runtime en NestJS). */
export const MANAGEMENT_DEMANDS_ONLINE_REPOSITORY = Symbol('MANAGEMENT_DEMANDS_ONLINE_REPOSITORY');

/** Datos mínimos para crear un registro (id y fechas son opcionales). */
export type CreateManagementDemandsOnlineInput = Pick<
  ManagementDemandsOnline,
  | 'portfolio_type_id'
  | 'name_data_base'
  | 'portfolio_city_config_id'
  | 'campaign_id'
  | 'lawsuit_id'
  | 'lawsuit_court_assignments_id'
  | 'client_id'
  | 'path_law_doc'
  | 'lawsuit_status'
  | 'amount_type_id'
  | 'state_type_id'
> &
  Partial<Pick<ManagementDemandsOnline, 'user_id' | 'user_name' | 'management_status' | 'detail' | 'responsible'>> &
  Partial<ManagementDemandsOnline>;

export interface FindAllManagementDemandsOnlineFilters {
  portfolio_type_id?: number;
  name_data_base?: string;
  amount_type_id?: number;
  number_filed?: string;
  management_status?: string;
  start_date?: Date;
  end_date?: Date;
}

export interface ManagementDemandsOnlineRepository {
  create(input: CreateManagementDemandsOnlineInput): Promise<ManagementDemandsOnline>;
  findAll(filters?: FindAllManagementDemandsOnlineFilters): Promise<ManagementDemandsOnline[]>;
  findById(id: number): Promise<ManagementDemandsOnline>;
  /** Para evitar duplicados al sincronizar por job. */
  findByLawsuitCourtAssignmentsIdAndBase(
    lawsuit_court_assignments_id: number,
    name_data_base: string,
  ): Promise<ManagementDemandsOnline | null>;
  update(record: ManagementDemandsOnline): Promise<ManagementDemandsOnline>;
  /**
   * Actualiza solo detail y updated_at (UPDATE directo). Útil para que la UI vea el paso actual del bot sin depender de save() completo.
   */
  updateAutomationDetail(id: number, detail: string): Promise<void>;
  delete(id: number): Promise<void>;
  /**
   * Obtiene de forma atómica la siguiente demanda pendiente (management_status Abierta o Novedad,
   * state_type_id = 1) y la marca inmediatamente como "En proceso".
   * Devuelve null si no hay registros disponibles.
   */
  findNextPendingAndMarkInProcess(
    portfolio_type_id: number,
  ): Promise<ManagementDemandsOnline | null>;
  /**
   * Obtiene la siguiente demanda pendiente sin marcarla. Permite validar (ej. horario del portal)
   * antes de marcar y abrir navegador. excludeIds: ids a excluir (ej. registros que no se pueden gestionar ahora).
   */
  findNextPending(
    portfolio_type_id: number,
    excludeIds?: number[],
  ): Promise<ManagementDemandsOnline | null>;
  /**
   * Marca el registro como "En proceso". Devuelve true si se actualizó (nadie más lo tomó).
   */
  markInProcess(id: number): Promise<boolean>;
}
