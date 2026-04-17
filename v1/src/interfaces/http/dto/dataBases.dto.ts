// Responsabilidad: modelos de datos de entrada/salida para HTTP.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDate, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';
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
  @ApiPropertyOptional({ example: 1, description: 'ID (opcional en POST, lo genera la BD)' })
  @IsNumber()
  @IsOptional()
  id?: number;

  @ApiProperty({ example: 1, description: 'ID del tipo de entorno (environment_type)' })
  @IsNumber()
  @IsNotEmpty()
  environment_type_id: number;

  @ApiProperty({ example: 1, description: 'ID del tipo de cartera (portfolio_type)' })
  @IsNumber()
  @IsNotEmpty()
  portfolio_type_id: number;

  @ApiPropertyOptional({
    example: 'Sudameris docker',
    description:
      'Solo en respuestas de listado: "portfolio_type_name environment_type_name". Si environment es "pro", solo portfolio_type_name.',
  })
  @IsString()
  @IsOptional()
  label_data_base?: string;

  @ApiProperty({
    example: basesExample,
    description:
      'JSON con bases de datos y sus configuraciones de servicios. Cada clave es el nombre de la BD, y el valor contiene los servicios disponibles (ej: generate_pdf_demand_service con url y api_key).',
    type: 'object',
    additionalProperties: {
      type: 'object',
      properties: {
        generate_pdf_demand_service: {
          type: 'object',
          properties: {
            url: { type: 'string', example: 'https://example.groupcos.com/api/v1' },
            api_key: { type: 'string', example: 'sk_74b9d1c1e949ae8e60f52b1f2a4d7c89' },
          },
          required: ['url', 'api_key'],
        },
      },
      required: ['generate_pdf_demand_service'],
    },
  })
  @IsObject()
  @IsNotEmpty()
  bases: BasesConfig;

  @ApiProperty({
    example: 'Bases de datos para entorno dev, cartera Propias',
    description: 'Descripción del grupo de bases',
  })
  @IsString()
  @IsNotEmpty()
  detail: string;

  @ApiProperty({ example: 1, description: 'ID del tipo de estado (state_type)' })
  @IsNumber()
  @IsNotEmpty()
  state_type_id: number;

  @ApiPropertyOptional({ example: '2026-02-25T12:00:00.000Z', description: 'Fecha de creación (opcional en POST)' })
  @IsDate()
  @IsOptional()
  created_at?: Date;

  @ApiPropertyOptional({ example: '2026-02-25T12:00:00.000Z', description: 'Fecha de actualización (opcional en POST)' })
  @IsDate()
  @IsOptional()
  updated_at?: Date;

  @ApiProperty({ example: 'BOT demands online', description: 'Responsable del registro' })
  @IsString()
  @IsNotEmpty()
  responsible: string;
}

/** Body para PUT: solo los campos a actualizar. El id va en la URL, no en el body. */
export class UpdateDataBasesDto {
  @ApiProperty({ example: 1, description: 'ID del tipo de entorno (environment_type)' })
  @IsNumber()
  @IsNotEmpty()
  environment_type_id: number;

  @ApiProperty({ example: 1, description: 'ID del tipo de cartera (portfolio_type)' })
  @IsNumber()
  @IsNotEmpty()
  portfolio_type_id: number;

  @ApiProperty({
    example: basesExample,
    description:
      'JSON con bases de datos y sus configuraciones de servicios. Cada clave es el nombre de la BD, y el valor contiene los servicios disponibles (ej: generate_pdf_demand_service con url y api_key).',
    type: 'object',
    additionalProperties: {
      type: 'object',
      properties: {
        generate_pdf_demand_service: {
          type: 'object',
          properties: {
            url: { type: 'string', example: 'https://example.groupcos.com/api/v1' },
            api_key: { type: 'string', example: 'sk_74b9d1c1e949ae8e60f52b1f2a4d7c89' },
          },
          required: ['url', 'api_key'],
        },
      },
      required: ['generate_pdf_demand_service'],
    },
  })
  @IsObject()
  @IsNotEmpty()
  bases: BasesConfig;

  @ApiProperty({
    example: 'Bases de datos para entorno dev, cartera Propias',
    description: 'Descripción del grupo de bases',
  })
  @IsString()
  @IsNotEmpty()
  detail: string;

  @ApiProperty({ example: 1, description: 'ID del tipo de estado (state_type)' })
  @IsNumber()
  @IsNotEmpty()
  state_type_id: number;

  @ApiPropertyOptional({ example: '2026-02-25T12:00:00.000Z', description: 'Fecha de creación' })
  @IsDate()
  @IsOptional()
  created_at?: Date;

  @ApiPropertyOptional({ example: '2026-02-25T12:00:00.000Z', description: 'Fecha de actualización' })
  @IsDate()
  @IsOptional()
  updated_at?: Date;

  @ApiProperty({ example: 'BOT demands online', description: 'Responsable del registro' })
  @IsString()
  @IsNotEmpty()
  responsible: string;
}
