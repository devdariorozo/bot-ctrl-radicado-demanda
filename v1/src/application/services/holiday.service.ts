// Responsabilidad: servicio de aplicación para holidays.

import {
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
import { TBL_STATE_TYPE_REPOSITORY, TblStateTypeRepository } from '@domain/ports/tblStateType.ports';
import { TblStateTypeId } from '@domain/value-objects/tblStateType.valueobjects';
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
      TblStateTypeId.create(input.state_type_id);
    } catch {
      throw new UnprocessableEntityException(userMsg.idEstadoEntero);
    }

    try {
      await this.stateTypeRepository.findById(input.state_type_id);
    } catch {
      throw new NotFoundException({ message: userMsg.notFoundEstado });
    }

    const normalized: CreateHolidayInput = {
      ...input,
      name: this.normalizeName(input.name),
      detail: this.normalizeDetail(input.detail),
      country_code: (input.country_code ?? 'CO').toUpperCase(),
      responsible: input.responsible ?? 'BOT ctrl filed demand',
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
      const holiday = await this.holidayRepository.findById(id);
      const state = await this.stateTypeRepository.findById(holiday.state_type_id);
      return {
        ...holiday,
        state_type_name: state.stty_type,
      };
    } catch {
      throw new NotFoundException({ message: userMsg.registroNoEncontrado });
    }
  }

  async update(holiday: Holiday): Promise<Holiday> {
    try {
      TblStateTypeId.create(holiday.state_type_id);
    } catch {
      throw new UnprocessableEntityException(userMsg.idEstadoEntero);
    }

    let existing: Holiday;
    try {
      existing = await this.holidayRepository.findById(holiday.id);
    } catch {
      throw new NotFoundException({ message: userMsg.registroNoEncontrado });
    }

    const normalized: Holiday = {
      ...holiday,
      name: this.normalizeName(holiday.name),
      detail: this.normalizeDetail(holiday.detail),
      country_code: (holiday.country_code ?? 'CO').toUpperCase(),
      responsible: holiday.responsible ?? 'BOT ctrl filed demand',
    };

    const hasChanges =
      existing.date.getTime() !== normalized.date.getTime() ||
      existing.name !== normalized.name ||
      existing.country_code !== normalized.country_code ||
      existing.type !== normalized.type ||
      existing.is_working_day !== normalized.is_working_day ||
      existing.detail !== normalized.detail ||
      existing.state_type_id !== normalized.state_type_id ||
      existing.responsible !== normalized.responsible;

    if (!hasChanges) {
      throw new UnprocessableEntityException({ message: userMsg.sinCambios });
    }

    try {
      return await this.holidayRepository.update(normalized);
    } catch {
      throw new InternalServerErrorException(userMsg.noActualizar);
    }
  }

  async delete(id: number): Promise<void> {
    try {
      await this.holidayRepository.findById(id);
    } catch {
      throw new NotFoundException({ message: userMsg.registroNoEncontrado });
    }

    try {
      await this.holidayRepository.delete(id);
    } catch {
      throw new InternalServerErrorException(userMsg.noEliminar);
    }
  }
}

