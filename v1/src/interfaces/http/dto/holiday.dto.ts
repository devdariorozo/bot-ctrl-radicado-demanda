// Responsabilidad: DTOs HTTP para holiday.

import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

const COUNTRY_CODES = ['CO'] as const;

export class HolidayDto {
  @ApiProperty({ example: '2026-01-01', description: 'Fecha del festivo (YYYY-MM-DD)' })
  @IsString()
  @IsNotEmpty()
  hldy_date: string;

  @ApiProperty({ example: 'Año Nuevo', description: 'Nombre del festivo' })
  @IsString()
  @IsNotEmpty()
  hldy_name: string;

  @ApiProperty({ example: 'CO', description: 'Código de país ISO 3166-1 alpha-2' })
  @IsString()
  @IsIn(COUNTRY_CODES as unknown as string[])
  hldy_country_code: string;

  @ApiProperty({ example: 'NATIONAL', description: 'Tipo de festivo (NATIONAL, RELIGIOUS, JUDICIAL, etc.)' })
  @IsString()
  @IsNotEmpty()
  hldy_type: string;

  @ApiProperty({ example: false, description: 'Indica si es día laborable (false = no laborable, true = laborable)' })
  @IsBoolean()
  hldy_is_working_day: boolean;

  @ApiProperty({ example: 'Se crea registro con exito.', description: 'Descripción del festivo' })
  @IsString()
  @IsNotEmpty()
  hldy_detail: string;

  @ApiProperty({ example: 1, description: 'ID del tipo de estado (stty_id)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  hldy_state_type_id: number;

  @ApiProperty({ example: 'BOT ctrl radicado demanda', description: 'Responsable del proceso' })
  @IsString()
  @IsNotEmpty()
  hldy_responsible: string;
}

/** Body JSON para PUT `actualizar/:id`. El hldy_id va en la URL. */
export class UpdateHolidayDto {
  @ApiProperty({ example: '2026-01-01', description: 'Fecha del festivo (YYYY-MM-DD)' })
  @IsString()
  @IsNotEmpty()
  hldy_date: string;

  @ApiProperty({ example: 'Año Nuevo', description: 'Nombre del festivo' })
  @IsString()
  @IsNotEmpty()
  hldy_name: string;

  @ApiProperty({ example: 'CO', description: 'Código de país ISO 3166-1 alpha-2' })
  @IsString()
  @IsIn(COUNTRY_CODES as unknown as string[])
  hldy_country_code: string;

  @ApiProperty({ example: 'NATIONAL', description: 'Tipo de festivo (NATIONAL, RELIGIOUS, JUDICIAL, etc.)' })
  @IsString()
  @IsNotEmpty()
  hldy_type: string;

  @ApiProperty({ example: false, description: 'Indica si es día laborable (false = no laborable, true = laborable)' })
  @IsBoolean()
  hldy_is_working_day: boolean;

  @ApiProperty({ example: 'Se crea registro con exito.', description: 'Descripción del festivo' })
  @IsString()
  @IsNotEmpty()
  hldy_detail: string;

  @ApiProperty({ example: 1, description: 'ID del tipo de estado (stty_id)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  hldy_state_type_id: number;

  @ApiProperty({ example: 'BOT ctrl radicado demanda', description: 'Responsable del proceso' })
  @IsString()
  @IsNotEmpty()
  hldy_responsible: string;
}
