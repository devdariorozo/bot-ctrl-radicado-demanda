// Responsabilidad: contratos de dominio para holidays.

import { Holiday } from '@domain/entities/holiday.entities';

export const HOLIDAY_REPOSITORY = Symbol('HOLIDAY_REPOSITORY');

export type CreateHolidayInput = Pick<
  Holiday,
  'date' | 'name' | 'country_code' | 'type' | 'is_working_day' | 'detail' | 'state_type_id' | 'responsible'
> & Partial<Holiday>;

export interface HolidayRepository {
  create(data: CreateHolidayInput): Promise<Holiday>;
  findAll(): Promise<Holiday[]>;
  findById(id: number): Promise<Holiday>;
  findByDateAndCountry(date: Date, country_code: string, type?: string): Promise<Holiday | null>;
  update(data: Holiday): Promise<Holiday>;
  delete(id: number): Promise<void>;
}

