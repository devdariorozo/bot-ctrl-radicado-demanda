// Responsabilidad: implementación concreta de AmountTypeRepository con TypeORM.

import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { AmountType } from '@domain/entities/amountType.entities';
import { CreateAmountTypeInput, AmountTypeRepository } from '@domain/ports/amountType.ports';
import { AmountTypeEntity } from '../entities/amountType.entities';
import { StateTypeEntity } from '../entities/stateType.entities';

@Injectable()
export class AmountTypeRepositoryImpl implements AmountTypeRepository {
  private readonly repo: Repository<AmountTypeEntity>;

  constructor(@InjectDataSource() dataSource: DataSource) {
    this.repo = dataSource.getRepository(AmountTypeEntity);
  }

  async create(input: CreateAmountTypeInput): Promise<AmountType> {
    const now = new Date();
    const entity: Partial<AmountTypeEntity> = {
      ...input,
      created_at: input.created_at ?? now,
      updated_at: input.updated_at ?? now,
    };
    const saved = await this.repo.save(entity as AmountTypeEntity);
    return saved;
  }

  async findByDuplicate(type: string): Promise<AmountType | null> {
    const found = await this.repo.findOneBy({ type });
    return found ?? null;
  }

  async findAll(): Promise<AmountType[]> {
    const raw = await this.repo
      .createQueryBuilder('at')
      .leftJoin(StateTypeEntity, 'st', 'st.id = at.state_type_id')
      .select([
        'at.id',
        'at.type',
        'at.specialty_process',
        'at.class_process',
        'at.detail',
        'at.state_type_id',
        'at.created_at',
        'at.updated_at',
        'at.responsible',
      ])
      .addSelect('st.type', 'state_type_name')
      .orderBy('at.id', 'DESC')
      .getRawMany();

    return raw.map((row: Record<string, unknown>) => ({
      id: row.at_id as number,
      type: row.at_type as string,
      specialty_process: row.at_specialty_process as string[],
      class_process: row.at_class_process as string[],
      detail: row.at_detail as string,
      state_type_id: row.at_state_type_id as number,
      state_type_name: (row.state_type_name as string) ?? '',
      created_at: row.at_created_at as Date,
      updated_at: row.at_updated_at as Date,
      responsible: row.at_responsible as string,
    }));
  }

  async findById(id: number): Promise<AmountType> {
    const found = await this.repo.findOneBy({ id });
    if (!found) {
      throw new Error('Amount type not found');
    }
    return found;
  }

  async update(amountType: AmountType): Promise<AmountType> {
    return this.repo.save(amountType);
  }

  async delete(id: number): Promise<void> {
    await this.repo.delete(id);
  }
}
