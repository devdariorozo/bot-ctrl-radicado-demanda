// Responsabilidad: la entidad TypeORM que mapea la tabla amount_type.

import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('amount_type')
export class AmountTypeEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  type: string;

  @Column('json')
  specialty_process: string[];

  @Column('json')
  class_process: string[];

  @Column()
  detail: string;

  @Column()
  state_type_id: number;

  @Column()
  created_at: Date;

  @Column()
  updated_at: Date;

  @Column()
  responsible: string;
}
