// Responsabilidad: la entidad TypeORM que mapea la tabla física.

import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('tbl_portfolio_type')
export class TblPortfolioTypeEntity {
  @PrimaryGeneratedColumn({ name: 'porty_id' })
  porty_id: number;

  @Column({ name: 'porty_type' })
  porty_type: string;

  @Column({ name: 'porty_detail' })
  porty_detail: string;

  @Column({ name: 'porty_state_type_id' })
  porty_state_type_id: number;

  @Column({ name: 'porty_created_at' })
  porty_created_at: Date;

  @Column({ name: 'porty_updated_at' })
  porty_updated_at: Date;

  @Column({ name: 'porty_responsible' })
  porty_responsible: string;
}
