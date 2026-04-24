// Responsabilidad: la entidad TypeORM que mapea la tabla física.

import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('tbl_environment_type')
export class TblEnvironmentTypeEntity {
  @PrimaryGeneratedColumn({ name: 'env_id' })
  env_id: number;

  @Column({ name: 'env_type' })
  env_type: string;

  @Column({ name: 'env_detail' })
  env_detail: string;

  @Column({ name: 'env_created_at' })
  env_created_at: Date;

  @Column({ name: 'env_updated_at' })
  env_updated_at: Date;

  @Column({ name: 'env_responsible' })
  env_responsible: string;
}

