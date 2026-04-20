// Responsabilidad: endpoints HTTP de Nest (controller).

import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiQuery, ApiTags, getSchemaPath } from '@nestjs/swagger';
import { CreateAttentionScheduleDto, AttentionScheduleDto, UpdateAttentionScheduleDto } from '../dto/attentionSchedule.dto';
import { AttentionScheduleService } from '@application/services/attentionSchedule.service';
import { AttentionSchedule } from '@domain/entities/attentionSchedule.entities';
import { CreateAttentionScheduleInput } from '@domain/ports/attentionSchedule.ports';
import { PaginatedResult, paginateArray } from '@application/utils/pagination.utils';
import { dataEmpty, dataMany, dataOne } from '@application/utils/response.utils';

const createExampleSchema = {
  portfolio_type_id: 1,
  days: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'],
  start_time: '08:00',
  start_recess: '12:00',
  end_recess: '14:00',
  end_time: '16:00',
  detail: 'Horario laboral estándar L-V 08:00-12:00 y 14:00-16:00',
  state_type_id: 1,
  responsible: 'BOT ctrl filed demand',
};

const updateExampleSchema = {
  portfolio_type_id: 1,
  days: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'],
  start_time: '08:00',
  start_recess: '12:00',
  end_recess: '14:00',
  end_time: '16:00',
  detail: 'Horario laboral estándar L-V 08:00-12:00 y 14:00-16:00',
  state_type_id: 1,
  responsible: 'BOT ctrl filed demand',
};

@ApiTags('attentionSchedule')
@Controller('attentionSchedule')
export class AttentionScheduleController {
  constructor(private readonly attentionScheduleService: AttentionScheduleService) {}

  private normalizeIdFilter(value: unknown): number | undefined {
    if (value === undefined || value === null || (value as any) === '') return undefined;
    const n = typeof value === 'number' ? value : Number(value as any);
    if (!Number.isFinite(n) || n <= 0) return undefined;
    return Math.floor(n);
  }

  private normalizeDayFilter(value?: string): string | undefined {
    if (!value) return undefined;
    const trimmed = value.trim();
    if (!trimmed || trimmed === '--') return undefined;
    return trimmed;
  }

  @Post()
  @ApiOperation({
    summary: 'Crear horario de atención',
    description:
      'Un solo registro con days como array de días en español (Lunes, Martes, ...).',
  })
  @ApiBody({
    description: 'days: array de días en español. Un único registro con ese array.',
    schema: { allOf: [{ $ref: getSchemaPath(CreateAttentionScheduleDto) }], example: createExampleSchema },
  })
  async create(@Body() dto: CreateAttentionScheduleDto): Promise<AttentionScheduleDto> {
    return this.attentionScheduleService.create(dto as CreateAttentionScheduleInput);
  }

  // Listado simple para selects (id + label_name)
  @Get('options')
  @ApiOperation({ summary: 'Obtener opciones de horarios de atención para selects' })
  async options() {
    const all = await this.attentionScheduleService.findAll();
    const items = all.map((item) => ({
      id: item.id,
      label_name: `Horario ${(item.portfolio_type_name ?? '').trim()}`.trim() || 'Horario',
    }));
    return dataMany(items);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los horarios de atención' })
  @ApiQuery({ name: 'start_date', required: false, type: String, description: 'Fecha inicial de creación (YYYY-MM-DD).' })
  @ApiQuery({ name: 'end_date', required: false, type: String, description: 'Fecha final de creación (YYYY-MM-DD).' })
  @ApiQuery({ name: 'portfolio_type_id', required: false, type: Number, description: 'Filtrar por portfolio_type_id (opcional)' })
  @ApiQuery({ name: 'state_type_id', required: false, type: Number, description: 'Filtrar por state_type_id (opcional)' })
  @ApiQuery({
    name: 'days',
    required: false,
    enum: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],
    description: 'Filtrar por un día específico (opcional)',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Número de página (>=1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Registros por página (>=1)' })
  async findAll(
    @Query('start_date') start_date?: string,
    @Query('end_date') end_date?: string,
    @Query('portfolio_type_id') portfolio_type_id?: number,
    @Query('state_type_id') state_type_id?: number,
    @Query('days') days?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<PaginatedResult<AttentionScheduleDto>> {
    const all = await this.attentionScheduleService.findAll();

    const parseDate = (value?: string): Date | undefined => {
      if (!value) return undefined;
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? undefined : d;
    };

    const start = parseDate(start_date);
    const end = parseDate(end_date);

    const portfolioId = this.normalizeIdFilter(portfolio_type_id);
    const stateId = this.normalizeIdFilter(state_type_id);
    const normalizedDay = this.normalizeDayFilter(days);

    const byDate = all.filter((item) => {
      const created = (item as any).created_at ? new Date((item as any).created_at) : undefined;
      if (!created || Number.isNaN(created.getTime())) return true;
      if (start && created < start) return false;
      if (end && created > end) return false;
      return true;
    });

    const filtered = byDate.filter((item) => {
      if (portfolioId !== undefined && Number(item.portfolio_type_id) !== portfolioId) return false;
      if (stateId !== undefined && Number(item.state_type_id) !== stateId) return false;
      if (normalizedDay && !item.days.includes(normalizedDay)) return false;
      return true;
    });

    return paginateArray(filtered, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un horario por id' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Número de página (>=1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Registros por página (>=1)' })
  async findById(@Param('id') id: number) {
    const item = await this.attentionScheduleService.findById(id);
    return dataOne(item);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar un horario de atención' })
  @ApiBody({
    schema: { allOf: [{ $ref: getSchemaPath(UpdateAttentionScheduleDto) }], example: updateExampleSchema },
  })
  async update(
    @Param('id') id: number,
    @Body() body: UpdateAttentionScheduleDto,
  ): Promise<AttentionScheduleDto> {
    return this.attentionScheduleService.update({ ...body, id: Number(id) } as AttentionSchedule);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un horario de atención' })
  async delete(@Param('id') id: number) {
    await this.attentionScheduleService.delete(id);
    return dataEmpty();
  }
}
