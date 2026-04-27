// Responsabilidad: modelos de datos de entrada/salida para HTTP.

import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, IsNotEmpty, IsNumber, IsInt, Min } from 'class-validator';

export class TblPortfolioTypeDto {
    @ApiProperty({ example: 'Propias', description: 'Tipo de cartera' })
    @IsString()
    @IsNotEmpty()
    porty_type: string;

    @ApiProperty({ example: 'Propias registered', description: 'Descripción de la cartera' })
    @IsString()
    @IsNotEmpty()
    porty_detail: string;

    @ApiProperty({ example: 1, description: 'ID del tipo de estado (stateType, stty_id)' })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    porty_state_type_id: number;

    @ApiProperty({ example: 'BOT ctrl radicado demanda', description: 'Responsable de la gestión' })
    @IsString()
    @IsNotEmpty()
    porty_responsible: string;
}

/** Body JSON para PUT `actualizar/:id`. El porty_id va en la URL. */
export class UpdateTblPortfolioTypeDto {
    @ApiProperty({ example: 'Propias', description: 'Tipo de cartera' })
    @IsString()
    @IsNotEmpty()
    porty_type: string;

    @ApiProperty({ example: 'Propias registered', description: 'Descripción de la cartera' })
    @IsString()
    @IsNotEmpty()
    porty_detail: string;

    @ApiProperty({ example: 1, description: 'ID del tipo de estado (stateType, stty_id)' })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    porty_state_type_id: number;

    @ApiProperty({ example: 'BOT ctrl radicado demanda', description: 'Responsable de la gestión' })
    @IsString()
    @IsNotEmpty()
    porty_responsible: string;
}
