// Responsabilidad: implementación concreta de AttentionScheduleRepository con TypeORM.

import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { AttentionSchedule } from '@domain/entities/attentionSchedule.entities';
import {
  AttentionScheduleRepository,
  CreateAttentionScheduleInput,
} from '@domain/ports/attentionSchedule.ports';
import { AttentionScheduleEntity } from '../entities/attentionSchedule.entities';
import { PortfolioTypeEntity } from '../entities/portfolioType.entities';
import { StateTypeEntity } from '../entities/stateType.entities';

@Injectable()
export class AttentionScheduleRepositoryImpl implements AttentionScheduleRepository {
  private readonly repo: Repository<AttentionScheduleEntity>;

  constructor(@InjectDataSource() dataSource: DataSource) {
    this.repo = dataSource.getRepository(AttentionScheduleEntity);
  }

  async create(input: CreateAttentionScheduleInput): Promise<AttentionSchedule> {
    const now = new Date();
    const entity: Partial<AttentionScheduleEntity> = {
      portfolio_type_id: input.portfolio_type_id,
      days: input.days,
      start_time: input.start_time,
      start_recess: (input as any).start_recess,
      end_recess: (input as any).end_recess,
      end_time: input.end_time,
      detail: input.detail,
      state_type_id: input.state_type_id,
      created_at: input.created_at ?? now,
      updated_at: input.updated_at ?? now,
      responsible: input.responsible,
    };
    const saved = await this.repo.save(entity as AttentionScheduleEntity);
    return this.toDomain(saved);
  }

  private toDomain(entity: AttentionScheduleEntity): AttentionSchedule {
    const days = Array.isArray(entity.days) ? entity.days : JSON.parse(String(entity.days ?? '[]'));
    return {
      id: entity.id,
      portfolio_type_id: entity.portfolio_type_id,
      days,
      start_time: entity.start_time,
      start_recess: (entity as any).start_recess,
      end_recess: (entity as any).end_recess,
      end_time: entity.end_time,
      detail: entity.detail,
      state_type_id: entity.state_type_id,
      created_at: entity.created_at,
      updated_at: entity.updated_at,
      responsible: entity.responsible,
    };
  }

  async findAll(): Promise<AttentionSchedule[]> {
    const raw = await this.repo
      .createQueryBuilder('sc')
      .leftJoin(PortfolioTypeEntity, 'pf', 'pf.id = sc.portfolio_type_id')
      .leftJoin(StateTypeEntity, 'st', 'st.id = sc.state_type_id')
      .select([
        'sc.id',
        'sc.portfolio_type_id',
        'sc.days',
        'sc.start_time',
        'sc.start_recess',
        'sc.end_recess',
        'sc.end_time',
        'sc.detail',
        'sc.state_type_id',
        'sc.created_at',
        'sc.updated_at',
        'sc.responsible',
      ])
      .addSelect('pf.type', 'portfolio_type_name')
      .addSelect('st.type', 'state_type_name')
      .orderBy('sc.id', 'DESC')
      .getRawMany();

    return raw.map((row: Record<string, unknown>) => {
      const daysRaw = row.sc_days;
      const days = typeof daysRaw === 'string' ? JSON.parse(daysRaw) : (daysRaw as string[]);
      return {
        id: row.sc_id as number,
        portfolio_type_id: row.sc_portfolio_type_id as number,
        portfolio_type_name: (row.portfolio_type_name as string) ?? '',
        days: Array.isArray(days) ? days : [],
        start_time: row.sc_start_time as string,
        start_recess: (row as any).sc_start_recess as string,
        end_recess: (row as any).sc_end_recess as string,
        end_time: row.sc_end_time as string,
        detail: row.sc_detail as string,
        state_type_id: row.sc_state_type_id as number,
        state_type_name: (row.state_type_name as string) ?? '',
        created_at: row.sc_created_at as Date,
        updated_at: row.sc_updated_at as Date,
        responsible: row.sc_responsible as string,
      };
    });
  }

  async findById(id: number): Promise<AttentionSchedule> {
    const entity = await this.repo.findOneBy({ id });
    if (!entity) {
      throw new Error('Attention schedule not found');
    }
    return this.toDomain(entity);
  }

  async findByPortfolio(portfolio_type_id: number, day?: string): Promise<AttentionSchedule[]> {
    const qb = this.repo
      .createQueryBuilder('sc')
      .leftJoin(PortfolioTypeEntity, 'pf', 'pf.id = sc.portfolio_type_id')
      .leftJoin(StateTypeEntity, 'st', 'st.id = sc.state_type_id')
      .select([
        'sc.id',
        'sc.portfolio_type_id',
        'sc.days',
        'sc.start_time',
        'sc.start_recess',
        'sc.end_recess',
        'sc.end_time',
        'sc.detail',
        'sc.state_type_id',
        'sc.created_at',
        'sc.updated_at',
        'sc.responsible',
      ])
      .addSelect('pf.type', 'portfolio_type_name')
      .addSelect('st.type', 'state_type_name')
      .where('sc.portfolio_type_id = :portfolio_type_id', { portfolio_type_id });

    if (day !== undefined) {
      qb.andWhere('JSON_CONTAINS(sc.days, :dayVal, \'$\')', {
        dayVal: JSON.stringify(day),
      });
    }

    const raw = await qb.getRawMany();
    return raw.map((row: Record<string, unknown>) => {
      const daysRaw = row.sc_days;
      const days = typeof daysRaw === 'string' ? JSON.parse(daysRaw) : (daysRaw as string[]);
      return {
        id: row.sc_id as number,
        portfolio_type_id: row.sc_portfolio_type_id as number,
        portfolio_type_name: (row.portfolio_type_name as string) ?? '',
        days: Array.isArray(days) ? days : [],
        start_time: row.sc_start_time as string,
        start_recess: (row as any).sc_start_recess as string,
        end_recess: (row as any).sc_end_recess as string,
        end_time: row.sc_end_time as string,
        detail: row.sc_detail as string,
        state_type_id: row.sc_state_type_id as number,
        state_type_name: (row.state_type_name as string) ?? '',
        created_at: row.sc_created_at as Date,
        updated_at: row.sc_updated_at as Date,
        responsible: row.sc_responsible as string,
      };
    });
  }

  async update(attentionSchedule: AttentionSchedule): Promise<AttentionSchedule> {
    const entity: AttentionScheduleEntity = {
      id: attentionSchedule.id,
      portfolio_type_id: attentionSchedule.portfolio_type_id,
      days: attentionSchedule.days,
      start_time: attentionSchedule.start_time,
      start_recess: (attentionSchedule as any).start_recess,
      end_recess: (attentionSchedule as any).end_recess,
      end_time: attentionSchedule.end_time,
      detail: attentionSchedule.detail,
      state_type_id: attentionSchedule.state_type_id,
      created_at: attentionSchedule.created_at,
      updated_at: attentionSchedule.updated_at,
      responsible: attentionSchedule.responsible,
    };
    const saved = await this.repo.save(entity);
    return this.toDomain(saved);
  }

  // Eliminar un horario
  async delete(id: number): Promise<void> {
    await this.repo.delete(id);
  }
}

