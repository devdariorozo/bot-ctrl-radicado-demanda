// Responsabilidad: endpoints HTTP de Nest (controller).

import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiQuery, ApiTags, getSchemaPath } from '@nestjs/swagger';
import { DataBasesDto, UpdateDataBasesDto } from '../dto/dataBases.dto';
import { DataBasesService } from '@application/services/dataBases.service';
import { DataBases } from '@domain/entities/dataBases.entities';
import { CreateDataBasesInput } from '@domain/ports/dataBases.ports';
import { PaginatedResult, paginateArray } from '@application/utils/pagination.utils';
import { dataEmpty, dataMany, dataOne } from '@application/utils/response.utils';

/** Ejemplo JSON que Swagger muestra por defecto en el body (guía visual para quien use la API). */
const createExampleSchema = {
  environment_type_id: 1,
  portfolio_type_id: 1,
  bases: {
    dev_db_1: {
      generate_pdf_demand_service: {
        url: 'https://example.groupcos.com/api/v1',
        api_key: 'sk_74b9d1c1e949ae8e60f52b1f2a4d7c89',
      },
    },
    dev_db_2: {
      generate_pdf_demand_service: {
        url: 'https://example2.groupcos.com/api/v1',
        api_key: 'sk_74b9d1c1e949ae8e60f52b1f2a4d7c89',
      },
    },
  },
  detail: 'Bases de datos para entorno dev, cartera Propias',
  state_type_id: 1,
  responsible: 'BOT demands online',
};

/** Ejemplo JSON para actualizar. El id va solo en la URL (path), no en el body. */
const updateExampleSchema = {
  environment_type_id: 1,
  portfolio_type_id: 1,
  bases: {
    dev_db_1: {
      generate_pdf_demand_service: {
        url: 'https://example.groupcos.com/api/v1',
        api_key: 'sk_74b9d1c1e949ae8e60f52b1f2a4d7c89',
      },
    },
  },
  detail: 'Bases de datos para entorno dev, cartera Propias',
  state_type_id: 1,
  responsible: 'BOT demands online',
};

@ApiTags('dataBases')
@Controller('dataBases')
export class DataBasesController {
  constructor(private readonly dataBasesService: DataBasesService) {}

  // Crear un nuevo registro de bases
  @Post()
  @ApiOperation({ summary: 'Crear un nuevo registro de bases' })
  @ApiBody({
    description: 'El JSON de abajo sirve de guía.',
    schema: { allOf: [{ $ref: getSchemaPath(DataBasesDto) }], example: createExampleSchema },
  })
  async create(@Body() dto: DataBasesDto) {
    const created = await this.dataBasesService.create(dto as CreateDataBasesInput);
    return dataOne(created);
  }

  // Listado simple para selects (id + label_name)
  @Get('options')
  @ApiOperation({ summary: 'Obtener opciones de bases de datos para selects' })
  async options() {
    const all = await this.dataBasesService.findAll();
    const items = all.map((item) => ({
      id: item.id,
      label_name: item.label_data_base ?? item.detail,
    }));
    return dataMany(items);
  }

  // Obtener todos los registros de bases
  @Get()
  @ApiOperation({ summary: 'Obtener todos los registros de bases' })
  @ApiQuery({ name: 'start_date', required: false, type: String, description: 'Fecha inicial de creación (YYYY-MM-DD).' })
  @ApiQuery({ name: 'end_date', required: false, type: String, description: 'Fecha final de creación (YYYY-MM-DD).' })
  @ApiQuery({ name: 'environment_type_id', required: false, type: Number, description: 'Filtrar por environment_type_id (opcional)' })
  @ApiQuery({ name: 'portfolio_type_id', required: false, type: Number, description: 'Filtrar por portfolio_type_id (opcional)' })
  @ApiQuery({ name: 'state_type_id', required: false, type: Number, description: 'Filtrar por state_type_id (opcional)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Número de página (>=1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Registros por página (>=1)' })
  async findAll(
    @Query('start_date') start_date?: string,
    @Query('end_date') end_date?: string,
    @Query('environment_type_id') environment_type_id?: number,
    @Query('portfolio_type_id') portfolio_type_id?: number,
    @Query('state_type_id') state_type_id?: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<PaginatedResult<DataBasesDto>> {
    const normalizeFilterId = (value: unknown): number | undefined => {
      if (value === undefined || value === null || (value as any) === '') return undefined;
      const n = typeof value === 'number' ? value : Number(value as any);
      if (!Number.isFinite(n) || n <= 0) return undefined;
      return Math.floor(n);
    };

    const envId = normalizeFilterId(environment_type_id);
    const portfId = normalizeFilterId(portfolio_type_id);
    const stateId = normalizeFilterId(state_type_id);

    const all = await this.dataBasesService.findAll();

    const parseDate = (value?: string): Date | undefined => {
      if (!value) return undefined;
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? undefined : d;
    };

    const start = parseDate(start_date);
    const end = parseDate(end_date);

    const byDate = all.filter((item) => {
      const created = (item as any).created_at ? new Date((item as any).created_at) : undefined;
      if (!created || Number.isNaN(created.getTime())) return true;
      if (start && created < start) return false;
      if (end && created > end) return false;
      return true;
    });

    const hasEnvFilter = envId !== undefined;
    const hasPortfFilter = portfId !== undefined;
    const hasStateFilter = stateId !== undefined;

    const hasAnyIdFilter = hasEnvFilter || hasPortfFilter || hasStateFilter;

    // Si NO viene ningún filtro de IDs, devolvemos todo lo filtrado solo por fecha.
    if (!hasAnyIdFilter) {
      return paginateArray(byDate, page, limit);
    }

    const filtered = byDate.filter((item) => {
      if (
        hasEnvFilter &&
        Number(item.environment_type_id) !== Number(envId)
      ) {
        return false;
      }

      if (
        hasPortfFilter &&
        Number(item.portfolio_type_id) !== Number(portfId)
      ) {
        return false;
      }

      if (
        hasStateFilter &&
        Number(item.state_type_id) !== Number(stateId)
      ) {
        return false;
      }

      return true;
    });

    return paginateArray(filtered, page, limit);
  }

  // Obtener un registro de bases por su id
  @Get(':id')
  @ApiOperation({ summary: 'Obtener un registro de bases por su id' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Número de página (>=1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Registros por página (>=1)' })
  async findById(@Param('id') id: number) {
    const item = await this.dataBasesService.findById(id);
    return dataOne(item);
  }

  // Actualizar un registro de bases
  @Put(':id')
  @ApiOperation({ summary: 'Actualizar un registro de bases' })
  @ApiBody({
    description: 'El JSON de abajo sirve de guía.',
    schema: { allOf: [{ $ref: getSchemaPath(UpdateDataBasesDto) }], example: updateExampleSchema },
  })
  async update(@Param('id') id: number, @Body() body: UpdateDataBasesDto) {
    const updated = await this.dataBasesService.update({ ...body, id: Number(id) } as DataBases);
    return dataOne(updated);
  }

  // Eliminar un registro de bases
  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un registro de bases' })
  async delete(@Param('id') id: number) {
    await this.dataBasesService.delete(id);
    return dataEmpty();
  }
}

