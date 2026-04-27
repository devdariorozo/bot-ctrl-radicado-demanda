// Responsabilidad: insertar datos iniciales (semilla).

import { DataSource } from 'typeorm';
import { TblPortfolioTypeEntity } from '../entities/portfolioType.entities';

export const tblPortfolioTypeSeeds = async (dataSource: DataSource) => {
  const repo = dataSource.getRepository(TblPortfolioTypeEntity);
  const now = new Date();
  await repo.save([
    {
      porty_type: 'Propias',
      porty_detail: 'Propias registered',
      porty_state_type_id: 1,
      porty_created_at: now,
      porty_updated_at: now,
      porty_responsible: 'BOT ctrl radicado demanda',
    },
    {
      porty_type: 'Sudameris',
      porty_detail: 'Sudameris registered',
      porty_state_type_id: 1,
      porty_created_at: now,
      porty_updated_at: now,
      porty_responsible: 'BOT ctrl radicado demanda',
    },
  ]);
};
