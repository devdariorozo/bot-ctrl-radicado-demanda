// Responsabilidad: DTOs HTTP para managementCtrlFiledDemand.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

const MANAGEMENT_STATUS_VALUES = [
  'Abierto',
  'En proceso',
  'Correo Automatizado',
  'Novedad correo',
  'Radicado encontrado',
  'Radicado no visible',
  'Radicado construido',
  'Novedad portal',
  'Para control manual',
] as const;

export class CreateManagementCtrlFiledDemandDto {
  @ApiProperty({ example: 1, description: 'ID del tipo de cartera' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  mcfd_portfolio_type_id: number;

  @ApiProperty({ example: 'dbd_demandas_online', description: 'Nombre de la base de datos de origen' })
  @IsString()
  @IsNotEmpty()
  mcfd_name_data_base: string;

  @ApiProperty({ example: 1001, description: 'ID de la demanda (tabla lawsuits)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  mcfd_lawsuit_id: number;

  @ApiProperty({ example: 2001, description: 'ID del radicado de demanda (tabla lawsuits_filings)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  mcfd_lawsuits_filings_id: number;

  @ApiProperty({ example: 3001, description: 'ID del cliente' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  mcfd_client_id: number;

  @ApiPropertyOptional({ example: '2026-01-15', description: 'Fecha de radicado (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  mcfd_filing_date?: string;

  @ApiPropertyOptional({ example: '11001400300120260001200', description: 'Número de radicado (máx 23 dígitos)' })
  @IsOptional()
  @IsString()
  @MaxLength(23)
  mcfd_number_filed?: string;

  @ApiProperty({
    example: 'Abierto',
    description: 'Estado del proceso',
    enum: MANAGEMENT_STATUS_VALUES,
  })
  @IsString()
  @IsIn(MANAGEMENT_STATUS_VALUES as unknown as string[])
  mcfd_management_status: string;

  @ApiPropertyOptional({ example: 'Demanda pendiente para ser gestionada.', description: 'Detalle del proceso' })
  @IsOptional()
  @IsString()
  mcfd_detail?: string;

  @ApiProperty({ example: 1, description: 'ID del tipo de estado (stty_id)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  mcfd_state_type_id: number;

  @ApiProperty({ example: 'BOT ctrl radicado demanda', description: 'Responsable del proceso' })
  @IsString()
  @IsNotEmpty()
  mcfd_responsible: string;
}

export class UpdateManagementCtrlFiledDemandDto {
  @ApiProperty({ example: 1, description: 'ID del tipo de cartera' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  mcfd_portfolio_type_id: number;

  @ApiProperty({ example: 'dbd_demandas_online', description: 'Nombre de la base de datos de origen' })
  @IsString()
  @IsNotEmpty()
  mcfd_name_data_base: string;

  @ApiProperty({ example: 1001, description: 'ID de la demanda (tabla lawsuits)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  mcfd_lawsuit_id: number;

  @ApiProperty({ example: 2001, description: 'ID del radicado de demanda (tabla lawsuits_filings)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  mcfd_lawsuits_filings_id: number;

  @ApiProperty({ example: 3001, description: 'ID del cliente' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  mcfd_client_id: number;

  @ApiPropertyOptional({ example: 5001, description: 'ID del correo de automatización (tabla automation_email)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  mcfd_automation_email_id?: number;

  @ApiPropertyOptional({ example: '2026-04-28T10:30:00.000Z', description: 'Última ejecución del proceso (ISO 8601)' })
  @IsOptional()
  @IsString()
  mcfd_last_execution?: string;

  @ApiPropertyOptional({ example: 0, description: 'Número de reintentos' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  mcfd_retries?: number;

  @ApiPropertyOptional({ example: '2026-01-15', description: 'Fecha de radicado (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  mcfd_filing_date?: string;

  @ApiPropertyOptional({ example: '2026-04-01', description: 'Fecha de última actuación (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  mcfd_filing_date_action?: string;

  @ApiPropertyOptional({ example: '11001400300120260001200', description: 'Número de radicado (máx 23 dígitos)' })
  @IsOptional()
  @IsString()
  @MaxLength(23)
  mcfd_number_filed?: string;

  @ApiProperty({
    example: 'En proceso',
    description: 'Estado del proceso',
    enum: MANAGEMENT_STATUS_VALUES,
  })
  @IsString()
  @IsIn(MANAGEMENT_STATUS_VALUES as unknown as string[])
  mcfd_management_status: string;

  @ApiPropertyOptional({ example: 'Demanda en proceso de automatización.', description: 'Detalle del proceso' })
  @IsOptional()
  @IsString()
  mcfd_detail?: string;

  @ApiProperty({ example: 1, description: 'ID del tipo de estado (stty_id)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  mcfd_state_type_id: number;

  @ApiProperty({ example: 'BOT ctrl radicado demanda', description: 'Responsable del proceso' })
  @IsString()
  @IsNotEmpty()
  mcfd_responsible: string;
}
