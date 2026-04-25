// Responsabilidad: endpoints HTTP de Nest (controller) para company_type.

import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiQuery, ApiTags, getSchemaPath } from '@nestjs/swagger';
import { CompanyTypeDto, UpdateCompanyTypeDto } from '../dto/companyType.dto';
import { CompanyTypeService } from '@application/services/companyType.service';
import { CompanyType } from '@domain/entities/companyType.entities';
import { CreateCompanyTypeInput } from '@domain/ports/companyType.ports';
import { getListQueryDateRange } from '@application/utils/listQueryDateRange.utils';
import { PaginatedResult, paginateArray } from '@application/utils/pagination.utils';
import { dataEmpty, dataMany, dataOne } from '@application/utils/response.utils';

/** Ejemplo JSON que Swagger muestra por defecto en el body (guía visual para quien use la API). */
const createExampleSchema = {
  portfolio_type_id: 1,
  campaings_format: 1,
  document_type: 'NIT',
  document_name: 'NÚMERO DE IDENTIFICACIÓN TRIBUTARIA',
  document_number: '900.097.543-9',
  company_name: 'CONTACTO SOLUTIONS SAS',
  address: 'CARRERA 41 NO. 17 - 15',
  contact_number: '320 833 3198',
  email_notifications: 'demandas@contactosolutions.com',
  detail: 'Se crea registro con exito.',
  state_type_id: 1,
};

/** Ejemplo JSON para actualizar. El id va solo en la URL (path), no en el body. */
const updateExampleSchema = {
  portfolio_type_id: 1,
  campaings_format: 1,
  document_type: 'NIT',
  document_name: 'NÚMERO DE IDENTIFICACIÓN TRIBUTARIA',
  document_number: '900.097.543-9',
  company_name: 'CONTACTO SOLUTIONS SAS',
  address: 'CARRERA 41 NO. 17 - 15',
  contact_number: '320 833 3198',
  email_notifications: 'demandas@contactosolutions.com',
  detail: 'Se actualiza registro con exito.',
  state_type_id: 1,
};

@ApiTags('companyType')
@Controller('companyType')
export class CompanyTypeController {
  constructor(private readonly companyTypeService: CompanyTypeService) {}

  // Crear un nuevo registro en company_type
  @Post('crear')
  @ApiOperation({ summary: 'Crear un nuevo registro de compañía' })
  @ApiBody({
    description: 'El JSON de abajo sirve de guía.',
    schema: { allOf: [{ $ref: getSchemaPath(CompanyTypeDto) }], example: createExampleSchema },
  })
  async create(@Body() dto: CompanyTypeDto) {
    const created = await this.companyTypeService.create(dto as CreateCompanyTypeInput);
    return dataOne(created);
  }

  // Listado simple para selects (id + label_name)
  @Get('opciones')
  @ApiOperation({ summary: 'Obtener opciones de companyType para selects' })
  async options() {
    const all = await this.companyTypeService.findAll();
    const items = all.map((item) => ({
      id: item.id,
      label_name: item.company_name,
    }));
    return dataMany(items);
  }

  // Obtener todos los registros con filtros básicos y paginación
  @Get('listar')
  @ApiOperation({ summary: 'Obtener todas las compañías (company_type)' })
  @ApiQuery({ name: 'start_date', required: false, type: String, description: 'Fecha inicial de creación (YYYY-MM-DD).' })
  @ApiQuery({ name: 'end_date', required: false, type: String, description: 'Fecha final de creación (YYYY-MM-DD).' })
  @ApiQuery({ name: 'company_name', required: false, type: String, description: 'Filtrar por nombre de compañía (búsqueda parcial, opcional)' })
  @ApiQuery({ name: 'document_number', required: false, type: String, description: 'Filtrar por número de documento (opcional)' })
  @ApiQuery({ name: 'state_type_id', required: false, type: Number, description: 'Filtrar por state_type_id (opcional)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Número de página (>=1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Registros por página (>=1)' })
  async findAll(
    @Query('start_date') start_date?: string,
    @Query('end_date') end_date?: string,
    @Query('company_name') company_name?: string,
    @Query('document_number') document_number?: string,
    @Query('state_type_id') state_type_id?: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<PaginatedResult<CompanyTypeDto>> {
    const all = await this.companyTypeService.findAll();

    const { start, end } = getListQueryDateRange(start_date, end_date);
    const normalizedCompany = company_name?.trim().toLowerCase() || '';
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

      if (normalizedCompany && !item.company_name.toLowerCase().includes(normalizedCompany)) return false;
      if (normalizedDoc && item.document_number !== normalizedDoc) return false;
      if (normalizedStateId !== undefined && Number(item.state_type_id) !== normalizedStateId) return false;
      return true;
    });

    return paginateArray(filtered, page, limit);
  }

  // Obtener un registro por su id
  @Get('filtrar/:id')
  @ApiOperation({ summary: 'Obtener un registro de compañía por su id' })
  async findById(@Param('id') id: number) {
    const item = await this.companyTypeService.findById(id);
    return dataOne(item);
  }

  // Actualizar un registro
  @Put('actualizar/:id')
  @ApiOperation({ summary: 'Actualizar un registro de compañía' })
  @ApiBody({
    description: 'El JSON de abajo sirve de guía.',
    schema: { allOf: [{ $ref: getSchemaPath(UpdateCompanyTypeDto) }], example: updateExampleSchema },
  })
  async update(@Param('id') id: number, @Body() body: UpdateCompanyTypeDto) {
    const updated = await this.companyTypeService.update({ ...body, id: Number(id) } as CompanyType);
    return dataOne(updated);
  }

  // Eliminar un registro
  @Delete('eliminar/:id')
  @ApiOperation({ summary: 'Eliminar un registro de compañía' })
  async delete(@Param('id') id: number) {
    await this.companyTypeService.delete(id);
    return dataEmpty();
  }
}

