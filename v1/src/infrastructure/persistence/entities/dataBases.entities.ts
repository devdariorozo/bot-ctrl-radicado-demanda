// Responsabilidad: la entidad TypeORM que mapea la tabla física.

import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('tbl_data_bases')
export class DataBasesEntity {
  @PrimaryGeneratedColumn()
  db_id: number;

  @Column()
  db_environment_type_id: number;

  @Column()
  db_portfolio_type_id: number;

  @Column('json')
  db_bases: Record<string, { generate_pdf_demand_service: { url: string; api_key: string } }>;

  @Column()
  db_detail: string;

  @Column()
  db_state_type_id: number;

  @Column()
  db_created_at: Date;

  @Column()
  db_updated_at: Date;

  @Column()
  db_responsible: string;
}
