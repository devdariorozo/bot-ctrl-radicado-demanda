// Responsabilidad: DTOs HTTP para botControl.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class IniciarBotControlDto {
  @ApiProperty({ example: 1, description: 'ID de la base de datos (tbl_data_bases.db_id)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  bctrl_data_bases_id: number;

  @ApiPropertyOptional({ example: 'Bot iniciado', description: 'Razón del inicio' })
  @IsOptional()
  @IsString()
  bctrl_reason?: string;

  @ApiPropertyOptional({ example: 'Bot iniciado correctamente.', description: 'Detalle del estado actual del bot' })
  @IsOptional()
  @IsString()
  bctrl_detail?: string;

  @ApiProperty({ example: 'BOT ctrl radicado demanda', description: 'Responsable del proceso' })
  @IsString()
  @IsNotEmpty()
  bctrl_responsible: string;
}

export class DetenerBotControlDto {
  @ApiProperty({ example: 1, description: 'ID de la base de datos (tbl_data_bases.db_id)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  bctrl_data_bases_id: number;

  @ApiPropertyOptional({ example: 'Bot detenido', description: 'Razón de la parada' })
  @IsOptional()
  @IsString()
  bctrl_reason?: string;

  @ApiPropertyOptional({ example: 'Bot detenido correctamente.', description: 'Detalle del estado actual del bot' })
  @IsOptional()
  @IsString()
  bctrl_detail?: string;

  @ApiProperty({ example: 'BOT ctrl radicado demanda', description: 'Responsable del proceso' })
  @IsString()
  @IsNotEmpty()
  bctrl_responsible: string;
}
