// Responsabilidad: endpoints HTTP de Nest (controller).

import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBody, ApiExtraModels, ApiOperation, ApiQuery, ApiTags, getSchemaPath } from '@nestjs/swagger';
import { CreateTblAttentionScheduleDto, UpdateTblAttentionScheduleDto } from '../dto/attentionSchedule.dto';
import { TblAttentionScheduleService } from '@application/services/attentionSchedule.service';
import { TblAttentionSchedule } from '@domain/entities/attentionSchedule.entities';
import { CreateTblAttentionScheduleInput } from '@domain/ports/attentionSchedule.ports';
import { getListQueryDateRange } from '@application/utils/listQueryDateRange.utils';
import { PaginatedResult, paginateArray } from '@application/utils/pagination.utils';
import { dataMany, dataOne } from '@application/utils/response.utils';

const DAY_ES: Record<string, string> = {
  Monday: 'Lunes',
  Tuesday: 'Martes',
  Wednesday: 'Miércoles',
  Thursday: 'Jueves',
  Friday: 'Viernes',
  Saturday: 'Sábado',
  Sunday: 'Domingo',
};

function daysRangeLabel(days: string[]): string {
  if (!Array.isArray(days) || days.length === 0) return '';
  const first = DAY_ES[days[0]] ?? days[0];
  if (days.length === 1) return first;
  const last = DAY_ES[days[days.length - 1]] ?? days[days.length - 1];
  return `${first} a ${last}`;
}

const createExampleSchema = {
  atsh_portfolio_type_id: 1,
  atsh_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  atsh_start_time: '08:00',
  atsh_start_recess_time: '12:00',
  atsh_end_recess_time: '14:00',
  atsh_end_time: '17:00',
  atsh_detail: 'Horario laboral estándar L-V',
  atsh_state_type_id: 1,
  atsh_responsible: 'BOT ctrl radicado demanda',
};

const updateExampleSchema = {
  atsh_portfolio_type_id: 1,
  atsh_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  atsh_start_time: '08:00',
  atsh_start_recess_time: '12:00',
  atsh_end_recess_time: '14:00',
  atsh_end_time: '17:00',
  atsh_detail: 'Horario laboral estándar L-V',
  atsh_state_type_id: 1,
  atsh_responsible: 'BOT ctrl radicado demanda',
};

@ApiTags('attentionSchedule')
@ApiExtraModels(CreateTblAttentionScheduleDto, UpdateTblAttentionScheduleDto)
@Controller('attentionSchedule')
export class TblAttentionScheduleController {
  constructor(private readonly service: TblAttentionScheduleService) {}

  private normalizeIdFilter(value: unknown): number | undefined {
    if (value === undefined || value === null || (value as string) === '') return undefined;
    const n = typeof value === 'number' ? value : Number(value as string);
    if (!Number.isFinite(n) || n <= 0) return undefined;
    return Math.floor(n);
  }

  private normalizeStringFilter(value?: string): string | undefined {
    if (!value) return undefined;
    const trimmed = value.trim();
    return trimmed || undefined;
  }

  private toRow(item: TblAttentionSchedule): Record<string, unknown> {
    const row: Record<string, unknown> = {
      atsh_id: item.atsh_id,
      atsh_portfolio_type_id: item.atsh_portfolio_type_id,
    };
    if (item.portfolio_type_name != null && String(item.portfolio_type_name).length > 0) {
      row.portfolio_type_name = item.portfolio_type_name;
    }
    row.atsh_days = item.atsh_days;
    row.atsh_start_time = item.atsh_start_time;
    row.atsh_start_recess_time = item.atsh_start_recess_time;
    row.atsh_end_recess_time = item.atsh_end_recess_time;
    row.atsh_end_time = item.atsh_end_time;
    row.atsh_detail = item.atsh_detail;
    row.atsh_state_type_id = item.atsh_state_type_id;
    if (item.state_type_name != null && String(item.state_type_name).length > 0) {
      row.state_type_name = item.state_type_name;
    }
    row.atsh_created_at = item.atsh_created_at;
    row.atsh_updated_at = item.atsh_updated_at;
    row.atsh_responsible = item.atsh_responsible;
    return row;
  }

  @Post('crear')
  @ApiOperation({ summary: 'Crear un horario de atención' })
  @ApiBody({
    description: 'Datos del horario. Se valida que no exista la combinación atsh_portfolio_type_id + atsh_days.',
    schema: { allOf: [{ $ref: getSchemaPath(CreateTblAttentionScheduleDto) }], example: createExampleSchema },
  })
  async create(@Body() dto: CreateTblAttentionScheduleDto) {
    const created = await this.service.create(dto as CreateTblAttentionScheduleInput);
    const full = await this.service.findById(created.atsh_id);
    return { data: [this.toRow(full)], message: 'Registro creado correctamente' };
  }

  @Get('opciones')
  @ApiOperation({ summary: 'Obtener opciones para selects (atsh_id, label_name = atsh_days)' })
  async options() {
    const all = await this.service.findAll();
    const items = all.map((item) => ({
      atsh_id: item.atsh_id,
      label_name: daysRangeLabel(item.atsh_days),
    }));
    return dataMany(items);
  }

  @Get('opcionesActivas')
  @ApiOperation({ summary: 'Obtener opciones activas para selects (atsh_id, label_name = atsh_days)' })
  async optionsActive() {
    const all = await this.service.findAllActive();
    const items = all.map((item) => ({
      atsh_id: item.atsh_id,
      label_name: daysRangeLabel(item.atsh_days),
    }));
    return dataMany(items);
  }

  @Get('listar')
  @ApiOperation({ summary: 'Listar horarios de atención con filtros opcionales' })
  @ApiQuery({ name: 'start_date', required: false, type: String, description: 'Fecha inicial de creación (YYYY-MM-DD).' })
  @ApiQuery({ name: 'end_date', required: false, type: String, description: 'Fecha final de creación (YYYY-MM-DD).' })
  @ApiQuery({ name: 'atsh_portfolio_type_id', required: false, type: Number, description: 'Filtrar por atsh_portfolio_type_id.' })
  @ApiQuery({ name: 'atsh_days', required: false, type: String, description: 'Filtrar por día (Monday, Tuesday, ...).' })
  @ApiQuery({ name: 'atsh_start_time', required: false, type: String, description: 'Filtrar por hora de inicio (HH:mm).' })
  @ApiQuery({ name: 'atsh_start_recess_time', required: false, type: String, description: 'Filtrar por hora inicio pausa (HH:mm).' })
  @ApiQuery({ name: 'atsh_end_recess_time', required: false, type: String, description: 'Filtrar por hora fin pausa (HH:mm).' })
  @ApiQuery({ name: 'atsh_end_time', required: false, type: String, description: 'Filtrar por hora de fin (HH:mm).' })
  @ApiQuery({ name: 'atsh_state_type_id', required: false, type: Number, description: 'Filtrar por atsh_state_type_id.' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Número de página (>=1).' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Registros por página (>=1).' })
  async findAll(
    @Query('start_date') start_date?: string,
    @Query('end_date') end_date?: string,
    @Query('atsh_portfolio_type_id') atsh_portfolio_type_id?: string,
    @Query('atsh_days') atsh_days?: string,
    @Query('atsh_start_time') atsh_start_time?: string,
    @Query('atsh_start_recess_time') atsh_start_recess_time?: string,
    @Query('atsh_end_recess_time') atsh_end_recess_time?: string,
    @Query('atsh_end_time') atsh_end_time?: string,
    @Query('atsh_state_type_id') atsh_state_type_id?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<PaginatedResult<Record<string, unknown>>> {
    const all = await this.service.findAll();
    const { start, end } = getListQueryDateRange(start_date, end_date);

    const portfolioId = this.normalizeIdFilter(atsh_portfolio_type_id);
    const stateId = this.normalizeIdFilter(atsh_state_type_id);
    const dayFilter = this.normalizeStringFilter(atsh_days);
    const startTimeFilter = this.normalizeStringFilter(atsh_start_time);
    const startRecessFilter = this.normalizeStringFilter(atsh_start_recess_time);
    const endRecessFilter = this.normalizeStringFilter(atsh_end_recess_time);
    const endTimeFilter = this.normalizeStringFilter(atsh_end_time);

    const filtered = all.filter((item) => {
      const created = item.atsh_created_at ? new Date(item.atsh_created_at) : undefined;
      if (created && !Number.isNaN(created.getTime())) {
        if (start && created < start) return false;
        if (end && created > end) return false;
      }
      if (portfolioId !== undefined && Number(item.atsh_portfolio_type_id) !== portfolioId) return false;
      if (stateId !== undefined && Number(item.atsh_state_type_id) !== stateId) return false;
      if (dayFilter && !item.atsh_days.includes(dayFilter)) return false;
      if (startTimeFilter && toHHmm(item.atsh_start_time) !== toHHmm(startTimeFilter)) return false;
      if (startRecessFilter && toHHmm(item.atsh_start_recess_time) !== toHHmm(startRecessFilter)) return false;
      if (endRecessFilter && toHHmm(item.atsh_end_recess_time) !== toHHmm(endRecessFilter)) return false;
      if (endTimeFilter && toHHmm(item.atsh_end_time) !== toHHmm(endTimeFilter)) return false;
      return true;
    });

    return paginateArray(
      filtered.map((item) => this.toRow(item)),
      page,
      limit,
    ) as unknown as PaginatedResult<Record<string, unknown>>;
  }

  @Get('filtrar/:id')
  @ApiOperation({ summary: 'Obtener un horario de atención por atsh_id' })
  async findById(@Param('id') id: string) {
    const numId = Number(id);
    if (!Number.isInteger(numId) || numId <= 0) {
      throw new BadRequestException('El id debe ser un numero entero y mayor a 0');
    }
    const item = await this.service.findById(numId);
    return dataOne(this.toRow(item));
  }

  @Put('actualizar/:id')
  @ApiOperation({ summary: 'Actualizar un horario de atención por atsh_id' })
  @ApiBody({
    description: 'El JSON de abajo sirve de guía.',
    schema: { allOf: [{ $ref: getSchemaPath(UpdateTblAttentionScheduleDto) }], example: updateExampleSchema },
  })
  async update(@Param('id') id: string, @Body() dto: UpdateTblAttentionScheduleDto) {
    const numId = Number(id);
    if (!Number.isInteger(numId) || numId <= 0) {
      throw new BadRequestException('El id debe ser un numero entero y mayor a 0');
    }
    await this.service.update({ ...dto, atsh_id: numId } as TblAttentionSchedule);
    return { data: null, message: 'Registro actualizado correctamente' };
  }

  @Delete('eliminar/:id')
  @ApiOperation({ summary: 'Eliminar un horario de atención por atsh_id' })
  async delete(@Param('id') id: string) {
    const numId = Number(id);
    if (!Number.isInteger(numId) || numId <= 0) {
      throw new BadRequestException('El id debe ser un numero entero y mayor a 0');
    }
    await this.service.delete(numId);
    return { data: null, message: 'Registro eliminado correctamente' };
  }
}

function toHHmm(time: string): string {
  return (time ?? '').trim().slice(0, 5);
}
