// Responsabilidad: modelos de datos de entrada/salida para HTTP.

import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class TblStateTypeDto {
    @ApiProperty({ example: 'Activo', description: 'Tipo de estado' })
    @IsString()
    @IsNotEmpty()
    stty_type: string;

    @ApiProperty({ example: 'Registro activo en el sistema', description: 'Descripción del estado' })
    @IsString()
    @IsNotEmpty()
    stty_detail: string;

    @ApiProperty({ example: 'BOT ctrl radicado demanda', description: 'Responsable de la gestión' })
    @IsString()
    @IsNotEmpty()
    stty_responsible: string;
}

/** Body JSON para PUT `actualizar/:id`. El stty_id va en la URL. */
export class UpdateTblStateTypeDto {
    @ApiProperty({ example: 'Activo', description: 'Tipo de estado' })
    @IsString()
    @IsNotEmpty()
    stty_type: string;

    @ApiProperty({ example: 'Registro activo en el sistema', description: 'Descripción del estado' })
    @IsString()
    @IsNotEmpty()
    stty_detail: string;

    @ApiProperty({ example: 'BOT ctrl radicado demanda', description: 'Responsable de la gestión' })
    @IsString()
    @IsNotEmpty()
    stty_responsible: string;
}
