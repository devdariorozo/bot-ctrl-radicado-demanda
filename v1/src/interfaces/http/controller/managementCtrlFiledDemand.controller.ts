// Responsabilidad: controller HTTP para managementCtrlFiledDemand.

import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBody,
  ApiExtraModels,
  ApiOperation,
  ApiQuery,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { ManagementCtrlFiledDemandService } from '@application/services/managementCtrlFiledDemand.service';
import { ManagementCtrlFiledDemand } from '@domain/entities/managementCtrlFiledDemand.entities';
import {
  CreateManagementCtrlFiledDemandDto,
  UpdateManagementCtrlFiledDemandDto,
} from '../dto/managementCtrlFiledDemand.dto';
import { CreateManagementCtrlFiledDemandInput } from '@domain/ports/managementCtrlFiledDemand.ports';
import { userMsg } from '@application/utils/apiUserMessages.utils';
import { getListQueryDateRange } from '@application/utils/listQueryDateRange.utils';
import { paginateArray } from '@application/utils/pagination.utils';
import { dataMany, dataOne } from '@application/utils/response.utils';

const createExampleSchema = {
  mcfd_portfolio_type_id: 1,
  mcfd_name_data_base: 'dbd_demandas_online',
  mcfd_lawsuit_id: 1001,
  mcfd_lawsuits_filings_id: 2001,
  mcfd_client_id: 3001,
  mcfd_data_courts: 10,
  mcfd_filing_date: '2026-01-15',
  mcfd_number_filed: '11001400300120260001200',
  mcfd_management_status: 'Abierto',
  mcfd_detail: 'Demanda pendiente por gestionar radicado',
  mcfd_state_type_id: 1,
  mcfd_responsible: 'BOT ctrl radicado demanda',
};

const updateExampleSchema = {
  mcfd_portfolio_type_id: 1,
  mcfd_name_data_base: 'dbd_demandas_online',
  mcfd_lawsuit_id: 1001,
  mcfd_lawsuits_filings_id: 2001,
  mcfd_client_id: 3001,
  mcfd_data_courts: 10,
  mcfd_automation_email_id: 5001,
  mcfd_last_execution: '2026-04-28T10:30:00.000Z',
  mcfd_retries: 1,
  mcfd_filing_date: '2026-01-15',
  mcfd_filing_date_action: '2026-04-01',
  mcfd_number_filed: '11001400300120260001200',
  mcfd_management_status: 'En proceso',
  mcfd_detail: 'Demanda en proceso de automatización.',
  mcfd_state_type_id: 1,
  mcfd_responsible: 'BOT ctrl radicado demanda',
};

@ApiTags('managementCtrlFiledDemand')
@ApiExtraModels(CreateManagementCtrlFiledDemandDto, UpdateManagementCtrlFiledDemandDto)
@Controller('managementCtrlFiledDemand')
export class ManagementCtrlFiledDemandController {
  constructor(private readonly service: ManagementCtrlFiledDemandService) {}

  @Post('crear')
  @ApiOperation({ summary: 'Crear un nuevo registro de gestión de radicado demanda' })
  @ApiBody({
    description: 'El JSON de abajo sirve de guía.',
    schema: {
      allOf: [{ $ref: getSchemaPath(CreateManagementCtrlFiledDemandDto) }],
      example: createExampleSchema,
    },
  })
  async create(@Body() dto: CreateManagementCtrlFiledDemandDto) {
    const input: CreateManagementCtrlFiledDemandInput = {
      mcfd_portfolio_type_id: dto.mcfd_portfolio_type_id,
      mcfd_name_data_base: dto.mcfd_name_data_base,
      mcfd_lawsuit_id: dto.mcfd_lawsuit_id,
      mcfd_lawsuits_filings_id: dto.mcfd_lawsuits_filings_id,
      mcfd_client_id: dto.mcfd_client_id,
      mcfd_data_courts: dto.mcfd_data_courts ?? null,
      mcfd_filing_date: dto.mcfd_filing_date ? new Date(dto.mcfd_filing_date) : null,
      mcfd_number_filed: dto.mcfd_number_filed ?? null,
      mcfd_management_status: dto.mcfd_management_status,
      mcfd_detail: 'Demanda pendiente por gestionar radicado',
      mcfd_state_type_id: dto.mcfd_state_type_id,
      mcfd_responsible: dto.mcfd_responsible,
    };
    const created = await this.service.create(input);
    return { data: [this.toRow(created)], message: 'Registro creado correctamente' };
  }

  @Get('opciones')
  @ApiOperation({ summary: 'Obtener opciones de estado de gestión para selects (mcfd_management_status, label_name)' })
  async opciones() {
    const items = await this.service.findOpciones();
    return dataMany(items.map((i) => ({ mcfd_management_status: i.mcfd_management_status, label_name: i.mcfd_management_status })));
  }

  @Get('opcionesActivas')
  @ApiOperation({ summary: 'Obtener opciones activas de estado de gestión para selects (mcfd_management_status, label_name), filtra por estado activo' })
  async opcionesActivas() {
    const items = await this.service.findOpcionesActivas();
    return dataMany(items.map((i) => ({ mcfd_management_status: i.mcfd_management_status, label_name: i.mcfd_management_status })));
  }

  @Get('listar')
  @ApiOperation({ summary: 'Listar registros de gestión de radicado demanda con filtros opcionales' })
  @ApiQuery({ name: 'start_date', required: false, type: String, description: 'Fecha inicial de creación (YYYY-MM-DD).' })
  @ApiQuery({ name: 'end_date', required: false, type: String, description: 'Fecha final de creación (YYYY-MM-DD).' })
  @ApiQuery({ name: 'mcfd_portfolio_type_id', required: false, type: Number, description: 'Filtrar por tipo de cartera.' })
  @ApiQuery({ name: 'mcfd_name_data_base', required: false, type: String, description: 'Filtrar por nombre de base de datos.' })
  @ApiQuery({ name: 'mcfd_lawsuit_id', required: false, type: Number, description: 'Filtrar por ID de demanda.' })
  @ApiQuery({ name: 'mcfd_lawsuits_filings_id', required: false, type: Number, description: 'Filtrar por ID de radicado.' })
  @ApiQuery({ name: 'mcfd_client_id', required: false, type: Number, description: 'Filtrar por ID del cliente.' })
  @ApiQuery({ name: 'mcfd_automation_email_id', required: false, type: Number, description: 'Filtrar por ID de correo de automatización.' })
  @ApiQuery({ name: 'mcfd_number_filed', required: false, type: String, description: 'Filtrar por número de radicado exacto.' })
  @ApiQuery({ name: 'mcfd_management_status', required: false, type: String, description: 'Filtrar por estado del proceso.' })
  @ApiQuery({ name: 'mcfd_state_type_id', required: false, type: Number, description: 'Filtrar por tipo de estado.' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Número de página (>=1).' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Registros por página (>=1).' })
  async findAll(
    @Query('start_date') start_date?: string,
    @Query('end_date') end_date?: string,
    @Query('mcfd_portfolio_type_id') mcfd_portfolio_type_id?: string,
    @Query('mcfd_name_data_base') mcfd_name_data_base?: string,
    @Query('mcfd_lawsuit_id') mcfd_lawsuit_id?: string,
    @Query('mcfd_lawsuits_filings_id') mcfd_lawsuits_filings_id?: string,
    @Query('mcfd_client_id') mcfd_client_id?: string,
    @Query('mcfd_automation_email_id') mcfd_automation_email_id?: string,
    @Query('mcfd_number_filed') mcfd_number_filed?: string,
    @Query('mcfd_management_status') mcfd_management_status?: string,
    @Query('mcfd_state_type_id') mcfd_state_type_id?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const { start, end } = getListQueryDateRange(start_date, end_date);

    const items = await this.service.findAll({
      start_date: start,
      end_date: end,
      mcfd_portfolio_type_id: parseOptionalId(mcfd_portfolio_type_id),
      mcfd_name_data_base: mcfd_name_data_base?.trim() || undefined,
      mcfd_lawsuit_id: parseOptionalId(mcfd_lawsuit_id),
      mcfd_lawsuits_filings_id: parseOptionalId(mcfd_lawsuits_filings_id),
      mcfd_client_id: parseOptionalId(mcfd_client_id),
      mcfd_automation_email_id: parseOptionalId(mcfd_automation_email_id),
      mcfd_number_filed: mcfd_number_filed?.trim() || undefined,
      mcfd_management_status: mcfd_management_status?.trim() || undefined,
      mcfd_state_type_id: parseOptionalId(mcfd_state_type_id),
    });

    return paginateArray(items.map((item) => this.toRow(item)), page, limit);
  }

  @Get('filtrar/:id')
  @ApiOperation({ summary: 'Obtener un registro de gestión de radicado demanda por su mcfd_id' })
  async findById(@Param('id') id: string) {
    const numId = Number(id);
    if (!Number.isInteger(numId) || numId <= 0) {
      throw new BadRequestException(userMsg.idUrlEntero);
    }
    const item = await this.service.findById(numId);
    return dataOne(this.toRow(item));
  }

  @Put('actualizar/:id')
  @ApiOperation({ summary: 'Actualizar un registro de gestión de radicado demanda por su mcfd_id' })
  @ApiBody({
    description: 'El JSON de abajo sirve de guía.',
    schema: {
      allOf: [{ $ref: getSchemaPath(UpdateManagementCtrlFiledDemandDto) }],
      example: updateExampleSchema,
    },
  })
  async update(@Param('id') id: string, @Body() body: UpdateManagementCtrlFiledDemandDto) {
    const numId = Number(id);
    if (!Number.isInteger(numId) || numId <= 0) {
      throw new BadRequestException(userMsg.idUrlEntero);
    }

    const toUpdate: ManagementCtrlFiledDemand = {
      mcfd_id: numId,
      mcfd_portfolio_type_id: body.mcfd_portfolio_type_id,
      mcfd_name_data_base: body.mcfd_name_data_base,
      mcfd_lawsuit_id: body.mcfd_lawsuit_id,
      mcfd_lawsuits_filings_id: body.mcfd_lawsuits_filings_id,
      mcfd_client_id: body.mcfd_client_id,
      mcfd_data_courts: body.mcfd_data_courts ?? null,
      mcfd_automation_email_id: body.mcfd_automation_email_id ?? null,
      mcfd_last_execution: body.mcfd_last_execution ? new Date(body.mcfd_last_execution) : null,
      mcfd_retries: body.mcfd_retries ?? 0,
      mcfd_filing_date: body.mcfd_filing_date ? new Date(body.mcfd_filing_date) : null,
      mcfd_filing_date_action: body.mcfd_filing_date_action ? new Date(body.mcfd_filing_date_action) : null,
      mcfd_number_filed: body.mcfd_number_filed ?? null,
      mcfd_management_status: body.mcfd_management_status,
      mcfd_detail: body.mcfd_detail ?? null,
      mcfd_state_type_id: body.mcfd_state_type_id,
      mcfd_responsible: body.mcfd_responsible,
      mcfd_created_at: new Date(),
      mcfd_updated_at: new Date(),
    };

    await this.service.update(toUpdate);
    return { data: null, message: 'Registro actualizado correctamente' };
  }

  @Delete('eliminar/:id')
  @ApiOperation({ summary: 'Eliminar un registro de gestión de radicado demanda por su mcfd_id' })
  async delete(@Param('id') id: string) {
    const numId = Number(id);
    if (!Number.isInteger(numId) || numId <= 0) {
      throw new BadRequestException(userMsg.idUrlEntero);
    }
    await this.service.delete(numId);
    return { data: null, message: 'Registro eliminado correctamente' };
  }

  private toRow(item: ManagementCtrlFiledDemand): Record<string, unknown> {
    const o: Record<string, unknown> = {};
    o.mcfd_id = item.mcfd_id;
    o.mcfd_portfolio_type_id = item.mcfd_portfolio_type_id;
    if (item.portfolio_type_name != null && String(item.portfolio_type_name).length > 0) {
      o.portfolio_type_name = item.portfolio_type_name;
    }
    o.mcfd_name_data_base = item.mcfd_name_data_base;
    o.mcfd_lawsuit_id = item.mcfd_lawsuit_id;
    o.mcfd_lawsuits_filings_id = item.mcfd_lawsuits_filings_id;
    o.mcfd_client_id = item.mcfd_client_id;
    o.mcfd_data_courts = item.mcfd_data_courts;
    o.mcfd_automation_email_id = item.mcfd_automation_email_id;
    o.mcfd_last_execution = item.mcfd_last_execution;
    o.mcfd_retries = item.mcfd_retries;
    o.mcfd_filing_date = this.toDateStr(item.mcfd_filing_date);
    o.mcfd_filing_date_action = this.toDateStr(item.mcfd_filing_date_action);
    o.mcfd_number_filed = item.mcfd_number_filed;
    o.mcfd_management_status = item.mcfd_management_status;
    o.mcfd_detail = item.mcfd_detail;
    o.mcfd_state_type_id = item.mcfd_state_type_id;
    if (item.state_type_name != null && String(item.state_type_name).length > 0) {
      o.state_type_name = item.state_type_name;
    }
    o.mcfd_created_at = item.mcfd_created_at;
    o.mcfd_updated_at = item.mcfd_updated_at;
    o.mcfd_responsible = item.mcfd_responsible;
    return o;
  }

  private toDateStr(date: Date | null | undefined): string | null {
    if (!date) return null;
    if (typeof date === 'string') return (date as string).slice(0, 10);
    return date.toISOString().slice(0, 10);
  }
}

function parseOptionalId(value: unknown): number | undefined {
  if (value === undefined || value === null || (value as string) === '') return undefined;
  const n = typeof value === 'number' ? value : Number(value as string);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return Math.floor(n);
}
