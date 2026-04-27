// Responsabilidad: modelos de datos de entrada/salida para HTTP.

import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsIn, IsInt, IsNotEmpty, IsString, Matches, Min } from 'class-validator';

export const DAYS_OF_WEEK_EN = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

const TIME_24H_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateTblAttentionScheduleDto {
  @ApiProperty({ example: 1, description: 'ID del tipo de cartera (atsh_portfolio_type_id)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  atsh_portfolio_type_id: number;

  @ApiProperty({
    example: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    description: 'Días laborales en inglés',
    enum: DAYS_OF_WEEK_EN,
    isArray: true,
  })
  @IsArray()
  @IsString({ each: true })
  @IsIn(DAYS_OF_WEEK_EN, { each: true, message: 'Cada día debe ser: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday' })
  @IsNotEmpty()
  atsh_days: string[];

  @ApiProperty({ example: '08:00', description: 'Hora de inicio (HH:mm 24h)' })
  @IsString()
  @Matches(TIME_24H_REGEX, { message: 'atsh_start_time debe tener formato HH:mm 24h' })
  atsh_start_time: string;

  @ApiProperty({ example: '12:00', description: 'Hora de inicio de la pausa (HH:mm 24h)' })
  @IsString()
  @Matches(TIME_24H_REGEX, { message: 'atsh_start_recess_time debe tener formato HH:mm 24h' })
  atsh_start_recess_time: string;

  @ApiProperty({ example: '14:00', description: 'Hora de fin de la pausa (HH:mm 24h)' })
  @IsString()
  @Matches(TIME_24H_REGEX, { message: 'atsh_end_recess_time debe tener formato HH:mm 24h' })
  atsh_end_recess_time: string;

  @ApiProperty({ example: '17:00', description: 'Hora de fin (HH:mm 24h)' })
  @IsString()
  @Matches(TIME_24H_REGEX, { message: 'atsh_end_time debe tener formato HH:mm 24h' })
  atsh_end_time: string;

  @ApiProperty({ example: 'Horario laboral estándar L-V', description: 'Descripción del horario o proceso' })
  @IsString()
  @IsNotEmpty()
  atsh_detail: string;

  @ApiProperty({ example: 1, description: 'ID del tipo de estado (atsh_state_type_id)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  atsh_state_type_id: number;

  @ApiProperty({ example: 'BOT ctrl radicado demanda', description: 'Responsable del proceso' })
  @IsString()
  @IsNotEmpty()
  atsh_responsible: string;
}

export class UpdateTblAttentionScheduleDto {
  @ApiProperty({ example: 1, description: 'ID del tipo de cartera (atsh_portfolio_type_id)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  atsh_portfolio_type_id: number;

  @ApiProperty({
    example: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    description: 'Días laborales en inglés',
    enum: DAYS_OF_WEEK_EN,
    isArray: true,
  })
  @IsArray()
  @IsString({ each: true })
  @IsIn(DAYS_OF_WEEK_EN, { each: true, message: 'Cada día debe ser: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday' })
  @IsNotEmpty()
  atsh_days: string[];

  @ApiProperty({ example: '08:00', description: 'Hora de inicio (HH:mm 24h)' })
  @IsString()
  @Matches(TIME_24H_REGEX, { message: 'atsh_start_time debe tener formato HH:mm 24h' })
  atsh_start_time: string;

  @ApiProperty({ example: '12:00', description: 'Hora de inicio de la pausa (HH:mm 24h)' })
  @IsString()
  @Matches(TIME_24H_REGEX, { message: 'atsh_start_recess_time debe tener formato HH:mm 24h' })
  atsh_start_recess_time: string;

  @ApiProperty({ example: '14:00', description: 'Hora de fin de la pausa (HH:mm 24h)' })
  @IsString()
  @Matches(TIME_24H_REGEX, { message: 'atsh_end_recess_time debe tener formato HH:mm 24h' })
  atsh_end_recess_time: string;

  @ApiProperty({ example: '17:00', description: 'Hora de fin (HH:mm 24h)' })
  @IsString()
  @Matches(TIME_24H_REGEX, { message: 'atsh_end_time debe tener formato HH:mm 24h' })
  atsh_end_time: string;

  @ApiProperty({ example: 'Horario laboral estándar L-V', description: 'Descripción del horario o proceso' })
  @IsString()
  @IsNotEmpty()
  atsh_detail: string;

  @ApiProperty({ example: 1, description: 'ID del tipo de estado (atsh_state_type_id)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  atsh_state_type_id: number;

  @ApiProperty({ example: 'BOT ctrl radicado demanda', description: 'Responsable del proceso' })
  @IsString()
  @IsNotEmpty()
  atsh_responsible: string;
}
