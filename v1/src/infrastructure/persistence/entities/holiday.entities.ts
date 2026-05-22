// Responsabilidad: entidad TypeORM para tbl_holiday.

import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('tbl_holiday')
export class HolidayEntity {
  @PrimaryGeneratedColumn()
  hldy_id: number;

  @Column({ type: 'date' })
  hldy_date: string;

  @Column({ length: 150 })
  hldy_name: string;

  @Column({ length: 2 })
  hldy_country_code: string;

  @Column({ length: 50 })
  hldy_type: string;

  @Column({ type: 'tinyint', width: 1, default: 0 })
  hldy_is_working_day: number;

  @Column({ length: 255 })
  hldy_detail: string;

  @Column()
  hldy_state_type_id: number;

  @Column()
  hldy_created_at: Date;

  @Column()
  hldy_updated_at: Date;

  @Column({ length: 100, default: 'BOT ctrl radicado demanda' })
  hldy_responsible: string;
}
