// Responsabilidad: contratos del dominio (interfaces) que la infraestructura debe implementar.

import { AttentionSchedule } from '@domain/entities/attentionSchedule.entities';

/** Token para inyección del repositorio (las interfaces no existen en runtime en NestJS). */
export const ATTENTION_SCHEDULE_REPOSITORY = Symbol('ATTENTION_SCHEDULE_REPOSITORY');

/** Datos para crear un registro; days es array de días en español. */
export type CreateAttentionScheduleInput = Pick<
  AttentionSchedule,
  | 'portfolio_type_id'
  | 'days'
  | 'start_time'
  | 'start_recess'
  | 'end_recess'
  | 'end_time'
  | 'detail'
  | 'state_type_id'
  | 'responsible'
> & Partial<AttentionSchedule>;

export interface AttentionScheduleRepository {
  create(input: CreateAttentionScheduleInput): Promise<AttentionSchedule>;
  findAll(): Promise<AttentionSchedule[]>;
  findById(id: number): Promise<AttentionSchedule>;
  /** Horarios por cartera; opcionalmente filtrar por un día (schedules que incluyan ese día). */
  findByPortfolio(portfolio_type_id: number, day?: string): Promise<AttentionSchedule[]>;
  update(attentionSchedule: AttentionSchedule): Promise<AttentionSchedule>;
  delete(id: number): Promise<void>;
}

