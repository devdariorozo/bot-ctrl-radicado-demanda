// Responsabilidad: modelos de datos de entrada/salida para HTTP.
// Días de la semana en español: Lunes, Martes, Miércoles, Jueves, Viernes, Sábado, Domingo.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsDate, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Matches } from 'class-validator';

export const DAYS_OF_WEEK_ES = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
] as const;

const TIME_24H_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Body para POST: un solo registro con days como array de días en español. */
export class CreateAttentionScheduleDto {
  @ApiProperty({ example: 1, description: 'ID del tipo de cartera (portfolio_type)' })
  @IsNumber()
  @IsNotEmpty()
  portfolio_type_id: number;

  @ApiProperty({
    example: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'],
    description: 'Días laborales en español (un registro por día)',
    enum: DAYS_OF_WEEK_ES,
    isArray: true,
  })
  @IsArray()
  @IsString({ each: true })
  @IsIn(DAYS_OF_WEEK_ES, { each: true, message: 'Each day must be one of: Lunes, Martes, Miércoles, Jueves, Viernes, Sábado, Domingo' })
  @IsNotEmpty()
  days: string[];

  @ApiProperty({ example: '08:00', description: 'Hora de inicio (HH:mm 24h)' })
  @IsString()
  @Matches(TIME_24H_REGEX, { message: 'start_time must be in HH:mm 24h format' })
  start_time: string;

  @ApiProperty({ example: '12:00', description: 'Hora inicio de receso (HH:mm 24h)' })
  @IsString()
  @Matches(TIME_24H_REGEX, { message: 'start_recess must be in HH:mm 24h format' })
  start_recess: string;

  @ApiProperty({ example: '14:00', description: 'Hora fin de receso (HH:mm 24h)' })
  @IsString()
  @Matches(TIME_24H_REGEX, { message: 'end_recess must be in HH:mm 24h format' })
  end_recess: string;

  @ApiProperty({ example: '17:00', description: 'Hora de fin (HH:mm 24h)' })
  @IsString()
  @Matches(TIME_24H_REGEX, { message: 'end_time must be in HH:mm 24h format' })
  end_time: string;

  @ApiProperty({ example: 'Horario laboral estándar L-V', description: 'Descripción del horario' })
  @IsString()
  @IsNotEmpty()
  detail: string;

  @ApiProperty({ example: 1, description: 'ID del tipo de estado (state_type)' })
  @IsNumber()
  @IsNotEmpty()
  state_type_id: number;

  @ApiProperty({ example: 'BOT ctrl filed demand', description: 'Responsable' })
  @IsString()
  @IsNotEmpty()
  responsible: string;
}

export class AttentionScheduleDto {
  @ApiPropertyOptional({ example: 1, description: 'ID (opcional en POST)' })
  @IsNumber()
  @IsOptional()
  id?: number;

  @ApiProperty({ example: 1, description: 'ID del tipo de cartera (portfolio_type)' })
  @IsNumber()
  @IsNotEmpty()
  portfolio_type_id: number;

  @ApiPropertyOptional({ description: 'Nombre del tipo de cartera (solo en respuestas)' })
  @IsString()
  @IsOptional()
  portfolio_type_name?: string;

  @ApiProperty({
    example: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'],
    description: 'Días de la semana en español',
    enum: DAYS_OF_WEEK_ES,
    isArray: true,
  })
  @IsArray()
  @IsString({ each: true })
  @IsIn(DAYS_OF_WEEK_ES, { each: true })
  days: string[];

  @ApiProperty({ example: '08:00', description: 'Hora de inicio (HH:mm)' })
  @IsString()
  start_time: string;

  @ApiProperty({ example: '12:00', description: 'Hora inicio de receso (HH:mm)' })
  @IsString()
  start_recess: string;

  @ApiProperty({ example: '14:00', description: 'Hora fin de receso (HH:mm)' })
  @IsString()
  end_recess: string;

  @ApiProperty({ example: '17:00', description: 'Hora de fin (HH:mm)' })
  @IsString()
  end_time: string;

  @ApiProperty({ example: 'Horario laboral estándar', description: 'Descripción' })
  @IsString()
  detail: string;

  @ApiProperty({ example: 1, description: 'ID del tipo de estado (state_type)' })
  @IsNumber()
  state_type_id: number;

  @ApiPropertyOptional({ description: 'Nombre del tipo de estado (solo en respuestas)' })
  @IsString()
  @IsOptional()
  state_type_name?: string;

  @ApiPropertyOptional()
  @IsDate()
  @IsOptional()
  created_at?: Date;

  @ApiPropertyOptional()
  @IsDate()
  @IsOptional()
  updated_at?: Date;

  @ApiProperty({ example: 'BOT ctrl filed demand' })
  @IsString()
  responsible: string;
}

/** Body para PUT: el id va en la URL; days es array de días en español. */
export class UpdateAttentionScheduleDto {
  @ApiProperty({ example: 1, description: 'ID del tipo de cartera (portfolio_type)' })
  @IsNumber()
  @IsNotEmpty()
  portfolio_type_id: number;

  @ApiProperty({
    example: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'],
    description: 'Días en español',
    enum: DAYS_OF_WEEK_ES,
    isArray: true,
  })
  @IsArray()
  @IsString({ each: true })
  @IsIn(DAYS_OF_WEEK_ES, { each: true })
  days: string[];

  @ApiProperty({ example: '08:00' })
  @IsString()
  @Matches(TIME_24H_REGEX, { message: 'start_time must be in HH:mm 24h format' })
  start_time: string;

  @ApiProperty({ example: '12:00' })
  @IsString()
  @Matches(TIME_24H_REGEX, { message: 'start_recess must be in HH:mm 24h format' })
  start_recess: string;

  @ApiProperty({ example: '14:00' })
  @IsString()
  @Matches(TIME_24H_REGEX, { message: 'end_recess must be in HH:mm 24h format' })
  end_recess: string;

  @ApiProperty({ example: '17:00' })
  @IsString()
  @Matches(TIME_24H_REGEX, { message: 'end_time must be in HH:mm 24h format' })
  end_time: string;

  @ApiProperty({ example: 'Horario laboral estándar' })
  @IsString()
  @IsNotEmpty()
  detail: string;

  @ApiProperty({ example: 1, description: 'ID del tipo de estado (state_type)' })
  @IsNumber()
  @IsNotEmpty()
  state_type_id: number;

  @ApiPropertyOptional()
  @IsDate()
  @IsOptional()
  created_at?: Date;

  @ApiPropertyOptional()
  @IsDate()
  @IsOptional()
  updated_at?: Date;

  @ApiProperty({ example: 'BOT ctrl filed demand' })
  @IsString()
  @IsNotEmpty()
  responsible: string;
}
