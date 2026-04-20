// Responsabilidad: la entidad TypeORM que mapea la tabla management_demands_online.

import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('management_demands_online')
export class ManagementDemandsOnlineEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  portfolio_type_id: number;

  @Column()
  name_data_base: string;

  @Column()
  portfolio_city_config_id: number;

  @Column()
  campaign_id: number;

  @Column()
  lawsuit_id: number;

  @Column()
  lawsuit_court_assignments_id: number;

  @Column()
  client_id: number;

  @Column({ length: 500 })
  path_law_doc: string;

  @Column({ length: 100 })
  lawsuit_status: string;

  @Column()
  amount_type_id: number;

  @Column({ default: 0 })
  user_id: number;

  @Column({ length: 100, default: 'BOT ctrl filed demand' })
  user_name: string;

  @Column({ length: 100, default: '-' })
  number_filed: string;

  @Column({ length: 100, default: 'Abierta' })
  management_status: string;

  @Column({ length: 500, default: 'Demanda pendiente para ser gestionada por el bot demands online' })
  detail: string;

  @Column({ default: 1 })
  state_type_id: number;

  @Column()
  created_at: Date;

  @Column()
  updated_at: Date;

  @Column({ length: 100, default: 'BOT ctrl filed demand' })
  responsible: string;
}
