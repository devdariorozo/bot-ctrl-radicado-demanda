// Responsabilidad: la entidad TypeORM que mapea la tabla física.

import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('tbl_state_type')
export class TblStateTypeEntity {
  @PrimaryGeneratedColumn({ name: 'stty_id' })
  stty_id: number;

  @Column({ name: 'stty_type' })
  stty_type: string;

  @Column({ name: 'stty_detail' })
  stty_detail: string;

  @Column({ name: 'stty_created_at' })
  stty_created_at: Date;

  @Column({ name: 'stty_updated_at' })
  stty_updated_at: Date;

  @Column({ name: 'stty_responsible' })
  stty_responsible: string;
}