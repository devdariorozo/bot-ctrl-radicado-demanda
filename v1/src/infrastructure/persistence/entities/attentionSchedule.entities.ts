// Responsabilidad: la entidad TypeORM que mapea la tabla física.

import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('tbl_attention_schedule')
export class TblAttentionScheduleEntity {
  @PrimaryGeneratedColumn({ name: 'atsh_id' })
  atsh_id: number;

  @Column({ name: 'atsh_portfolio_type_id' })
  atsh_portfolio_type_id: number;

  @Column({ name: 'atsh_days', type: 'json' })
  atsh_days: string[];

  @Column({ name: 'atsh_start_time', type: 'varchar', length: 5 })
  atsh_start_time: string;

  @Column({ name: 'atsh_start_recess_time', type: 'varchar', length: 5 })
  atsh_start_recess_time: string;

  @Column({ name: 'atsh_end_recess_time', type: 'varchar', length: 5 })
  atsh_end_recess_time: string;

  @Column({ name: 'atsh_end_time', type: 'varchar', length: 5 })
  atsh_end_time: string;

  @Column({ name: 'atsh_detail' })
  atsh_detail: string;

  @Column({ name: 'atsh_state_type_id' })
  atsh_state_type_id: number;

  @Column({ name: 'atsh_created_at' })
  atsh_created_at: Date;

  @Column({ name: 'atsh_updated_at' })
  atsh_updated_at: Date;

  @Column({ name: 'atsh_responsible' })
  atsh_responsible: string;
}
