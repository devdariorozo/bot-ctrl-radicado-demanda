// Responsabilidad: endpoints HTTP de Nest (controller).

import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiQuery, ApiTags, getSchemaPath } from '@nestjs/swagger';
import { StateTypeDto, UpdateStateTypeDto } from '../dto/stateType.dto';
import { StateTypeService } from '@application/services/stateType.service';
import { StateType } from '@domain/entities/stateType.entities';
import { PaginatedResult, paginateArray } from '@application/utils/pagination.utils';
import { dataEmpty, dataMany, dataOne } from '@application/utils/response.utils';

/** Ejemplo JSON que Swagger muestra por defecto en el body (guía visual para quien use la API). */
const createExampleSchema = {
    type: 'Active',
    detail: 'Registro activo',
    responsible: 'BOT demands online',
};

/** Ejemplo JSON para actualizar. El id va solo en la URL (path), no en el body. */
const updateExampleSchema = {
    type: 'Active',
    detail: 'Registro activo',
    responsible: 'BOT demands online',
};

@ApiTags('stateType')
@Controller('stateType')
export class StateTypeController {
    constructor(private readonly stateTypeService: StateTypeService) {}
    // Crear un nuevo tipo de estado
    @Post()
    @ApiOperation({ summary: 'Crear un nuevo tipo de estado' })
    @ApiBody({
        description: 'El JSON de abajo sirve de guía.',
        schema: { allOf: [{ $ref: getSchemaPath(StateTypeDto) }], example: createExampleSchema },
    })
    async create(@Body() stateTypeDto: StateTypeDto): Promise<StateTypeDto> {
        return this.stateTypeService.create(stateTypeDto);
    }
    // Listado simple para selects (id + label_name)
    @Get('options')
    @ApiOperation({ summary: 'Obtener opciones de tipos de estado para selects' })
    async options() {
        const all = await this.stateTypeService.findAll();
        const items = all.map((item) => ({ id: item.id, label_name: item.type }));
        return dataMany(items);
    }
    // Obtener todos los tipos de estado
    @Get()
  @ApiOperation({ summary: 'Obtener todos los tipos de estado' })
  @ApiQuery({ name: 'start_date', required: false, type: String, description: 'Fecha inicial de creación (YYYY-MM-DD).' })
  @ApiQuery({ name: 'end_date', required: false, type: String, description: 'Fecha final de creación (YYYY-MM-DD).' })
  @ApiQuery({ name: 'type', required: false, type: String, description: 'Filtrar por type (búsqueda parcial, opcional)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Número de página (>=1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Registros por página (>=1)' })
    async findAll(
    @Query('start_date') start_date?: string,
    @Query('end_date') end_date?: string,
    @Query('type') type?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    ): Promise<PaginatedResult<StateTypeDto>> {
    const all = await this.stateTypeService.findAll();

    const parseDate = (value?: string): Date | undefined => {
      if (!value) return undefined;
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? undefined : d;
    };

    const start = parseDate(start_date);
    const end = parseDate(end_date);
    const normalizedType = type?.trim().toLowerCase() || '';

    const byDate = all.filter((item) => {
      const created = (item as any).created_at ? new Date((item as any).created_at) : undefined;
      if (!created || Number.isNaN(created.getTime())) return true;
      if (start && created < start) return false;
      if (end && created > end) return false;
      return true;
    });

    const byFilters = byDate.filter((item) => {
      if (normalizedType && !item.type.toLowerCase().includes(normalizedType)) return false;
      return true;
    });

    return paginateArray(byFilters, page, limit);
    }
    // Obtener un tipo de estado por su id
    @Get(':id')
    @ApiOperation({ summary: 'Obtener un tipo de estado por su id' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Número de página (>=1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Registros por página (>=1)' })
    async findById(@Param('id') id: number) {
        const item = await this.stateTypeService.findById(id);
        return dataOne(item);
    }
    // Actualizar un tipo de estado
    @Put(':id')
    @ApiOperation({ summary: 'Actualizar un tipo de estado' })
    @ApiBody({
        description: 'El JSON de abajo sirve de guía.',
        schema: { allOf: [{ $ref: getSchemaPath(UpdateStateTypeDto) }], example: updateExampleSchema },
    })
    async update(@Param('id') id: number, @Body() body: UpdateStateTypeDto) {
        const updated = await this.stateTypeService.update({ ...body, id: Number(id) } as StateType);
        return dataOne(updated);
    }
    // Eliminar un tipo de estado
    @Delete(':id')
    @ApiOperation({ summary: 'Eliminar un tipo de estado' })
    async delete(@Param('id') id: number) {
        await this.stateTypeService.delete(id);
        return dataEmpty();
    }
}