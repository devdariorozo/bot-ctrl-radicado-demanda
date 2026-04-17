// Responsabilidad: modelos de datos de entrada/salida para HTTP (management_demands_online).

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional, IsDate } from 'class-validator';

export class ManagementDemandsOnlineDto {
  @ApiPropertyOptional({ example: 1, description: 'ID (opcional en POST, lo genera la BD)' })
  @IsNumber()
  @IsOptional()
  id?: number;

  @ApiProperty({ example: 1, description: 'ID de la cartera (portfolio_type_id)' })
  @IsNumber()
  @IsNotEmpty()
  portfolio_type_id: number;

  @ApiProperty({ example: 'dbd_demands_online', description: 'Nombre de la base de datos de origen' })
  @IsString()
  @IsNotEmpty()
  name_data_base: string;

  @ApiProperty({ example: 1, description: 'ID de configuración ciudad (portfolio_city_config)' })
  @IsNumber()
  @IsNotEmpty()
  portfolio_city_config_id: number;

  @ApiProperty({ example: 1, description: 'ID de campaña' })
  @IsNumber()
  @IsNotEmpty()
  campaign_id: number;

  @ApiProperty({ example: 1001, description: 'ID del proceso/demanda' })
  @IsNumber()
  @IsNotEmpty()
  lawsuit_id: number;

  @ApiProperty({ example: 1, description: 'ID de asignación tribunal' })
  @IsNumber()
  @IsNotEmpty()
  lawsuit_court_assignments_id: number;

  @ApiProperty({ example: 1, description: 'ID del cliente' })
  @IsNumber()
  @IsNotEmpty()
  client_id: number;

  @ApiProperty({ example: '/docs/ley.pdf', description: 'Ruta del documento legal' })
  @IsString()
  @IsNotEmpty()
  path_law_doc: string;

  @ApiProperty({ example: 'Pendiente', description: 'Estado del proceso' })
  @IsString()
  @IsNotEmpty()
  lawsuit_status: string;

  @ApiProperty({ example: 1, description: 'ID del tipo de cuantía' })
  @IsNumber()
  @IsNotEmpty()
  amount_type_id: number;

  @ApiPropertyOptional({ example: 0, description: 'ID de usuario (por defecto 0)' })
  @IsNumber()
  @IsOptional()
  user_id?: number;

  @ApiPropertyOptional({ example: 'BOT demands online', description: 'Nombre de usuario' })
  @IsString()
  @IsOptional()
  user_name?: string;

  @ApiPropertyOptional({ example: '-', description: 'Número de radicación del proceso' })
  @IsString()
  @IsOptional()
  number_filed?: string;

  @ApiPropertyOptional({ example: 'Abierta', description: 'Estado de gestión' })
  @IsString()
  @IsOptional()
  management_status?: string;

  @ApiPropertyOptional({
    example: 'Demanda pendiente para ser gestionada por el bot demands online',
    description: 'Detalle',
  })
  @IsString()
  @IsOptional()
  detail?: string;

  @ApiPropertyOptional({ example: 1, description: 'ID del tipo de estado (por defecto 1)' })
  @IsNumber()
  @IsOptional()
  state_type_id?: number;

  @ApiPropertyOptional({ example: '2026-03-03T12:00:00.000Z', description: 'Fecha de creación' })
  @IsDate()
  @IsOptional()
  created_at?: Date;

  @ApiPropertyOptional({ example: '2026-03-03T12:00:00.000Z', description: 'Fecha de actualización' })
  @IsDate()
  @IsOptional()
  updated_at?: Date;

  @ApiPropertyOptional({ example: 'BOT demands online', description: 'Responsable' })
  @IsString()
  @IsOptional()
  responsible?: string;
}

/** Body para PUT. El id va en la URL, no en el body. */
export class UpdateManagementDemandsOnlineDto {
  @ApiProperty({ example: 'dbd_demands_online', description: 'Nombre de la base de datos de origen' })
  @IsString()
  @IsNotEmpty()
  name_data_base: string;

  @ApiProperty({ example: 1, description: 'ID de la cartera (portfolio_type_id)' })
  @IsNumber()
  @IsNotEmpty()
  portfolio_type_id: number;

  @ApiProperty({ example: 1, description: 'ID de configuración ciudad' })
  @IsNumber()
  @IsNotEmpty()
  portfolio_city_config_id: number;

  @ApiProperty({ example: 1, description: 'ID de campaña' })
  @IsNumber()
  @IsNotEmpty()
  campaign_id: number;

  @ApiProperty({ example: 1001, description: 'ID del proceso' })
  @IsNumber()
  @IsNotEmpty()
  lawsuit_id: number;

  @ApiProperty({ example: 1, description: 'ID de asignación tribunal' })
  @IsNumber()
  @IsNotEmpty()
  lawsuit_court_assignments_id: number;

  @ApiProperty({ example: 1, description: 'ID del cliente' })
  @IsNumber()
  @IsNotEmpty()
  client_id: number;

  @ApiProperty({ example: '/docs/ley.pdf', description: 'Ruta del documento legal' })
  @IsString()
  @IsNotEmpty()
  path_law_doc: string;

  @ApiProperty({ example: 'Pendiente', description: 'Estado del proceso' })
  @IsString()
  @IsNotEmpty()
  lawsuit_status: string;

  @ApiProperty({ example: 1, description: 'ID del tipo de cuantía' })
  @IsNumber()
  @IsNotEmpty()
  amount_type_id: number;

  @ApiPropertyOptional({ example: 0, description: 'ID de usuario' })
  @IsNumber()
  @IsOptional()
  user_id?: number;

  @ApiPropertyOptional({ example: 'BOT demands online', description: 'Nombre de usuario' })
  @IsString()
  @IsOptional()
  user_name?: string;

  @ApiPropertyOptional({ example: '-', description: 'Número de radicación del proceso' })
  @IsString()
  @IsOptional()
  number_filed?: string;

  @ApiPropertyOptional({ example: 'Abierta', description: 'Estado de gestión' })
  @IsString()
  @IsOptional()
  management_status?: string;

  @ApiPropertyOptional({ description: 'Detalle' })
  @IsString()
  @IsOptional()
  detail?: string;

  @ApiProperty({ example: 1, description: 'ID del tipo de estado' })
  @IsNumber()
  @IsNotEmpty()
  state_type_id: number;

  @ApiPropertyOptional({ description: 'Responsable' })
  @IsString()
  @IsOptional()
  responsible?: string;
}
