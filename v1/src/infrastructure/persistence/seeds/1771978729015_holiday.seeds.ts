// Responsabilidad: insertar datos iniciales para holiday.

import { DataSource } from 'typeorm';
import { HolidayEntity } from '../entities/holiday.entities';

export const holidaySeeds = async (dataSource: DataSource) => {
  const repo = dataSource.getRepository(HolidayEntity);
  const now = new Date();

  await repo.save([
    // Año Nuevo
    {
      date: '2026-01-01',
      name: 'AÑO NUEVO',
      country_code: 'CO',
      type: 'NATIONAL',
      is_working_day: 0,
      detail: 'Festivo oficial en Colombia',
      state_type_id: 1,
      created_at: now,
      updated_at: now,
      responsible: 'BOT ctrl filed demand',
    },
    // Reyes Magos (trasladado por Ley Emiliani)
    {
      date: '2026-01-12',
      name: 'REYES MAGOS',
      country_code: 'CO',
      type: 'NATIONAL',
      is_working_day: 0,
      detail: 'Festivo oficial en Colombia',
      state_type_id: 1,
      created_at: now,
      updated_at: now,
      responsible: 'BOT ctrl filed demand',
    },
    // Día de San José (trasladado a lunes)
    {
      date: '2026-03-23',
      name: 'DÍA DE SAN JOSÉ',
      country_code: 'CO',
      type: 'NATIONAL',
      is_working_day: 0,
      detail: 'Festivo oficial en Colombia',
      state_type_id: 1,
      created_at: now,
      updated_at: now,
      responsible: 'BOT ctrl filed demand',
    },
    // Jueves Santo
    {
      date: '2026-04-02',
      name: 'JUEVES SANTO',
      country_code: 'CO',
      type: 'JUDICIAL',
      is_working_day: 0,
      detail: 'Festivo religioso en Colombia',
      state_type_id: 1,
      created_at: now,
      updated_at: now,
      responsible: 'BOT ctrl filed demand',
    },
    // Viernes Santo
    {
      date: '2026-04-03',
      name: 'VIERNES SANTO',
      country_code: 'CO',
      type: 'JUDICIAL',
      is_working_day: 0,
      detail: 'Festivo religioso en Colombia',
      state_type_id: 1,
      created_at: now,
      updated_at: now,
      responsible: 'BOT ctrl filed demand',
    },
    // Día del Trabajo
    {
      date: '2026-05-01',
      name: 'DÍA DEL TRABAJO',
      country_code: 'CO',
      type: 'NATIONAL',
      is_working_day: 0,
      detail: 'Festivo oficial en Colombia',
      state_type_id: 1,
      created_at: now,
      updated_at: now,
      responsible: 'BOT ctrl filed demand',
    },
    // Ascensión del Señor (trasladado a lunes)
    {
      date: '2026-05-18',
      name: 'ASCENSIÓN DEL SEÑOR',
      country_code: 'CO',
      type: 'RELIGIOUS',
      is_working_day: 0,
      detail: 'Festivo religioso en Colombia',
      state_type_id: 1,
      created_at: now,
      updated_at: now,
      responsible: 'BOT ctrl filed demand',
    },
    // Corpus Christi (trasladado a lunes)
    {
      date: '2026-06-08',
      name: 'CORPUS CHRISTI',
      country_code: 'CO',
      type: 'RELIGIOUS',
      is_working_day: 0,
      detail: 'Festivo religioso en Colombia',
      state_type_id: 1,
      created_at: now,
      updated_at: now,
      responsible: 'BOT ctrl filed demand',
    },
    // Sagrado Corazón de Jesús (trasladado a lunes)
    {
      date: '2026-06-15',
      name: 'SAGRADO CORAZÓN DE JESÚS',
      country_code: 'CO',
      type: 'RELIGIOUS',
      is_working_day: 0,
      detail: 'Festivo religioso en Colombia',
      state_type_id: 1,
      created_at: now,
      updated_at: now,
      responsible: 'BOT ctrl filed demand',
    },
    // San Pedro y San Pablo (trasladado a lunes)
    {
      date: '2026-06-29',
      name: 'SAN PEDRO Y SAN PABLO',
      country_code: 'CO',
      type: 'RELIGIOUS',
      is_working_day: 0,
      detail: 'Festivo religioso en Colombia',
      state_type_id: 1,
      created_at: now,
      updated_at: now,
      responsible: 'BOT ctrl filed demand',
    },
    // Día de la Independencia
    {
      date: '2026-07-20',
      name: 'DÍA DE LA INDEPENDENCIA',
      country_code: 'CO',
      type: 'NATIONAL',
      is_working_day: 0,
      detail: 'Festivo oficial en Colombia',
      state_type_id: 1,
      created_at: now,
      updated_at: now,
      responsible: 'BOT ctrl filed demand',
    },
    // Batalla de Boyacá
    {
      date: '2026-08-07',
      name: 'BATALLA DE BOYACÁ',
      country_code: 'CO',
      type: 'NATIONAL',
      is_working_day: 0,
      detail: 'Festivo oficial en Colombia',
      state_type_id: 1,
      created_at: now,
      updated_at: now,
      responsible: 'BOT ctrl filed demand',
    },
    // Asunción de la Virgen (trasladado a lunes)
    {
      date: '2026-08-17',
      name: 'ASUNCIÓN DE LA VIRGEN',
      country_code: 'CO',
      type: 'RELIGIOUS',
      is_working_day: 0,
      detail: 'Festivo religioso en Colombia',
      state_type_id: 1,
      created_at: now,
      updated_at: now,
      responsible: 'BOT ctrl filed demand',
    },
    // Día de la Raza (trasladado a lunes)
    {
      date: '2026-10-12',
      name: 'DÍA DE LA RAZA',
      country_code: 'CO',
      type: 'NATIONAL',
      is_working_day: 0,
      detail: 'Festivo oficial en Colombia',
      state_type_id: 1,
      created_at: now,
      updated_at: now,
      responsible: 'BOT ctrl filed demand',
    },
    // Todos los Santos (trasladado a lunes)
    {
      date: '2026-11-02',
      name: 'TODOS LOS SANTOS',
      country_code: 'CO',
      type: 'RELIGIOUS',
      is_working_day: 0,
      detail: 'Festivo religioso en Colombia',
      state_type_id: 1,
      created_at: now,
      updated_at: now,
      responsible: 'BOT ctrl filed demand',
    },
    // Independencia de Cartagena (trasladado a lunes)
    {
      date: '2026-11-16',
      name: 'INDEPENDENCIA DE CARTAGENA',
      country_code: 'CO',
      type: 'NATIONAL',
      is_working_day: 0,
      detail: 'Festivo oficial en Colombia',
      state_type_id: 1,
      created_at: now,
      updated_at: now,
      responsible: 'BOT ctrl filed demand',
    },
    // Inmaculada Concepción
    {
      date: '2026-12-08',
      name: 'INMACULADA CONCEPCIÓN',
      country_code: 'CO',
      type: 'RELIGIOUS',
      is_working_day: 0,
      detail: 'Festivo religioso en Colombia',
      state_type_id: 1,
      created_at: now,
      updated_at: now,
      responsible: 'BOT ctrl filed demand',
    },
    // Navidad
    {
      date: '2026-12-25',
      name: 'NAVIDAD',
      country_code: 'CO',
      type: 'RELIGIOUS',
      is_working_day: 0,
      detail: 'Festivo religioso en Colombia',
      state_type_id: 1,
      created_at: now,
      updated_at: now,
      responsible: 'BOT ctrl filed demand',
    },
  ]);
};

