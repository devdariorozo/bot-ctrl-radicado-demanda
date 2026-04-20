// Responsabilidad: endpoints HTTP de Nest (controller).

import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiQuery, ApiTags, getSchemaPath } from '@nestjs/swagger';
import { PortfolioTypeDto, UpdatePortfolioTypeDto } from '../dto/portfolioType.dto';
import { PortfolioTypeService } from '@application/services/portfolioType.service';
import { PortfolioType } from '@domain/entities/portfolioType.entities';
import { CreatePortfolioTypeInput } from '@domain/ports/portfolioType.ports';
import { PaginatedResult, paginateArray } from '@application/utils/pagination.utils';
import { dataEmpty, dataMany, dataOne } from '@application/utils/response.utils';

/** Ejemplo JSON que Swagger muestra por defecto en el body (guía visual para quien use la API). */
const createExampleSchema = {
    type: 'Propias',
    detail: 'Propias registered',
    state_type_id: 1,
    responsible: 'BOT ctrl filed demand',
};

/** Ejemplo JSON para actualizar. El id va solo en la URL (path), no en el body. */
const updateExampleSchema = {
    type: 'Propias',
    detail: 'Propias registered',
    state_type_id: 1,
    responsible: 'BOT ctrl filed demand',
};

@ApiTags('portfolioType')
@Controller('portfolioType')
export class PortfolioTypeController {
    constructor(private readonly portfolioTypeService: PortfolioTypeService) {}
    // Crear un nuevo tipo de cartera
    @Post()
    @ApiOperation({ summary: 'Crear un nuevo tipo de cartera' })
    @ApiBody({
        description: 'El JSON de abajo sirve de guía.',
        schema: { allOf: [{ $ref: getSchemaPath(PortfolioTypeDto) }], example: createExampleSchema },
    })
    async create(@Body() portfolioTypeDto: PortfolioTypeDto) {
        const created = await this.portfolioTypeService.create(portfolioTypeDto as CreatePortfolioTypeInput);
        return dataOne(created);
    }
    // Listado simple para selects (id + label_name)
    @Get('options')
    @ApiOperation({ summary: 'Obtener opciones de tipos de cartera para selects' })
    async options() {
        const all = await this.portfolioTypeService.findAll();
        const items = all.map((item) => ({ id: item.id, label_name: item.type }));
        return dataMany(items);
    }
    // Obtener todos los tipos de cartera
    @Get()
  @ApiOperation({ summary: 'Obtener todos los tipos de cartera' })
  @ApiQuery({ name: 'start_date', required: false, type: String, description: 'Fecha inicial de creación (YYYY-MM-DD).' })
  @ApiQuery({ name: 'end_date', required: false, type: String, description: 'Fecha final de creación (YYYY-MM-DD).' })
  @ApiQuery({ name: 'type', required: false, type: String, description: 'Filtrar por type (búsqueda parcial, opcional)' })
  @ApiQuery({ name: 'state_type_id', required: false, type: Number, description: 'Filtrar por state_type_id (opcional)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Número de página (>=1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Registros por página (>=1)' })
    async findAll(
    @Query('start_date') start_date?: string,
    @Query('end_date') end_date?: string,
    @Query('type') type?: string,
    @Query('state_type_id') state_type_id?: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    ): Promise<PaginatedResult<PortfolioTypeDto>> {
    const all = await this.portfolioTypeService.findAll();

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

    const filtered = byDate.filter((item) => {
      const normalizedStateId =
        state_type_id === undefined || state_type_id === null
          ? undefined
          : (() => {
              const n =
                typeof state_type_id === 'number'
                  ? state_type_id
                  : Number(state_type_id as any);
              if (!Number.isFinite(n) || n <= 0) return undefined;
              return Math.floor(n);
            })();
      if (normalizedType && !item.type.toLowerCase().includes(normalizedType)) return false;
      if (normalizedStateId !== undefined && Number(item.state_type_id) !== normalizedStateId) return false;
      return true;
    });

    return paginateArray(filtered, page, limit);
    }
    // Obtener un tipo de cartera por su id
    @Get(':id')
    @ApiOperation({ summary: 'Obtener un tipo de cartera por su id' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Número de página (>=1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Registros por página (>=1)' })
    async findById(@Param('id') id: number) {
        const item = await this.portfolioTypeService.findById(id);
        return dataOne(item);
    }
    // Actualizar un tipo de cartera
    @Put(':id')
    @ApiOperation({ summary: 'Actualizar un tipo de cartera' })
    @ApiBody({
        description: 'El JSON de abajo sirve de guía.',
        schema: { allOf: [{ $ref: getSchemaPath(UpdatePortfolioTypeDto) }], example: updateExampleSchema },
    })
    async update(@Param('id') id: number, @Body() body: UpdatePortfolioTypeDto) {
        const updated = await this.portfolioTypeService.update({ ...body, id: Number(id) } as PortfolioType);
        return dataOne(updated);
    }
    // Eliminar un tipo de cartera
    @Delete(':id')
    @ApiOperation({ summary: 'Eliminar un tipo de cartera' })
    async delete(@Param('id') id: number) {
        await this.portfolioTypeService.delete(id);
        return dataEmpty();
    }
}