// Responsabilidad: modelos de datos de entrada/salida para HTTP.

import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsObject, IsString, Min } from 'class-validator';
import { BasesConfig } from '@domain/entities/dataBases.entities';

const basesExample: BasesConfig = {
  dev_db_1: {
    generate_pdf_demand_service: {
      url: 'https://example.groupcos.com/api/v1',
      api_key: 'sk_74b9d1c1e949ae8e60f52b1f2a4d7c89',
    },
  },
  dev_db_2: {
    generate_pdf_demand_service: {
      url: 'https://example2.groupcos.com/api/v1',
      api_key: 'sk_74b9d1c1e949ae8e60f52b1f2a4d7c89',
    },
  },
};

export class DataBasesDto {
  @ApiProperty({ example: 1, description: 'ID del tipo de entorno (environmentType, env_id)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  db_environment_type_id: number;

  @ApiProperty({ example: 1, description: 'ID del tipo de cartera (portfolioType, porty_id)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  db_portfolio_type_id: number;

  @ApiProperty({
    example: basesExample,
    description:
      'JSON de bases: nombre lógico → servicios (ej. generate_pdf_demand_service: url, api_key).',
    type: 'object',
    additionalProperties: true,
  })
  @IsObject()
  @IsNotEmpty()
  db_bases: BasesConfig;

  @ApiProperty({
    example: 'Bases de datos para entorno dev, cartera Propias',
    description: 'Descripción del registro',
  })
  @IsString()
  @IsNotEmpty()
  db_detail: string;

  @ApiProperty({ example: 1, description: 'ID del tipo de estado (stateType, stty_id)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  db_state_type_id: number;

  @ApiProperty({ example: 'BOT ctrl radicado demanda', description: 'Responsable de la gestión' })
  @IsString()
  @IsNotEmpty()
  db_responsible: string;
}

export class UpdateDataBasesDto {
  @ApiProperty({ example: 1, description: 'ID del tipo de entorno (environmentType, env_id)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  db_environment_type_id: number;

  @ApiProperty({ example: 1, description: 'ID del tipo de cartera (portfolioType, porty_id)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  db_portfolio_type_id: number;

  @ApiProperty({
    example: basesExample,
    description: 'Objeto db_bases (misma forma que en creación).',
    type: 'object',
    additionalProperties: true,
  })
  @IsObject()
  @IsNotEmpty()
  db_bases: BasesConfig;

  @ApiProperty({ example: 'Bases de datos para entorno dev, cartera Propias', description: 'Descripción' })
  @IsString()
  @IsNotEmpty()
  db_detail: string;

  @ApiProperty({ example: 1, description: 'ID del tipo de estado' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  db_state_type_id: number;

  @ApiProperty({ example: 'BOT ctrl radicado demanda', description: 'Responsable' })
  @IsString()
  @IsNotEmpty()
  db_responsible: string;
}
