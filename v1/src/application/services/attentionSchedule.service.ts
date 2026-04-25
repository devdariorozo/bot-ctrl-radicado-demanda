// Responsabilidad: fachada de aplicación que usará el controller.

import {
  UnprocessableEntityException,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { AttentionSchedule } from '@domain/entities/attentionSchedule.entities';
import {
  ATTENTION_SCHEDULE_REPOSITORY,
  AttentionScheduleRepository,
  CreateAttentionScheduleInput,
} from '@domain/ports/attentionSchedule.ports';
import { TBL_PORTFOLIO_TYPE_REPOSITORY, TblPortfolioTypeRepository } from '@domain/ports/tblPortfolioType.ports';
import { TBL_STATE_TYPE_REPOSITORY, TblStateTypeRepository } from '@domain/ports/tblStateType.ports';
import { TblPortfolioTypeId } from '@domain/value-objects/tblPortfolioType.valueobjects';
import { TblStateTypeId } from '@domain/value-objects/tblStateType.valueobjects';
import {
  DayOfWeek,
  DAYS_OF_WEEK_ES,
} from '@domain/value-objects/attentionSchedule.valueobjects';
import { userMsg } from '@application/utils/apiUserMessages.utils';
import { capitalizeFirstWord } from '@application/utils/string.utils';
import { QueryFailedError } from 'typeorm';

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

@Injectable()
export class AttentionScheduleService {
  constructor(
    @Inject(ATTENTION_SCHEDULE_REPOSITORY)
    private readonly attentionScheduleRepository: AttentionScheduleRepository,
    @Inject(TBL_PORTFOLIO_TYPE_REPOSITORY)
    private readonly portfolioTypeRepository: TblPortfolioTypeRepository,
    @Inject(TBL_STATE_TYPE_REPOSITORY)
    private readonly stateTypeRepository: TblStateTypeRepository,
  ) {}

  /** Crea un solo registro con days como array de días en español. */
  async create(input: CreateAttentionScheduleInput): Promise<AttentionSchedule> {
    try {
      TblPortfolioTypeId.create(input.portfolio_type_id);
      TblStateTypeId.create(input.state_type_id);
    } catch {
      throw new UnprocessableEntityException(userMsg.carteraYEstadoEnteros);
    }
    if (!input.days?.length) {
      throw new UnprocessableEntityException(userMsg.diasObligatorios);
    }
    const daysSet = new Set<string>();
    for (const d of input.days) {
      try {
        const vo = DayOfWeek.create(d);
        daysSet.add(vo.value);
      } catch {
        throw new UnprocessableEntityException(
          `Cada día debe ser uno de: ${DAYS_OF_WEEK_ES.join(', ')}.`,
        );
      }
    }
    const daysArray = Array.from(daysSet);

    try {
      await this.portfolioTypeRepository.findById(input.portfolio_type_id);
      await this.stateTypeRepository.findById(input.state_type_id);
    } catch {
      throw new NotFoundException({ message: userMsg.noRelacion });
    }

    const start = timeToMinutes(input.start_time);
    const startRecess = timeToMinutes((input as any).start_recess);
    const endRecess = timeToMinutes((input as any).end_recess);
    const end = timeToMinutes(input.end_time);
    if ([start, startRecess, endRecess, end].some((v) => Number.isNaN(v))) {
      throw new UnprocessableEntityException(userMsg.horasFormato);
    }
    if (!(start < startRecess && startRecess < endRecess && endRecess < end)) {
      throw new UnprocessableEntityException(userMsg.horasOrden);
    }

    const existing = await this.attentionScheduleRepository.findByPortfolio(input.portfolio_type_id);
    const duplicate = existing.some(
      (s) =>
        s.start_time === input.start_time &&
        (s as any).start_recess === (input as any).start_recess &&
        (s as any).end_recess === (input as any).end_recess &&
        s.end_time === input.end_time,
    );
    if (duplicate) {
      throw new ConflictException({ message: userMsg.horarioDuplicado });
    }

    const normalizedDetail = capitalizeFirstWord(input.detail);
    const toCreate: CreateAttentionScheduleInput = {
      portfolio_type_id: input.portfolio_type_id,
      days: daysArray,
      start_time: input.start_time,
      start_recess: (input as any).start_recess,
      end_recess: (input as any).end_recess,
      end_time: input.end_time,
      detail: normalizedDetail,
      state_type_id: input.state_type_id,
      responsible: input.responsible,
    };
    try {
      return await this.attentionScheduleRepository.create(toCreate);
    } catch (err) {
      const isDuplicate =
        err instanceof QueryFailedError &&
        ((err as QueryFailedError & { code?: string; driverError?: { code?: string } }).code === 'ER_DUP_ENTRY' ||
          (err as QueryFailedError & { driverError?: { code?: string } }).driverError?.code === 'ER_DUP_ENTRY' ||
          (err as Error).message?.includes('Duplicate entry'));
      if (isDuplicate) {
        throw new ConflictException({ message: userMsg.horarioDuplicado });
      }
      throw new InternalServerErrorException(userMsg.noCrear);
    }
  }

  async findAll(): Promise<AttentionSchedule[]> {
    try {
      return await this.attentionScheduleRepository.findAll();
    } catch (error) {
      throw new InternalServerErrorException(userMsg.noListar);
    }
  }

  async findById(id: number): Promise<AttentionSchedule> {
    try {
      const sc = await this.attentionScheduleRepository.findById(id);
      const [portfolio, state] = await Promise.all([
        this.portfolioTypeRepository.findById(sc.portfolio_type_id),
        this.stateTypeRepository.findById(sc.state_type_id),
      ]);
      return {
        id: sc.id,
        portfolio_type_id: sc.portfolio_type_id,
        portfolio_type_name: portfolio.porty_type,
        days: sc.days,
        start_time: sc.start_time,
        start_recess: (sc as any).start_recess,
        end_recess: (sc as any).end_recess,
        end_time: sc.end_time,
        detail: sc.detail,
        state_type_id: sc.state_type_id,
        state_type_name: state.stty_type,
        created_at: sc.created_at,
        updated_at: sc.updated_at,
        responsible: sc.responsible,
      };
    } catch (error) {
      throw new NotFoundException({ message: userMsg.registroNoEncontrado });
    }
  }

  async findByPortfolio(portfolio_type_id: number, days?: string): Promise<AttentionSchedule[]> {
    if (days !== undefined) {
      try {
        DayOfWeek.create(days);
      } catch {
        throw new UnprocessableEntityException(
          `Cada día debe ser uno de: ${DAYS_OF_WEEK_ES.join(', ')}.`,
        );
      }
    }
    try {
      await this.portfolioTypeRepository.findById(portfolio_type_id);
    } catch {
      throw new NotFoundException({ message: userMsg.notFoundCarteraParam });
    }
    return this.attentionScheduleRepository.findByPortfolio(portfolio_type_id, days);
  }

  async update(input: AttentionSchedule): Promise<AttentionSchedule> {
    try {
      TblPortfolioTypeId.create(input.portfolio_type_id);
      TblStateTypeId.create(input.state_type_id);
    } catch (e) {
      throw new UnprocessableEntityException(
        e instanceof Error ? e.message : userMsg.idsCarteraEstadoInvalido,
      );
    }
    if (!Array.isArray(input.days) || !input.days.length) {
      throw new UnprocessableEntityException(userMsg.diasObligatorios);
    }
    for (const d of input.days) {
      try {
        DayOfWeek.create(d);
      } catch {
        throw new UnprocessableEntityException(
          `Cada día debe ser uno de: ${DAYS_OF_WEEK_ES.join(', ')}.`,
        );
      }
    }

    let existing: AttentionSchedule;
    try {
      existing = await this.attentionScheduleRepository.findById(input.id);
    } catch {
      throw new NotFoundException({ message: userMsg.registroNoEncontrado });
    }

    const start = timeToMinutes(input.start_time);
    const startRecess = timeToMinutes((input as any).start_recess);
    const endRecess = timeToMinutes((input as any).end_recess);
    const end = timeToMinutes(input.end_time);
    if ([start, startRecess, endRecess, end].some((v) => Number.isNaN(v))) {
      throw new UnprocessableEntityException(userMsg.horasFormato);
    }
    if (!(start < startRecess && startRecess < endRecess && endRecess < end)) {
      throw new UnprocessableEntityException(userMsg.horasOrden);
    }

    const others = await this.attentionScheduleRepository.findByPortfolio(input.portfolio_type_id);
    const duplicate = others
      .filter((sc) => sc.id !== input.id)
      .some(
        (s) =>
          s.start_time === input.start_time &&
          (s as any).start_recess === (input as any).start_recess &&
          (s as any).end_recess === (input as any).end_recess &&
          s.end_time === input.end_time,
      );
    if (duplicate) {
      throw new ConflictException({ message: userMsg.horarioDuplicado });
    }

    const normalized = { ...input, detail: capitalizeFirstWord(input.detail) };
    const sameDays =
      Array.isArray(existing.days) &&
      Array.isArray(normalized.days) &&
      existing.days.length === normalized.days.length &&
      existing.days.every((d, i) => d === normalized.days[i]);
    const sameStartTime = timeToMinutes(existing.start_time) === timeToMinutes(normalized.start_time);
    const sameEndTime = timeToMinutes(existing.end_time) === timeToMinutes(normalized.end_time);
    const hasChanges =
      existing.portfolio_type_id !== normalized.portfolio_type_id ||
      !sameDays ||
      !sameStartTime ||
      !sameEndTime ||
      existing.detail !== normalized.detail ||
      existing.state_type_id !== normalized.state_type_id ||
      existing.responsible !== normalized.responsible;

    if (!hasChanges) {
      throw new UnprocessableEntityException({ message: userMsg.sinCambios });
    }
    try {
      await this.attentionScheduleRepository.update(normalized);
      return this.findById(input.id);
    } catch (error) {
      throw new InternalServerErrorException(userMsg.noActualizar);
    }
  }

  async delete(id: number): Promise<void> {
    try {
      await this.attentionScheduleRepository.findById(id);
    } catch (error) {
      throw new NotFoundException({ message: userMsg.registroNoEncontrado });
    }
    try {
      await this.attentionScheduleRepository.delete(id);
    } catch (error) {
      throw new InternalServerErrorException(userMsg.noEliminar);
    }
  }
}
