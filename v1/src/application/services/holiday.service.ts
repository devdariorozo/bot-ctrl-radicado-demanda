// Responsabilidad: servicio de aplicación para holidays.

import {
  ConflictException,
  UnprocessableEntityException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Holiday } from '@domain/entities/holiday.entities';
import {
  HOLIDAY_REPOSITORY,
  HolidayRepository,
  CreateHolidayInput,
} from '@domain/ports/holiday.ports';
import { TBL_STATE_TYPE_REPOSITORY, TblStateTypeRepository } from '@domain/ports/stateType.ports';
import { TblStateTypeId } from '@domain/value-objects/stateType.valueobjects';
import { userMsg } from '@application/utils/apiUserMessages.utils';
import { capitalizeFirstWord } from '@application/utils/string.utils';

@Injectable()
export class HolidayService {
  constructor(
    @Inject(HOLIDAY_REPOSITORY)
    private readonly holidayRepository: HolidayRepository,
    @Inject(TBL_STATE_TYPE_REPOSITORY)
    private readonly stateTypeRepository: TblStateTypeRepository,
  ) {}

  private normalizeName(name: string): string {
    return (name ?? '').toUpperCase().trim();
  }

  private normalizeDetail(detail: string): string {
    return capitalizeFirstWord(detail);
  }

  async create(input: CreateHolidayInput): Promise<Holiday> {
    try {
      TblStateTypeId.create(input.hldy_state_type_id);
    } catch {
      throw new UnprocessableEntityException(userMsg.idEstadoEntero);
    }

    try {
      await this.stateTypeRepository.findById(input.hldy_state_type_id);
    } catch {
      throw new NotFoundException({ message: userMsg.notFoundEstado });
    }

    const duplicate = await this.holidayRepository.findByDateAndCountry(
      input.hldy_date,
      (input.hldy_country_code ?? 'CO').toUpperCase(),
    );
    if (duplicate) {
      throw new ConflictException({
        message: 'El registro ya existe',
        hldy_date: input.hldy_date,
        hldy_country_code: input.hldy_country_code,
      });
    }

    const normalized: CreateHolidayInput = {
      ...input,
      hldy_name: this.normalizeName(input.hldy_name),
      hldy_detail: this.normalizeDetail(input.hldy_detail),
      hldy_country_code: (input.hldy_country_code ?? 'CO').toUpperCase(),
    };

    try {
      return await this.holidayRepository.create(normalized);
    } catch {
      throw new InternalServerErrorException(userMsg.noCrear);
    }
  }

  async findAll(): Promise<Holiday[]> {
    try {
      return await this.holidayRepository.findAll();
    } catch {
      throw new InternalServerErrorException(userMsg.noListar);
    }
  }

  async findById(id: number): Promise<Holiday> {
    try {
      return await this.holidayRepository.findById(id);
    } catch {
      throw new NotFoundException({ message: 'Registro no encontrado', id });
    }
  }

  async update(holiday: Holiday): Promise<Holiday> {
    try {
      TblStateTypeId.create(holiday.hldy_state_type_id);
    } catch {
      throw new UnprocessableEntityException(userMsg.idEstadoEntero);
    }

    let existing: Holiday;
    try {
      existing = await this.holidayRepository.findById(holiday.hldy_id);
    } catch {
      throw new NotFoundException({ message: 'Registro no encontrado', id: holiday.hldy_id });
    }

    try {
      await this.stateTypeRepository.findById(holiday.hldy_state_type_id);
    } catch {
      throw new NotFoundException({ message: userMsg.notFoundEstado });
    }

    const normalized: Holiday = {
      ...holiday,
      hldy_name: this.normalizeName(holiday.hldy_name),
      hldy_detail: this.normalizeDetail(holiday.hldy_detail),
      hldy_country_code: (holiday.hldy_country_code ?? 'CO').toUpperCase(),
    };

    const existingDateStr = existing.hldy_date instanceof Date
      ? existing.hldy_date.toISOString().slice(0, 10)
      : String(existing.hldy_date).slice(0, 10);
    const newDateStr = normalized.hldy_date instanceof Date
      ? normalized.hldy_date.toISOString().slice(0, 10)
      : String(normalized.hldy_date).slice(0, 10);

    const hasChanges =
      existingDateStr !== newDateStr ||
      existing.hldy_name !== normalized.hldy_name ||
      existing.hldy_country_code !== normalized.hldy_country_code ||
      existing.hldy_type !== normalized.hldy_type ||
      existing.hldy_is_working_day !== normalized.hldy_is_working_day ||
      existing.hldy_detail !== normalized.hldy_detail ||
      existing.hldy_state_type_id !== normalized.hldy_state_type_id ||
      existing.hldy_responsible !== normalized.hldy_responsible;

    if (!hasChanges) {
      throw new UnprocessableEntityException({ message: 'No hay cambios para actualizar', id: holiday.hldy_id });
    }

    const toSave: Holiday = {
      ...normalized,
      hldy_created_at: existing.hldy_created_at,
      hldy_updated_at: new Date(),
    };

    try {
      return await this.holidayRepository.update(toSave);
    } catch {
      throw new InternalServerErrorException(userMsg.noActualizar);
    }
  }

  async delete(id: number): Promise<void> {
    try {
      await this.holidayRepository.findById(id);
    } catch {
      throw new NotFoundException({ message: 'Registro no encontrado', id });
    }

    try {
      await this.holidayRepository.delete(id);
    } catch {
      throw new InternalServerErrorException(userMsg.noEliminar);
    }
  }
}
