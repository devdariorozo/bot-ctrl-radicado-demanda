// Responsabilidad: endpoints HTTP de Nest para management_demands_online.

import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiQuery, ApiTags, getSchemaPath } from '@nestjs/swagger';

import { ManagementDemandsOnlineService } from '@application/services/managementDemandsOnline.service';
import { ManagementDemandsOnline } from '@domain/entities/managementDemandsOnline.entities';
import { CreateManagementDemandsOnlineInput } from '@domain/ports/managementDemandsOnline.ports';
import {
  ManagementDemandsOnlineDto,
  UpdateManagementDemandsOnlineDto,
} from '../dto/managementDemandsOnline.dto';
import { getListQueryDateRange } from '@application/utils/listQueryDateRange.utils';
import { PaginatedResult, paginateArray } from '@application/utils/pagination.utils';
import { dataEmpty, dataOne } from '@application/utils/response.utils';

const createExampleSchema = {
  portfolio_type_id: 1,
  name_data_base: 'dbd_demands_online',
  portfolio_city_config_id: 1,
  campaign_id: 1,
  lawsuit_id: 1001,
  lawsuit_court_assignments_id: 1,
  client_id: 1,
  path_law_doc: '/docs/ley.pdf',
  lawsuit_status: 'Pendiente',
  amount_type_id: 1,
  user_id: 1,
  user_name: 'BOT ctrl filed demand',
  number_filed: '-',
  management_status: 'Abierta',
  detail: 'Demanda pendiente para ser gestionada por el bot demands online',
  state_type_id: 1,
  responsible: 'BOT ctrl filed demand',
};

const updateExampleSchema = {
  name_data_base: 'dbd_demands_online',
  portfolio_type_id: 1,
  portfolio_city_config_id: 1,
  campaign_id: 1,
  lawsuit_id: 1001,
  lawsuit_court_assignments_id: 1,
  client_id: 1,
  path_law_doc: '/docs/ley.pdf',
  lawsuit_status: 'Pendiente',
  amount_type_id: 1,
  user_id: 1,
  user_name: 'BOT ctrl filed demand',
  number_filed: '-',
  management_status: 'Abierta',
  detail: 'Demanda pendiente para ser gestionada por el bot demands online',
  state_type_id: 1,
  responsible: 'BOT ctrl filed demand',
};

@ApiTags('managementDemandsOnline')
@Controller('managementDemandsOnline')
export class ManagementDemandsOnlineController {
  constructor(private readonly managementDemandsOnlineService: ManagementDemandsOnlineService) {}

  @Post('crear')
  @ApiOperation({ summary: 'Crear un registro de gestión de demandas pendientes' })
  @ApiBody({
    description: 'Cuerpo para crear el registro.',
    schema: { allOf: [{ $ref: getSchemaPath(ManagementDemandsOnlineDto) }], example: createExampleSchema },
  })
  async create(@Body() dto: ManagementDemandsOnlineDto) {
    const created = await this.managementDemandsOnlineService.create(
      dto as CreateManagementDemandsOnlineInput,
    );
    return dataOne(created);
  }

  @Get('listar')
  @ApiOperation({ summary: 'Listar todos los registros de gestión de demandas' })
  @ApiQuery({ name: 'start_date', required: false, type: String, description: 'Fecha inicial (YYYY-MM-DD).' })
  @ApiQuery({ name: 'end_date', required: false, type: String, description: 'Fecha final (YYYY-MM-DD).' })
  @ApiQuery({ name: 'portfolio_type_id', required: false, type: Number, description: 'Filtrar por ID de cartera.' })
  @ApiQuery({ name: 'name_data_base', required: false, type: String, description: 'Filtrar por nombre de base de datos.' })
  @ApiQuery({ name: 'amount_type_id', required: false, type: Number, description: 'Filtrar por ID de tipo de cuantía.' })
  @ApiQuery({ name: 'number_filed', required: false, type: String, description: 'Filtrar por número de radicación.' })
  @ApiQuery({ name: 'management_status', required: false, type: String, description: 'Filtrar por estado de gestión (Abierta, En proceso, Registrada, Novedad).' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Número de página (>=1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Registros por página (>=1)' })
  async findAll(
    @Query('start_date') start_date?: string,
    @Query('end_date') end_date?: string,
    @Query('portfolio_type_id') portfolio_type_id?: string,
    @Query('name_data_base') name_data_base?: string,
    @Query('amount_type_id') amount_type_id?: string,
    @Query('number_filed') number_filed?: string,
    @Query('management_status') management_status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<PaginatedResult<ManagementDemandsOnlineDto>> {
    const { start, end } = getListQueryDateRange(start_date, end_date);
    const all = await this.managementDemandsOnlineService.findAll({
      start_date: start,
      end_date: end,
      portfolio_type_id: portfolio_type_id !== undefined ? Number(portfolio_type_id) : undefined,
      name_data_base: name_data_base || undefined,
      amount_type_id: amount_type_id !== undefined ? Number(amount_type_id) : undefined,
      number_filed: number_filed || undefined,
      management_status: management_status || undefined,
    });

    return paginateArray(all, page, limit);
  }

  @Get('filtrar/:id')
  @ApiOperation({ summary: 'Obtener un registro por id' })
  async findById(@Param('id') id: number) {
    const item = await this.managementDemandsOnlineService.findById(id);
    return dataOne(item);
  }

  @Put('actualizar/:id')
  @ApiOperation({ summary: 'Actualizar un registro por id' })
  @ApiBody({
    description: 'Cuerpo para actualizar. El id va en la URL.',
    schema: {
      allOf: [{ $ref: getSchemaPath(UpdateManagementDemandsOnlineDto) }],
      example: updateExampleSchema,
    },
  })
  async update(@Param('id') id: number, @Body() body: UpdateManagementDemandsOnlineDto) {
    const updated = await this.managementDemandsOnlineService.update({
      ...body,
      id: Number(id),
    } as ManagementDemandsOnline);
    return dataOne(updated);
  }

  @Delete('eliminar/:id')
  @ApiOperation({ summary: 'Eliminar un registro por id' })
  async delete(@Param('id') id: number) {
    await this.managementDemandsOnlineService.delete(id);
    return dataEmpty();
  }
}
