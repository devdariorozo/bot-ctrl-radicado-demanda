// Responsabilidad: modelos de datos de entrada/salida para HTTP.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDate, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class PortfolioCityConfigDto {
  @ApiPropertyOptional({ example: 1, description: 'ID (opcional en POST, lo genera la BD)' })
  @IsNumber()
  @IsOptional()
  id?: number;

  @ApiProperty({ example: 1, description: 'ID de data_bases (FK)' })
  @IsNumber()
  @IsNotEmpty()
  id_data_bases: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'ID del tipo de portafolio (derivado de data_bases.portfolio_type_id, solo en respuestas)',
  })
  @IsNumber()
  @IsOptional()
  portfolio_type_id?: number;

  @ApiProperty({ example: 149, description: 'ID de la vista de ciudades (id_city_views)' })
  @IsNumber()
  @IsNotEmpty()
  id_city_views: number;

  @ApiProperty({ example: 'BOGOTÁ', description: 'Nombre del departamento' })
  @IsString()
  @IsNotEmpty()
  name_departament: string;

  @ApiProperty({ example: 'BOGOTÁ', description: 'Nombre completo ciudad' })
  @IsString()
  @IsNotEmpty()
  name_city: string;

  @ApiProperty({ example: 'BOGOTÁ - BOGOTÁ', description: 'Ciudad' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({
    example: 'Configuración cartera propia Bogotá',
    description: 'Descripción de la configuración',
  })
  @IsString()
  @IsNotEmpty()
  detail: string;

  @ApiPropertyOptional({
    example: 'Propias',
    description: 'Nombre del tipo de portafolio (JOIN a portfolio_type.type, solo en respuestas)',
  })
  @IsString()
  @IsOptional()
  portfolio_type_name?: string;

  @ApiPropertyOptional({ description: 'Nombre del tipo de estado (solo en respuestas)' })
  @IsString()
  @IsOptional()
  state_type_name?: string;

  @ApiProperty({ example: 1, description: 'ID del tipo de estado (state_type)' })
  @IsNumber()
  @IsNotEmpty()
  state_type_id: number;

  @ApiPropertyOptional({ example: '2026-02-27T12:00:00.000Z', description: 'Fecha de creación (opcional en POST)' })
  @IsDate()
  @IsOptional()
  created_at?: Date;

  @ApiPropertyOptional({ example: '2026-02-27T12:00:00.000Z', description: 'Fecha de actualización (opcional en POST)' })
  @IsDate()
  @IsOptional()
  updated_at?: Date;

  @ApiProperty({ example: 'BOT ctrl filed demand', description: 'Responsable del registro' })
  @IsString()
  @IsNotEmpty()
  responsible: string;
}

/** Body para PUT: solo los campos a actualizar. El id va en la URL, no en el body. */
export class UpdatePortfolioCityConfigDto {
  @ApiProperty({ example: 1, description: 'ID de data_bases (FK)' })
  @IsNumber()
  @IsNotEmpty()
  id_data_bases: number;

  @ApiProperty({ example: 149, description: 'ID de la vista de ciudades (id_city_views)' })
  @IsNumber()
  @IsNotEmpty()
  id_city_views: number;

  @ApiProperty({ example: 'BOGOTÁ', description: 'Nombre del departamento' })
  @IsString()
  @IsNotEmpty()
  name_departament: string;

  @ApiProperty({ example: 'BOGOTÁ', description: 'Nombre completo ciudad' })
  @IsString()
  @IsNotEmpty()
  name_city: string;

  @ApiProperty({ example: 'BOGOTÁ - BOGOTÁ', description: 'Ciudad' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({
    example: 'Configuración cartera propia Bogotá',
    description: 'Descripción de la configuración',
  })
  @IsString()
  @IsNotEmpty()
  detail: string;

  @ApiProperty({ example: 1, description: 'ID del tipo de estado (state_type)' })
  @IsNumber()
  @IsNotEmpty()
  state_type_id: number;

  @ApiPropertyOptional({ example: '2026-02-27T12:00:00.000Z', description: 'Fecha de creación' })
  @IsDate()
  @IsOptional()
  created_at?: Date;

  @ApiPropertyOptional({ example: '2026-02-27T12:00:00.000Z', description: 'Fecha de actualización' })
  @IsDate()
  @IsOptional()
  updated_at?: Date;

  @ApiProperty({ example: 'BOT ctrl filed demand', description: 'Responsable del registro' })
  @IsString()
  @IsNotEmpty()
  responsible: string;
}
