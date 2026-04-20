// Responsabilidad: insertar datos iniciales (semilla) para tipos de entorno.

import { DataSource } from 'typeorm';
import { EnvironmentTypeEntity } from '../entities/environmentType.entities';

export const environmentTypeSeeds = async (dataSource: DataSource) => {
  const repo = dataSource.getRepository(EnvironmentTypeEntity);
  const now = new Date();
  await repo.save([
    {
      type: 'dev',
      detail: 'Ambiente de desarrollo',
      created_at: now,
      updated_at: now,
      responsible: 'BOT ctrl filed demand',
    },
    {
      type: 'qa',
      detail: 'Ambiente de pruebas (QA)',
      created_at: now,
      updated_at: now,
      responsible: 'BOT ctrl filed demand',
    },
    {
      type: 'pro',
      detail: 'Ambiente de producción',
      created_at: now,
      updated_at: now,
      responsible: 'BOT ctrl filed demand',
    },
  ]);
};

