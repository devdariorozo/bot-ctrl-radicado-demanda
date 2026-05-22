// Responsabilidad: fachada de aplicación que usará el controller.

import {
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { TblAttentionSchedule } from '@domain/entities/attentionSchedule.entities';
import {
  TBL_ATTENTION_SCHEDULE_REPOSITORY,
  TblAttentionScheduleRepository,
  CreateTblAttentionScheduleInput,
} from '@domain/ports/attentionSchedule.ports';
import { TBL_PORTFOLIO_TYPE_REPOSITORY, TblPortfolioTypeRepository } from '@domain/ports/portfolioType.ports';
import { TBL_STATE_TYPE_REPOSITORY, TblStateTypeRepository } from '@domain/ports/stateType.ports';
import { TblPortfolioTypeId } from '@domain/value-objects/portfolioType.valueobjects';
import { TblStateTypeId } from '@domain/value-objects/stateType.valueobjects';
import { DAYS_OF_WEEK_EN } from '@domain/value-objects/attentionSchedule.valueobjects';
import { userMsg } from '@application/utils/apiUserMessages.utils';
import { capitalizeFirstWord } from '@application/utils/string.utils';

@Injectable()
export class TblAttentionScheduleService {
  constructor(
    @Inject(TBL_ATTENTION_SCHEDULE_REPOSITORY)
    private readonly attentionScheduleRepository: TblAttentionScheduleRepository,
    @Inject(TBL_PORTFOLIO_TYPE_REPOSITORY)
    private readonly portfolioTypeRepository: TblPortfolioTypeRepository,
    @Inject(TBL_STATE_TYPE_REPOSITORY)
    private readonly stateTypeRepository: TblStateTypeRepository,
  ) {}

  async create(input: CreateTblAttentionScheduleInput): Promise<TblAttentionSchedule> {
    try {
      TblPortfolioTypeId.create(input.atsh_portfolio_type_id);
    } catch {
      throw new UnprocessableEntityException(userMsg.idCarteraEntero);
    }
    try {
      TblStateTypeId.create(input.atsh_state_type_id);
    } catch {
      throw new UnprocessableEntityException(userMsg.idEstadoEntero);
    }

    if (!input.atsh_days?.length) {
      throw new UnprocessableEntityException(userMsg.diasObligatorios);
    }
    for (const d of input.atsh_days) {
      if (!DAYS_OF_WEEK_EN.includes(d as (typeof DAYS_OF_WEEK_EN)[number])) {
        throw new UnprocessableEntityException(
          `Cada día debe ser uno de: ${DAYS_OF_WEEK_EN.join(', ')}`,
        );
      }
    }

    const duplicate = await this.attentionScheduleRepository.findByDuplicate(
      input.atsh_portfolio_type_id,
      input.atsh_days,
    );
    if (duplicate) {
      throw new ConflictException({
        message: 'El registro ya existe',
        atsh_portfolio_type_id: input.atsh_portfolio_type_id,
        atsh_days: input.atsh_days,
      });
    }

    const toCreate: CreateTblAttentionScheduleInput = {
      ...input,
      atsh_detail: capitalizeFirstWord(input.atsh_detail),
    };
    try {
      return await this.attentionScheduleRepository.create(toCreate);
    } catch {
      throw new InternalServerErrorException(userMsg.noCrear);
    }
  }

  async findAll(): Promise<TblAttentionSchedule[]> {
    try {
      return await this.attentionScheduleRepository.findAll();
    } catch {
      throw new InternalServerErrorException(userMsg.noListar);
    }
  }

  async findAllActive(): Promise<TblAttentionSchedule[]> {
    try {
      return await this.attentionScheduleRepository.findAllActive();
    } catch {
      throw new InternalServerErrorException(userMsg.noListar);
    }
  }

  async findById(id: number): Promise<TblAttentionSchedule> {
    let record: TblAttentionSchedule;
    try {
      record = await this.attentionScheduleRepository.findById(id);
    } catch {
      throw new NotFoundException({ message: userMsg.registroNoEncontrado });
    }
    try {
      const [portfolio, state] = await Promise.all([
        this.portfolioTypeRepository.findById(record.atsh_portfolio_type_id),
        this.stateTypeRepository.findById(record.atsh_state_type_id),
      ]);
      return { ...record, portfolio_type_name: portfolio.porty_type, state_type_name: state.stty_type };
    } catch {
      throw new InternalServerErrorException(userMsg.noCargarRelacion);
    }
  }

  async update(input: TblAttentionSchedule): Promise<void> {
    try {
      TblPortfolioTypeId.create(input.atsh_portfolio_type_id);
    } catch {
      throw new UnprocessableEntityException(userMsg.idCarteraEntero);
    }
    try {
      TblStateTypeId.create(input.atsh_state_type_id);
    } catch {
      throw new UnprocessableEntityException(userMsg.idEstadoEntero);
    }

    if (!input.atsh_days?.length) {
      throw new UnprocessableEntityException(userMsg.diasObligatorios);
    }
    for (const d of input.atsh_days) {
      if (!DAYS_OF_WEEK_EN.includes(d as (typeof DAYS_OF_WEEK_EN)[number])) {
        throw new UnprocessableEntityException(
          `Cada día debe ser uno de: ${DAYS_OF_WEEK_EN.join(', ')}`,
        );
      }
    }

    let existing: TblAttentionSchedule;
    try {
      existing = await this.attentionScheduleRepository.findById(input.atsh_id);
    } catch {
      throw new NotFoundException({ message: userMsg.registroNoEncontrado });
    }

    const normalizedDetail = capitalizeFirstWord(input.atsh_detail);
    const sameDays =
      existing.atsh_days.length === input.atsh_days.length &&
      [...existing.atsh_days].sort().join(',') === [...input.atsh_days].sort().join(',');

    const hasChanges =
      existing.atsh_portfolio_type_id !== input.atsh_portfolio_type_id ||
      !sameDays ||
      existing.atsh_start_time !== input.atsh_start_time ||
      existing.atsh_start_recess_time !== input.atsh_start_recess_time ||
      existing.atsh_end_recess_time !== input.atsh_end_recess_time ||
      existing.atsh_end_time !== input.atsh_end_time ||
      existing.atsh_detail !== normalizedDetail ||
      existing.atsh_state_type_id !== input.atsh_state_type_id ||
      existing.atsh_responsible !== input.atsh_responsible;

    if (!hasChanges) {
      throw new UnprocessableEntityException({ message: 'No hay cambios para actualizar' });
    }

    try {
      await this.attentionScheduleRepository.update({ ...input, atsh_detail: normalizedDetail });
    } catch {
      throw new InternalServerErrorException(userMsg.noActualizar);
    }
  }

  async delete(id: number): Promise<void> {
    try {
      await this.attentionScheduleRepository.findById(id);
    } catch {
      throw new NotFoundException({ message: userMsg.registroNoEncontrado });
    }
    try {
      await this.attentionScheduleRepository.delete(id);
    } catch {
      throw new InternalServerErrorException(userMsg.noEliminar);
    }
  }
}
