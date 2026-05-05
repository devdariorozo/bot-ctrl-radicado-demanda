// Responsabilidad: controller HTTP para automationEmail.

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
import { AutomationEmailService } from '@application/services/automationEmail.service';
import { AutomationEmail } from '@domain/entities/automationEmail.entities';
import {
  CreateAutomationEmailDto,
  UpdateAutomationEmailDto,
} from '../dto/automationEmail.dto';
import { CreateAutomationEmailInput } from '@domain/ports/automationEmail.ports';
import { userMsg } from '@application/utils/apiUserMessages.utils';
import { getListQueryDateRange } from '@application/utils/listQueryDateRange.utils';
import { paginateArray } from '@application/utils/pagination.utils';
import { dataMany, dataOne } from '@application/utils/response.utils';

const createExampleSchema = {
  autm_message_id: '<202604281151.1633827@deaj.ramajudicial.gov.co>',
  autm_from_email: 'demandaenlinea1@deaj.ramajudicial.gov.co',
  autm_to_email: 'DEMANDAS@CONTACTOSOLUTIONS.COM; repartojcmpalsoledad@cendoj.ramajudicial.gov.co',
  autm_date_received: 'martes, 7 de abril de 2026 11:51 a. m.',
  autm_subject: 'Generación de la Demanda en línea No 1633827',
  autm_departament: 'ATLANTICO',
  autm_city: 'SOLEDAD',
  autm_locality: 'SIN LOCALIDAD',
  autm_specialty: 'CIVIL MUNICIPAL DE PEQUEÑAS CAUSAS Y COMPETENCIA MÚLTIPLE – MÍNIMA CUANTÍA',
  autm_process_class: '41-03-08 EJECUTIVO DE MÍNIMA CUANTÍA',
  autm_subject_demanding: 'DEMANDANTE O SOLICITANTE',
  autm_artificial_person: 'CONTACTO SOLUTIONS SAS',
  autm_document_type_1: 'NIT',
  autm_document_number_1: '9000975439',
  autm_email_1: 'DEMANDAS@CONTACTOSOLUTIONS.COM',
  autm_address_1: 'CARRERA 43 NO. 17 - 47',
  autm_phone_number_1: '3132811157',
  autm_subject_defendant: 'DEMANDADO',
  autm_natural_person: 'EDWIN ALEXANDER AVENDAÑO JAIMES',
  autm_document_type_2: 'CC',
  autm_document_number_2: '72261493',
  autm_email_2: null,
  autm_address_2: null,
  autm_phone_number_2: null,
  autm_number_filed: null,
  autm_automation_status: 'Correo recibido',
  autm_detail: 'Solicitud recibida con número de confirmación 1633827.',
  autm_status_type_id: 1,
  autm_responsible: 'BOT ctrl radicado demanda',
};

const updateExampleSchema = {
  autm_message_id: '<202604281151.1633827@deaj.ramajudicial.gov.co>',
  autm_from_email: 'demandaenlinea1@deaj.ramajudicial.gov.co',
  autm_to_email: 'DEMANDAS@CONTACTOSOLUTIONS.COM; repartojcmpalsoledad@cendoj.ramajudicial.gov.co',
  autm_date_received: 'martes, 7 de abril de 2026 11:51 a. m.',
  autm_subject: 'Generación de la Demanda en línea No 1633827',
  autm_departament: 'ATLANTICO',
  autm_city: 'SOLEDAD',
  autm_locality: 'SIN LOCALIDAD',
  autm_specialty: 'CIVIL MUNICIPAL DE PEQUEÑAS CAUSAS Y COMPETENCIA MÚLTIPLE – MÍNIMA CUANTÍA',
  autm_process_class: '41-03-08 EJECUTIVO DE MÍNIMA CUANTÍA',
  autm_subject_demanding: 'DEMANDANTE O SOLICITANTE',
  autm_artificial_person: 'CONTACTO SOLUTIONS SAS',
  autm_document_type_1: 'NIT',
  autm_document_number_1: '9000975439',
  autm_email_1: 'DEMANDAS@CONTACTOSOLUTIONS.COM',
  autm_address_1: 'CARRERA 43 NO. 17 - 47',
  autm_phone_number_1: '3132811157',
  autm_subject_defendant: 'DEMANDADO',
  autm_natural_person: 'EDWIN ALEXANDER AVENDAÑO JAIMES',
  autm_document_type_2: 'CC',
  autm_document_number_2: '72261493',
  autm_email_2: null,
  autm_address_2: null,
  autm_phone_number_2: null,
  autm_number_filed: null,
  autm_automation_status: 'Correo procesado',
  autm_detail: 'Actualización manual del estado luego de procesar adjuntos.',
  autm_status_type_id: 1,
  autm_responsible: 'BOT ctrl radicado demanda',
};

@ApiTags('automationEmail')
@ApiExtraModels(CreateAutomationEmailDto, UpdateAutomationEmailDto)
@Controller('automationEmail')
export class AutomationEmailController {
  constructor(private readonly service: AutomationEmailService) {}

  @Post('crear')
  @ApiOperation({ summary: 'Crear un nuevo registro de correo automatizado' })
  @ApiBody({
    description: 'El JSON de abajo sirve de guía.',
    schema: {
      allOf: [{ $ref: getSchemaPath(CreateAutomationEmailDto) }],
      example: createExampleSchema,
    },
  })
  async create(@Body() dto: CreateAutomationEmailDto) {
    const input: CreateAutomationEmailInput = {
      autm_message_id: dto.autm_message_id,
      autm_from_email: dto.autm_from_email,
      autm_to_email: dto.autm_to_email,
      autm_date_received: dto.autm_date_received,
      autm_subject: dto.autm_subject,
      autm_departament: dto.autm_departament ?? null,
      autm_city: dto.autm_city ?? null,
      autm_locality: dto.autm_locality ?? null,
      autm_specialty: dto.autm_specialty ?? null,
      autm_process_class: dto.autm_process_class ?? null,
      autm_subject_demanding: dto.autm_subject_demanding ?? null,
      autm_artificial_person: dto.autm_artificial_person ?? null,
      autm_document_type_1: dto.autm_document_type_1 ?? null,
      autm_document_number_1: dto.autm_document_number_1 ?? null,
      autm_email_1: dto.autm_email_1 ?? null,
      autm_address_1: dto.autm_address_1 ?? null,
      autm_phone_number_1: dto.autm_phone_number_1 ?? null,
      autm_subject_defendant: dto.autm_subject_defendant ?? null,
      autm_natural_person: dto.autm_natural_person ?? null,
      autm_document_type_2: dto.autm_document_type_2 ?? null,
      autm_document_number_2: dto.autm_document_number_2 ?? null,
      autm_email_2: dto.autm_email_2 ?? null,
      autm_address_2: dto.autm_address_2 ?? null,
      autm_phone_number_2: dto.autm_phone_number_2 ?? null,
      autm_number_filed: dto.autm_number_filed ?? null,
      autm_automation_status: dto.autm_automation_status,
      autm_detail: dto.autm_detail ?? null,
      autm_status_type_id: dto.autm_status_type_id,
      autm_responsible: dto.autm_responsible,
    };
    const created = await this.service.create(input);
    return { data: [this.toRow(created)], message: 'Registro creado correctamente' };
  }

  @Get('opciones')
  @ApiOperation({ summary: 'Obtener opciones de estado de automatización para selects (autm_automation_status, label_name)' })
  async opciones() {
    const items = await this.service.findOpciones();
    return dataMany(items.map((i) => ({ autm_automation_status: i.autm_automation_status, label_name: i.autm_automation_status })));
  }

  @Get('opcionesActivas')
  @ApiOperation({ summary: 'Obtener opciones activas de estado de automatización para selects (autm_automation_status, label_name), filtra por estado activo' })
  async opcionesActivas() {
    const items = await this.service.findOpcionesActivas();
    return dataMany(items.map((i) => ({ autm_automation_status: i.autm_automation_status, label_name: i.autm_automation_status })));
  }

  @Get('listar')
  @ApiOperation({ summary: 'Listar registros de correos automatizados con filtros opcionales' })
  @ApiQuery({ name: 'start_date', required: false, type: String, description: 'Fecha inicial de creación (YYYY-MM-DD).' })
  @ApiQuery({ name: 'end_date', required: false, type: String, description: 'Fecha final de creación (YYYY-MM-DD).' })
  @ApiQuery({ name: 'autm_date_received', required: false, type: String, description: 'Filtrar por fecha/hora de recepción (búsqueda parcial).' })
  @ApiQuery({ name: 'autm_from_email', required: false, type: String, description: 'Filtrar por correo del remitente (búsqueda parcial).' })
  @ApiQuery({ name: 'autm_to_email', required: false, type: String, description: 'Filtrar por correo del destinatario (búsqueda parcial).' })
  @ApiQuery({ name: 'autm_departament', required: false, type: String, description: 'Filtrar por departamento (exacto).' })
  @ApiQuery({ name: 'autm_city', required: false, type: String, description: 'Filtrar por ciudad (exacto).' })
  @ApiQuery({ name: 'autm_locality', required: false, type: String, description: 'Filtrar por localidad (búsqueda parcial).' })
  @ApiQuery({ name: 'autm_specialty', required: false, type: String, description: 'Filtrar por especialidad (búsqueda parcial).' })
  @ApiQuery({ name: 'autm_process_class', required: false, type: String, description: 'Filtrar por clase de proceso (búsqueda parcial).' })
  @ApiQuery({ name: 'autm_subject_demanding', required: false, type: String, description: 'Filtrar por sujeto demandante (búsqueda parcial).' })
  @ApiQuery({ name: 'autm_artificial_person', required: false, type: String, description: 'Filtrar por persona jurídica (búsqueda parcial).' })
  @ApiQuery({ name: 'autm_document_number_1', required: false, type: String, description: 'Filtrar por número de documento (demandante, exacto).' })
  @ApiQuery({ name: 'autm_email_1', required: false, type: String, description: 'Filtrar por correo electrónico (demandante, exacto).' })
  @ApiQuery({ name: 'autm_address_1', required: false, type: String, description: 'Filtrar por dirección (demandante, búsqueda parcial).' })
  @ApiQuery({ name: 'autm_phone_number_1', required: false, type: String, description: 'Filtrar por teléfono (demandante, exacto).' })
  @ApiQuery({ name: 'autm_natural_person', required: false, type: String, description: 'Filtrar por persona natural (demandado, búsqueda parcial).' })
  @ApiQuery({ name: 'autm_document_number_2', required: false, type: String, description: 'Filtrar por número de documento (demandado).' })
  @ApiQuery({ name: 'autm_email_2', required: false, type: String, description: 'Filtrar por correo electrónico (demandado, búsqueda parcial).' })
  @ApiQuery({ name: 'autm_address_2', required: false, type: String, description: 'Filtrar por dirección (demandado, búsqueda parcial).' })
  @ApiQuery({ name: 'autm_phone_number_2', required: false, type: String, description: 'Filtrar por teléfono (demandado).' })
  @ApiQuery({ name: 'autm_number_filed', required: false, type: String, description: 'Filtrar por número de radicado exacto.' })
  @ApiQuery({ name: 'autm_automation_status', required: false, type: String, description: 'Filtrar por estado de automatización.' })
  @ApiQuery({ name: 'autm_status_type_id', required: false, type: Number, description: 'Filtrar por tipo de estado.' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Número de página (>=1).' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Registros por página (>=1).' })
  async findAll(
    @Query('start_date') start_date?: string,
    @Query('end_date') end_date?: string,
    @Query('autm_date_received') autm_date_received?: string,
    @Query('autm_from_email') autm_from_email?: string,
    @Query('autm_to_email') autm_to_email?: string,
    @Query('autm_departament') autm_departament?: string,
    @Query('autm_city') autm_city?: string,
    @Query('autm_locality') autm_locality?: string,
    @Query('autm_specialty') autm_specialty?: string,
    @Query('autm_process_class') autm_process_class?: string,
    @Query('autm_subject_demanding') autm_subject_demanding?: string,
    @Query('autm_artificial_person') autm_artificial_person?: string,
    @Query('autm_document_number_1') autm_document_number_1?: string,
    @Query('autm_email_1') autm_email_1?: string,
    @Query('autm_address_1') autm_address_1?: string,
    @Query('autm_phone_number_1') autm_phone_number_1?: string,
    @Query('autm_natural_person') autm_natural_person?: string,
    @Query('autm_document_number_2') autm_document_number_2?: string,
    @Query('autm_email_2') autm_email_2?: string,
    @Query('autm_address_2') autm_address_2?: string,
    @Query('autm_phone_number_2') autm_phone_number_2?: string,
    @Query('autm_number_filed') autm_number_filed?: string,
    @Query('autm_automation_status') autm_automation_status?: string,
    @Query('autm_status_type_id') autm_status_type_id?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const { start, end } = getListQueryDateRange(start_date, end_date);

    const items = await this.service.findAll({
      start_date: start,
      end_date: end,
      autm_date_received: autm_date_received?.trim() || undefined,
      autm_from_email: autm_from_email?.trim() || undefined,
      autm_to_email: autm_to_email?.trim() || undefined,
      autm_departament: autm_departament?.trim() || undefined,
      autm_city: autm_city?.trim() || undefined,
      autm_locality: autm_locality?.trim() || undefined,
      autm_specialty: autm_specialty?.trim() || undefined,
      autm_process_class: autm_process_class?.trim() || undefined,
      autm_subject_demanding: autm_subject_demanding?.trim() || undefined,
      autm_artificial_person: autm_artificial_person?.trim() || undefined,
      autm_document_number_1: autm_document_number_1?.trim() || undefined,
      autm_email_1: autm_email_1?.trim() || undefined,
      autm_address_1: autm_address_1?.trim() || undefined,
      autm_phone_number_1: autm_phone_number_1?.trim() || undefined,
      autm_natural_person: autm_natural_person?.trim() || undefined,
      autm_document_number_2: autm_document_number_2?.trim() || undefined,
      autm_email_2: autm_email_2?.trim() || undefined,
      autm_address_2: autm_address_2?.trim() || undefined,
      autm_phone_number_2: autm_phone_number_2?.trim() || undefined,
      autm_number_filed: autm_number_filed?.trim() || undefined,
      autm_automation_status: autm_automation_status?.trim() || undefined,
      autm_status_type_id: parseOptionalId(autm_status_type_id),
    });

    return paginateArray(items.map((item) => this.toRow(item)), page, limit);
  }

  @Get('filtrar/:id')
  @ApiOperation({ summary: 'Obtener un registro de correo automatizado por su autm_id' })
  async findById(@Param('id') id: string) {
    const numId = Number(id);
    if (!Number.isInteger(numId) || numId <= 0) {
      throw new BadRequestException(userMsg.idUrlEntero);
    }
    const item = await this.service.findById(numId);
    return dataOne(this.toRow(item));
  }

  @Put('actualizar/:id')
  @ApiOperation({ summary: 'Actualizar un registro de correo automatizado por su autm_id' })
  @ApiBody({
    description: 'El JSON de abajo sirve de guía.',
    schema: {
      allOf: [{ $ref: getSchemaPath(UpdateAutomationEmailDto) }],
      example: updateExampleSchema,
    },
  })
  async update(@Param('id') id: string, @Body() body: UpdateAutomationEmailDto) {
    const numId = Number(id);
    if (!Number.isInteger(numId) || numId <= 0) {
      throw new BadRequestException(userMsg.idUrlEntero);
    }

    const toUpdate: AutomationEmail = {
      autm_id: numId,
      autm_message_id: body.autm_message_id,
      autm_from_email: body.autm_from_email,
      autm_to_email: body.autm_to_email,
      autm_date_received: body.autm_date_received,
      autm_subject: body.autm_subject,
      autm_departament: body.autm_departament ?? null,
      autm_city: body.autm_city ?? null,
      autm_locality: body.autm_locality ?? null,
      autm_specialty: body.autm_specialty ?? null,
      autm_process_class: body.autm_process_class ?? null,
      autm_subject_demanding: body.autm_subject_demanding ?? null,
      autm_artificial_person: body.autm_artificial_person ?? null,
      autm_document_type_1: body.autm_document_type_1 ?? null,
      autm_document_number_1: body.autm_document_number_1 ?? null,
      autm_email_1: body.autm_email_1 ?? null,
      autm_address_1: body.autm_address_1 ?? null,
      autm_phone_number_1: body.autm_phone_number_1 ?? null,
      autm_subject_defendant: body.autm_subject_defendant ?? null,
      autm_natural_person: body.autm_natural_person ?? null,
      autm_document_type_2: body.autm_document_type_2 ?? null,
      autm_document_number_2: body.autm_document_number_2 ?? null,
      autm_email_2: body.autm_email_2 ?? null,
      autm_address_2: body.autm_address_2 ?? null,
      autm_phone_number_2: body.autm_phone_number_2 ?? null,
      autm_number_filed: body.autm_number_filed ?? null,
      autm_automation_status: body.autm_automation_status,
      autm_detail: body.autm_detail ?? null,
      autm_status_type_id: body.autm_status_type_id,
      autm_responsible: body.autm_responsible,
      autm_created_at: new Date(),
      autm_updated_at: new Date(),
    };

    await this.service.update(toUpdate);
    return { data: null, message: 'Registro actualizado correctamente' };
  }

  @Delete('eliminar/:id')
  @ApiOperation({ summary: 'Eliminar un registro de correo automatizado por su autm_id' })
  async delete(@Param('id') id: string) {
    const numId = Number(id);
    if (!Number.isInteger(numId) || numId <= 0) {
      throw new BadRequestException(userMsg.idUrlEntero);
    }
    await this.service.delete(numId);
    return { data: null, message: 'Registro eliminado correctamente' };
  }

  private toRow(item: AutomationEmail): Record<string, unknown> {
    const o: Record<string, unknown> = {
      autm_id: item.autm_id,
      autm_message_id: item.autm_message_id,
      autm_from_email: item.autm_from_email,
      autm_to_email: item.autm_to_email,
      autm_date_received: item.autm_date_received,
      autm_subject: item.autm_subject,
      autm_departament: item.autm_departament,
      autm_city: item.autm_city,
      autm_locality: item.autm_locality,
      autm_specialty: item.autm_specialty,
      autm_process_class: item.autm_process_class,
      autm_subject_demanding: item.autm_subject_demanding,
      autm_artificial_person: item.autm_artificial_person,
      autm_document_type_1: item.autm_document_type_1,
      autm_document_number_1: item.autm_document_number_1,
      autm_email_1: item.autm_email_1,
      autm_address_1: item.autm_address_1,
      autm_phone_number_1: item.autm_phone_number_1,
      autm_subject_defendant: item.autm_subject_defendant,
      autm_natural_person: item.autm_natural_person,
      autm_document_type_2: item.autm_document_type_2,
      autm_document_number_2: item.autm_document_number_2,
      autm_email_2: item.autm_email_2,
      autm_address_2: item.autm_address_2,
      autm_phone_number_2: item.autm_phone_number_2,
      autm_number_filed: item.autm_number_filed,
      autm_automation_status: item.autm_automation_status,
      autm_detail: item.autm_detail,
      autm_status_type_id: item.autm_status_type_id,
    };
    if (item.state_type_name != null && String(item.state_type_name).length > 0) {
      o.state_type_name = item.state_type_name;
    }
    o.autm_created_at = item.autm_created_at;
    o.autm_updated_at = item.autm_updated_at;
    o.autm_responsible = item.autm_responsible;
    return o;
  }
}

function parseOptionalId(value: unknown): number | undefined {
  if (value === undefined || value === null || (value as string) === '') return undefined;
  const n = typeof value === 'number' ? value : Number(value as string);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return Math.floor(n);
}
