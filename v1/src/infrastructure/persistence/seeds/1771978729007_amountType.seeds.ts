// Responsabilidad: insertar datos iniciales (semilla) para amount_type.

import { DataSource } from 'typeorm';
import { AmountTypeEntity } from '../entities/amountType.entities';

export const amountTypeSeeds = async (dataSource: DataSource) => {
  const repo = dataSource.getRepository(AmountTypeEntity);
  const now = new Date();

  await repo.save([
    {
      id: 1,
      type: 'Mayor Cuantía',
      specialty_process: ['CIVIL CIRCUITO - MAYOR CUANTÍA', 'PROMISCUO MUNICIPAL'],
      class_process: ['31-03-07 PROCESOS EJECUTIVOS', '40-89-08 EJECUTIVO DE MÍNIMA CUANTÍA '],
      detail: 'Demanda con mayor cuantia',
      state_type_id: 1,
      created_at: now,
      updated_at: now,
      responsible: 'BOT ctrl filed demand',
    },
    {
      id: 2,
      type: 'Menor Cuantía',
      specialty_process: ['CIVIL MUNICIPAL - MENOR CUANTÍA', 'PROMISCUO MUNICIPAL'],
      class_process: ['40-03-05 EJECUTIVO DE MENOR CUANTÍA', '40-89-08 EJECUTIVO DE MÍNIMA CUANTÍA '],
      detail: 'Demanda con menor cuantia',
      state_type_id: 1,
      created_at: now,
      updated_at: now,
      responsible: 'BOT ctrl filed demand',
    },
    {
      id: 3,
      type: 'Mínima Cuantía',
      specialty_process: [
        'CIVIL MUNICIPAL DE PEQUEÑAS CAUSAS Y COMPETENCIA MÚLTIPLE – MÍNIMA CUANTÍA',
        'PROMISCUO MUNICIPAL',
      ],
      class_process: [
        '41-03-08 EJECUTIVO DE MÍNIMA CUANTÍA',
        '40-89-08 EJECUTIVO DE MÍNIMA CUANTÍA ',
      ],
      detail: 'Demanda con minima cuantia',
      state_type_id: 1,
      created_at: now,
      updated_at: now,
      responsible: 'BOT ctrl filed demand',
    },
  ]);
};
