// Responsabilidad: modelos de datos de entrada/salida para HTTP.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsDate, IsOptional } from 'class-validator';

export class TblPortfolioTypeDto {
    @ApiPropertyOptional({ example: 1, description: 'ID (opcional en POST, lo genera la BD)' })
    @IsNumber()
    @IsOptional()
    porty_id?: number;

    @ApiProperty({ example: 'Propias', description: 'Tipo de cartera' })
    @IsString()
    @IsNotEmpty()
    porty_type: string;

    @ApiProperty({ example: 'Propias registered', description: 'Descripción de la cartera' })
    @IsString()
    @IsNotEmpty()
    porty_detail: string;

    @ApiProperty({ example: 1, description: 'ID del tipo de estado' })
    @IsNumber()
    @IsNotEmpty()
    porty_state_type_id: number;

    @ApiPropertyOptional({ example: '2026-02-25T12:00:00.000Z', description: 'Fecha de creación (opcional en POST)' })
    @IsDate()
    @IsOptional()
    porty_created_at?: Date;

    @ApiPropertyOptional({ example: '2026-02-25T12:00:00.000Z', description: 'Fecha de actualización (opcional en POST)' })
    @IsDate()
    @IsOptional()
    porty_updated_at?: Date;

    @ApiProperty({ example: 'BOT ctrl radicado demanda', description: 'Responsable de la cartera' })
    @IsString()
    @IsNotEmpty()
    porty_responsible: string;
}

export class UpdateTblPortfolioTypeDto {
    @ApiProperty({ example: 'Propias', description: 'Tipo de cartera' })
    @IsString()
    @IsNotEmpty()
    porty_type: string;

    @ApiProperty({ example: 'Propias registered', description: 'Descripción de la cartera' })
    @IsString()
    @IsNotEmpty()
    porty_detail: string;

    @ApiProperty({ example: 1, description: 'ID del tipo de estado' })
    @IsNumber()
    @IsNotEmpty()
    porty_state_type_id: number;

    @ApiPropertyOptional({ example: '2026-02-25T12:00:00.000Z', description: 'Fecha de creación' })
    @IsDate()
    @IsOptional()
    porty_created_at?: Date;

    @ApiPropertyOptional({ example: '2026-02-25T12:00:00.000Z', description: 'Fecha de actualización' })
    @IsDate()
    @IsOptional()
    porty_updated_at?: Date;

    @ApiProperty({ example: 'BOT ctrl radicado demanda', description: 'Responsable de la cartera' })
    @IsString()
    @IsNotEmpty()
    porty_responsible: string;
}
