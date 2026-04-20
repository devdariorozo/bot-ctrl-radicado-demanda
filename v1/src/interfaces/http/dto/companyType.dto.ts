// Responsabilidad: modelos de datos de entrada/salida para HTTP (company_type).

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsDate,
  IsOptional,
  Matches,
  IsEmail,
} from 'class-validator';
import { Transform } from 'class-transformer';

// Regex para NIT colombiano con miles y dígito de verificación: 900.097.543-9
const NIT_FORMAT_REGEX = /^\d{1,3}(?:\.\d{3})*-\d$/;

// Regex flexible para teléfonos con grupos de dígitos separados por espacios: "320 833 3198", "287 1144"
const PHONE_FORMAT_REGEX = /^[0-9]{2,4}( [0-9]{2,4}){1,3}$/;

export class CompanyTypeDto {
  @ApiPropertyOptional({ example: 1, description: 'ID (opcional en POST, lo genera la BD)' })
  @IsNumber()
  @IsOptional()
  id?: number;

  @ApiProperty({ example: 1, description: 'ID del tipo de cartera (portfolio_type_id)' })
  @IsNumber()
  @IsNotEmpty()
  portfolio_type_id: number;

  @ApiProperty({ example: 1, description: 'Formato de campaña (ej. 1, 2, etc.)' })
  @IsNumber()
  @IsNotEmpty()
  campaings_format: number;

  @ApiProperty({ example: 'NIT', description: 'Tipo de documento (siempre en mayúsculas)' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase().trim() : value))
  @Matches(/^[A-Z]+$/, { message: 'document_type must contain only uppercase letters' })
  document_type: string;

  @ApiProperty({
    example: 'NÚMERO DE IDENTIFICACIÓN TRIBUTARIA',
    description: 'Nombre descriptivo del tipo de documento',
  })
  @IsString()
  @IsOptional()
  document_name?: string;

  @ApiProperty({ example: '900.097.543-9', description: 'Número de documento con miles y guion final' })
  @IsString()
  @IsNotEmpty()
  @Matches(NIT_FORMAT_REGEX, {
    message: 'document_number must be like 900.097.543-9',
  })
  document_number: string;

  @ApiProperty({ example: 'CONTACTO SOLUTIONS S.A.S', description: 'Nombre de la compañía' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase().trim() : value))
  company_name: string;

  @ApiProperty({ example: 'CARRERA 43 NO. 17 - 47', description: 'Dirección de la compañía' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase().trim() : value))
  address: string;

  @ApiProperty({ example: '320 833 3198', description: 'Número de contacto en formato numérico con espacios' })
  @IsString()
  @IsNotEmpty()
  @Matches(PHONE_FORMAT_REGEX, {
    message: 'contact_number must be a valid phone format like "320 833 3198" o "287 1144"',
  })
  contact_number: string;

  @ApiProperty({
    example: 'DEMANDAS@CONTACTOSOLUTIONS.COM',
    description: 'Correo para notificaciones (se almacena en MAYÚSCULAS)',
  })
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase().trim() : value))
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
    example: '2026-03-03T12:00:00.000Z',
    description: 'Fecha de creación (opcional en POST)',
  })
  @IsDate()
  @IsOptional()
  created_at?: Date;

  @ApiPropertyOptional({
    example: '2026-03-03T12:00:00.000Z',
    description: 'Fecha de actualización (opcional en POST)',
  })
  @IsDate()
  @IsOptional()
  updated_at?: Date;

  @ApiPropertyOptional({
    example: 'BOT ctrl filed demand',
    description: 'Responsable (siempre se forzará a BOT ctrl filed demand)',
  })
  @IsString()
  @IsOptional()
  responsible?: string;
}

/** Body para PUT: solo los campos a actualizar. El id va en la URL, no en el body. */
export class UpdateCompanyTypeDto {
  @ApiProperty({ example: 1, description: 'ID del tipo de cartera (portfolio_type_id)' })
  @IsNumber()
  @IsNotEmpty()
  portfolio_type_id: number;

  @ApiProperty({ example: 1, description: 'Formato de campaña' })
  @IsNumber()
  @IsNotEmpty()
  campaings_format: number;

  @ApiProperty({ example: 'NIT', description: 'Tipo de documento (siempre en mayúsculas)' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase().trim() : value))
  @Matches(/^[A-Z]+$/, { message: 'document_type must contain only uppercase letters' })
  document_type: string;

  @ApiProperty({
    example: 'NÚMERO DE IDENTIFICACIÓN TRIBUTARIA',
    description: 'Nombre descriptivo del tipo de documento',
  })
  @IsString()
  @IsOptional()
  document_name?: string;

  @ApiProperty({ example: '900.097.543-9', description: 'Número de documento con miles y guion final' })
  @IsString()
  @IsNotEmpty()
  @Matches(NIT_FORMAT_REGEX, {
    message: 'document_number must be like 900.097.543-9',
  })
  document_number: string;

  @ApiProperty({ example: 'CONTACTO SOLUTIONS S.A.S', description: 'Nombre de la compañía' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase().trim() : value))
  company_name: string;

  @ApiProperty({ example: 'CARRERA 43 NO. 17 - 47', description: 'Dirección de la compañía' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase().trim() : value))
  address: string;

  @ApiProperty({ example: '320 833 3198', description: 'Número de contacto en formato numérico con espacios' })
  @IsString()
  @IsNotEmpty()
  @Matches(PHONE_FORMAT_REGEX, {
    message: 'contact_number must be a valid phone format like "320 833 3198" o "287 1144"',
  })
  contact_number: string;

  @ApiProperty({
    example: 'DEMANDAS@CONTACTOSOLUTIONS.COM',
    description: 'Correo para notificaciones (se almacena en MAYÚSCULAS)',
  })
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase().trim() : value))
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
    description: 'Responsable (siempre se forzará a BOT ctrl filed demand)',
  })
  @IsString()
  @IsOptional()
  responsible?: string;
}

