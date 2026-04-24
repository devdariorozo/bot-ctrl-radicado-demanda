// Responsabilidad: modelos de datos de entrada/salida para HTTP.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsDate, IsOptional } from 'class-validator';

export class TblStateTypeDto {
    @ApiPropertyOptional({ example: 1, description: 'stty_id (opcional en POST, lo genera la BD)' })
    @IsNumber()
    @IsOptional()
    stty_id?: number;

    @ApiProperty({ example: 'Active', description: 'Tipo de estado' })
    @IsString()
    @IsNotEmpty()
    stty_type: string;

    @ApiProperty({ example: 'Registro activo', description: 'Descripción del estado' })
    @IsString()
    @IsNotEmpty()
    stty_detail: string;

    @ApiPropertyOptional({ example: '2026-04-23T12:00:00.000Z', description: 'Fecha de creación (opcional en POST)' })
    @IsDate()
    @IsOptional()
    stty_created_at?: Date;

    @ApiPropertyOptional({ example: '2026-04-23T12:00:00.000Z', description: 'Fecha de actualización (opcional en POST)' })
    @IsDate()
    @IsOptional()
    stty_updated_at?: Date;

    @ApiProperty({ example: 'BOT ctrl radicado demanda', description: 'Responsable de la gestión' })
    @IsString()
    @IsNotEmpty()
    stty_responsible: string;
}

/** Body para PUT: solo los campos a actualizar. El stty_id va en la URL, no en el body. */
export class UpdateTblStateTypeDto {
    @ApiProperty({ example: 'Active', description: 'Tipo de estado' })
    @IsString()
    @IsNotEmpty()
    stty_type: string;

    @ApiProperty({ example: 'Registro activo', description: 'Descripción del estado' })
    @IsString()
    @IsNotEmpty()
    stty_detail: string;

    @ApiPropertyOptional({ example: '2026-04-23T12:00:00.000Z', description: 'Fecha de creación' })
    @IsDate()
    @IsOptional()
    stty_created_at?: Date;

    @ApiPropertyOptional({ example: '2026-04-23T12:00:00.000Z', description: 'Fecha de actualización' })
    @IsDate()
    @IsOptional()
    stty_updated_at?: Date;

    @ApiProperty({ example: 'BOT ctrl radicado demanda', description: 'Responsable de la gestión' })
    @IsString()
    @IsNotEmpty()
    stty_responsible: string;
}