// Responsabilidad: implementación concreta de ManagementDemandsOnlineRepository con TypeORM.

import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';

import { ManagementDemandsOnline } from '@domain/entities/managementDemandsOnline.entities';
import {
  CreateManagementDemandsOnlineInput,
  FindAllManagementDemandsOnlineFilters,
  ManagementDemandsOnlineRepository,
} from '@domain/ports/managementDemandsOnline.ports';
import { ManagementDemandsOnlineEntity } from '../entities/managementDemandsOnline.entities';
import { StateTypeEntity } from '../entities/stateType.entities';
import { PortfolioCityConfigEntity } from '../entities/portfolioCityConfig.entities';
import { DataBasesEntity } from '../entities/dataBases.entities';
import { EnvironmentTypeEntity } from '../entities/environmentType.entities';
import { PortfolioTypeEntity } from '../entities/portfolioType.entities';

@Injectable()
export class ManagementDemandsOnlineRepositoryImpl implements ManagementDemandsOnlineRepository {
  private readonly repo: Repository<ManagementDemandsOnlineEntity>;

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {
    this.repo = dataSource.getRepository(ManagementDemandsOnlineEntity);
  }

  async create(input: CreateManagementDemandsOnlineInput): Promise<ManagementDemandsOnline> {
    const now = new Date();
    const entity: Partial<ManagementDemandsOnlineEntity> = {
      portfolio_type_id: input.portfolio_type_id,
      name_data_base: input.name_data_base,
      portfolio_city_config_id: input.portfolio_city_config_id,
      campaign_id: input.campaign_id,
      lawsuit_id: input.lawsuit_id,
      lawsuit_court_assignments_id: input.lawsuit_court_assignments_id,
      client_id: input.client_id,
      path_law_doc: input.path_law_doc ?? '',
      lawsuit_status: input.lawsuit_status,
      amount_type_id: input.amount_type_id,
      user_id: input.user_id === 0 || input.user_id == null ? 1 : input.user_id,
      user_name: input.user_name ?? 'BOT ctrl filed demand',
      number_filed: input.number_filed ?? '-',
      management_status: input.management_status ?? 'Abierta',
      detail: input.detail ?? 'Demanda pendiente para ser gestionada por el bot demands online',
      state_type_id: input.state_type_id ?? 1,
      responsible: input.responsible ?? 'BOT ctrl filed demand',
      created_at: input.created_at ?? now,
      updated_at: input.updated_at ?? now,
    };
    const saved = await this.repo.save(entity as ManagementDemandsOnlineEntity);
    return saved;
  }

  async findAll(filters: FindAllManagementDemandsOnlineFilters = {}): Promise<ManagementDemandsOnline[]> {
    const qb = this.repo
      .createQueryBuilder('m')
      .leftJoin(StateTypeEntity, 'st', 'st.id = m.state_type_id')
      .leftJoin(PortfolioCityConfigEntity, 'pcc', 'pcc.id = m.portfolio_city_config_id')
      .leftJoin(DataBasesEntity, 'db', 'db.id = pcc.id_data_bases')
      .leftJoin(EnvironmentTypeEntity, 'env', 'env.id = db.environment_type_id')
      .leftJoin(PortfolioTypeEntity, 'pf', 'pf.id = db.portfolio_type_id')
      .select([
        'm.id',
        'm.portfolio_type_id',
        'm.name_data_base',
        'm.portfolio_city_config_id',
        'm.campaign_id',
        'm.lawsuit_id',
        'm.lawsuit_court_assignments_id',
        'm.client_id',
        'm.path_law_doc',
        'm.lawsuit_status',
        'm.amount_type_id',
        'm.user_id',
        'm.user_name',
        'm.number_filed',
        'm.management_status',
        'm.detail',
        'm.state_type_id',
        'm.created_at',
        'm.updated_at',
        'm.responsible',
        'pcc.id_city_views',
        'pcc.city',
        'pcc.id_data_bases',
        'db.environment_type_id',
      ])
      .addSelect('st.type', 'state_type_name')
      .addSelect('env.type', 'environment_type_name')
      .addSelect('pf.type', 'portfolio_type_name');

    if (filters.portfolio_type_id !== undefined) {
      qb.andWhere('m.portfolio_type_id = :portfolio_type_id', { portfolio_type_id: filters.portfolio_type_id });
    }
    if (filters.name_data_base) {
      qb.andWhere('m.name_data_base = :name_data_base', { name_data_base: filters.name_data_base });
    }
    if (filters.amount_type_id !== undefined) {
      qb.andWhere('m.amount_type_id = :amount_type_id', { amount_type_id: filters.amount_type_id });
    }
    if (filters.number_filed) {
      qb.andWhere('m.number_filed = :number_filed', { number_filed: filters.number_filed });
    }
    if (filters.management_status) {
      qb.andWhere('m.management_status = :management_status', { management_status: filters.management_status });
    }
    if (filters.start_date) {
      qb.andWhere('m.created_at >= :start_date', { start_date: filters.start_date });
    }
    if (filters.end_date) {
      // Incluir todo el día final
      const endOfDay = new Date(filters.end_date);
      endOfDay.setHours(23, 59, 59, 999);
      qb.andWhere('m.created_at <= :end_date', { end_date: endOfDay });
    }

    qb.orderBy('m.id', 'DESC');
    const raw = await qb.getRawMany();

    return raw.map((row: Record<string, unknown>) => ({
      id: row.m_id as number,
      name_data_base: row.m_name_data_base as string,
      portfolio_city_config_id: row.m_portfolio_city_config_id as number,
       id_city_views: row.pcc_id_city_views as number | undefined,
      city: row.pcc_city as string | undefined,
      id_data_bases: row.pcc_id_data_bases as number | undefined,
      environment_type_id: row.db_environment_type_id as number | undefined,
      environment_type_name: (row.environment_type_name as string) ?? undefined,
      portfolio_type_name: (row.portfolio_type_name as string) ?? undefined,
      campaign_id: row.m_campaign_id as number,
      lawsuit_id: row.m_lawsuit_id as number,
      lawsuit_court_assignments_id: row.m_lawsuit_court_assignments_id as number,
      client_id: row.m_client_id as number,
      path_law_doc: row.m_path_law_doc as string,
      lawsuit_status: row.m_lawsuit_status as string,
      amount_type_id: row.m_amount_type_id as number,
      portfolio_type_id: row.m_portfolio_type_id as number,
      user_id: row.m_user_id as number,
      user_name: row.m_user_name as string,
      number_filed: row.m_number_filed as string,
      management_status: row.m_management_status as string,
      detail: row.m_detail as string,
      state_type_id: row.m_state_type_id as number,
      state_type_name: (row.state_type_name as string) ?? '',
      created_at: row.m_created_at as Date,
      updated_at: row.m_updated_at as Date,
      responsible: row.m_responsible as string,
    }));
  }

  async findById(id: number): Promise<ManagementDemandsOnline> {
    const raw = await this.repo
      .createQueryBuilder('m')
      .leftJoin(StateTypeEntity, 'st', 'st.id = m.state_type_id')
      .leftJoin(PortfolioCityConfigEntity, 'pcc', 'pcc.id = m.portfolio_city_config_id')
      .leftJoin(DataBasesEntity, 'db', 'db.id = pcc.id_data_bases')
      .leftJoin(EnvironmentTypeEntity, 'env', 'env.id = db.environment_type_id')
      .leftJoin(PortfolioTypeEntity, 'pf', 'pf.id = db.portfolio_type_id')
      .select([
        'm.id',
        'm.portfolio_type_id',
        'm.name_data_base',
        'm.portfolio_city_config_id',
        'm.campaign_id',
        'm.lawsuit_id',
        'm.lawsuit_court_assignments_id',
        'm.client_id',
        'm.path_law_doc',
        'm.lawsuit_status',
        'm.amount_type_id',
        'm.user_id',
        'm.user_name',
        'm.number_filed',
        'm.management_status',
        'm.detail',
        'm.state_type_id',
        'm.created_at',
        'm.updated_at',
        'm.responsible',
        'pcc.id_city_views',
        'pcc.city',
        'pcc.id_data_bases',
        'db.environment_type_id',
      ])
      .addSelect('st.type', 'state_type_name')
      .addSelect('env.type', 'environment_type_name')
      .addSelect('pf.type', 'portfolio_type_name')
      .where('m.id = :id', { id })
      .getRawOne<Record<string, unknown> | null>();

    if (!raw) {
      throw new Error('Management demands online record not found');
    }

    return {
      id: raw.m_id as number,
      name_data_base: raw.m_name_data_base as string,
      portfolio_city_config_id: raw.m_portfolio_city_config_id as number,
      id_city_views: raw.pcc_id_city_views as number | undefined,
      city: raw.pcc_city as string | undefined,
      id_data_bases: raw.pcc_id_data_bases as number | undefined,
      environment_type_id: raw.db_environment_type_id as number | undefined,
      environment_type_name: (raw.environment_type_name as string) ?? undefined,
      portfolio_type_name: (raw.portfolio_type_name as string) ?? undefined,
      campaign_id: raw.m_campaign_id as number,
      lawsuit_id: raw.m_lawsuit_id as number,
      lawsuit_court_assignments_id: raw.m_lawsuit_court_assignments_id as number,
      client_id: raw.m_client_id as number,
      path_law_doc: raw.m_path_law_doc as string,
      lawsuit_status: raw.m_lawsuit_status as string,
      amount_type_id: raw.m_amount_type_id as number,
      portfolio_type_id: raw.m_portfolio_type_id as number,
      user_id: raw.m_user_id as number,
      user_name: raw.m_user_name as string,
      number_filed: raw.m_number_filed as string,
      management_status: raw.m_management_status as string,
      detail: raw.m_detail as string,
      state_type_id: raw.m_state_type_id as number,
      state_type_name: (raw.state_type_name as string) ?? '',
      created_at: raw.m_created_at as Date,
      updated_at: raw.m_updated_at as Date,
      responsible: raw.m_responsible as string,
    };
  }

  async findByLawsuitCourtAssignmentsIdAndBase(
    lawsuit_court_assignments_id: number,
    name_data_base: string,
  ): Promise<ManagementDemandsOnline | null> {
    const found = await this.repo.findOne({
      where: { lawsuit_court_assignments_id, name_data_base },
    });
    return found ?? null;
  }

  async update(record: ManagementDemandsOnline): Promise<ManagementDemandsOnline> {
    const toSave = {
      ...record,
      user_id: record.user_id === 0 || record.user_id == null ? 1 : record.user_id,
      user_name: record.user_name ?? 'BOT ctrl filed demand',
      management_status: record.management_status ?? 'Abierta',
    };
    return this.repo.save(toSave);
  }

  /** detail en BD suele ser VARCHAR(500). */
  async updateAutomationDetail(id: number, detail: string): Promise<void> {
    const safe = detail.length > 500 ? `${detail.slice(0, 497)}...` : detail;
    await this.repo.update({ id }, { detail: safe, updated_at: new Date() });
  }

  async delete(id: number): Promise<void> {
    await this.repo.delete(id);
  }

  async findNextPending(
    portfolio_type_id: number,
    excludeIds: number[] = [],
  ): Promise<ManagementDemandsOnline | null> {
    const qb = this.repo
      .createQueryBuilder('m')
      .where('m.management_status IN (:...statuses)', { statuses: ['Abierta', 'Novedad'] })
      .andWhere('m.state_type_id = :stateTypeId', { stateTypeId: 1 })
      .andWhere('m.portfolio_type_id = :portfolioTypeId', { portfolioTypeId: portfolio_type_id })
      .orderBy('m.updated_at', 'ASC')
      .addOrderBy('m.id', 'ASC');
    if (excludeIds.length > 0) {
      qb.andWhere('m.id NOT IN (:...excludeIds)', { excludeIds });
    }
    const entity = await qb.getOne();
    if (!entity) return null;
    return {
      id: entity.id,
      portfolio_type_id: entity.portfolio_type_id,
      name_data_base: entity.name_data_base,
      portfolio_city_config_id: entity.portfolio_city_config_id,
      campaign_id: entity.campaign_id,
      lawsuit_id: entity.lawsuit_id,
      lawsuit_court_assignments_id: entity.lawsuit_court_assignments_id,
      client_id: entity.client_id,
      path_law_doc: entity.path_law_doc,
      lawsuit_status: entity.lawsuit_status,
      amount_type_id: entity.amount_type_id,
      user_id: entity.user_id,
      user_name: entity.user_name,
      number_filed: entity.number_filed,
      management_status: entity.management_status,
      detail: entity.detail,
      state_type_id: entity.state_type_id,
      created_at: entity.created_at,
      updated_at: entity.updated_at,
      responsible: entity.responsible,
    };
  }

  async markInProcess(id: number): Promise<boolean> {
    const result = await this.repo.update(
      {
        id,
        management_status: In(['Abierta', 'Novedad']),
      },
      {
        management_status: 'En proceso',
        detail: 'Bot registrando demanda en linea',
        updated_at: new Date(),
      },
    );
    return (result.affected ?? 0) > 0;
  }

  async findNextPendingAndMarkInProcess(
    portfolio_type_id: number,
  ): Promise<ManagementDemandsOnline | null> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const repo = queryRunner.manager.getRepository(ManagementDemandsOnlineEntity);

      const entity = await repo
        .createQueryBuilder('m')
        .setLock('pessimistic_write')
        .where('m.management_status IN (:...statuses)', { statuses: ['Abierta', 'Novedad'] })
        .andWhere('m.state_type_id = :stateTypeId', { stateTypeId: 1 })
        .andWhere('m.portfolio_type_id = :portfolioTypeId', { portfolioTypeId: portfolio_type_id })
        .orderBy('m.updated_at', 'ASC')
        .addOrderBy('m.id', 'ASC')
        .getOne();

      if (!entity) {
        await queryRunner.commitTransaction();
        return null;
      }

      entity.management_status = 'En proceso';
      entity.detail = 'Bot registrando demanda en linea';
      entity.updated_at = new Date();

      const saved = await repo.save(entity);
      await queryRunner.commitTransaction();

      return {
        id: saved.id,
        portfolio_type_id: saved.portfolio_type_id,
        name_data_base: saved.name_data_base,
        portfolio_city_config_id: saved.portfolio_city_config_id,
        campaign_id: saved.campaign_id,
        lawsuit_id: saved.lawsuit_id,
        lawsuit_court_assignments_id: saved.lawsuit_court_assignments_id,
        client_id: saved.client_id,
        path_law_doc: saved.path_law_doc,
        lawsuit_status: saved.lawsuit_status,
        amount_type_id: saved.amount_type_id,
        user_id: saved.user_id,
        user_name: saved.user_name,
        number_filed: saved.number_filed,
        management_status: saved.management_status,
        detail: saved.detail,
        state_type_id: saved.state_type_id,
        created_at: saved.created_at,
        updated_at: saved.updated_at,
        responsible: saved.responsible,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
