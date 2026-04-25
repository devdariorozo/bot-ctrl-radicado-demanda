// Responsabilidad: la entidad TypeORM que mapea la tabla física.

import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('tbl_data_bases')
export class DataBasesEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  environment_type_id: number;

  @Column()
  portfolio_type_id: number;

  @Column('json')
  bases: Record<string, { generate_pdf_demand_service: { url: string; api_key: string } }>;

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

