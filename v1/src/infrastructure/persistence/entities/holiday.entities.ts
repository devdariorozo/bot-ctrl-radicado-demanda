// Responsabilidad: entidad TypeORM para tabla holiday.

import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('holiday')
export class HolidayEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date' })
  date: string;

  @Column({ length: 150 })
  name: string;

  @Column({ length: 2 })
  country_code: string;

  @Column({ length: 50 })
  type: string;

  @Column({ type: 'tinyint', width: 1, default: 0 })
  is_working_day: number;

  @Column({ length: 255 })
  detail: string;

  @Column()
  state_type_id: number;

  @Column()
  created_at: Date;

  @Column()
  updated_at: Date;

  @Column({ length: 100, default: 'BOT demands online' })
  responsible: string;
}

