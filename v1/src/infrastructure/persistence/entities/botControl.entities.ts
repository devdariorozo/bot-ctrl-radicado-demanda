// Responsabilidad: entidad TypeORM para tbl_bot_control.

import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('tbl_bot_control')
export class BotControlEntity {
  @PrimaryGeneratedColumn()
  bctrl_id: number;

  @Column({ type: 'int' })
  bctrl_data_bases_id: number;

  @Column({ type: 'tinyint', width: 1, default: 0 })
  bctrl_running: boolean;

  @Column({ type: 'datetime', nullable: true, default: null })
  bctrl_last_started_at: Date | null;

  @Column({ type: 'datetime', nullable: true, default: null })
  bctrl_last_stopped_at: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true, default: null })
  bctrl_reason: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true, default: null })
  bctrl_detail: string | null;

  @Column({ type: 'datetime' })
  bctrl_created_at: Date;

  @Column({ type: 'datetime' })
  bctrl_updated_at: Date;

  @Column({ type: 'varchar', length: 100, default: 'BOT ctrl radicado demanda' })
  bctrl_responsible: string;
}
