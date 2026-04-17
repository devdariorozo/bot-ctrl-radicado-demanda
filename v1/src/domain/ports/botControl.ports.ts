// Responsabilidad: contrato del repositorio de control del bot.

import { BotControl } from '@domain/entities/botControl.entities';

/** Token para inyección del repositorio. */
export const BOT_CONTROL_REPOSITORY = Symbol('BOT_CONTROL_REPOSITORY');

/** Datos mínimos para crear/actualizar un registro de control del bot. */
export type UpsertBotControlInput = Pick<BotControl, 'data_bases_id' | 'running' | 'responsible'> &
  Partial<BotControl>;

export interface BotControlRepository {
  /** Crea o actualiza el registro de control para un data_bases_id concreto. */
  upsertForDataBases(input: UpsertBotControlInput): Promise<BotControl>;

  /** Obtiene un registro por data_bases_id; null si no existe. */
  findByDataBasesId(data_bases_id: number): Promise<BotControl | null>;

  /** Lista todos los registros de control. */
  findAll(): Promise<BotControl[]>;

  /** Devuelve todos los data_bases_id que están marcados como running. */
  findRunningIds(): Promise<number[]>;
}

