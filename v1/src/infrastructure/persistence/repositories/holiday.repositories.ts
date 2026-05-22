// Responsabilidad: implementación TypeORM de HolidayRepository (`tbl_holiday`).

import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { HolidayEntity } from '../entities/holiday.entities';
import { Holiday } from '@domain/entities/holiday.entities';
import { CreateHolidayInput, HolidayRepository } from '@domain/ports/holiday.ports';
import { TblStateTypeEntity } from '../entities/stateType.entities';

@Injectable()
export class TblHolidayRepositoryImpl implements HolidayRepository {
  private readonly repo: Repository<HolidayEntity>;

  constructor(@InjectDataSource() dataSource: DataSource) {
    this.repo = dataSource.getRepository(HolidayEntity);
  }

  async create(data: CreateHolidayInput): Promise<Holiday> {
    const now = new Date();
    const entity: Partial<HolidayEntity> = {
      hldy_date: this.toDateString(data.hldy_date),
      hldy_name: data.hldy_name,
      hldy_country_code: data.hldy_country_code,
      hldy_type: data.hldy_type,
      hldy_is_working_day: data.hldy_is_working_day ? 1 : 0,
      hldy_detail: data.hldy_detail,
      hldy_state_type_id: data.hldy_state_type_id,
      hldy_created_at: data.hldy_created_at ?? now,
      hldy_updated_at: data.hldy_updated_at ?? now,
      hldy_responsible: data.hldy_responsible,
    };
    const saved = await this.repo.save(entity as HolidayEntity);
    return this.findById(saved.hldy_id);
  }

  async findAll(): Promise<Holiday[]> {
    const raw = await this.repo
      .createQueryBuilder('h')
      .leftJoin(TblStateTypeEntity, 'st', 'st.stty_id = h.hldy_state_type_id')
      .select('h.hldy_id', 'hldy_id')
      .addSelect('h.hldy_date', 'hldy_date')
      .addSelect('h.hldy_name', 'hldy_name')
      .addSelect('h.hldy_country_code', 'hldy_country_code')
      .addSelect('h.hldy_type', 'hldy_type')
      .addSelect('h.hldy_is_working_day', 'hldy_is_working_day')
      .addSelect('h.hldy_detail', 'hldy_detail')
      .addSelect('h.hldy_state_type_id', 'hldy_state_type_id')
      .addSelect('h.hldy_created_at', 'hldy_created_at')
      .addSelect('h.hldy_updated_at', 'hldy_updated_at')
      .addSelect('h.hldy_responsible', 'hldy_responsible')
      .addSelect('st.stty_type', 'state_type_name')
      .orderBy('h.hldy_date', 'DESC')
      .getRawMany();

    return raw.map((row: Record<string, unknown>) => this.rowToDomain(row));
  }

  async findById(id: number): Promise<Holiday> {
    const raw = await this.repo
      .createQueryBuilder('h')
      .leftJoin(TblStateTypeEntity, 'st', 'st.stty_id = h.hldy_state_type_id')
      .select('h.hldy_id', 'hldy_id')
      .addSelect('h.hldy_date', 'hldy_date')
      .addSelect('h.hldy_name', 'hldy_name')
      .addSelect('h.hldy_country_code', 'hldy_country_code')
      .addSelect('h.hldy_type', 'hldy_type')
      .addSelect('h.hldy_is_working_day', 'hldy_is_working_day')
      .addSelect('h.hldy_detail', 'hldy_detail')
      .addSelect('h.hldy_state_type_id', 'hldy_state_type_id')
      .addSelect('h.hldy_created_at', 'hldy_created_at')
      .addSelect('h.hldy_updated_at', 'hldy_updated_at')
      .addSelect('h.hldy_responsible', 'hldy_responsible')
      .addSelect('st.stty_type', 'state_type_name')
      .where('h.hldy_id = :id', { id })
      .getRawOne<Record<string, unknown> | undefined>();

    if (!raw) {
      throw new Error('Holiday not found');
    }
    return this.rowToDomain(raw);
  }

  async findByDateAndCountry(date: Date, country_code: string): Promise<Holiday | null> {
    const dateStr = this.toDateString(date);
    const found = await this.repo.findOne({
      where: { hldy_date: dateStr, hldy_country_code: country_code },
    });
    return found ? this.entityToDomain(found) : null;
  }

  async update(data: Holiday): Promise<Holiday> {
    await this.repo.update(
      { hldy_id: data.hldy_id },
      {
        hldy_date: this.toDateString(data.hldy_date),
        hldy_name: data.hldy_name,
        hldy_country_code: data.hldy_country_code,
        hldy_type: data.hldy_type,
        hldy_is_working_day: data.hldy_is_working_day ? 1 : 0,
        hldy_detail: data.hldy_detail,
        hldy_state_type_id: data.hldy_state_type_id,
        hldy_responsible: data.hldy_responsible,
        hldy_updated_at: data.hldy_updated_at,
      },
    );
    return this.findById(data.hldy_id);
  }

  async delete(id: number): Promise<void> {
    await this.repo.delete({ hldy_id: id });
  }

  private rowToDomain(row: Record<string, unknown>): Holiday {
    return {
      hldy_id: row.hldy_id as number,
      hldy_date: new Date(row.hldy_date as string),
      hldy_name: row.hldy_name as string,
      hldy_country_code: row.hldy_country_code as string,
      hldy_type: row.hldy_type as string,
      hldy_is_working_day: (row.hldy_is_working_day as number) === 1,
      hldy_detail: row.hldy_detail as string,
      hldy_state_type_id: row.hldy_state_type_id as number,
      state_type_name: (row.state_type_name as string) ?? '',
      hldy_created_at: row.hldy_created_at as Date,
      hldy_updated_at: row.hldy_updated_at as Date,
      hldy_responsible: row.hldy_responsible as string,
    };
  }

  private entityToDomain(entity: HolidayEntity): Holiday {
    return {
      hldy_id: entity.hldy_id,
      hldy_date: new Date(entity.hldy_date),
      hldy_name: entity.hldy_name,
      hldy_country_code: entity.hldy_country_code,
      hldy_type: entity.hldy_type,
      hldy_is_working_day: entity.hldy_is_working_day === 1,
      hldy_detail: entity.hldy_detail,
      hldy_state_type_id: entity.hldy_state_type_id,
      hldy_created_at: entity.hldy_created_at,
      hldy_updated_at: entity.hldy_updated_at,
      hldy_responsible: entity.hldy_responsible,
    };
  }

  private toDateString(date: Date | string | undefined): string {
    if (!date) return new Date().toISOString().slice(0, 10);
    if (typeof date === 'string') return date.slice(0, 10);
    return date.toISOString().slice(0, 10);
  }
}
