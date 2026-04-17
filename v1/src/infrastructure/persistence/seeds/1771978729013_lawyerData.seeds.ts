// Responsabilidad: insertar datos iniciales para lawyer_data.

import { DataSource } from 'typeorm';
import { LawyerDataEntity } from '../entities/lawyerData.entities';

export const lawyerDataSeeds = async (dataSource: DataSource) => {
  const repo = dataSource.getRepository(LawyerDataEntity);
  const now = new Date();

  await repo.save([
    {
      portfolio_type_id: 1,
      document_type: 'C.C',
      document_name: 'CÉDULA DE CIUDADANÍA',
      document_number: '1.022.371.176',
      first_name: 'ADRIANA',
      second_name: 'PAOLA',
      first_last_name: 'HERNANDEZ',
      second_last_name: 'ACEVEDO',
      address: 'CARRERA 41 NO. 17 - 15',
      contact_number: '313 281 1157',
      email_notifications: 'DEMANDAS@CONTACTOSOLUTIONS.COM',
      detail: 'Se crea registro con exito.',
      state_type_id: 1,
      created_at: now,
      updated_at: now,
      responsible: 'BOT demands online',
    },
  ]);
};

