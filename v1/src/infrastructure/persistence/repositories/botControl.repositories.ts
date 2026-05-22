// Responsabilidad: implementación TypeORM de BotControlRepository.

import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { BotControl } from '@domain/entities/botControl.entities';
import {
  BotControlRepository,
  CreateBotControlInput,
  FindAllBotControlFilters,
} from '@domain/ports/botControl.ports';
import { BotControlEntity } from '../entities/botControl.entities';
import { DataBasesEntity } from '../entities/dataBases.entities';
import { TblEnvironmentTypeEntity } from '../entities/environmentType.entities';
import { TblPortfolioTypeEntity } from '../entities/portfolioType.entities';

@Injectable()
export class BotControlRepositoryImpl implements BotControlRepository {
  private readonly repo: Repository<BotControlEntity>;

  constructor(@InjectDataSource() dataSource: DataSource) {
    this.repo = dataSource.getRepository(BotControlEntity);
  }

  async create(input: CreateBotControlInput): Promise<BotControl> {
    const now = new Date();
    const entity: Partial<BotControlEntity> = {
      bctrl_data_bases_id: input.bctrl_data_bases_id,
      bctrl_running: input.bctrl_running,
      bctrl_last_started_at: input.bctrl_last_started_at ?? null,
      bctrl_last_stopped_at: input.bctrl_last_stopped_at ?? null,
      bctrl_reason: input.bctrl_reason ?? null,
      bctrl_detail: input.bctrl_detail ?? null,
      bctrl_created_at: now,
      bctrl_updated_at: now,
      bctrl_responsible: input.bctrl_responsible,
    };
    const saved = await this.repo.save(entity as BotControlEntity);
    return this.toDomain(saved);
  }

  async findAll(filters: FindAllBotControlFilters = {}): Promise<BotControl[]> {
    const qb = this.repo
      .createQueryBuilder('bc')
      .select('bc.bctrl_id', 'bctrl_id')
      .addSelect('bc.bctrl_data_bases_id', 'bctrl_data_bases_id')
      .addSelect('bc.bctrl_running', 'bctrl_running')
      .addSelect('bc.bctrl_last_started_at', 'bctrl_last_started_at')
      .addSelect('bc.bctrl_last_stopped_at', 'bctrl_last_stopped_at')
      .addSelect('bc.bctrl_reason', 'bctrl_reason')
      .addSelect('bc.bctrl_detail', 'bctrl_detail')
      .addSelect('bc.bctrl_created_at', 'bctrl_created_at')
      .addSelect('bc.bctrl_updated_at', 'bctrl_updated_at')
      .addSelect('bc.bctrl_responsible', 'bctrl_responsible')
      .addSelect('env.env_type', 'environment_type_name')
      .addSelect('pf.porty_type', 'portfolio_type_name')
      .leftJoin(DataBasesEntity, 'db', 'db.db_id = bc.bctrl_data_bases_id')
      .leftJoin(TblEnvironmentTypeEntity, 'env', 'env.env_id = db.db_environment_type_id')
      .leftJoin(TblPortfolioTypeEntity, 'pf', 'pf.porty_id = db.db_portfolio_type_id');

    if (filters.start_date) {
      qb.andWhere('bc.bctrl_created_at >= :start_date', { start_date: filters.start_date });
    }
    if (filters.end_date) {
      qb.andWhere('bc.bctrl_created_at <= :end_date', { end_date: filters.end_date });
    }
    if (filters.bctrl_data_bases_id !== undefined) {
      qb.andWhere('bc.bctrl_data_bases_id = :bctrl_data_bases_id', { bctrl_data_bases_id: filters.bctrl_data_bases_id });
    }
    if (filters.bctrl_running !== undefined) {
      qb.andWhere('bc.bctrl_running = :bctrl_running', { bctrl_running: filters.bctrl_running ? 1 : 0 });
    }

    qb.orderBy('bc.bctrl_id', 'DESC');
    const raw = await qb.getRawMany();
    return raw.map((row: Record<string, unknown>) => this.rowToDomain(row));
  }

  async findById(id: number): Promise<BotControl> {
    const entity = await this.repo.findOne({ where: { bctrl_id: id } });
    if (!entity) {
      throw new Error('BotControl not found');
    }
    return this.toDomain(entity);
  }

  async findLastByDataBasesId(data_bases_id: number): Promise<BotControl | null> {
    const entity = await this.repo.findOne({
      where: { bctrl_data_bases_id: data_bases_id },
      order: { bctrl_id: 'DESC' },
    });
    return entity ? this.toDomain(entity) : null;
  }

  async findRunningByDataBasesId(data_bases_id: number): Promise<BotControl | null> {
    const entity = await this.repo.findOne({
      where: { bctrl_data_bases_id: data_bases_id, bctrl_running: true },
      order: { bctrl_id: 'DESC' },
    });
    return entity ? this.toDomain(entity) : null;
  }

  async update(data: BotControl): Promise<void> {
    await this.repo.update(
      { bctrl_id: data.bctrl_id },
      {
        bctrl_running: data.bctrl_running,
        bctrl_last_started_at: data.bctrl_last_started_at ?? null,
        bctrl_last_stopped_at: data.bctrl_last_stopped_at ?? null,
        bctrl_reason: data.bctrl_reason ?? null,
        bctrl_detail: data.bctrl_detail ?? null,
        bctrl_responsible: data.bctrl_responsible,
        bctrl_updated_at: data.bctrl_updated_at,
      },
    );
  }

  async updateDetail(data_bases_id: number, detail: string): Promise<void> {
    await this.repo.update(
      { bctrl_data_bases_id: data_bases_id, bctrl_running: true },
      { bctrl_detail: detail },
    );
  }

  async findRunningIds(): Promise<number[]> {
    const rows = await this.repo
      .createQueryBuilder('bc')
      .select('DISTINCT bc.bctrl_data_bases_id', 'bctrl_data_bases_id')
      .where('bc.bctrl_running = :running', { running: 1 })
      .getRawMany<{ bctrl_data_bases_id: number }>();
    return rows.map((r) => r.bctrl_data_bases_id);
  }

  private toDomain(entity: BotControlEntity): BotControl {
    return {
      bctrl_id: entity.bctrl_id,
      bctrl_data_bases_id: entity.bctrl_data_bases_id,
      bctrl_running: !!entity.bctrl_running,
      bctrl_last_started_at: entity.bctrl_last_started_at ?? null,
      bctrl_last_stopped_at: entity.bctrl_last_stopped_at ?? null,
      bctrl_reason: entity.bctrl_reason ?? null,
      bctrl_detail: entity.bctrl_detail ?? null,
      bctrl_created_at: entity.bctrl_created_at,
      bctrl_updated_at: entity.bctrl_updated_at,
      bctrl_responsible: entity.bctrl_responsible,
    };
  }

  private rowToDomain(row: Record<string, unknown>): BotControl {
    return {
      bctrl_id: row.bctrl_id as number,
      bctrl_data_bases_id: row.bctrl_data_bases_id as number,
      bctrl_running: !!(row.bctrl_running as number),
      bctrl_last_started_at: row.bctrl_last_started_at ? (row.bctrl_last_started_at as Date) : null,
      bctrl_last_stopped_at: row.bctrl_last_stopped_at ? (row.bctrl_last_stopped_at as Date) : null,
      bctrl_reason: (row.bctrl_reason as string) ?? null,
      bctrl_detail: (row.bctrl_detail as string) ?? null,
      bctrl_created_at: row.bctrl_created_at as Date,
      bctrl_updated_at: row.bctrl_updated_at as Date,
      bctrl_responsible: row.bctrl_responsible as string,
      environment_type_name: (row.environment_type_name as string) ?? undefined,
      portfolio_type_name: (row.portfolio_type_name as string) ?? undefined,
    };
  }
}
