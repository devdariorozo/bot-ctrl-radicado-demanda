// Responsabilidad: controller HTTP para holidays.

import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiQuery, ApiTags, getSchemaPath } from '@nestjs/swagger';
import { HolidayService } from '@application/services/holiday.service';
import { Holiday } from '@domain/entities/holiday.entities';
import { HolidayDto, UpdateHolidayDto } from '../dto/holiday.dto';
import { CreateHolidayInput } from '@domain/ports/holiday.ports';
import { PaginatedResult, paginateArray } from '@application/utils/pagination.utils';
import { dataEmpty, dataMany, dataOne } from '@application/utils/response.utils';

const createExampleSchema = {
  date: '2026-03-24',
  name: 'DÍA DE SAN JOSÉ',
  country_code: 'CO',
  type: 'NATIONAL',
  is_working_day: false,
  detail: 'Festivo oficial en Colombia',
  state_type_id: 1,
  responsible: 'BOT ctrl filed demand',
};

const updateExampleSchema = {
  ...createExampleSchema,
  detail: 'Festivo oficial en Colombia (actualizado)',
};

@ApiTags('holiday')
@Controller('holiday')
export class HolidayController {
  constructor(private readonly holidayService: HolidayService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo día festivo' })
  @ApiBody({
    description: 'El JSON de abajo sirve de guía.',
    schema: { allOf: [{ $ref: getSchemaPath(HolidayDto) }], example: createExampleSchema },
  })
  async create(@Body() dto: HolidayDto) {
    const input: CreateHolidayInput = {
      ...(dto as any),
      date: new Date(dto.date),
    };
    const created = await this.holidayService.create(input);
    return dataOne(created);
  }

  @Get('options')
  @ApiOperation({ summary: 'Obtener opciones de festivos para selects' })
  async options() {
    const all = await this.holidayService.findAll();
    const items = all.map((item) => ({
      id: item.id,
      label_name: `${item.date.toISOString().slice(0, 10)} - ${item.name}`,
    }));
    return dataMany(items);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los días festivos' })
  @ApiQuery({ name: 'start_date', required: false, type: String, description: 'Fecha inicial (YYYY-MM-DD).' })
  @ApiQuery({ name: 'end_date', required: false, type: String, description: 'Fecha final (YYYY-MM-DD).' })
  @ApiQuery({ name: 'country_code', required: false, type: String, description: 'Filtrar por código de país (ej. CO).' })
  @ApiQuery({ name: 'type', required: false, type: String, description: 'Filtrar por tipo (NATIONAL, JUDICIAL, etc.).' })
  @ApiQuery({ name: 'state_type_id', required: false, type: Number, description: 'Filtrar por state_type_id.' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Número de página (>=1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Registros por página (>=1)' })
  async findAll(
    @Query('start_date') start_date?: string,
    @Query('end_date') end_date?: string,
    @Query('country_code') country_code?: string,
    @Query('type') type?: string,
    @Query('state_type_id') state_type_id?: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<PaginatedResult<HolidayDto>> {
    const all = await this.holidayService.findAll();

    const parseDate = (value?: string): Date | undefined => {
      if (!value) return undefined;
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? undefined : d;
    };

    const start = parseDate(start_date);
    const end = parseDate(end_date);
    const normalizedCountry = (country_code ?? '').trim().toUpperCase();
    const normalizedType = (type ?? '').trim().toUpperCase();

    const normalizedStateId =
      state_type_id === undefined || state_type_id === null
        ? undefined
        : (() => {
            const n = typeof state_type_id === 'number' ? state_type_id : Number(state_type_id);
            if (!Number.isFinite(n) || n <= 0) return undefined;
            return Math.floor(n);
          })();

    const byDate = all.filter((item) => {
      const d = item.date instanceof Date ? item.date : new Date(item.date);
      if (Number.isNaN(d.getTime())) return true;
      if (start && d < start) return false;
      if (end && d > end) return false;
      return true;
    });

    const filtered = byDate.filter((item) => {
      if (normalizedCountry && item.country_code.toUpperCase() !== normalizedCountry) return false;
      if (normalizedType && item.type.toUpperCase() !== normalizedType) return false;
      if (normalizedStateId !== undefined && Number(item.state_type_id) !== normalizedStateId) return false;
      return true;
    });

    const dtoItems: HolidayDto[] = filtered.map((item) => ({
      id: item.id,
      date: item.date instanceof Date ? item.date.toISOString().slice(0, 10) : String(item.date),
      name: item.name,
      country_code: item.country_code,
      type: item.type,
      is_working_day: item.is_working_day,
      detail: item.detail,
      state_type_id: item.state_type_id,
      state_type_name: item.state_type_name,
      created_at: item.created_at,
      updated_at: item.updated_at,
      responsible: item.responsible,
    }));

    return paginateArray(dtoItems, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un festivo por su id' })
  async findById(@Param('id') id: number) {
    const item = await this.holidayService.findById(id);
    return dataOne(item);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar un festivo' })
  @ApiBody({
    description: 'El JSON de abajo sirve de guía.',
    schema: { allOf: [{ $ref: getSchemaPath(UpdateHolidayDto) }], example: updateExampleSchema },
  })
  async update(@Param('id') id: number, @Body() body: UpdateHolidayDto) {
    const toUpdate: Holiday = {
      ...(body as any),
      id: Number(id),
      date: new Date(body.date),
    };
    const updated = await this.holidayService.update(toUpdate);
    return dataOne(updated);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un festivo' })
  async delete(@Param('id') id: number) {
    await this.holidayService.delete(id);
    return dataEmpty();
  }
}

