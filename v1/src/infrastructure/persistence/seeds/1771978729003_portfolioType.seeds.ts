// Responsabilidad: insertar datos iniciales (semilla).

import { DataSource } from 'typeorm';
import { PortfolioTypeEntity } from '../entities/portfolioType.entities';

export const portfolioTypeSeeds = async (dataSource: DataSource) => {
  const repo = dataSource.getRepository(PortfolioTypeEntity);
  const now = new Date();
  await repo.save([
    {
      type: 'Propias',
      detail: 'Propias registered',
      state_type_id: 1,
      created_at: now,
      updated_at: now,
      responsible: 'BOT demands online',
    },
    {
      type: 'Sudameris',
      detail: 'Sudameris registered',
      state_type_id: 1,
      created_at: now,
      updated_at: now,
      responsible: 'BOT demands online',
    },
  ]);
};