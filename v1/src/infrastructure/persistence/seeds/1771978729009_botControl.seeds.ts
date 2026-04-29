// Responsabilidad: insertar datos iniciales (semilla) para tbl_bot_control.

import { DataSource } from 'typeorm';
import { BotControlEntity } from '../entities/botControl.entities';

export const botControlSeeds = async (dataSource: DataSource) => {
  const repo = dataSource.getRepository(BotControlEntity);
  const now = new Date();

  const basePayload = {
    bctrl_running: false,
    bctrl_last_started_at: null,
    bctrl_last_stopped_at: now,
    bctrl_reason: 'Bot detenido',
    bctrl_detail: 'Bot detenido correctamente.',
    bctrl_created_at: now,
    bctrl_updated_at: now,
    bctrl_responsible: 'BOT ctrl radicado demanda',
  };

  await repo.query('TRUNCATE TABLE tbl_bot_control');

  await repo.save([
    { bctrl_data_bases_id: 1, ...basePayload },
    { bctrl_data_bases_id: 2, ...basePayload },
    { bctrl_data_bases_id: 3, ...basePayload },
  ]);
};
