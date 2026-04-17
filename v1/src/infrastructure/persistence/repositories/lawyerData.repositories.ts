// Responsabilidad: implementación TypeORM de LawyerDataRepository.

import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { LawyerDataEntity } from '../entities/lawyerData.entities';
import { LawyerData } from '@domain/entities/lawyerData.entities';
import { CreateLawyerDataInput, LawyerDataRepository } from '@domain/ports/lawyerData.ports';
import { PortfolioTypeEntity } from '../entities/portfolioType.entities';
import { StateTypeEntity } from '../entities/stateType.entities';

@Injectable()
export class LawyerDataRepositoryImpl implements LawyerDataRepository {
  private readonly repo: Repository<LawyerDataEntity>;

  constructor(@InjectDataSource() dataSource: DataSource) {
    this.repo = dataSource.getRepository(LawyerDataEntity);
  }

  async create(data: CreateLawyerDataInput): Promise<LawyerData> {
    const now = new Date();
    const entity: Partial<LawyerDataEntity> = {
      ...data,
      created_at: data.created_at ?? now,
      updated_at: data.updated_at ?? now,
      responsible: 'BOT demands online',
    };
    const saved = await this.repo.save(entity as LawyerDataEntity);
    return saved;
  }

  async findByDuplicate(
    portfolio_type_id: number,
    document_type: string,
    document_number: string,
  ): Promise<LawyerData | null> {
    const existing = await this.repo.findOne({
      where: { portfolio_type_id, document_type, document_number },
    });
    return (existing as LawyerData) ?? null;
  }

  async findFirstByPortfolioTypeId(portfolio_type_id: number): Promise<LawyerData | null> {
    const row = await this.repo.findOne({
      where: { portfolio_type_id },
      order: { id: 'ASC' },
    });
    return (row as LawyerData) ?? null;
  }

  async findAll(): Promise<LawyerData[]> {
    const raw = await this.repo
      .createQueryBuilder('ld')
      .leftJoin(PortfolioTypeEntity, 'pt', 'pt.id = ld.portfolio_type_id')
      .leftJoin(StateTypeEntity, 'st', 'st.id = ld.state_type_id')
      .select([
        'ld.id',
        'ld.portfolio_type_id',
        'ld.document_type',
        'ld.document_name',
        'ld.document_number',
        'ld.first_name',
        'ld.second_name',
        'ld.first_last_name',
        'ld.second_last_name',
        'ld.address',
        'ld.contact_number',
        'ld.email_notifications',
        'ld.detail',
        'ld.state_type_id',
        'ld.created_at',
        'ld.updated_at',
        'ld.responsible',
      ])
      .addSelect('pt.type', 'portfolio_type_name')
      .addSelect('st.type', 'state_type_name')
      .getRawMany();

    return raw.map((row: Record<string, unknown>) => ({
      id: row.ld_id,
      portfolio_type_id: row.ld_portfolio_type_id,
      portfolio_type_name: (row.portfolio_type_name ?? '') as string,
      document_type: row.ld_document_type,
      document_name: row.ld_document_name,
      document_number: row.ld_document_number,
      first_name: row.ld_first_name,
      second_name: row.ld_second_name,
      first_last_name: row.ld_first_last_name,
      second_last_name: row.ld_second_last_name,
      address: row.ld_address,
      contact_number: row.ld_contact_number,
      email_notifications: row.ld_email_notifications,
      detail: row.ld_detail,
      state_type_id: row.ld_state_type_id,
      state_type_name: (row.state_type_name ?? '') as string,
      created_at: row.ld_created_at,
      updated_at: row.ld_updated_at,
      responsible: row.ld_responsible,
    })) as LawyerData[];
  }

  async findById(id: number): Promise<LawyerData> {
    const found = await this.repo.findOne({ where: { id } });
    if (!found) {
      throw new Error('Lawyer data not found');
    }
    return found as LawyerData;
  }

  async update(data: LawyerData): Promise<LawyerData> {
    const entity: Partial<LawyerDataEntity> = {
      ...data,
      second_name: data.second_name,
      second_last_name: data.second_last_name,
    };
    const saved = await this.repo.save(entity as LawyerDataEntity);
    return saved as unknown as LawyerData;
  }

  async delete(id: number): Promise<void> {
    await this.repo.delete(id);
  }
}

