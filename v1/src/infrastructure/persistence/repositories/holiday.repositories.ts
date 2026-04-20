// Responsabilidad: implementación TypeORM de HolidayRepository.

import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { HolidayEntity } from '../entities/holiday.entities';
import { Holiday } from '@domain/entities/holiday.entities';
import { CreateHolidayInput, HolidayRepository } from '@domain/ports/holiday.ports';
import { StateTypeEntity } from '../entities/stateType.entities';

@Injectable()
export class HolidayRepositoryImpl implements HolidayRepository {
  private readonly repo: Repository<HolidayEntity>;

  constructor(@InjectDataSource() dataSource: DataSource) {
    this.repo = dataSource.getRepository(HolidayEntity);
  }

  async create(data: CreateHolidayInput): Promise<Holiday> {
    const now = new Date();
    const entity: Partial<HolidayEntity> = {
      ...data,
      date: this.toDateString(data.date),
      is_working_day: data.is_working_day ? 1 : 0,
      created_at: data.created_at ?? now,
      updated_at: data.updated_at ?? now,
    };
    const saved = await this.repo.save(entity as HolidayEntity);
    return this.toDomain(saved);
  }

  async findAll(): Promise<Holiday[]> {
    const raw = await this.repo
      .createQueryBuilder('h')
      .leftJoin(StateTypeEntity, 'st', 'st.id = h.state_type_id')
      .select([
        'h.id',
        'h.date',
        'h.name',
        'h.country_code',
        'h.type',
        'h.is_working_day',
        'h.detail',
        'h.state_type_id',
        'h.created_at',
        'h.updated_at',
        'h.responsible',
      ])
      .addSelect('st.type', 'state_type_name')
      .orderBy('h.id', 'DESC')
      .getRawMany();

    return raw.map((row: Record<string, unknown>) => ({
      id: row.h_id as number,
      date: new Date(row.h_date as string),
      name: row.h_name as string,
      country_code: row.h_country_code as string,
      type: row.h_type as string,
      is_working_day: (row.h_is_working_day as number) === 1,
      detail: row.h_detail as string,
      state_type_id: row.h_state_type_id as number,
      state_type_name: (row.state_type_name as string) ?? '',
      created_at: row.h_created_at as Date,
      updated_at: row.h_updated_at as Date,
      responsible: row.h_responsible as string,
    }));
  }

  async findById(id: number): Promise<Holiday> {
    const found = await this.repo.findOne({ where: { id } });
    if (!found) {
      throw new Error('Holiday not found');
    }
    return this.toDomain(found);
  }

  async findByDateAndCountry(date: Date, country_code: string, type?: string): Promise<Holiday | null> {
    const dateStr = this.toDateString(date);
    const where: Partial<HolidayEntity> = {
      date: dateStr,
      country_code,
    };
    if (type) {
      where.type = type;
    }
    const found = await this.repo.findOne({ where });
    return found ? this.toDomain(found) : null;
  }

  async update(data: Holiday): Promise<Holiday> {
    const entity: HolidayEntity = {
      id: data.id,
      date: this.toDateString(data.date),
      name: data.name,
      country_code: data.country_code,
      type: data.type,
      is_working_day: data.is_working_day ? 1 : 0,
      detail: data.detail,
      state_type_id: data.state_type_id,
      created_at: data.created_at,
      updated_at: data.updated_at,
      responsible: data.responsible,
    };
    const saved = await this.repo.save(entity);
    return this.toDomain(saved);
  }

  async delete(id: number): Promise<void> {
    await this.repo.delete(id);
  }

  private toDomain(entity: HolidayEntity): Holiday {
    return {
      id: entity.id,
      date: new Date(entity.date),
      name: entity.name,
      country_code: entity.country_code,
      type: entity.type,
      is_working_day: entity.is_working_day === 1,
      detail: entity.detail,
      state_type_id: entity.state_type_id,
      created_at: entity.created_at,
      updated_at: entity.updated_at,
      responsible: entity.responsible,
    };
  }

  private toDateString(date: Date | string | undefined): string {
    if (!date) return new Date().toISOString().slice(0, 10);
    if (typeof date === 'string') return date.slice(0, 10);
    return date.toISOString().slice(0, 10);
  }
}

