// Responsabilidad: insertar datos iniciales (semilla) para company_type.

import { DataSource } from 'typeorm';
import { CompanyTypeEntity } from '../entities/companyType.entities';

export const companyTypeSeeds = async (dataSource: DataSource) => {
  const repo = dataSource.getRepository(CompanyTypeEntity);
  const now = new Date();

  await repo.save([
    {
      portfolio_type_id: 1,
      campaings_format: 1,
      document_type: 'NIT',
      document_name: 'NÚMERO DE IDENTIFICACIÓN TRIBUTARIA',
      document_number: '900.097.543-9',
      company_name: 'CONTACTO SOLUTIONS SAS',
      address: 'CARRERA 41 NO. 17 - 15',
      contact_number: '320 833 3198',
      email_notifications: 'DEMANDAS@CONTACTOSOLUTIONS.COM',
      detail: 'Se crea registro con exito.',
      state_type_id: 1,
      created_at: now,
      updated_at: now,
      responsible: 'BOT ctrl filed demand',
    },
    {
      portfolio_type_id: 1,
      campaings_format: 2,
      document_type: 'NIT',
      document_name: 'NÚMERO DE IDENTIFICACIÓN TRIBUTARIA',
      document_number: '901.507.911-0',
      company_name: 'NOVARTEC SAS',
      address: 'CARRERA 41 NO. 17 - 15',
      contact_number: '320 833 3198',
      email_notifications: 'DEMANDAS@CONTACTOSOLUTIONS.COM',
      detail: 'Se crea registro con exito.',
      state_type_id: 1,
      created_at: now,
      updated_at: now,
      responsible: 'BOT ctrl filed demand',
    },
    {
      portfolio_type_id: 2,
      campaings_format: 1,
      document_type: 'NIT',
      document_name: 'NÚMERO DE IDENTIFICACIÓN TRIBUTARIA',
      document_number: '860.050.750-1',
      company_name: 'BANCO GNB SUDAMERIS SA',
      address: 'CARRERA 7 NO. 75 - 85',
      contact_number: '287 1144',
      email_notifications: 'PENDIENTE@CORREO.COM',
      detail: 'Se crea registro con exito.',
      state_type_id: 1,
      created_at: now,
      updated_at: now,
      responsible: 'BOT ctrl filed demand',
    },
  ]);
};

