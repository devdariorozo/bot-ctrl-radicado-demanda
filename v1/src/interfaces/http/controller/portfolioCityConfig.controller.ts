// Responsabilidad: endpoints HTTP de Nest (controller).

import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiQuery, ApiResponse, ApiTags, getSchemaPath } from '@nestjs/swagger';
import { PortfolioCityConfigDto, UpdatePortfolioCityConfigDto } from '../dto/portfolioCityConfig.dto';
import { PortfolioCityConfigService } from '@application/services/portfolioCityConfig.service';
import { PortfolioCityConfig } from '@domain/entities/portfolioCityConfig.entities';
import { CreatePortfolioCityConfigInput } from '@domain/ports/portfolioCityConfig.ports';
import { getListQueryDateRange } from '@application/utils/listQueryDateRange.utils';
import { PaginatedResult, paginateArray } from '@application/utils/pagination.utils';
import { dataEmpty, dataMany, dataOne } from '@application/utils/response.utils';

const createExampleSchema = {
  id_data_bases: 1,
  id_city_views: 149,
  name_departament: 'BOGOTÁ',
  name_city: 'BOGOTÁ',
  city: 'BOGOTÁ - BOGOTÁ',
  detail: 'Configuración cartera propia Bogotá',
  state_type_id: 1,
  responsible: 'BOT ctrl filed demand',
};

const updateExampleSchema = {
  id_data_bases: 1,
  id_city_views: 149,
  name_departament: 'BOGOTÁ',
  name_city: 'BOGOTÁ',
  city: 'BOGOTÁ - BOGOTÁ',
  detail: 'Configuración cartera propia Bogotá',
  state_type_id: 1,
  responsible: 'BOT ctrl filed demand',
};

@ApiTags('portfolioCityConfig')
@Controller('portfolioCityConfig')
export class PortfolioCityConfigController {
  constructor(private readonly portfolioCityConfigService: PortfolioCityConfigService) {}

  private normalizeIdFilter(value: unknown): number | undefined {
    if (value === undefined || value === null || (value as any) === '') return undefined;
    const n = typeof value === 'number' ? value : Number(value as any);
    if (!Number.isFinite(n) || n <= 0) return undefined;
    return Math.floor(n);
  }

  @Post('crear')
  @ApiOperation({ summary: 'Crear una nueva configuración cartera-ciudad' })
  @ApiBody({
    description: 'El JSON de abajo sirve de guía.',
    schema: {
      allOf: [{ $ref: getSchemaPath(PortfolioCityConfigDto) }],
      example: createExampleSchema,
    },
  })
  async create(@Body() dto: PortfolioCityConfigDto) {
    const created = await this.portfolioCityConfigService.create(dto as CreatePortfolioCityConfigInput);
    return dataOne(created);
  }

  @Get('opciones')
  @ApiOperation({ summary: 'Obtener opciones de configuración cartera-ciudad para selects' })
  async options() {
    const all = await this.portfolioCityConfigService.findAll();
    const items = all.map((item) => {
      const env = (item.environment_type_name ?? '').trim();
      const envCapitalized = env ? env.charAt(0).toUpperCase() + env.slice(1).toLowerCase() : '';
      const parts = [envCapitalized, item.portfolio_type_name ?? '', item.city].filter(Boolean);
      return {
        id: item.id,
        label_name: parts.join(' '),
      };
    });
    return dataMany(items);
  }

  @Get('listar')
  @ApiOperation({ summary: 'Obtener todas las configuraciones' })
  @ApiQuery({ name: 'start_date', required: false, type: String, description: 'Fecha inicial de creación (YYYY-MM-DD).' })
  @ApiQuery({ name: 'end_date', required: false, type: String, description: 'Fecha final de creación (YYYY-MM-DD).' })
  @ApiQuery({ name: 'id_data_bases', required: false, type: Number, description: 'Filtrar por id_data_bases (opcional)' })
  @ApiQuery({ name: 'id_city_views', required: false, type: Number, description: 'Filtrar por id_city_views (opcional)' })
  @ApiQuery({ name: 'state_type_id', required: false, type: Number, description: 'Filtrar por state_type_id (opcional)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Número de página (>=1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Registros por página (>=1)' })
  async findAll(
    @Query('start_date') start_date?: string,
    @Query('end_date') end_date?: string,
    @Query('id_data_bases') id_data_bases?: number,
    @Query('id_city_views') id_city_views?: number,
    @Query('state_type_id') state_type_id?: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<PaginatedResult<PortfolioCityConfigDto>> {
    const all = await this.portfolioCityConfigService.findAll();

    const { start, end } = getListQueryDateRange(start_date, end_date);

    const dbId = this.normalizeIdFilter(id_data_bases);
    const cityId = this.normalizeIdFilter(id_city_views);
    const stateId = this.normalizeIdFilter(state_type_id);

    const byDate = all.filter((item) => {
      const created = (item as any).created_at ? new Date((item as any).created_at) : undefined;
      if (!created || Number.isNaN(created.getTime())) return true;
      if (start && created < start) return false;
      if (end && created > end) return false;
      return true;
    });

    const filtered = byDate.filter((item) => {
      if (dbId !== undefined && Number(item.id_data_bases) !== dbId) return false;
      if (cityId !== undefined && Number(item.id_city_views) !== cityId) return false;
      if (stateId !== undefined && Number(item.state_type_id) !== stateId) return false;
      return true;
    });

    return paginateArray(filtered, page, limit);
  }

  @Get('ciudades')
  @ApiOperation({
    summary: 'vCitiesFetch - Consultar vista v_cities',
    description:
      'Ejecuta una consulta sobre la primera base de datos del registro data_bases indicado, contra la vista v_cities. Retorna id, city_name, department, city.',
  })
  @ApiQuery({
    name: 'id_data_bases',
    required: true,
    type: Number,
    description: 'ID del registro en data_bases; se usa la primera base del array (posición 0) para consultar v_cities.',
  })
  async vCitiesFetch(@Query('id_data_bases') id_data_bases: number) {
    const items = await this.portfolioCityConfigService.vCitiesFetch(Number(id_data_bases));
    return dataMany(items);
  }

  @Get('filtrar/:id')
  @ApiOperation({ summary: 'Obtener una configuración por id' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Número de página (>=1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Registros por página (>=1)' })
  async findById(@Param('id') id: number) {
    const item = await this.portfolioCityConfigService.findById(id);
    return dataOne(item);
  }

  @Put('actualizar/:id')
  @ApiOperation({ summary: 'Actualizar una configuración' })
  @ApiBody({
    description: 'El JSON de abajo sirve de guía.',
    schema: {
      allOf: [{ $ref: getSchemaPath(UpdatePortfolioCityConfigDto) }],
      example: updateExampleSchema,
    },
  })
  async update(
    @Param('id') id: number,
    @Body() body: UpdatePortfolioCityConfigDto,
  ) {
    const updated = await this.portfolioCityConfigService.update({ ...body, id: Number(id) } as PortfolioCityConfig);
    return dataOne(updated);
  }

  @Delete('eliminar/:id')
  @ApiOperation({ summary: 'Eliminar una configuración' })
  async delete(@Param('id') id: number) {
    await this.portfolioCityConfigService.delete(id);
    return dataEmpty();
  }
}
