// Responsabilidad: DTOs HTTP para automationEmail.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateAutomationEmailDto {
  @ApiProperty({ example: 'remitente@ejemplo.com', description: 'Correo del remitente' })
  @IsString()
  @IsNotEmpty()
  autm_from_email: string;

  @ApiProperty({ example: 'destinatario@empresa.com', description: 'Correo del destinatario' })
  @IsString()
  @IsNotEmpty()
  autm_to_email: string;

  @ApiProperty({
    example: 'martes, 7 de abril de 2026 11:51 a. m.',
    description: 'Fecha/hora de recepción del correo (texto informativo tal como llega en el correo)',
  })
  @IsString()
  @IsNotEmpty()
  autm_date_received: string;

  @ApiProperty({ example: 'Demanda - Juan Pérez - 2026-04-28', description: 'Asunto del correo' })
  @IsString()
  @IsNotEmpty()
  autm_subject: string;

  @ApiPropertyOptional({ example: 'Cundinamarca', description: 'Departamento' })
  @IsOptional()
  @IsString()
  autm_departament?: string;

  @ApiPropertyOptional({ example: 'Bogotá D.C.', description: 'Ciudad' })
  @IsOptional()
  @IsString()
  autm_city?: string;

  @ApiPropertyOptional({ example: 'Usaquén', description: 'Localidad demandado' })
  @IsOptional()
  @IsString()
  autm_locality?: string;

  @ApiPropertyOptional({ example: 'Medicina General', description: 'Especialidad demandada' })
  @IsOptional()
  @IsString()
  autm_specialty?: string;

  @ApiPropertyOptional({ example: 'Ordinario', description: 'Clase de proceso demandado' })
  @IsOptional()
  @IsString()
  autm_process_class?: string;

  @ApiPropertyOptional({ example: 'Persona Natural', description: 'Tipo de sujeto demandante' })
  @IsOptional()
  @IsString()
  autm_subject_demanding?: string;

  @ApiPropertyOptional({ example: 'EPS Salud Total S.A.', description: 'Persona jurídica (demandante)' })
  @IsOptional()
  @IsString()
  autm_artificial_person?: string;

  @ApiPropertyOptional({ example: 'CC', description: 'Tipo de documento (demandante)' })
  @IsOptional()
  @IsString()
  autm_document_type_1?: string;

  @ApiPropertyOptional({ example: '1020304050', description: 'Número de documento (demandante)' })
  @IsOptional()
  @IsString()
  autm_document_number_1?: string;

  @ApiPropertyOptional({ example: 'demandante@correo.com', description: 'Correo electrónico (demandante)' })
  @IsOptional()
  @IsString()
  autm_email_1?: string;

  @ApiPropertyOptional({ example: 'Calle 10 # 20-30, Bogotá', description: 'Dirección (demandante)' })
  @IsOptional()
  @IsString()
  autm_address_1?: string;

  @ApiPropertyOptional({ example: '3001234567', description: 'Teléfono (demandante)' })
  @IsOptional()
  @IsString()
  autm_phone_number_1?: string;

  @ApiPropertyOptional({ example: 'Persona Natural', description: 'Tipo de sujeto demandado' })
  @IsOptional()
  @IsString()
  autm_subject_defendant?: string;

  @ApiPropertyOptional({ example: 'Carlos López Martínez', description: 'Persona natural (demandado)' })
  @IsOptional()
  @IsString()
  autm_natural_person?: string;

  @ApiPropertyOptional({ example: 'CC', description: 'Tipo de documento (demandado)' })
  @IsOptional()
  @IsString()
  autm_document_type_2?: string;

  @ApiPropertyOptional({ example: '9876543210', description: 'Número de documento (demandado)' })
  @IsOptional()
  @IsString()
  autm_document_number_2?: string;

  @ApiPropertyOptional({ example: 'demandado@correo.com', description: 'Correo electrónico (demandado)' })
  @IsOptional()
  @IsString()
  autm_email_2?: string;

  @ApiPropertyOptional({ example: 'Carrera 5 # 15-20, Bogotá', description: 'Dirección (demandado)' })
  @IsOptional()
  @IsString()
  autm_address_2?: string;

  @ApiPropertyOptional({ example: '3109876543', description: 'Teléfono (demandado)' })
  @IsOptional()
  @IsString()
  autm_phone_number_2?: string;

  @ApiPropertyOptional({ example: '11001400300120260001200', description: 'Número de radicado extraído (máx 23 dígitos)' })
  @IsOptional()
  @IsString()
  @MaxLength(23)
  autm_number_filed?: string;

  @ApiProperty({ example: 'Correo recibido', description: 'Estado de la automatización' })
  @IsString()
  @IsNotEmpty()
  autm_automation_status: string;

  @ApiPropertyOptional({ example: 'Correo procesado correctamente.', description: 'Detalle o mensaje del proceso' })
  @IsOptional()
  @IsString()
  autm_detail?: string;

  @ApiProperty({ example: 1, description: 'ID del tipo de estado (stty_id)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  autm_status_type_id: number;

  @ApiProperty({ example: 'BOT ctrl radicado demanda', description: 'Responsable del proceso' })
  @IsString()
  @IsNotEmpty()
  autm_responsible: string;
}

export class UpdateAutomationEmailDto {
  @ApiProperty({ example: 'remitente@ejemplo.com', description: 'Correo del remitente' })
  @IsString()
  @IsNotEmpty()
  autm_from_email: string;

  @ApiProperty({ example: 'destinatario@empresa.com', description: 'Correo del destinatario' })
  @IsString()
  @IsNotEmpty()
  autm_to_email: string;

  @ApiProperty({
    example: 'martes, 7 de abril de 2026 11:51 a. m.',
    description: 'Fecha/hora de recepción del correo (texto informativo tal como llega en el correo)',
  })
  @IsString()
  @IsNotEmpty()
  autm_date_received: string;

  @ApiProperty({ example: 'Demanda - Juan Pérez - 2026-04-28', description: 'Asunto del correo' })
  @IsString()
  @IsNotEmpty()
  autm_subject: string;

  @ApiPropertyOptional({ example: 'Cundinamarca', description: 'Departamento' })
  @IsOptional()
  @IsString()
  autm_departament?: string;

  @ApiPropertyOptional({ example: 'Bogotá D.C.', description: 'Ciudad' })
  @IsOptional()
  @IsString()
  autm_city?: string;

  @ApiPropertyOptional({ example: 'Usaquén', description: 'Localidad demandado' })
  @IsOptional()
  @IsString()
  autm_locality?: string;

  @ApiPropertyOptional({ example: 'Medicina General', description: 'Especialidad demandada' })
  @IsOptional()
  @IsString()
  autm_specialty?: string;

  @ApiPropertyOptional({ example: 'Ordinario', description: 'Clase de proceso demandado' })
  @IsOptional()
  @IsString()
  autm_process_class?: string;

  @ApiPropertyOptional({ example: 'Persona Natural', description: 'Tipo de sujeto demandante' })
  @IsOptional()
  @IsString()
  autm_subject_demanding?: string;

  @ApiPropertyOptional({ example: 'EPS Salud Total S.A.', description: 'Persona jurídica (demandante)' })
  @IsOptional()
  @IsString()
  autm_artificial_person?: string;

  @ApiPropertyOptional({ example: 'CC', description: 'Tipo de documento (demandante)' })
  @IsOptional()
  @IsString()
  autm_document_type_1?: string;

  @ApiPropertyOptional({ example: '1020304050', description: 'Número de documento (demandante)' })
  @IsOptional()
  @IsString()
  autm_document_number_1?: string;

  @ApiPropertyOptional({ example: 'demandante@correo.com', description: 'Correo electrónico (demandante)' })
  @IsOptional()
  @IsString()
  autm_email_1?: string;

  @ApiPropertyOptional({ example: 'Calle 10 # 20-30, Bogotá', description: 'Dirección (demandante)' })
  @IsOptional()
  @IsString()
  autm_address_1?: string;

  @ApiPropertyOptional({ example: '3001234567', description: 'Teléfono (demandante)' })
  @IsOptional()
  @IsString()
  autm_phone_number_1?: string;

  @ApiPropertyOptional({ example: 'Persona Natural', description: 'Tipo de sujeto demandado' })
  @IsOptional()
  @IsString()
  autm_subject_defendant?: string;

  @ApiPropertyOptional({ example: 'Carlos López Martínez', description: 'Persona natural (demandado)' })
  @IsOptional()
  @IsString()
  autm_natural_person?: string;

  @ApiPropertyOptional({ example: 'CC', description: 'Tipo de documento (demandado)' })
  @IsOptional()
  @IsString()
  autm_document_type_2?: string;

  @ApiPropertyOptional({ example: '9876543210', description: 'Número de documento (demandado)' })
  @IsOptional()
  @IsString()
  autm_document_number_2?: string;

  @ApiPropertyOptional({ example: 'demandado@correo.com', description: 'Correo electrónico (demandado)' })
  @IsOptional()
  @IsString()
  autm_email_2?: string;

  @ApiPropertyOptional({ example: 'Carrera 5 # 15-20, Bogotá', description: 'Dirección (demandado)' })
  @IsOptional()
  @IsString()
  autm_address_2?: string;

  @ApiPropertyOptional({ example: '3109876543', description: 'Teléfono (demandado)' })
  @IsOptional()
  @IsString()
  autm_phone_number_2?: string;

  @ApiPropertyOptional({ example: '11001400300120260001200', description: 'Número de radicado extraído (máx 23 dígitos)' })
  @IsOptional()
  @IsString()
  @MaxLength(23)
  autm_number_filed?: string;

  @ApiProperty({ example: 'Correo recibido', description: 'Estado de la automatización' })
  @IsString()
  @IsNotEmpty()
  autm_automation_status: string;

  @ApiPropertyOptional({ example: 'Correo procesado correctamente.', description: 'Detalle o mensaje del proceso' })
  @IsOptional()
  @IsString()
  autm_detail?: string;

  @ApiProperty({ example: 1, description: 'ID del tipo de estado (stty_id)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  autm_status_type_id: number;

  @ApiProperty({ example: 'BOT ctrl radicado demanda', description: 'Responsable del proceso' })
  @IsString()
  @IsNotEmpty()
  autm_responsible: string;
}
