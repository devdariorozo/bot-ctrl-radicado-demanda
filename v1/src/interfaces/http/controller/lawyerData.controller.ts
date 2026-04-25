// Responsabilidad: controller HTTP para lawyer_data.

import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiQuery, ApiTags, getSchemaPath } from '@nestjs/swagger';
import { LawyerDataDto, UpdateLawyerDataDto } from '../dto/lawyerData.dto';
import { LawyerDataService } from '@application/services/lawyerData.service';
import { LawyerData } from '@domain/entities/lawyerData.entities';
import { CreateLawyerDataInput } from '@domain/ports/lawyerData.ports';
import { getListQueryDateRange } from '@application/utils/listQueryDateRange.utils';
import { PaginatedResult, paginateArray } from '@application/utils/pagination.utils';
import { dataEmpty, dataMany, dataOne } from '@application/utils/response.utils';

const createExampleSchema = {
  portfolio_type_id: 1,
  document_type: 'C.C',
  document_name: 'CÉDULA DE CIUDADANÍA',
  document_number: '1.022.371.176',
  first_name: 'ADRIANA',
  second_name: 'PAOLA',
  first_last_name: 'HERNANDEZ',
  second_last_name: 'ACEVEDO',
  address: 'CARRERA 41 NO. 17 - 15',
  contact_number: '313 281 1157',
  email_notifications: 'DEMANDAS@CONTACTOSOLUTIONS.COM',
  detail: 'Se crea registro con exito.',
  state_type_id: 1,
};

const updateExampleSchema = {
  ...createExampleSchema,
  detail: 'Se actualiza registro con exito.',
};

@ApiTags('lawyerData')
@Controller('lawyerData')
export class LawyerDataController {
  constructor(private readonly lawyerDataService: LawyerDataService) {}

  @Post('crear')
  @ApiOperation({ summary: 'Crear un nuevo registro de abogado (lawyer_data)' })
  @ApiBody({
    description: 'El JSON de abajo sirve de guía.',
    schema: { allOf: [{ $ref: getSchemaPath(LawyerDataDto) }], example: createExampleSchema },
  })
  async create(@Body() dto: LawyerDataDto) {
    const created = await this.lawyerDataService.create(dto as CreateLawyerDataInput);
    return dataOne(created);
  }

  @Get('opciones')
  @ApiOperation({ summary: 'Obtener opciones de abogados para selects' })
  async options() {
    const all = await this.lawyerDataService.findAll();
    const items = all.map((item) => ({
      id: item.id,
      label_name: `${item.first_name} ${item.second_name} ${item.first_last_name} ${item.second_last_name}`.trim(),
    }));
    return dataMany(items);
  }

  @Get('listar')
  @ApiOperation({ summary: 'Obtener todos los registros de abogados' })
  @ApiQuery({ name: 'start_date', required: false, type: String, description: 'Fecha inicial de creación (YYYY-MM-DD).' })
  @ApiQuery({ name: 'end_date', required: false, type: String, description: 'Fecha final de creación (YYYY-MM-DD).' })
  @ApiQuery({ name: 'document_number', required: false, type: String, description: 'Filtrar por número de documento (opcional)' })
  @ApiQuery({ name: 'state_type_id', required: false, type: Number, description: 'Filtrar por state_type_id (opcional)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Número de página (>=1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Registros por página (>=1)' })
  async findAll(
    @Query('start_date') start_date?: string,
    @Query('end_date') end_date?: string,
    @Query('document_number') document_number?: string,
    @Query('state_type_id') state_type_id?: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<PaginatedResult<LawyerDataDto>> {
    const all = await this.lawyerDataService.findAll();

    const { start, end } = getListQueryDateRange(start_date, end_date);
    const normalizedDoc = document_number?.trim() || '';

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
              const n = typeof state_type_id === 'number' ? state_type_id : Number(state_type_id as any);
              if (!Number.isFinite(n) || n <= 0) return undefined;
              return Math.floor(n);
            })();

      if (normalizedDoc && item.document_number !== normalizedDoc) return false;
      if (normalizedStateId !== undefined && Number(item.state_type_id) !== normalizedStateId) return false;
      return true;
    });

    return paginateArray(filtered, page, limit);
  }

  @Get('filtrar/:id')
  @ApiOperation({ summary: 'Obtener un registro de abogado por su id' })
  async findById(@Param('id') id: number) {
    const item = await this.lawyerDataService.findById(id);
    return dataOne(item);
  }

  @Put('actualizar/:id')
  @ApiOperation({ summary: 'Actualizar un registro de abogado' })
  @ApiBody({
    description: 'El JSON de abajo sirve de guía.',
    schema: { allOf: [{ $ref: getSchemaPath(UpdateLawyerDataDto) }], example: updateExampleSchema },
  })
  async update(@Param('id') id: number, @Body() body: UpdateLawyerDataDto) {
    const updated = await this.lawyerDataService.update({ ...body, id: Number(id) } as LawyerData);
    return dataOne(updated);
  }

  @Delete('eliminar/:id')
  @ApiOperation({ summary: 'Eliminar un registro de abogado' })
  async delete(@Param('id') id: number) {
    await this.lawyerDataService.delete(id);
    return dataEmpty();
  }
}

