// Responsabilidad: contratos de dominio para botControl.

import { BotControl } from '@domain/entities/botControl.entities';

export const BOT_CONTROL_REPOSITORY = Symbol('BOT_CONTROL_REPOSITORY');

export type CreateBotControlInput = {
  bctrl_data_bases_id: number;
  bctrl_running: boolean;
  bctrl_last_started_at?: Date | null;
  bctrl_last_stopped_at?: Date | null;
  bctrl_reason?: string | null;
  bctrl_detail?: string | null;
  bctrl_responsible: string;
};

export type FindAllBotControlFilters = {
  start_date?: Date;
  end_date?: Date;
  bctrl_data_bases_id?: number;
  bctrl_running?: boolean;
};

export interface BotControlRepository {
  create(data: CreateBotControlInput): Promise<BotControl>;
  findAll(filters?: FindAllBotControlFilters): Promise<BotControl[]>;
  findById(id: number): Promise<BotControl>;
  findLastByDataBasesId(data_bases_id: number): Promise<BotControl | null>;
  findRunningByDataBasesId(data_bases_id: number): Promise<BotControl | null>;
  update(data: BotControl): Promise<void>;
  updateDetail(data_bases_id: number, detail: string): Promise<void>;
  findRunningIds(): Promise<number[]>;
}
