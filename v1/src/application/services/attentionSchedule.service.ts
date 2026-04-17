// Responsabilidad: fachada de aplicación que usará el controller.

import {
  BadRequestException,
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
import { PORTFOLIO_TYPE_REPOSITORY, PortfolioTypeRepository } from '@domain/ports/portfolioType.ports';
import { STATE_TYPE_REPOSITORY, StateTypeRepository } from '@domain/ports/stateType.ports';
import { PortfolioTypeId } from '@domain/value-objects/portfolioType.valueobjects';
import { StateTypeId } from '@domain/value-objects/stateType.valueobjects';
import {
  DayOfWeek,
  DAYS_OF_WEEK_ES,
} from '@domain/value-objects/attentionSchedule.valueobjects';
import { capitalizeFirstWord } from '@application/utils/string.utils';
import { QueryFailedError } from 'typeorm';

const DUPLICATE_SCHEDULE_MSG =
  'Attention schedule already exists for this portfolio_type_id, start_time and end_time';

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

@Injectable()
export class AttentionScheduleService {
  constructor(
    @Inject(ATTENTION_SCHEDULE_REPOSITORY)
    private readonly attentionScheduleRepository: AttentionScheduleRepository,
    @Inject(PORTFOLIO_TYPE_REPOSITORY)
    private readonly portfolioTypeRepository: PortfolioTypeRepository,
    @Inject(STATE_TYPE_REPOSITORY)
    private readonly stateTypeRepository: StateTypeRepository,
  ) {}

  /** Crea un solo registro con days como array de días en español. */
  async create(input: CreateAttentionScheduleInput): Promise<AttentionSchedule> {
    try {
      PortfolioTypeId.create(input.portfolio_type_id);
      StateTypeId.create(input.state_type_id);
    } catch {
      throw new BadRequestException('portfolio_type_id and state_type_id must be positive integers');
    }
    if (!input.days?.length) {
      throw new BadRequestException('days must be a non-empty array');
    }
    const daysSet = new Set<string>();
    for (const d of input.days) {
      try {
        const vo = DayOfWeek.create(d);
        daysSet.add(vo.value);
      } catch {
        throw new BadRequestException(
          `Each day must be one of: ${DAYS_OF_WEEK_ES.join(', ')}`,
        );
      }
    }
    const daysArray = Array.from(daysSet);

    try {
      await this.portfolioTypeRepository.findById(input.portfolio_type_id);
      await this.stateTypeRepository.findById(input.state_type_id);
    } catch {
      throw new NotFoundException('One or more related records not found');
    }

    const start = timeToMinutes(input.start_time);
    const startRecess = timeToMinutes((input as any).start_recess);
    const endRecess = timeToMinutes((input as any).end_recess);
    const end = timeToMinutes(input.end_time);
    if ([start, startRecess, endRecess, end].some((v) => Number.isNaN(v))) {
      throw new BadRequestException(
        'start_time, start_recess, end_recess and end_time must be valid HH:mm',
      );
    }
    if (!(start < startRecess && startRecess < endRecess && endRecess < end)) {
      throw new BadRequestException(
        'Times must satisfy start_time < start_recess < end_recess < end_time',
      );
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
      throw new ConflictException(DUPLICATE_SCHEDULE_MSG);
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
        throw new ConflictException(DUPLICATE_SCHEDULE_MSG);
      }
      throw err;
    }
  }

  async findAll(): Promise<AttentionSchedule[]> {
    try {
      return await this.attentionScheduleRepository.findAll();
    } catch (error) {
      throw new InternalServerErrorException('Error getting all attention schedules');
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
        portfolio_type_name: portfolio.type,
        days: sc.days,
        start_time: sc.start_time,
        start_recess: (sc as any).start_recess,
        end_recess: (sc as any).end_recess,
        end_time: sc.end_time,
        detail: sc.detail,
        state_type_id: sc.state_type_id,
        state_type_name: state.type,
        created_at: sc.created_at,
        updated_at: sc.updated_at,
        responsible: sc.responsible,
      };
    } catch (error) {
      throw new NotFoundException('No data found for the given id');
    }
  }

  async findByPortfolio(portfolio_type_id: number, days?: string): Promise<AttentionSchedule[]> {
    if (days !== undefined) {
      try {
        DayOfWeek.create(days);
      } catch {
        throw new BadRequestException(
          `days must be one of: ${DAYS_OF_WEEK_ES.join(', ')}`,
        );
      }
    }
    try {
      await this.portfolioTypeRepository.findById(portfolio_type_id);
    } catch {
      throw new NotFoundException('No data found for the given portfolio_type_id');
    }
    return this.attentionScheduleRepository.findByPortfolio(portfolio_type_id, days);
  }

  async update(input: AttentionSchedule): Promise<AttentionSchedule> {
    try {
      PortfolioTypeId.create(input.portfolio_type_id);
      StateTypeId.create(input.state_type_id);
    } catch (e) {
      throw new BadRequestException(
        e instanceof Error ? e.message : 'Invalid portfolio_type_id or state_type_id',
      );
    }
    if (!Array.isArray(input.days) || !input.days.length) {
      throw new BadRequestException('days must be a non-empty array');
    }
    for (const d of input.days) {
      try {
        DayOfWeek.create(d);
      } catch {
        throw new BadRequestException(
          `Each day must be one of: ${DAYS_OF_WEEK_ES.join(', ')}`,
        );
      }
    }

    let existing: AttentionSchedule;
    try {
      existing = await this.attentionScheduleRepository.findById(input.id);
    } catch {
      throw new NotFoundException('No data found for the given id');
    }

    const start = timeToMinutes(input.start_time);
    const startRecess = timeToMinutes((input as any).start_recess);
    const endRecess = timeToMinutes((input as any).end_recess);
    const end = timeToMinutes(input.end_time);
    if ([start, startRecess, endRecess, end].some((v) => Number.isNaN(v))) {
      throw new BadRequestException(
        'start_time, start_recess, end_recess and end_time must be valid HH:mm',
      );
    }
    if (!(start < startRecess && startRecess < endRecess && endRecess < end)) {
      throw new BadRequestException(
        'Times must satisfy start_time < start_recess < end_recess < end_time',
      );
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
      throw new ConflictException(DUPLICATE_SCHEDULE_MSG);
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
      throw new BadRequestException('No changes to update');
    }
    try {
      await this.attentionScheduleRepository.update(normalized);
      return this.findById(input.id);
    } catch (error) {
      throw new InternalServerErrorException('Error updating attention schedule');
    }
  }

  async delete(id: number): Promise<void> {
    try {
      await this.attentionScheduleRepository.findById(id);
    } catch (error) {
      throw new NotFoundException('No data found for the given id');
    }
    try {
      await this.attentionScheduleRepository.delete(id);
    } catch (error) {
      throw new InternalServerErrorException('Error deleting attention schedule');
    }
  }
}
