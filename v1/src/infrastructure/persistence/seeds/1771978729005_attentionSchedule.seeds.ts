// Responsabilidad: insertar datos iniciales (semilla) para tbl_attention_schedule.

import { DataSource } from 'typeorm';
import { TblAttentionScheduleEntity } from '../entities/attentionSchedule.entities';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export const tblAttentionScheduleSeeds = async (dataSource: DataSource) => {
  const repo = dataSource.getRepository(TblAttentionScheduleEntity);
  const now = new Date();

  await repo.save([
    {
      atsh_portfolio_type_id: 1,
      atsh_days: WEEKDAYS,
      atsh_start_time: '08:00',
      atsh_start_recess_time: '12:00',
      atsh_end_recess_time: '14:00',
      atsh_end_time: '17:00',
      atsh_detail: 'Horario laboral estándar L-V para Propias',
      atsh_state_type_id: 1,
      atsh_created_at: now,
      atsh_updated_at: now,
      atsh_responsible: 'BOT ctrl radicado demanda',
    },
    {
      atsh_portfolio_type_id: 2,
      atsh_days: WEEKDAYS,
      atsh_start_time: '08:00',
      atsh_start_recess_time: '12:00',
      atsh_end_recess_time: '14:00',
      atsh_end_time: '17:00',
      atsh_detail: 'Horario laboral estándar L-V para Sudameris',
      atsh_state_type_id: 1,
      atsh_created_at: now,
      atsh_updated_at: now,
      atsh_responsible: 'BOT ctrl radicado demanda',
    },
  ]);
};
