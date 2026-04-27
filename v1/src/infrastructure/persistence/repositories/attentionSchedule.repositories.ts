// Responsabilidad: implementación concreta de TblAttentionScheduleRepository con TypeORM.

import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { TblAttentionSchedule } from '@domain/entities/attentionSchedule.entities';
import {
  TblAttentionScheduleRepository,
  CreateTblAttentionScheduleInput,
} from '@domain/ports/attentionSchedule.ports';
import { TblAttentionScheduleEntity } from '../entities/attentionSchedule.entities';
import { TblPortfolioTypeEntity } from '../entities/portfolioType.entities';
import { TblStateTypeEntity } from '../entities/stateType.entities';

@Injectable()
export class TblAttentionScheduleRepositoryImpl implements TblAttentionScheduleRepository {
  private readonly repo: Repository<TblAttentionScheduleEntity>;

  constructor(@InjectDataSource() dataSource: DataSource) {
    this.repo = dataSource.getRepository(TblAttentionScheduleEntity);
  }

  async create(input: CreateTblAttentionScheduleInput): Promise<TblAttentionSchedule> {
    const now = new Date();
    const entity: Partial<TblAttentionScheduleEntity> = {
      atsh_portfolio_type_id: input.atsh_portfolio_type_id,
      atsh_days: input.atsh_days,
      atsh_start_time: input.atsh_start_time,
      atsh_start_recess_time: input.atsh_start_recess_time,
      atsh_end_recess_time: input.atsh_end_recess_time,
      atsh_end_time: input.atsh_end_time,
      atsh_detail: input.atsh_detail,
      atsh_state_type_id: input.atsh_state_type_id,
      atsh_created_at: input.atsh_created_at ?? now,
      atsh_updated_at: input.atsh_updated_at ?? now,
      atsh_responsible: input.atsh_responsible,
    };
    const saved = await this.repo.save(entity as TblAttentionScheduleEntity);
    return this.toDomain(saved);
  }

  async findByDuplicate(atsh_portfolio_type_id: number, atsh_days: string[]): Promise<TblAttentionSchedule | null> {
    const records = await this.repo.findBy({ atsh_portfolio_type_id });
    const inputDaysSet = new Set(atsh_days);
    for (const record of records) {
      const days = Array.isArray(record.atsh_days)
        ? record.atsh_days
        : JSON.parse(String(record.atsh_days ?? '[]'));
      if (
        days.length === atsh_days.length &&
        days.every((d: string) => inputDaysSet.has(d))
      ) {
        return this.toDomain(record);
      }
    }
    return null;
  }

  private toDomain(entity: TblAttentionScheduleEntity): TblAttentionSchedule {
    const days = Array.isArray(entity.atsh_days)
      ? entity.atsh_days
      : JSON.parse(String(entity.atsh_days ?? '[]'));
    return {
      atsh_id: entity.atsh_id,
      atsh_portfolio_type_id: entity.atsh_portfolio_type_id,
      atsh_days: days,
      atsh_start_time: entity.atsh_start_time,
      atsh_start_recess_time: entity.atsh_start_recess_time,
      atsh_end_recess_time: entity.atsh_end_recess_time,
      atsh_end_time: entity.atsh_end_time,
      atsh_detail: entity.atsh_detail,
      atsh_state_type_id: entity.atsh_state_type_id,
      atsh_created_at: entity.atsh_created_at,
      atsh_updated_at: entity.atsh_updated_at,
      atsh_responsible: entity.atsh_responsible,
    };
  }

  private mapRawRow(row: Record<string, unknown>): TblAttentionSchedule {
    const daysRaw = row.asch_atsh_days;
    const days = typeof daysRaw === 'string' ? JSON.parse(daysRaw) : (daysRaw as string[]);
    return {
      atsh_id: row.asch_atsh_id as number,
      atsh_portfolio_type_id: row.asch_atsh_portfolio_type_id as number,
      portfolio_type_name: (row.portfolio_type_name as string) ?? '',
      atsh_days: Array.isArray(days) ? days : [],
      atsh_start_time: row.asch_atsh_start_time as string,
      atsh_start_recess_time: row.asch_atsh_start_recess_time as string,
      atsh_end_recess_time: row.asch_atsh_end_recess_time as string,
      atsh_end_time: row.asch_atsh_end_time as string,
      atsh_detail: row.asch_atsh_detail as string,
      atsh_state_type_id: row.asch_atsh_state_type_id as number,
      state_type_name: (row.state_type_name as string) ?? '',
      atsh_created_at: row.asch_atsh_created_at as Date,
      atsh_updated_at: row.asch_atsh_updated_at as Date,
      atsh_responsible: row.asch_atsh_responsible as string,
    };
  }

  async findAll(): Promise<TblAttentionSchedule[]> {
    const raw = await this.repo
      .createQueryBuilder('asch')
      .leftJoin(TblPortfolioTypeEntity, 'pf', 'pf.porty_id = asch.atsh_portfolio_type_id')
      .leftJoin(TblStateTypeEntity, 'st', 'st.stty_id = asch.atsh_state_type_id')
      .select([
        'asch.atsh_id',
        'asch.atsh_portfolio_type_id',
        'asch.atsh_days',
        'asch.atsh_start_time',
        'asch.atsh_start_recess_time',
        'asch.atsh_end_recess_time',
        'asch.atsh_end_time',
        'asch.atsh_detail',
        'asch.atsh_state_type_id',
        'asch.atsh_created_at',
        'asch.atsh_updated_at',
        'asch.atsh_responsible',
      ])
      .addSelect('pf.porty_type', 'portfolio_type_name')
      .addSelect('st.stty_type', 'state_type_name')
      .orderBy('asch.atsh_id', 'DESC')
      .getRawMany();

    return raw.map((row: Record<string, unknown>) => this.mapRawRow(row));
  }

  async findAllActive(): Promise<TblAttentionSchedule[]> {
    const raw = await this.repo
      .createQueryBuilder('asch')
      .leftJoin(TblPortfolioTypeEntity, 'pf', 'pf.porty_id = asch.atsh_portfolio_type_id')
      .leftJoin(TblStateTypeEntity, 'st', 'st.stty_id = asch.atsh_state_type_id')
      .where('LOWER(COALESCE(st.stty_type, :empty)) NOT LIKE :pattern', {
        pattern: '%inactiv%',
        empty: '',
      })
      .select([
        'asch.atsh_id',
        'asch.atsh_portfolio_type_id',
        'asch.atsh_days',
        'asch.atsh_start_time',
        'asch.atsh_start_recess_time',
        'asch.atsh_end_recess_time',
        'asch.atsh_end_time',
        'asch.atsh_detail',
        'asch.atsh_state_type_id',
        'asch.atsh_created_at',
        'asch.atsh_updated_at',
        'asch.atsh_responsible',
      ])
      .addSelect('pf.porty_type', 'portfolio_type_name')
      .addSelect('st.stty_type', 'state_type_name')
      .orderBy('asch.atsh_id', 'DESC')
      .getRawMany();

    return raw.map((row: Record<string, unknown>) => this.mapRawRow(row));
  }

  async findByPortfolioType(atsh_portfolio_type_id: number): Promise<TblAttentionSchedule[]> {
    const raw = await this.repo
      .createQueryBuilder('asch')
      .leftJoin(TblStateTypeEntity, 'st', 'st.stty_id = asch.atsh_state_type_id')
      .select([
        'asch.atsh_id',
        'asch.atsh_portfolio_type_id',
        'asch.atsh_days',
        'asch.atsh_start_time',
        'asch.atsh_start_recess_time',
        'asch.atsh_end_recess_time',
        'asch.atsh_end_time',
        'asch.atsh_detail',
        'asch.atsh_state_type_id',
        'asch.atsh_created_at',
        'asch.atsh_updated_at',
        'asch.atsh_responsible',
      ])
      .addSelect('st.stty_type', 'state_type_name')
      .where('asch.atsh_portfolio_type_id = :pid', { pid: atsh_portfolio_type_id })
      .getRawMany();

    return raw.map((row: Record<string, unknown>) => {
      const daysRaw = row.asch_atsh_days;
      const days = typeof daysRaw === 'string' ? JSON.parse(daysRaw) : (daysRaw as string[]);
      return {
        atsh_id: row.asch_atsh_id as number,
        atsh_portfolio_type_id: row.asch_atsh_portfolio_type_id as number,
        atsh_days: Array.isArray(days) ? days : [],
        atsh_start_time: row.asch_atsh_start_time as string,
        atsh_start_recess_time: row.asch_atsh_start_recess_time as string,
        atsh_end_recess_time: row.asch_atsh_end_recess_time as string,
        atsh_end_time: row.asch_atsh_end_time as string,
        atsh_detail: row.asch_atsh_detail as string,
        atsh_state_type_id: row.asch_atsh_state_type_id as number,
        state_type_name: (row.state_type_name as string) ?? '',
        atsh_created_at: row.asch_atsh_created_at as Date,
        atsh_updated_at: row.asch_atsh_updated_at as Date,
        atsh_responsible: row.asch_atsh_responsible as string,
      };
    });
  }

  async findById(id: number): Promise<TblAttentionSchedule> {
    const entity = await this.repo.findOneBy({ atsh_id: id });
    if (!entity) {
      throw new Error('tbl_attention_schedule not found');
    }
    return this.toDomain(entity);
  }

  async update(input: TblAttentionSchedule): Promise<void> {
    await this.repo.update(
      { atsh_id: input.atsh_id },
      {
        atsh_portfolio_type_id: input.atsh_portfolio_type_id,
        atsh_days: input.atsh_days,
        atsh_start_time: input.atsh_start_time,
        atsh_start_recess_time: input.atsh_start_recess_time,
        atsh_end_recess_time: input.atsh_end_recess_time,
        atsh_end_time: input.atsh_end_time,
        atsh_detail: input.atsh_detail,
        atsh_state_type_id: input.atsh_state_type_id,
        atsh_responsible: input.atsh_responsible,
        atsh_updated_at: new Date(),
      },
    );
  }

  async delete(id: number): Promise<void> {
    await this.repo.delete(id);
  }
}
