// Responsabilidad: modelos de datos de entrada/salida para HTTP (amount_type).

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsDate, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class AmountTypeDto {
  @ApiPropertyOptional({ example: 1, description: 'ID (opcional en POST)' })
  @IsNumber()
  @IsOptional()
  id?: number;

  @ApiProperty({ example: 'Mayor Cuantía', description: 'Tipo de cuantía' })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({
    example: ['CIVIL CIRCUITO - MAYOR CUANTÍA', 'PROMISCUO MUNICIPAL'],
    description: 'Especialidades posibles del proceso (se probarán en orden)',
    isArray: true,
    type: String,
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  specialty_process: string[];

  @ApiProperty({
    example: ['31-03-07 PROCESOS EJECUTIVOS'],
    description: 'Clases de proceso posibles (se probarán en orden)',
    isArray: true,
    type: String,
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  class_process: string[];

  @ApiProperty({ example: 'Demanda con mayor cuantia', description: 'Detalle descriptivo' })
  @IsString()
  @IsNotEmpty()
  detail: string;

  @ApiProperty({ example: 1, description: 'ID del tipo de estado' })
  @IsNumber()
  @IsNotEmpty()
  state_type_id: number;

  @ApiPropertyOptional({ description: 'Fecha de creación (opcional en POST)' })
  @IsDate()
  @IsOptional()
  created_at?: Date;

  @ApiPropertyOptional({ description: 'Fecha de actualización (opcional en POST)' })
  @IsDate()
  @IsOptional()
  updated_at?: Date;

  @ApiProperty({ example: 'BOT demands online', description: 'Responsable del registro' })
  @IsString()
  @IsNotEmpty()
  responsible: string;
}

/** Body para PUT: solo los campos a actualizar. El id va en la URL. */
export class UpdateAmountTypeDto {
  @ApiProperty({ example: 'Mayor Cuantía', description: 'Tipo de cuantía' })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({
    example: ['CIVIL CIRCUITO - MAYOR CUANTÍA', 'PROMISCUO MUNICIPAL'],
    description: 'Especialidades posibles del proceso',
    isArray: true,
    type: String,
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  specialty_process: string[];

  @ApiProperty({
    example: ['31-03-07 PROCESOS EJECUTIVOS'],
    description: 'Clases de proceso posibles',
    isArray: true,
    type: String,
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  class_process: string[];

  @ApiProperty({ example: 'Demanda con mayor cuantia', description: 'Detalle descriptivo' })
  @IsString()
  @IsNotEmpty()
  detail: string;

  @ApiProperty({ example: 1, description: 'ID del tipo de estado' })
  @IsNumber()
  @IsNotEmpty()
  state_type_id: number;

  @ApiPropertyOptional({ description: 'Fecha de creación' })
  @IsDate()
  @IsOptional()
  created_at?: Date;

  @ApiPropertyOptional({ description: 'Fecha de actualización' })
  @IsDate()
  @IsOptional()
  updated_at?: Date;

  @ApiProperty({ example: 'BOT demands online', description: 'Responsable del registro' })
  @IsString()
  @IsNotEmpty()
  responsible: string;
}
