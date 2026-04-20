// Responsabilidad: insertar datos iniciales (semilla) para bot_control.
//
// Se crean tres registros asociados a data_bases_id 1 (dev), 2 (qa) y 3 (pro) de la cartera propia,
// todos con el bot detenido (running = false).

import { DataSource } from 'typeorm';
import { BotControlEntity } from '../entities/botControl.entities';

export const botControlSeeds = async (dataSource: DataSource) => {
  const repo = dataSource.getRepository(BotControlEntity);
  const now = new Date();

  const basePayload = {
    running: false,
    last_started_at: null,
    last_stopped_at: now,
    reason: 'Bot detenido',
    created_at: now,
    updated_at: now,
    responsible: 'BOT ctrl filed demand',
  };

  await repo.save([
    {
      data_bases_id: 1,
      ...basePayload,
    },
    {
      data_bases_id: 2,
      ...basePayload,
    },
    {
      data_bases_id: 3,
      ...basePayload,
    },
  ]);
};

