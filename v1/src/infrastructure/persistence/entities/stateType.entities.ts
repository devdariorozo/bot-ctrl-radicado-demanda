// Responsabilidad: la entidad TypeORM que mapea la tabla física.

import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('state_type')
export class StateTypeEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  type: string;

  @Column()
  detail: string;

  @Column()
  created_at: Date;

  @Column()
  updated_at: Date;

  @Column()
  responsible: string;
}