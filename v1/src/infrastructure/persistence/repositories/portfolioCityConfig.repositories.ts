// Responsabilidad: implementación concreta de PortfolioCityConfigRepository con TypeORM.

import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { PortfolioCityConfig } from '@domain/entities/portfolioCityConfig.entities';
import { PortfolioCityConfigEntity } from '../entities/portfolioCityConfig.entities';
import {
  PortfolioCityConfigRepository,
  CreatePortfolioCityConfigInput,
} from '@domain/ports/portfolioCityConfig.ports';
import { TblStateTypeEntity } from '../entities/stateType.entities';
import { DataBasesEntity } from '../entities/dataBases.entities';
import { TblPortfolioTypeEntity } from '../entities/portfolioType.entities';
import { TblEnvironmentTypeEntity } from '../entities/environmentType.entities';

@Injectable()
export class PortfolioCityConfigRepositoryImpl implements PortfolioCityConfigRepository {
  private readonly repo: Repository<PortfolioCityConfigEntity>;

  constructor(@InjectDataSource() dataSource: DataSource) {
    this.repo = dataSource.getRepository(PortfolioCityConfigEntity);
  }

  async create(input: CreatePortfolioCityConfigInput): Promise<PortfolioCityConfig> {
    const now = new Date();
    const entity: Partial<PortfolioCityConfigEntity> = {
      id_data_bases: input.id_data_bases,
      id_city_views: input.id_city_views,
      name_departament: input.name_departament,
      name_city: input.name_city,
      city: input.city,
      detail: input.detail,
      state_type_id: input.state_type_id,
      created_at: input.created_at ?? now,
      updated_at: input.updated_at ?? now,
      responsible: input.responsible,
    };
    const saved = await this.repo.save(entity as PortfolioCityConfigEntity);
    return this.toDomain(saved);
  }

  async findAll(): Promise<PortfolioCityConfig[]> {
    const raw = await this.repo
      .createQueryBuilder('pcc')
      .leftJoin(TblStateTypeEntity, 'st', 'st.stty_id = pcc.state_type_id')
      .leftJoin(DataBasesEntity, 'db', 'db.id = pcc.id_data_bases')
      .leftJoin(TblEnvironmentTypeEntity, 'env', 'env.env_id = db.environment_type_id')
      .leftJoin(TblPortfolioTypeEntity, 'pf', 'pf.porty_id = db.portfolio_type_id')
      .select([
        'pcc.id',
        'pcc.id_data_bases',
        'db.portfolio_type_id',
        'pcc.id_city_views',
        'pcc.name_departament',
        'pcc.name_city',
        'pcc.city',
        'pcc.detail',
        'pcc.state_type_id',
        'pcc.created_at',
        'pcc.updated_at',
        'pcc.responsible',
      ])
      .addSelect('env.env_type', 'environment_type_name')
      .addSelect('st.stty_type', 'state_type_name')
      .addSelect('pf.porty_type', 'portfolio_type_name')
      .orderBy('pcc.id', 'DESC')
      .getRawMany();

    return raw.map((row: Record<string, unknown>) => ({
      id: row.pcc_id as number,
      id_data_bases: row.pcc_id_data_bases as number,
      environment_type_name: (row.environment_type_name as string) ?? '',
      portfolio_type_id: row.db_portfolio_type_id as number,
      portfolio_type_name: (row.portfolio_type_name as string) ?? '',
      id_city_views: row.pcc_id_city_views as number,
      name_departament: row.pcc_name_departament as string,
      name_city: row.pcc_name_city as string,
      city: row.pcc_city as string,
      detail: row.pcc_detail as string,
      state_type_id: row.pcc_state_type_id as number,
      state_type_name: (row.state_type_name as string) ?? '',
      created_at: row.pcc_created_at as Date,
      updated_at: row.pcc_updated_at as Date,
      responsible: row.pcc_responsible as string,
    }));
  }

  async findById(id: number): Promise<PortfolioCityConfig> {
    const entity = await this.repo.findOneBy({ id });
    if (!entity) {
      throw new Error('PortfolioCityConfig not found');
    }
    return this.toDomain(entity);
  }

  async findByDataBasesAndCityViews(
    id_data_bases: number,
    id_city_views: number,
  ): Promise<PortfolioCityConfig | null> {
    const entity = await this.repo.findOne({
      where: { id_data_bases, id_city_views },
    });
    return entity ? this.toDomain(entity) : null;
  }

  async findByDataBases(id_data_bases: number): Promise<PortfolioCityConfig[]> {
    const list = await this.repo.find({ where: { id_data_bases } });
    return list.map((e) => this.toDomain(e));
  }

  async update(config: PortfolioCityConfig): Promise<PortfolioCityConfig> {
    const entity = this.toEntity(config);
    const saved = await this.repo.save(entity);
    return this.toDomain(saved);
  }

  async delete(id: number): Promise<void> {
    await this.repo.delete(id);
  }

  private toDomain(entity: PortfolioCityConfigEntity): PortfolioCityConfig {
    return {
      id: entity.id,
      id_data_bases: entity.id_data_bases,
      id_city_views: entity.id_city_views,
      name_departament: entity.name_departament,
      name_city: entity.name_city,
      city: entity.city,
      detail: entity.detail,
      state_type_id: entity.state_type_id,
      created_at: entity.created_at,
      updated_at: entity.updated_at,
      responsible: entity.responsible,
    };
  }

  private toEntity(domain: PortfolioCityConfig): PortfolioCityConfigEntity {
    const e = new PortfolioCityConfigEntity();
    e.id = domain.id;
    e.id_data_bases = domain.id_data_bases;
    e.id_city_views = domain.id_city_views;
    e.name_departament = domain.name_departament;
    e.name_city = domain.name_city;
    e.city = domain.city;
    e.detail = domain.detail;
    e.state_type_id = domain.state_type_id;
    e.created_at = domain.created_at;
    e.updated_at = domain.updated_at;
    e.responsible = domain.responsible;
    return e;
  }
}
