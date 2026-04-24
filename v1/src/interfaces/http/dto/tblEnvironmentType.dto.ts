// Responsabilidad: modelos de datos de entrada/salida para HTTP.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsDate, IsOptional } from 'class-validator';

export class TblEnvironmentTypeDto {
    @ApiPropertyOptional({ example: 1, description: 'env_id (opcional en POST, lo genera la BD)' })
    @IsNumber()
    @IsOptional()
    env_id?: number;

    @ApiProperty({ example: 'dev', description: 'Tipo de entorno (dev, qa, pro)' })
    @IsString()
    @IsNotEmpty()
    env_type: string;

    @ApiProperty({ example: 'Ambiente de desarrollo', description: 'Descripción del entorno' })
    @IsString()
    @IsNotEmpty()
    env_detail: string;

    @ApiPropertyOptional({ example: '2026-04-23T12:00:00.000Z', description: 'Fecha de creación (opcional en POST)' })
    @IsDate()
    @IsOptional()
    env_created_at?: Date;

    @ApiPropertyOptional({ example: '2026-04-23T12:00:00.000Z', description: 'Fecha de actualización (opcional en POST)' })
    @IsDate()
    @IsOptional()
    env_updated_at?: Date;

    @ApiProperty({ example: 'BOT ctrl radicado demanda', description: 'Responsable de la gestión' })
    @IsString()
    @IsNotEmpty()
    env_responsible: string;
}

/** Body para PUT: solo los campos a actualizar. El env_id va en la URL, no en el body. */
export class UpdateTblEnvironmentTypeDto {
    @ApiProperty({ example: 'dev', description: 'Tipo de entorno (dev, qa, pro)' })
    @IsString()
    @IsNotEmpty()
    env_type: string;

    @ApiProperty({ example: 'Ambiente de desarrollo', description: 'Descripción del entorno' })
    @IsString()
    @IsNotEmpty()
    env_detail: string;

    @ApiPropertyOptional({ example: '2026-04-23T12:00:00.000Z', description: 'Fecha de creación' })
    @IsDate()
    @IsOptional()
    env_created_at?: Date;

    @ApiPropertyOptional({ example: '2026-04-23T12:00:00.000Z', description: 'Fecha de actualización' })
    @IsDate()
    @IsOptional()
    env_updated_at?: Date;

    @ApiProperty({ example: 'BOT ctrl radicado demanda', description: 'Responsable de la gestión' })
    @IsString()
    @IsNotEmpty()
    env_responsible: string;
}

