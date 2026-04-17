// Responsabilidad: insertar datos iniciales (semilla) para horarios de atención.
// Un registro con days como array de días en español.

import { DataSource } from 'typeorm';
import { AttentionScheduleEntity } from '../entities/attentionSchedule.entities';

const WEEKDAYS_ES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

export const attentionScheduleSeeds = async (dataSource: DataSource) => {
  const repo = dataSource.getRepository(AttentionScheduleEntity);
  const now = new Date();

  await repo.save({
    portfolio_type_id: 1, // Propias
    days: WEEKDAYS_ES,
    start_time: '08:00',
    start_recess: '12:00',
    end_recess: '14:00',
    end_time: '16:00',
    detail: 'Horario laboral estándar L-V 08:00-12:00 y 14:00-16:00 para Propias',
    state_type_id: 1,
    created_at: now,
    updated_at: now,
    responsible: 'BOT demands online',
  });
};
