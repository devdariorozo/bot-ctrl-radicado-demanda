// Responsabilidad: modelos de datos de entrada/salida para HTTP.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsDate, IsOptional } from 'class-validator';

export class StateTypeDto {
    @ApiPropertyOptional({ example: 1, description: 'ID (opcional en POST, lo genera la BD)' })
    @IsNumber()
    @IsOptional()
    id?: number;

    @ApiProperty({ example: 'Active', description: 'Tipo de estado' })
    @IsString()
    @IsNotEmpty()
    type: string;

    @ApiProperty({ example: 'Registro activo', description: 'Descripción del estado' })
    @IsString()
    @IsNotEmpty()
    detail: string;

    @ApiPropertyOptional({ example: '2026-02-25T12:00:00.000Z', description: 'Fecha de creación (opcional en POST)' })
    @IsDate()
    @IsOptional()
    created_at?: Date;

    @ApiPropertyOptional({ example: '2026-02-25T12:00:00.000Z', description: 'Fecha de actualización (opcional en POST)' })
    @IsDate()
    @IsOptional()
    updated_at?: Date;

    @ApiProperty({ example: 'BOT demands online', description: 'Responsable del estado' })
    @IsString()
    @IsNotEmpty()
    responsible: string;
}

/** Body para PUT: solo los campos a actualizar. El id va en la URL, no en el body. */
export class UpdateStateTypeDto {
    @ApiProperty({ example: 'Active', description: 'Tipo de estado' })
    @IsString()
    @IsNotEmpty()
    type: string;

    @ApiProperty({ example: 'Registro activo', description: 'Descripción del estado' })
    @IsString()
    @IsNotEmpty()
    detail: string;

    @ApiPropertyOptional({ example: '2026-02-25T12:00:00.000Z', description: 'Fecha de creación' })
    @IsDate()
    @IsOptional()
    created_at?: Date;

    @ApiPropertyOptional({ example: '2026-02-25T12:00:00.000Z', description: 'Fecha de actualización' })
    @IsDate()
    @IsOptional()
    updated_at?: Date;

    @ApiProperty({ example: 'BOT demands online', description: 'Responsable del estado' })
    @IsString()
    @IsNotEmpty()
    responsible: string;
}