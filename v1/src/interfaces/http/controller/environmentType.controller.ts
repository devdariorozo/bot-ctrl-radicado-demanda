// Responsabilidad: endpoints HTTP de Nest (controller).

import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiQuery, ApiTags, getSchemaPath } from '@nestjs/swagger';
import { EnvironmentTypeDto, UpdateEnvironmentTypeDto } from '../dto/environmentType.dto';
import { EnvironmentTypeService } from '@application/services/environmentType.service';
import { EnvironmentType } from '@domain/entities/environmentType.entities';
import { CreateEnvironmentTypeInput } from '@domain/ports/environmentType.ports';
import { PaginatedResult, paginateArray } from '@application/utils/pagination.utils';
import { dataEmpty, dataMany, dataOne } from '@application/utils/response.utils';

/** Ejemplo JSON que Swagger muestra por defecto en el body (guía visual para quien use la API). */
const createExampleSchema = {
    type: 'dev',
    detail: 'Dev environment registered',
    responsible: 'BOT ctrl filed demand',
};

/** Ejemplo JSON para actualizar. El id va solo en la URL (path), no en el body. */
const updateExampleSchema = {
    type: 'dev',
    detail: 'Dev environment registered',
    responsible: 'BOT ctrl filed demand',
};

@ApiTags('environmentType')
@Controller('environmentType')
export class EnvironmentTypeController {
    constructor(private readonly environmentTypeService: EnvironmentTypeService) {}
    // Crear un nuevo tipo de entorno
    @Post()
    @ApiOperation({ summary: 'Crear un nuevo tipo de entorno' })
    @ApiBody({
        description: 'El JSON de abajo sirve de guía.',
        schema: { allOf: [{ $ref: getSchemaPath(EnvironmentTypeDto) }], example: createExampleSchema },
    })
    async create(@Body() environmentTypeDto: EnvironmentTypeDto) {
        const created = await this.environmentTypeService.create(environmentTypeDto as CreateEnvironmentTypeInput);
        return dataOne(created);
    }
    // Listado simple para selects (id + label_name)
    @Get('options')
    @ApiOperation({ summary: 'Obtener opciones de tipos de entorno para selects' })
    async options() {
        const all = await this.environmentTypeService.findAll();
        const items = all.map((item) => ({ id: item.id, label_name: item.type }));
        return dataMany(items);
    }
    // Obtener todos los tipos de entorno
    @Get()
  @ApiOperation({ summary: 'Obtener todos los tipos de entorno' })
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
    ): Promise<PaginatedResult<EnvironmentTypeDto>> {
    const all = await this.environmentTypeService.findAll();

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
    // Obtener un tipo de entorno por su id
    @Get(':id')
    @ApiOperation({ summary: 'Obtener un tipo de entorno por su id' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Número de página (>=1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Registros por página (>=1)' })
    async findById(@Param('id') id: number) {
        const item = await this.environmentTypeService.findById(id);
        return dataOne(item);
    }
    // Actualizar un tipo de entorno
    @Put(':id')
    @ApiOperation({ summary: 'Actualizar un tipo de entorno' })
    @ApiBody({
        description: 'El JSON de abajo sirve de guía.',
        schema: { allOf: [{ $ref: getSchemaPath(UpdateEnvironmentTypeDto) }], example: updateExampleSchema },
    })
    async update(@Param('id') id: number, @Body() body: UpdateEnvironmentTypeDto): Promise<EnvironmentTypeDto> {
        return this.environmentTypeService.update({ ...body, id: Number(id) } as EnvironmentType);
    }
    // Eliminar un tipo de entorno
    @Delete(':id')
    @ApiOperation({ summary: 'Eliminar un tipo de entorno' })
    async delete(@Param('id') id: number) {
        await this.environmentTypeService.delete(id);
        return dataEmpty();
    }
}

