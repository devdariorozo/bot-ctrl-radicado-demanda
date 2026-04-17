// Responsabilidad: la entidad TypeORM que mapea la tabla física.

import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('portfolio_city_config')
export class PortfolioCityConfigEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  id_data_bases: number;

  @Column()
  id_city_views: number;

  @Column({ length: 255 })
  name_departament: string;

  @Column({ length: 255 })
  name_city: string;

  @Column({ length: 255 })
  city: string;

  @Column({ length: 500 })
  detail: string;

  @Column()
  state_type_id: number;

  @Column()
  created_at: Date;

  @Column()
  updated_at: Date;

  @Column({ length: 100 })
  responsible: string;
}
