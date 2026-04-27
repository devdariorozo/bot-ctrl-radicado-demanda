// Responsabilidad: contratos de dominio para holidays.

import { Holiday } from '@domain/entities/holiday.entities';

export const HOLIDAY_REPOSITORY = Symbol('HOLIDAY_REPOSITORY');

export type CreateHolidayInput = Pick<
  Holiday,
  'hldy_date' | 'hldy_name' | 'hldy_country_code' | 'hldy_type' | 'hldy_is_working_day' | 'hldy_detail' | 'hldy_state_type_id' | 'hldy_responsible'
> & Partial<Holiday>;

export interface HolidayRepository {
  create(data: CreateHolidayInput): Promise<Holiday>;
  findAll(): Promise<Holiday[]>;
  findById(id: number): Promise<Holiday>;
  findByDateAndCountry(date: Date, country_code: string): Promise<Holiday | null>;
  update(data: Holiday): Promise<Holiday>;
  delete(id: number): Promise<void>;
}
