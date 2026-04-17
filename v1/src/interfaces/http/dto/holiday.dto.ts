// Responsabilidad: DTOs HTTP para holiday.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDate, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

const COUNTRY_CODES = ['CO'] as const;

export class HolidayDto {
  @ApiPropertyOptional({ example: 1, description: 'ID (opcional en POST)' })
  @IsNumber()
  @IsOptional()
  id?: number;

  @ApiProperty({ example: '2026-03-24', description: 'Fecha del festivo (YYYY-MM-DD)' })
  @IsString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({ example: 'DÍA DE SAN JOSÉ', description: 'Nombre del festivo (mayúsculas)' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'CO', description: 'Código de país ISO 3166-1 alpha-2' })
  @IsString()
  @IsIn(COUNTRY_CODES as unknown as string[])
  country_code: string;

  @ApiProperty({ example: 'NATIONAL', description: 'Tipo de festivo (NATIONAL, JUDICIAL, etc.)' })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({ example: false, description: 'Si es día laborable para el bot (0 = no, 1 = sí)' })
  @IsBoolean()
  is_working_day: boolean;

  @ApiProperty({ example: 'Festivo oficial en Colombia', description: 'Detalle del festivo' })
  @IsString()
  @IsNotEmpty()
  detail: string;

  @ApiProperty({ example: 1, description: 'ID del tipo de estado' })
  @IsNumber()
  @IsNotEmpty()
  state_type_id: number;

  @ApiPropertyOptional({ example: 'Active', description: 'Nombre del tipo de estado (solo respuesta)' })
  @IsString()
  @IsOptional()
  state_type_name?: string;

  @ApiPropertyOptional({ example: '2026-03-10T12:00:00.000Z', description: 'Fecha de creación' })
  @IsDate()
  @IsOptional()
  created_at?: Date;

  @ApiPropertyOptional({ example: '2026-03-10T12:00:00.000Z', description: 'Fecha de actualización' })
  @IsDate()
  @IsOptional()
  updated_at?: Date;

  @ApiProperty({ example: 'BOT demands online', description: 'Responsable' })
  @IsString()
  @IsNotEmpty()
  responsible: string;
}

export class UpdateHolidayDto {
  @ApiProperty({ example: '2026-03-24', description: 'Fecha del festivo (YYYY-MM-DD)' })
  @IsString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({ example: 'DÍA DE SAN JOSÉ', description: 'Nombre del festivo (mayúsculas)' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'CO', description: 'Código de país ISO 3166-1 alpha-2' })
  @IsString()
  @IsIn(COUNTRY_CODES as unknown as string[])
  country_code: string;

  @ApiProperty({ example: 'NATIONAL', description: 'Tipo de festivo (NATIONAL, JUDICIAL, etc.)' })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({ example: false, description: 'Si es día laborable para el bot (0 = no, 1 = sí)' })
  @IsBoolean()
  is_working_day: boolean;

  @ApiProperty({ example: 'Festivo oficial en Colombia', description: 'Detalle del festivo' })
  @IsString()
  @IsNotEmpty()
  detail: string;

  @ApiProperty({ example: 1, description: 'ID del tipo de estado' })
  @IsNumber()
  @IsNotEmpty()
  state_type_id: number;

  @ApiPropertyOptional({ example: '2026-03-10T12:00:00.000Z', description: 'Fecha de creación' })
  @IsDate()
  @IsOptional()
  created_at?: Date;

  @ApiPropertyOptional({ example: '2026-03-10T12:00:00.000Z', description: 'Fecha de actualización' })
  @IsDate()
  @IsOptional()
  updated_at?: Date;

  @ApiProperty({ example: 'BOT demands online', description: 'Responsable' })
  @IsString()
  @IsNotEmpty()
  responsible: string;
}

