// Responsabilidad: entidad TypeORM para tbl_automation_email.

import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('tbl_automation_email')
export class AutomationEmailEntity {
  @PrimaryGeneratedColumn()
  autm_id: number;

  @Column({ type: 'varchar', length: 255 })
  autm_from_email: string;

  @Column({ type: 'varchar', length: 255 })
  autm_to_email: string;

  @Column({ type: 'varchar', length: 255 })
  autm_date_received: string;

  @Column({ type: 'varchar', length: 500 })
  autm_subject: string;

  @Column({ type: 'varchar', length: 100, nullable: true, default: null })
  autm_departament: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, default: null })
  autm_city: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, default: null })
  autm_locality: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, default: null })
  autm_specialty: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, default: null })
  autm_process_class: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, default: null })
  autm_subject_demanding: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, default: null })
  autm_artificial_person: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, default: null })
  autm_document_type_1: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, default: null })
  autm_document_number_1: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, default: null })
  autm_email_1: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, default: null })
  autm_address_1: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true, default: null })
  autm_phone_number_1: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, default: null })
  autm_subject_defendant: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, default: null })
  autm_natural_person: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, default: null })
  autm_document_type_2: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, default: null })
  autm_document_number_2: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, default: null })
  autm_email_2: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, default: null })
  autm_address_2: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true, default: null })
  autm_phone_number_2: string | null;

  @Column({ type: 'varchar', length: 23, nullable: true, default: null })
  autm_number_filed: string | null;

  @Column({ type: 'varchar', length: 100 })
  autm_automation_status: string;

  @Column({ type: 'text', nullable: true, default: null })
  autm_detail: string | null;

  @Column({ type: 'int' })
  autm_status_type_id: number;

  @Column({ type: 'datetime' })
  autm_created_at: Date;

  @Column({ type: 'datetime' })
  autm_updated_at: Date;

  @Column({ type: 'varchar', length: 100, default: 'BOT ctrl radicado demanda' })
  autm_responsible: string;
}
