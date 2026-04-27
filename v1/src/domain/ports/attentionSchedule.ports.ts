// Responsabilidad: contratos del dominio (interfaces) que la infraestructura debe implementar.

import { TblAttentionSchedule } from '@domain/entities/attentionSchedule.entities';

export const TBL_ATTENTION_SCHEDULE_REPOSITORY = Symbol('TBL_ATTENTION_SCHEDULE_REPOSITORY');

export type CreateTblAttentionScheduleInput = Pick<
  TblAttentionSchedule,
  | 'atsh_portfolio_type_id'
  | 'atsh_days'
  | 'atsh_start_time'
  | 'atsh_start_recess_time'
  | 'atsh_end_recess_time'
  | 'atsh_end_time'
  | 'atsh_detail'
  | 'atsh_state_type_id'
  | 'atsh_responsible'
> & Partial<TblAttentionSchedule>;

export interface TblAttentionScheduleRepository {
  create(input: CreateTblAttentionScheduleInput): Promise<TblAttentionSchedule>;
  findByDuplicate(atsh_portfolio_type_id: number, atsh_days: string[]): Promise<TblAttentionSchedule | null>;
  findAll(): Promise<TblAttentionSchedule[]>;
  findAllActive(): Promise<TblAttentionSchedule[]>;
  findByPortfolioType(atsh_portfolio_type_id: number): Promise<TblAttentionSchedule[]>;
  findById(id: number): Promise<TblAttentionSchedule>;
  update(input: TblAttentionSchedule): Promise<void>;
  delete(id: number): Promise<void>;
}
