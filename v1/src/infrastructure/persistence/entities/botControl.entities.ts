// Responsabilidad: entidad TypeORM de la tabla bot_control.

import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('bot_control')
export class BotControlEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  data_bases_id: number;

  @Column({ type: 'tinyint', width: 1, default: 0 })
  running: boolean;

  @Column({ type: 'datetime', nullable: true })
  last_started_at: Date | null;

  @Column({ type: 'datetime', nullable: true })
  last_stopped_at: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reason: string | null;

  @Column()
  created_at: Date;

  @Column()
  updated_at: Date;

  @Column({ length: 100 })
  responsible: string;
}

