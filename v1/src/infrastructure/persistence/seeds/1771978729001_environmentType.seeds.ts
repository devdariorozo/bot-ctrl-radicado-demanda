// Responsabilidad: insertar datos iniciales (semilla) para tipos de entorno.

import { DataSource } from 'typeorm';
import { TblEnvironmentTypeEntity } from '../entities/environmentType.entities';

export const tblEnvironmentTypeSeeds = async (dataSource: DataSource) => {
  const repo = dataSource.getRepository(TblEnvironmentTypeEntity);
  const now = new Date();
  await repo.save([
    {
      env_type: 'dev',
      env_detail: 'Ambiente de desarrollo',
      env_created_at: now,
      env_updated_at: now,
      env_responsible: 'BOT ctrl radicado demanda',
    },
    {
      env_type: 'qa',
      env_detail: 'Ambiente de pruebas (QA)',
      env_created_at: now,
      env_updated_at: now,
      env_responsible: 'BOT ctrl radicado demanda',
    },
    {
      env_type: 'pro',
      env_detail: 'Ambiente de producción',
      env_created_at: now,
      env_updated_at: now,
      env_responsible: 'BOT ctrl radicado demanda',
    },
  ]);
};

