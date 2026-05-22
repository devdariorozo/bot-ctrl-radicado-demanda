// Responsabilidad: insertar datos iniciales para tbl_holiday — festivos Colombia 2026 (Ley Emiliani).

import { DataSource } from 'typeorm';
import { HolidayEntity } from '../entities/holiday.entities';

export const holidaySeeds = async (dataSource: DataSource) => {
  const repo = dataSource.getRepository(HolidayEntity);
  const now = new Date();

  await repo.save([
    { hldy_date: '2026-01-01', hldy_name: 'AÑO NUEVO',                  hldy_country_code: 'CO', hldy_type: 'NATIONAL',  hldy_is_working_day: 0, hldy_detail: 'Se crea registro con exito.', hldy_state_type_id: 1, hldy_created_at: now, hldy_updated_at: now, hldy_responsible: 'BOT ctrl radicado demanda' },
    { hldy_date: '2026-01-12', hldy_name: 'DÍA DE LOS REYES MAGOS',     hldy_country_code: 'CO', hldy_type: 'RELIGIOUS', hldy_is_working_day: 0, hldy_detail: 'Se crea registro con exito.', hldy_state_type_id: 1, hldy_created_at: now, hldy_updated_at: now, hldy_responsible: 'BOT ctrl radicado demanda' },
    { hldy_date: '2026-03-23', hldy_name: 'DÍA DE SAN JOSÉ',            hldy_country_code: 'CO', hldy_type: 'RELIGIOUS', hldy_is_working_day: 0, hldy_detail: 'Se crea registro con exito.', hldy_state_type_id: 1, hldy_created_at: now, hldy_updated_at: now, hldy_responsible: 'BOT ctrl radicado demanda' },
    { hldy_date: '2026-04-02', hldy_name: 'JUEVES SANTO',               hldy_country_code: 'CO', hldy_type: 'RELIGIOUS', hldy_is_working_day: 0, hldy_detail: 'Se crea registro con exito.', hldy_state_type_id: 1, hldy_created_at: now, hldy_updated_at: now, hldy_responsible: 'BOT ctrl radicado demanda' },
    { hldy_date: '2026-04-03', hldy_name: 'VIERNES SANTO',              hldy_country_code: 'CO', hldy_type: 'RELIGIOUS', hldy_is_working_day: 0, hldy_detail: 'Se crea registro con exito.', hldy_state_type_id: 1, hldy_created_at: now, hldy_updated_at: now, hldy_responsible: 'BOT ctrl radicado demanda' },
    { hldy_date: '2026-05-01', hldy_name: 'DÍA DEL TRABAJO',            hldy_country_code: 'CO', hldy_type: 'NATIONAL',  hldy_is_working_day: 0, hldy_detail: 'Se crea registro con exito.', hldy_state_type_id: 1, hldy_created_at: now, hldy_updated_at: now, hldy_responsible: 'BOT ctrl radicado demanda' },
    { hldy_date: '2026-05-18', hldy_name: 'ASCENSIÓN DEL SEÑOR',        hldy_country_code: 'CO', hldy_type: 'RELIGIOUS', hldy_is_working_day: 0, hldy_detail: 'Se crea registro con exito.', hldy_state_type_id: 1, hldy_created_at: now, hldy_updated_at: now, hldy_responsible: 'BOT ctrl radicado demanda' },
    { hldy_date: '2026-06-08', hldy_name: 'CORPUS CHRISTI',             hldy_country_code: 'CO', hldy_type: 'RELIGIOUS', hldy_is_working_day: 0, hldy_detail: 'Se crea registro con exito.', hldy_state_type_id: 1, hldy_created_at: now, hldy_updated_at: now, hldy_responsible: 'BOT ctrl radicado demanda' },
    { hldy_date: '2026-06-15', hldy_name: 'SAGRADO CORAZÓN DE JESÚS',   hldy_country_code: 'CO', hldy_type: 'RELIGIOUS', hldy_is_working_day: 0, hldy_detail: 'Se crea registro con exito.', hldy_state_type_id: 1, hldy_created_at: now, hldy_updated_at: now, hldy_responsible: 'BOT ctrl radicado demanda' },
    { hldy_date: '2026-06-29', hldy_name: 'SAN PEDRO Y SAN PABLO',      hldy_country_code: 'CO', hldy_type: 'RELIGIOUS', hldy_is_working_day: 0, hldy_detail: 'Se crea registro con exito.', hldy_state_type_id: 1, hldy_created_at: now, hldy_updated_at: now, hldy_responsible: 'BOT ctrl radicado demanda' },
    { hldy_date: '2026-07-20', hldy_name: 'DÍA DE LA INDEPENDENCIA',    hldy_country_code: 'CO', hldy_type: 'NATIONAL',  hldy_is_working_day: 0, hldy_detail: 'Se crea registro con exito.', hldy_state_type_id: 1, hldy_created_at: now, hldy_updated_at: now, hldy_responsible: 'BOT ctrl radicado demanda' },
    { hldy_date: '2026-08-07', hldy_name: 'BATALLA DE BOYACÁ',          hldy_country_code: 'CO', hldy_type: 'NATIONAL',  hldy_is_working_day: 0, hldy_detail: 'Se crea registro con exito.', hldy_state_type_id: 1, hldy_created_at: now, hldy_updated_at: now, hldy_responsible: 'BOT ctrl radicado demanda' },
    { hldy_date: '2026-08-17', hldy_name: 'ASUNCIÓN DE LA VIRGEN',      hldy_country_code: 'CO', hldy_type: 'RELIGIOUS', hldy_is_working_day: 0, hldy_detail: 'Se crea registro con exito.', hldy_state_type_id: 1, hldy_created_at: now, hldy_updated_at: now, hldy_responsible: 'BOT ctrl radicado demanda' },
    { hldy_date: '2026-10-12', hldy_name: 'DÍA DE LA RAZA',             hldy_country_code: 'CO', hldy_type: 'NATIONAL',  hldy_is_working_day: 0, hldy_detail: 'Se crea registro con exito.', hldy_state_type_id: 1, hldy_created_at: now, hldy_updated_at: now, hldy_responsible: 'BOT ctrl radicado demanda' },
    { hldy_date: '2026-11-02', hldy_name: 'TODOS LOS SANTOS',           hldy_country_code: 'CO', hldy_type: 'RELIGIOUS', hldy_is_working_day: 0, hldy_detail: 'Se crea registro con exito.', hldy_state_type_id: 1, hldy_created_at: now, hldy_updated_at: now, hldy_responsible: 'BOT ctrl radicado demanda' },
    { hldy_date: '2026-11-16', hldy_name: 'INDEPENDENCIA DE CARTAGENA', hldy_country_code: 'CO', hldy_type: 'NATIONAL',  hldy_is_working_day: 0, hldy_detail: 'Se crea registro con exito.', hldy_state_type_id: 1, hldy_created_at: now, hldy_updated_at: now, hldy_responsible: 'BOT ctrl radicado demanda' },
    { hldy_date: '2026-12-08', hldy_name: 'INMACULADA CONCEPCIÓN',      hldy_country_code: 'CO', hldy_type: 'RELIGIOUS', hldy_is_working_day: 0, hldy_detail: 'Se crea registro con exito.', hldy_state_type_id: 1, hldy_created_at: now, hldy_updated_at: now, hldy_responsible: 'BOT ctrl radicado demanda' },
    { hldy_date: '2026-12-25', hldy_name: 'NAVIDAD',                    hldy_country_code: 'CO', hldy_type: 'NATIONAL',  hldy_is_working_day: 0, hldy_detail: 'Se crea registro con exito.', hldy_state_type_id: 1, hldy_created_at: now, hldy_updated_at: now, hldy_responsible: 'BOT ctrl radicado demanda' },
  ]);
};
