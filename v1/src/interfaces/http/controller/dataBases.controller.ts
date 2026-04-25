// Responsabilidad: endpoints HTTP de Nest (controller).

import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiQuery, ApiTags, getSchemaPath } from '@nestjs/swagger';
import { DataBasesDto, UpdateDataBasesDto } from '../dto/dataBases.dto';
import { DataBasesService, shortLabelForBases } from '@application/services/dataBases.service';
import { DataBases } from '@domain/entities/dataBases.entities';
import { CreateDataBasesInput } from '@domain/ports/dataBases.ports';
import { userMsg } from '@application/utils/apiUserMessages.utils';
import { getListQueryDateRange } from '@application/utils/listQueryDateRange.utils';
import { paginateArray } from '@application/utils/pagination.utils';
import { dataMany, dataOne } from '@application/utils/response.utils';
import { fromCreateDataBasesDto, fromUpdateDataBasesDto, toDataBasesApi } from '../mappers/dataBasesHttp.mappers';

const createExampleSchema = {
  db_environment_type_id: 1,
  db_portfolio_type_id: 1,
  db_bases: {
    miosv2_carteras_QA: {
      generate_pdf_demand_service: {
        url: 'https://qa-cartera.groupcos.com/api/v1',
        api_key: 'sk_74b9d1c1e949ae8e60f52b1f2a4d7c89',
      },
    },
  },
  db_detail: 'Bases de datos para entorno QA',
  db_state_type_id: 1,
  db_responsible: 'BOT ctrl radicado demanda',
};

const updateExampleSchema = { ...createExampleSchema };

@ApiTags('tbl_data_bases')
@Controller('tbl_data_bases')
export class DataBasesController {
  constructor(private readonly dataBasesService: DataBasesService) {}

  @Post('crear')
  @ApiOperation({ summary: 'Crear un registro en tbl_data_bases' })
  @ApiBody({
    description: 'El JSON de abajo sirve de guía.',
    schema: { allOf: [{ $ref: getSchemaPath(DataBasesDto) }], example: createExampleSchema },
  })
  async create(@Body() dto: DataBasesDto) {
    const input: CreateDataBasesInput = fromCreateDataBasesDto(dto);
    const created = await this.dataBasesService.create(input);
    // Misma carga enriquecida y mismo orden que listar / filtrar
    const full = await this.dataBasesService.findById(created.id);
    return { data: [toDataBasesApi(full)], message: 'Registro creado correctamente' };
  }

  @Get('opciones')
  @ApiOperation({
    summary: 'Opciones para selects (db_id, label_name); excluye entornos de tipo producción',
  })
  async options() {
    const all = await this.dataBasesService.findAll();
    const list = this.dataBasesService.findOptionsExcludingProduction(all);
    const items = list.map((item) => ({
      db_id: item.id,
      label_name: shortLabelForBases(item.bases, item.detail),
    }));
    return dataMany(items);
  }

  @Get('opcionesActivas')
  @ApiOperation({
    summary: 'Opciones activas: db_id y label_name; excluye tipo de estado inactivo (stty_type con "inactiv")',
  })
  async optionsActive() {
    const all = await this.dataBasesService.findAll();
    const list = this.dataBasesService.findOptionsActiveState(all);
    const items = list.map((item) => ({
      db_id: item.id,
      label_name: shortLabelForBases(item.bases, item.detail),
    }));
    return dataMany(items);
  }

  @Get('listar')
  @ApiOperation({ summary: 'Listar con filtros opcionales' })
  @ApiQuery({ name: 'start_date', required: false, type: String, description: 'Fecha creación desde (YYYY-MM-DD).' })
  @ApiQuery({ name: 'end_date', required: false, type: String, description: 'Fecha creación hasta (YYYY-MM-DD).' })
  @ApiQuery({ name: 'db_environment_type_id', required: false, type: Number, description: 'Filtrar por env_id' })
  @ApiQuery({ name: 'db_portfolio_type_id', required: false, type: Number, description: 'Filtrar por porty_id' })
  @ApiQuery({ name: 'db_bases', required: false, type: String, description: 'Subcadena en JSON serializado de db_bases' })
  @ApiQuery({ name: 'db_state_type_id', required: false, type: Number, description: 'Filtrar por stty_id' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Página (>=1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Tamaño de página (>=1)' })
  async findAll(
    @Query('start_date') start_date?: string,
    @Query('end_date') end_date?: string,
    @Query('db_environment_type_id') db_environment_type_id?: number,
    @Query('db_portfolio_type_id') db_portfolio_type_id?: number,
    @Query('db_bases') db_bases?: string,
    @Query('db_state_type_id') db_state_type_id?: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const normalizeId = (value: unknown): number | undefined => {
      if (value === undefined || value === null || (value as any) === '') return undefined;
      const n = typeof value === 'number' ? value : Number(value as any);
      if (!Number.isFinite(n) || n <= 0) return undefined;
      return Math.floor(n);
    };

    const envF = normalizeId(db_environment_type_id);
    const portF = normalizeId(db_portfolio_type_id);
    const stateF = normalizeId(db_state_type_id);
    const basesQ = (db_bases ?? '').trim().toLowerCase();

    const all = await this.dataBasesService.findAll();

    const { start, end } = getListQueryDateRange(start_date, end_date);

    const byDate = all.filter((item) => {
      const created = item.created_at ? new Date(item.created_at) : undefined;
      if (!created || Number.isNaN(created.getTime())) return true;
      if (start && created < start) return false;
      if (end && created > end) return false;
      return true;
    });

    const filtered = byDate.filter((item) => {
      if (envF !== undefined && Number(item.environment_type_id) !== envF) return false;
      if (portF !== undefined && Number(item.portfolio_type_id) !== portF) return false;
      if (stateF !== undefined && Number(item.state_type_id) !== stateF) return false;
      if (basesQ) {
        const hay = jsonStringifyLower(item.bases);
        if (!hay.includes(basesQ)) return false;
      }
      return true;
    });

    const asApi = filtered.map((row) => toDataBasesApi(row));
    return paginateArray(asApi, page, limit);
  }

  @Get('filtrar/:id')
  @ApiOperation({ summary: 'Obtener un registro por db_id' })
  async findById(@Param('id') id: string) {
    const numId = Number(id);
    if (!Number.isInteger(numId) || numId <= 0) {
      throw new BadRequestException(userMsg.idUrlEntero);
    }
    const item = await this.dataBasesService.findById(numId);
    return dataOne(toDataBasesApi(item));
  }

  @Put('actualizar/:id')
  @ApiOperation({ summary: 'Actualizar por db_id' })
  @ApiBody({
    description: 'El JSON de abajo sirve de guía.',
    schema: { allOf: [{ $ref: getSchemaPath(UpdateDataBasesDto) }], example: updateExampleSchema },
  })
  async update(@Param('id') id: string, @Body() body: UpdateDataBasesDto) {
    const numId = Number(id);
    if (!Number.isInteger(numId) || numId <= 0) {
      throw new BadRequestException(userMsg.idUrlEntero);
    }
    await this.dataBasesService.update(fromUpdateDataBasesDto(body, numId));
    return { data: null, message: 'Registro actualizado correctamente' };
  }

  @Delete('eliminar/:id')
  @ApiOperation({ summary: 'Eliminar por db_id' })
  async delete(@Param('id') id: string) {
    const numId = Number(id);
    if (!Number.isInteger(numId) || numId <= 0) {
      throw new BadRequestException(userMsg.idUrlEntero);
    }
    await this.dataBasesService.delete(numId);
    return { data: null, message: 'Registro eliminado correctamente' };
  }
}

function jsonStringifyLower(bases: DataBases['bases']): string {
  try {
    return JSON.stringify(bases).toLowerCase();
  } catch {
    return '';
  }
}
