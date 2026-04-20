// Responsabilidad: DTOs HTTP para lawyer_data.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsDate, IsOptional, Matches, IsEmail } from 'class-validator';
import { Transform } from 'class-transformer';

// CC con puntos de miles: 1.022.371.176
const CC_FORMAT_REGEX = /^\d{1,3}(?:\.\d{3})*$/;

// Teléfono: grupos de 2–4 dígitos separados por espacios, como "310 235 6985"
const PHONE_FORMAT_REGEX = /^[0-9]{2,4}( [0-9]{2,4}){1,3}$/;

export class LawyerDataDto {
  @ApiPropertyOptional({ example: 1, description: 'ID (opcional en POST, lo genera la BD)' })
  @IsNumber()
  @IsOptional()
  id?: number;

  @ApiProperty({ example: 1, description: 'ID del tipo de cartera (portfolio_type_id)' })
  @IsNumber()
  @IsNotEmpty()
  portfolio_type_id: number;

  @ApiProperty({ example: 'C.C', description: 'Tipo de documento del abogado (mayúsculas)' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase().trim() : value))
  document_type: string;

  @ApiProperty({
    example: 'CÉDULA DE CIUDADANÍA',
    description: 'Nombre descriptivo del tipo de documento (mayúsculas)',
  })
  @IsString()
  @IsOptional()
  document_name?: string;

  @ApiProperty({ example: '1.022.371.176', description: 'Número de documento con puntos de miles' })
  @IsString()
  @IsNotEmpty()
  @Matches(CC_FORMAT_REGEX, {
    message: 'document_number must be like 1.022.371.176',
  })
  document_number: string;

  @ApiProperty({ example: 'ADRIANA', description: 'Primer nombre (mayúsculas)' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase().trim() : value))
  first_name: string;

  @ApiProperty({ example: 'PAOLA', description: 'Segundo nombre (mayúsculas, opcional)' })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase().trim() : value))
  second_name?: string;

  @ApiProperty({ example: 'BUSTAMANTE', description: 'Primer apellido (mayúsculas)' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase().trim() : value))
  first_last_name: string;

  @ApiProperty({ example: 'ESCOBAR', description: 'Segundo apellido (mayúsculas, opcional)' })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase().trim() : value))
  second_last_name?: string;

  @ApiProperty({
    example: 'CALLE 166 NO. 9 - 15 APTO 204 TORRE 9',
    description: 'Dirección (mayúsculas)',
  })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase().trim() : value))
  address: string;

  @ApiProperty({ example: '310 235 6985', description: 'Número de contacto en formato telefónico' })
  @IsString()
  @IsNotEmpty()
  @Matches(PHONE_FORMAT_REGEX, {
    message: 'contact_number must be a valid phone format like "310 235 6985"',
  })
  contact_number: string;

  @ApiProperty({
    example: 'DEMANDAS@CONTACTOSOLUTIONS.COM',
    description: 'Correo para notificaciones (se guarda siempre en MAYÚSCULAS)',
  })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsEmail()
  email_notifications: string;

  @ApiProperty({
    example: 'Se crea registro con exito.',
    description: 'Detalle (se normaliza a capital en la primera palabra)',
  })
  @IsString()
  @IsNotEmpty()
  detail: string;

  @ApiProperty({ example: 1, description: 'ID del tipo de estado' })
  @IsNumber()
  @IsNotEmpty()
  state_type_id: number;

  @ApiPropertyOptional({
    example: '2026-03-10T12:00:00.000Z',
    description: 'Fecha de creación (opcional en POST)',
  })
  @IsDate()
  @IsOptional()
  created_at?: Date;

  @ApiPropertyOptional({
    example: '2026-03-10T12:00:00.000Z',
    description: 'Fecha de actualización (opcional en POST)',
  })
  @IsDate()
  @IsOptional()
  updated_at?: Date;

  @ApiPropertyOptional({
    example: 'BOT ctrl filed demand',
    description: 'Responsable (se forzará siempre a BOT ctrl filed demand)',
  })
  @IsString()
  @IsOptional()
  responsible?: string;
}

export class UpdateLawyerDataDto {
  @ApiProperty({ example: 1, description: 'ID del tipo de cartera (portfolio_type_id)' })
  @IsNumber()
  @IsNotEmpty()
  portfolio_type_id: number;

  @ApiProperty({ example: 'C.C', description: 'Tipo de documento del abogado (mayúsculas)' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase().trim() : value))
  document_type: string;

  @ApiProperty({
    example: 'CÉDULA DE CIUDADANÍA',
    description: 'Nombre descriptivo del tipo de documento (mayúsculas)',
  })
  @IsString()
  @IsOptional()
  document_name?: string;

  @ApiProperty({ example: '1.022.371.176', description: 'Número de documento con puntos de miles' })
  @IsString()
  @IsNotEmpty()
  @Matches(CC_FORMAT_REGEX, {
    message: 'document_number must be like 1.022.371.176',
  })
  document_number: string;

  @ApiProperty({ example: 'ADRIANA', description: 'Primer nombre (mayúsculas)' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase().trim() : value))
  first_name: string;

  @ApiProperty({ example: 'PAOLA', description: 'Segundo nombre (mayúsculas, opcional)' })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase().trim() : value))
  second_name?: string;

  @ApiProperty({ example: 'BUSTAMANTE', description: 'Primer apellido (mayúsculas)' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase().trim() : value))
  first_last_name: string;

  @ApiProperty({ example: 'ESCOBAR', description: 'Segundo apellido (mayúsculas, opcional)' })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase().trim() : value))
  second_last_name?: string;

  @ApiProperty({
    example: 'CALLE 166 NO. 9 - 15 APTO 204 TORRE 9',
    description: 'Dirección (mayúsculas)',
  })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase().trim() : value))
  address: string;

  @ApiProperty({ example: '310 235 6985', description: 'Número de contacto en formato telefónico' })
  @IsString()
  @IsNotEmpty()
  @Matches(PHONE_FORMAT_REGEX, {
    message: 'contact_number must be a valid phone format like \"310 235 6985\"',
  })
  contact_number: string;

  @ApiProperty({
    example: 'DEMANDAS@CONTACTOSOLUTIONS.COM',
    description: 'Correo para notificaciones (se guarda siempre en MAYÚSCULAS)',
  })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsEmail()
  email_notifications: string;

  @ApiProperty({
    example: 'Se crea registro con exito.',
    description: 'Detalle (se normaliza a capital en la primera palabra)',
  })
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

  @ApiPropertyOptional({
    example: 'BOT ctrl filed demand',
    description: 'Responsable (se forzará siempre a BOT ctrl filed demand)',
  })
  @IsString()
  @IsOptional()
  responsible?: string;
}

