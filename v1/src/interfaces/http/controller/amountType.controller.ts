// Responsabilidad: endpoints HTTP de Nest para amount_type.

import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiQuery, ApiTags, getSchemaPath } from '@nestjs/swagger';

import { AmountTypeService } from '@application/services/amountType.service';
import { AmountType } from '@domain/entities/amountType.entities';
import { CreateAmountTypeInput } from '@domain/ports/amountType.ports';
import { AmountTypeDto, UpdateAmountTypeDto } from '../dto/amountType.dto';
import { getListQueryDateRange } from '@application/utils/listQueryDateRange.utils';
import { PaginatedResult, paginateArray } from '@application/utils/pagination.utils';
import { dataEmpty, dataOne } from '@application/utils/response.utils';

const createExampleSchema = {
  type: 'Mayor Cuantía',
  specialty_process: ['CIVIL CIRCUITO - MAYOR CUANTÍA', 'PROMISCUO MUNICIPAL'],
  class_process: ['31-03-07 PROCESOS EJECUTIVOS', '40-89-08 EJECUTIVO DE MÍNIMA CUANTÍA '],
  detail: 'Demanda con mayor cuantia',
  state_type_id: 1,
  responsible: 'BOT ctrl filed demand',
};

const updateExampleSchema = {
  type: 'Mayor Cuantía',
  specialty_process: ['CIVIL CIRCUITO - MAYOR CUANTÍA', 'PROMISCUO MUNICIPAL'],
  class_process: ['31-03-07 PROCESOS EJECUTIVOS', '40-89-08 EJECUTIVO DE MÍNIMA CUANTÍA '],
  detail: 'Demanda con mayor cuantia',
  state_type_id: 1,
  responsible: 'BOT ctrl filed demand',
};

@ApiTags('amountType')
@Controller('amountType')
export class AmountTypeController {
  constructor(private readonly amountTypeService: AmountTypeService) {}

  @Post('crear')
  @ApiOperation({ summary: 'Crear un nuevo tipo de cuantía' })
  @ApiBody({
    description: 'El JSON de abajo sirve de guía.',
    schema: { allOf: [{ $ref: getSchemaPath(AmountTypeDto) }], example: createExampleSchema },
  })
  async create(@Body() dto: AmountTypeDto) {
    const created = await this.amountTypeService.create(dto as CreateAmountTypeInput);
    return dataOne(created);
  }

  // Listado simple para selects (id + label_name)
  @Get('opciones')
  @ApiOperation({ summary: 'Obtener opciones de tipos de cuantía para selects' })
  async options() {
    const all = await this.amountTypeService.findAll();
    const items = all.map((item) => ({
      id: item.id,
      label_name: item.type,
    }));
    return dataOne(items);
  }

  @Get('listar')
  @ApiOperation({ summary: 'Obtener todos los tipos de cuantía' })
  @ApiQuery({ name: 'start_date', required: false, type: String, description: 'Fecha inicial (YYYY-MM-DD).' })
  @ApiQuery({ name: 'end_date', required: false, type: String, description: 'Fecha final (YYYY-MM-DD).' })
  @ApiQuery({ name: 'type', required: false, type: String, description: 'Filtrar por type (parcial).' })
  @ApiQuery({ name: 'specialty_process', required: false, type: String, description: 'Filtrar por specialty_process (parcial).' })
  @ApiQuery({ name: 'class_process', required: false, type: String, description: 'Filtrar por class_process (parcial).' })
  @ApiQuery({ name: 'state_type_id', required: false, type: Number, description: 'Filtrar por state_type_id.' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Número de página (>=1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Registros por página (>=1)' })
  async findAll(
    @Query('start_date') start_date?: string,
    @Query('end_date') end_date?: string,
    @Query('type') type?: string,
    @Query('specialty_process') specialty_process?: string,
    @Query('class_process') class_process?: string,
    @Query('state_type_id') state_type_id?: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<PaginatedResult<AmountTypeDto>> {
    const all = await this.amountTypeService.findAll();

    const { start, end } = getListQueryDateRange(start_date, end_date);

    const normalizedStateId =
      state_type_id === undefined || state_type_id === null
        ? undefined
        : (() => {
            const n = typeof state_type_id === 'number' ? state_type_id : Number(state_type_id);
            if (!Number.isFinite(n) || n <= 0) return undefined;
            return Math.floor(n);
          })();

    const normalizedType = (type ?? '').trim().toLowerCase();
    const normalizedSpecialty = (specialty_process ?? '').trim().toLowerCase();
    const normalizedClass = (class_process ?? '').trim().toLowerCase();

    const byDate = all.filter((item) => {
      const created = (item as AmountType & { created_at?: Date }).created_at
        ? new Date((item as AmountType & { created_at?: Date }).created_at!)
        : undefined;
      if (!created || Number.isNaN(created.getTime())) return true;
      if (start && created < start) return false;
      if (end && created > end) return false;
      return true;
    });

    const filtered = byDate.filter((item) => {
      if (normalizedType && !(item.type ?? '').toLowerCase().includes(normalizedType)) return false;

      if (normalizedSpecialty) {
        const specialties = Array.isArray(item.specialty_process)
          ? item.specialty_process
          : item.specialty_process
            ? [item.specialty_process as unknown as string]
            : [];
        const matchesSpecialty = specialties.some((sp) => (sp ?? '').toLowerCase().includes(normalizedSpecialty));
        if (!matchesSpecialty) return false;
      }

      if (normalizedClass) {
        const classes = Array.isArray(item.class_process)
          ? item.class_process
          : item.class_process
            ? [item.class_process as unknown as string]
            : [];
        const matchesClass = classes.some((cp) => (cp ?? '').toLowerCase().includes(normalizedClass));
        if (!matchesClass) return false;
      }

      if (normalizedStateId !== undefined && Number(item.state_type_id) !== normalizedStateId) return false;
      return true;
    });

    return paginateArray(filtered, page, limit);
  }

  @Get('filtrar/:id')
  @ApiOperation({ summary: 'Obtener un tipo de cuantía por su id' })
  async findById(@Param('id') id: number) {
    const item = await this.amountTypeService.findById(id);
    return dataOne(item);
  }

  @Put('actualizar/:id')
  @ApiOperation({ summary: 'Actualizar un tipo de cuantía' })
  @ApiBody({
    description: 'El JSON de abajo sirve de guía.',
    schema: { allOf: [{ $ref: getSchemaPath(UpdateAmountTypeDto) }], example: updateExampleSchema },
  })
  async update(@Param('id') id: number, @Body() body: UpdateAmountTypeDto) {
    const updated = await this.amountTypeService.update({ ...body, id: Number(id) } as AmountType);
    return dataOne(updated);
  }

  @Delete('eliminar/:id')
  @ApiOperation({ summary: 'Eliminar un tipo de cuantía' })
  async delete(@Param('id') id: number) {
    await this.amountTypeService.delete(id);
    return dataEmpty();
  }
}
