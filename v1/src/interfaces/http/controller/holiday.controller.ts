// Responsabilidad: controller HTTP para holidays.

import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBody, ApiExtraModels, ApiOperation, ApiQuery, ApiTags, getSchemaPath } from '@nestjs/swagger';
import { HolidayService } from '@application/services/holiday.service';
import { Holiday } from '@domain/entities/holiday.entities';
import { HolidayDto, UpdateHolidayDto } from '../dto/holiday.dto';
import { CreateHolidayInput } from '@domain/ports/holiday.ports';
import { userMsg } from '@application/utils/apiUserMessages.utils';
import { getListQueryDateRange } from '@application/utils/listQueryDateRange.utils';
import { paginateArray } from '@application/utils/pagination.utils';
import { dataMany, dataOne } from '@application/utils/response.utils';

const createExampleSchema = {
  hldy_date: '2026-01-01',
  hldy_name: 'Año Nuevo',
  hldy_country_code: 'CO',
  hldy_type: 'NATIONAL',
  hldy_is_working_day: false,
  hldy_detail: 'Se crea registro con exito.',
  hldy_state_type_id: 1,
  hldy_responsible: 'BOT ctrl radicado demanda',
};

const updateExampleSchema = { ...createExampleSchema };

@ApiTags('holiday')
@ApiExtraModels(HolidayDto, UpdateHolidayDto)
@Controller('holiday')
export class HolidayController {
  constructor(private readonly holidayService: HolidayService) {}

  @Post('crear')
  @ApiOperation({ summary: 'Crear un nuevo día festivo' })
  @ApiBody({
    description: 'El JSON de abajo sirve de guía.',
    schema: { allOf: [{ $ref: getSchemaPath(HolidayDto) }], example: createExampleSchema },
  })
  async create(@Body() dto: HolidayDto) {
    const input: CreateHolidayInput = {
      ...dto,
      hldy_date: new Date(dto.hldy_date),
    };
    const created = await this.holidayService.create(input);
    return { data: [this.toRow(created)], message: 'Registro creado correctamente' };
  }

  @Get('opciones')
  @ApiOperation({ summary: 'Obtener opciones de festivos para selects (hldy_id, label_name)' })
  async options() {
    const all = await this.holidayService.findAll();
    const items = all.map((item) => ({
      hldy_id: item.hldy_id,
      label_name: `${this.toDateStr(item.hldy_date)} - ${item.hldy_name}`,
    }));
    return dataMany(items);
  }

  @Get('opcionesActivas')
  @ApiOperation({ summary: 'Opciones activas para selects (hldy_id, label_name); filtra por estado activo' })
  async optionsActive() {
    const all = await this.holidayService.findAll();
    const active = all.filter((item) => {
      const n = (item.state_type_name ?? '').toLowerCase();
      return n.length > 0 && !n.includes('inactiv');
    });
    const items = active.map((item) => ({
      hldy_id: item.hldy_id,
      label_name: `${this.toDateStr(item.hldy_date)} - ${item.hldy_name}`,
    }));
    return dataMany(items);
  }

  @Get('listar')
  @ApiOperation({ summary: 'Listar todos los festivos con filtros opcionales' })
  @ApiQuery({ name: 'start_date', required: false, type: String, description: 'Fecha inicial de creación (YYYY-MM-DD).' })
  @ApiQuery({ name: 'end_date', required: false, type: String, description: 'Fecha final de creación (YYYY-MM-DD).' })
  @ApiQuery({ name: 'hldy_date', required: false, type: String, description: 'Filtrar por hldy_date exacta (YYYY-MM-DD).' })
  @ApiQuery({ name: 'hldy_name', required: false, type: String, description: 'Filtrar por hldy_name (búsqueda parcial).' })
  @ApiQuery({ name: 'hldy_type', required: false, type: String, description: 'Filtrar por hldy_type (ej. NATIONAL).' })
  @ApiQuery({ name: 'hldy_state_type_id', required: false, type: Number, description: 'Filtrar por stty_id.' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Número de página (>=1).' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Registros por página (>=1).' })
  async findAll(
    @Query('start_date') start_date?: string,
    @Query('end_date') end_date?: string,
    @Query('hldy_date') hldy_date?: string,
    @Query('hldy_name') hldy_name?: string,
    @Query('hldy_type') hldy_type?: string,
    @Query('hldy_state_type_id') hldy_state_type_id?: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const all = await this.holidayService.findAll();
    const { start, end } = getListQueryDateRange(start_date, end_date);

    const normalizedDate = (hldy_date ?? '').trim();
    const normalizedName = (hldy_name ?? '').trim().toUpperCase();
    const normalizedType = (hldy_type ?? '').trim().toUpperCase();
    const normalizedStateId = parseOptionalId(hldy_state_type_id);

    const byCreatedDate = all.filter((item) => {
      const created = item.hldy_created_at ? new Date(item.hldy_created_at) : undefined;
      if (!created || Number.isNaN(created.getTime())) return true;
      if (start && created < start) return false;
      if (end && created > end) return false;
      return true;
    });

    const filtered = byCreatedDate.filter((item) => {
      if (normalizedDate && this.toDateStr(item.hldy_date) !== normalizedDate) return false;
      if (normalizedName && !item.hldy_name.toUpperCase().includes(normalizedName)) return false;
      if (normalizedType && item.hldy_type.toUpperCase() !== normalizedType) return false;
      if (normalizedStateId !== undefined && Number(item.hldy_state_type_id) !== normalizedStateId) return false;
      return true;
    });

    return paginateArray(filtered.map((item) => this.toRow(item)), page, limit);
  }

  @Get('filtrar/:id')
  @ApiOperation({ summary: 'Obtener un festivo por su hldy_id' })
  async findById(@Param('id') id: string) {
    const numId = Number(id);
    if (!Number.isInteger(numId) || numId <= 0) {
      throw new BadRequestException(userMsg.idUrlEntero);
    }
    const item = await this.holidayService.findById(numId);
    return dataOne(this.toRow(item));
  }

  @Put('actualizar/:id')
  @ApiOperation({ summary: 'Actualizar un festivo por su hldy_id' })
  @ApiBody({
    description: 'El JSON de abajo sirve de guía.',
    schema: { allOf: [{ $ref: getSchemaPath(UpdateHolidayDto) }], example: updateExampleSchema },
  })
  async update(@Param('id') id: string, @Body() body: UpdateHolidayDto) {
    const numId = Number(id);
    if (!Number.isInteger(numId) || numId <= 0) {
      throw new BadRequestException(userMsg.idUrlEntero);
    }
    const toUpdate: Holiday = {
      ...body,
      hldy_id: numId,
      hldy_date: new Date(body.hldy_date),
    } as unknown as Holiday;
    await this.holidayService.update(toUpdate);
    return { data: null, message: 'Registro actualizado correctamente' };
  }

  @Delete('eliminar/:id')
  @ApiOperation({ summary: 'Eliminar un festivo por su hldy_id' })
  async delete(@Param('id') id: string) {
    const numId = Number(id);
    if (!Number.isInteger(numId) || numId <= 0) {
      throw new BadRequestException(userMsg.idUrlEntero);
    }
    await this.holidayService.delete(numId);
    return { data: null, message: 'Registro eliminado correctamente' };
  }

  private toRow(item: Holiday): Record<string, unknown> {
    const o: Record<string, unknown> = {
      hldy_id: item.hldy_id,
      hldy_date: this.toDateStr(item.hldy_date),
      hldy_name: item.hldy_name,
      hldy_country_code: item.hldy_country_code,
      hldy_type: item.hldy_type,
      hldy_is_working_day: item.hldy_is_working_day,
      hldy_detail: item.hldy_detail,
      hldy_state_type_id: item.hldy_state_type_id,
    };
    if (item.state_type_name != null && String(item.state_type_name).length > 0) {
      o.state_type_name = item.state_type_name;
    }
    o.hldy_created_at = item.hldy_created_at;
    o.hldy_updated_at = item.hldy_updated_at;
    o.hldy_responsible = item.hldy_responsible;
    return o;
  }

  private toDateStr(date: Date | string): string {
    if (!date) return '';
    if (typeof date === 'string') return date.slice(0, 10);
    return date.toISOString().slice(0, 10);
  }
}

function parseOptionalId(value: unknown): number | undefined {
  if (value === undefined || value === null || (value as string) === '') return undefined;
  const n = typeof value === 'number' ? value : Number(value as string);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return Math.floor(n);
}
