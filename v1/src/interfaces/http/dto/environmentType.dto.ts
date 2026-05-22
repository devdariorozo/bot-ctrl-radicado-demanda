// Responsabilidad: modelos de datos de entrada/salida para HTTP.

import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class TblEnvironmentTypeDto {
    @ApiProperty({ example: 'dev', description: 'Tipo de entorno (dev, qa, pro)' })
    @IsString()
    @IsNotEmpty()
    env_type: string;

    @ApiProperty({ example: 'Ambiente de desarrollo', description: 'Descripción del entorno' })
    @IsString()
    @IsNotEmpty()
    env_detail: string;

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

    @ApiProperty({ example: 'BOT ctrl radicado demanda', description: 'Responsable de la gestión' })
    @IsString()
    @IsNotEmpty()
    env_responsible: string;
}
