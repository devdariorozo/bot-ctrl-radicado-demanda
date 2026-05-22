// Responsabilidad: entidad TypeORM para tbl_management_ctrl_filed_demand.

import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('tbl_management_ctrl_filed_demand')
export class ManagementCtrlFiledDemandEntity {
  @PrimaryGeneratedColumn()
  mcfd_id: number;

  @Column()
  mcfd_portfolio_type_id: number;

  @Column({ length: 100 })
  mcfd_name_data_base: string;

  @Column()
  mcfd_lawsuit_id: number;

  @Column()
  mcfd_lawsuits_filings_id: number;

  @Column()
  mcfd_client_id: number;

  @Column({ type: 'int', nullable: true, default: null })
  mcfd_data_courts: number | null;

  @Column({ type: 'int', nullable: true, default: null })
  mcfd_automation_email_id: number | null;

  @Column({ type: 'datetime', nullable: true, default: null })
  mcfd_last_execution: Date | null;

  @Column({ default: 0 })
  mcfd_retries: number;

  @Column({ type: 'date', nullable: true, default: null })
  mcfd_filing_date: string | null;

  @Column({ type: 'date', nullable: true, default: null })
  mcfd_filing_date_action: string | null;

  @Column({ type: 'varchar', length: 23, nullable: true, default: null })
  mcfd_number_filed: string | null;

  @Column({ length: 100 })
  mcfd_management_status: string;

  @Column({ type: 'text', nullable: true, default: null })
  mcfd_detail: string | null;

  @Column()
  mcfd_state_type_id: number;

  @Column()
  mcfd_created_at: Date;

  @Column()
  mcfd_updated_at: Date;

  @Column({ length: 100, default: 'BOT ctrl radicado demanda' })
  mcfd_responsible: string;
}
