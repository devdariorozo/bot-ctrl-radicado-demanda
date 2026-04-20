// Responsabilidad: la entidad TypeORM que mapea la tabla física company_type.

import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('company_type')
export class CompanyTypeEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  portfolio_type_id: number;

  @Column()
  campaings_format: number;

  @Column({ length: 20 })
  document_type: string;

  @Column({ length: 100 })
  document_name: string;

  @Column({ length: 30 })
  document_number: string;

  @Column({ length: 255 })
  company_name: string;

  @Column({ length: 255 })
  address: string;

  @Column({ length: 50 })
  contact_number: string;

  @Column({ length: 255 })
  email_notifications: string;

  @Column({ length: 255 })
  detail: string;

  @Column()
  state_type_id: number;

  @Column()
  created_at: Date;

  @Column()
  updated_at: Date;

  @Column({ length: 100, default: 'BOT ctrl filed demand' })
  responsible: string;
}

