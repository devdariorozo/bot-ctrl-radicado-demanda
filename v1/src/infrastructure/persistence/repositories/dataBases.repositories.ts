// Responsabilidad: implementación TypeORM de DataBasesRepository (`tbl_data_bases`).

import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { BasesConfig, DataBases } from '@domain/entities/dataBases.entities';
import { jsonStableStringify } from '@application/utils/jsonStableStringify.utils';
import { DataBasesEntity } from '../entities/dataBases.entities';
import {
  DataBasesRepository,
  CreateDataBasesInput,
  VCitiesRow,
} from '@domain/ports/dataBases.ports';
import { TblEnvironmentTypeEntity } from '../entities/environmentType.entities';
import { TblPortfolioTypeEntity } from '../entities/portfolioType.entities';
import { TblStateTypeEntity } from '../entities/stateType.entities';

@Injectable()
export class TblDataBasesRepositoryImpl implements DataBasesRepository {
  private readonly repo: Repository<DataBasesEntity>;

  constructor(@InjectDataSource() dataSource: DataSource) {
    this.repo = dataSource.getRepository(DataBasesEntity);
  }

  async create(input: CreateDataBasesInput): Promise<DataBases> {
    const now = new Date();
    const entity: Partial<DataBasesEntity> = {
      db_environment_type_id: input.db_environment_type_id,
      db_portfolio_type_id: input.db_portfolio_type_id,
      db_bases: input.db_bases,
      db_detail: input.db_detail,
      db_state_type_id: input.db_state_type_id,
      db_created_at: input.db_created_at ?? now,
      db_updated_at: input.db_updated_at ?? now,
      db_responsible: input.db_responsible,
    };
    const saved = await this.repo.save(entity as DataBasesEntity);
    return this.findById(saved.db_id);
  }

  async findByDuplicateBases(bases: BasesConfig): Promise<DataBases | null> {
    const target = jsonStableStringify(bases);
    const rows = await this.repo.find();
    for (const e of rows) {
      if (jsonStableStringify(e.db_bases as BasesConfig) === target) {
        return this.findById(e.db_id);
      }
    }
    return null;
  }

  async findByEnvAndPortfolio(
    db_environment_type_id: number,
    db_portfolio_type_id: number,
  ): Promise<DataBases | null> {
    const raw = await this.repo
      .createQueryBuilder('tb')
      .leftJoin(TblEnvironmentTypeEntity, 'env', 'env.env_id = tb.db_environment_type_id')
      .leftJoin(TblPortfolioTypeEntity, 'pf', 'pf.porty_id = tb.db_portfolio_type_id')
      .leftJoin(TblStateTypeEntity, 'st', 'st.stty_id = tb.db_state_type_id')
      .select('tb.db_id', 'db_id')
      .addSelect('tb.db_environment_type_id', 'db_environment_type_id')
      .addSelect('tb.db_portfolio_type_id', 'db_portfolio_type_id')
      .addSelect('tb.db_bases', 'db_bases')
      .addSelect('tb.db_detail', 'db_detail')
      .addSelect('tb.db_state_type_id', 'db_state_type_id')
      .addSelect('tb.db_created_at', 'db_created_at')
      .addSelect('tb.db_updated_at', 'db_updated_at')
      .addSelect('tb.db_responsible', 'db_responsible')
      .addSelect('env.env_type', 'environment_type_name')
      .addSelect('pf.porty_type', 'portfolio_type_name')
      .addSelect('st.stty_type', 'state_type_name')
      .where('tb.db_environment_type_id = :db_environment_type_id', { db_environment_type_id })
      .andWhere('tb.db_portfolio_type_id = :db_portfolio_type_id', { db_portfolio_type_id })
      .orderBy('tb.db_id', 'DESC')
      .getRawOne<Record<string, unknown> | undefined>();

    if (!raw) return null;

    return {
      db_id: raw.db_id as number,
      db_environment_type_id: raw.db_environment_type_id as number,
      environment_type_name: (raw.environment_type_name as string) ?? '',
      db_portfolio_type_id: raw.db_portfolio_type_id as number,
      portfolio_type_name: (raw.portfolio_type_name as string) ?? '',
      db_bases: raw.db_bases as DataBases['db_bases'],
      db_detail: raw.db_detail as string,
      db_state_type_id: raw.db_state_type_id as number,
      state_type_name: (raw.state_type_name as string) ?? '',
      db_created_at: raw.db_created_at as Date,
      db_updated_at: raw.db_updated_at as Date,
      db_responsible: raw.db_responsible as string,
    };
  }

  async findAll(): Promise<DataBases[]> {
    const raw = await this.repo
      .createQueryBuilder('tb')
      .leftJoin(TblEnvironmentTypeEntity, 'env', 'env.env_id = tb.db_environment_type_id')
      .leftJoin(TblPortfolioTypeEntity, 'pf', 'pf.porty_id = tb.db_portfolio_type_id')
      .leftJoin(TblStateTypeEntity, 'st', 'st.stty_id = tb.db_state_type_id')
      .select('tb.db_id', 'db_id')
      .addSelect('tb.db_environment_type_id', 'db_environment_type_id')
      .addSelect('tb.db_portfolio_type_id', 'db_portfolio_type_id')
      .addSelect('tb.db_bases', 'db_bases')
      .addSelect('tb.db_detail', 'db_detail')
      .addSelect('tb.db_state_type_id', 'db_state_type_id')
      .addSelect('tb.db_created_at', 'db_created_at')
      .addSelect('tb.db_updated_at', 'db_updated_at')
      .addSelect('tb.db_responsible', 'db_responsible')
      .addSelect('env.env_type', 'environment_type_name')
      .addSelect('pf.porty_type', 'portfolio_type_name')
      .addSelect('st.stty_type', 'state_type_name')
      .orderBy('tb.db_id', 'DESC')
      .getRawMany();

    return raw.map((row: Record<string, unknown>) => ({
      db_id: row.db_id as number,
      db_environment_type_id: row.db_environment_type_id as number,
      environment_type_name: (row.environment_type_name as string) ?? '',
      db_portfolio_type_id: row.db_portfolio_type_id as number,
      portfolio_type_name: (row.portfolio_type_name as string) ?? '',
      db_bases: row.db_bases as DataBases['db_bases'],
      db_detail: row.db_detail as string,
      db_state_type_id: row.db_state_type_id as number,
      state_type_name: (row.state_type_name as string) ?? '',
      db_created_at: row.db_created_at as Date,
      db_updated_at: row.db_updated_at as Date,
      db_responsible: row.db_responsible as string,
    }));
  }

  async findById(id: number): Promise<DataBases> {
    const raw = await this.repo
      .createQueryBuilder('tb')
      .leftJoin(TblEnvironmentTypeEntity, 'env', 'env.env_id = tb.db_environment_type_id')
      .leftJoin(TblPortfolioTypeEntity, 'pf', 'pf.porty_id = tb.db_portfolio_type_id')
      .leftJoin(TblStateTypeEntity, 'st', 'st.stty_id = tb.db_state_type_id')
      .leftJoin(TblStateTypeEntity, 'st_pf', 'st_pf.stty_id = pf.porty_state_type_id')
      .select('tb.db_id', 'db_id')
      .addSelect('tb.db_environment_type_id', 'db_environment_type_id')
      .addSelect('tb.db_portfolio_type_id', 'db_portfolio_type_id')
      .addSelect('tb.db_bases', 'db_bases')
      .addSelect('tb.db_detail', 'db_detail')
      .addSelect('tb.db_state_type_id', 'db_state_type_id')
      .addSelect('tb.db_created_at', 'db_created_at')
      .addSelect('tb.db_updated_at', 'db_updated_at')
      .addSelect('tb.db_responsible', 'db_responsible')
      .addSelect('env.env_type', 'environment_type_name')
      .addSelect('pf.porty_type', 'portfolio_type_name')
      .addSelect('st.stty_type', 'state_type_name')
      .addSelect('st_pf.stty_type', 'portfolio_state_type_name')
      .where('tb.db_id = :id', { id })
      .getRawOne<Record<string, unknown> | undefined>();

    if (!raw) {
      throw new Error('DataBases record not found');
    }

    return {
      db_id: raw.db_id as number,
      db_environment_type_id: raw.db_environment_type_id as number,
      environment_type_name: (raw.environment_type_name as string) ?? '',
      db_portfolio_type_id: raw.db_portfolio_type_id as number,
      portfolio_type_name: (raw.portfolio_type_name as string) ?? '',
      db_bases: raw.db_bases as DataBases['db_bases'],
      db_detail: raw.db_detail as string,
      db_state_type_id: raw.db_state_type_id as number,
      state_type_name: (raw.state_type_name as string) ?? '',
      portfolio_state_type_name: (raw.portfolio_state_type_name as string) ?? undefined,
      db_created_at: raw.db_created_at as Date,
      db_updated_at: raw.db_updated_at as Date,
      db_responsible: raw.db_responsible as string,
    };
  }

  async update(dataBases: DataBases): Promise<DataBases> {
    await this.repo.update(
      { db_id: dataBases.db_id },
      {
        db_environment_type_id: dataBases.db_environment_type_id,
        db_portfolio_type_id: dataBases.db_portfolio_type_id,
        db_bases: dataBases.db_bases,
        db_detail: dataBases.db_detail,
        db_state_type_id: dataBases.db_state_type_id,
        db_responsible: dataBases.db_responsible,
        db_updated_at: dataBases.db_updated_at,
      },
    );
    return this.findById(dataBases.db_id);
  }

  async delete(id: number): Promise<void> {
    await this.repo.delete({ db_id: id });
  }

  async fetchVCitiesFromFirstBase(idDataBases: number): Promise<VCitiesRow[]> {
    const record = await this.findById(idDataBases);
    if (!record.db_bases || typeof record.db_bases !== 'object' || Object.keys(record.db_bases).length === 0) {
      throw new Error('No bases configured for this data_bases record');
    }
    const firstBase = Object.keys(record.db_bases)[0];
    if (!/^[a-zA-Z0-9_]+$/.test(firstBase)) {
      throw new Error('Invalid database name');
    }
    const sql = `SELECT id, city_name, department, city FROM \`${firstBase}\`.v_cities`;
    const rows = await this.repo.manager.query(sql);
    return rows as VCitiesRow[];
  }

  async runQueryOnBase(
    baseName: string,
    sql: string,
    params: unknown[] = [],
  ): Promise<Record<string, unknown>[]> {
    if (!/^[a-zA-Z0-9_]+$/.test(baseName)) {
      throw new Error('Invalid database name');
    }
    const rows = await this.repo.manager.query(sql, params);
    return (rows ?? []) as Record<string, unknown>[];
  }
}
