// Responsabilidad: endpoints HTTP de Nest (controller).

import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiQuery, ApiTags, getSchemaPath } from '@nestjs/swagger';
import { TblEnvironmentTypeDto, UpdateTblEnvironmentTypeDto } from '../dto/tblEnvironmentType.dto';
import { TblEnvironmentTypeService } from '@application/services/tblEnvironmentType.service';
import { TblEnvironmentType } from '@domain/entities/tblEnvironmentType.entities';
import { CreateTblEnvironmentTypeInput } from '@domain/ports/tblEnvironmentType.ports';
import { PaginatedResult, paginateArray } from '@application/utils/pagination.utils';
import { dataEmpty, dataMany, dataOne } from '@application/utils/response.utils';

/** Ejemplo JSON que Swagger muestra por defecto en el body (guía visual para quien use la API). */
const createExampleSchema = {
    env_type: 'dev',
    env_detail: 'Ambiente de desarrollo',
    env_responsible: 'BOT ctrl radicado demanda',
};

/** Ejemplo JSON para actualizar. El env_id va solo en la URL (path), no en el body. */
const updateExampleSchema = {
    env_type: 'dev',
    env_detail: 'Ambiente de desarrollo',
    env_responsible: 'BOT ctrl radicado demanda',
};

@ApiTags('tbl_environment_type')
@Controller('tbl_environment_type')
export class TblEnvironmentTypeController {
    constructor(private readonly tblEnvironmentTypeService: TblEnvironmentTypeService) {}

    // Crear un nuevo tipo de entorno
    @Post()
    @ApiOperation({ summary: 'Crear un nuevo tipo de entorno' })
    @ApiBody({
        description: 'El JSON de abajo sirve de guía.',
        schema: { allOf: [{ $ref: getSchemaPath(TblEnvironmentTypeDto) }], example: createExampleSchema },
    })
    async create(@Body() dto: TblEnvironmentTypeDto) {
        const created = await this.tblEnvironmentTypeService.create(dto as CreateTblEnvironmentTypeInput);
        return dataOne(created);
    }

    // Listado simple para selects (env_id + label_name)
    @Get('options')
    @ApiOperation({ summary: 'Obtener opciones de tipos de entorno para selects' })
    async options() {
        const all = await this.tblEnvironmentTypeService.findAll();
        const items = all.map((item) => ({ env_id: item.env_id, label_name: item.env_type }));
        return dataMany(items);
    }

    // Obtener un tipo de entorno por su env_type (debe ir antes de :id para evitar conflictos de ruta)
    @Get('type/:type')
    @ApiOperation({ summary: 'Obtener un tipo de entorno por su env_type' })
    async findByType(@Param('type') type: string) {
        const item = await this.tblEnvironmentTypeService.findByType(type);
        return dataOne(item);
    }

    // Obtener todos los tipos de entorno
    @Get()
    @ApiOperation({ summary: 'Obtener todos los tipos de entorno' })
    @ApiQuery({ name: 'start_date', required: false, type: String, description: 'Fecha inicial de creación (YYYY-MM-DD).' })
    @ApiQuery({ name: 'end_date', required: false, type: String, description: 'Fecha final de creación (YYYY-MM-DD).' })
    @ApiQuery({ name: 'env_type', required: false, type: String, description: 'Filtrar por env_type (búsqueda parcial, opcional).' })
    @ApiQuery({ name: 'page', required: false, type: Number, description: 'Número de página (>=1).' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Registros por página (>=1).' })
    async findAll(
        @Query('start_date') start_date?: string,
        @Query('end_date') end_date?: string,
        @Query('env_type') env_type?: string,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
    ): Promise<PaginatedResult<TblEnvironmentTypeDto>> {
        const all = await this.tblEnvironmentTypeService.findAll();

        const parseDate = (value?: string): Date | undefined => {
            if (!value) return undefined;
            const d = new Date(value);
            return Number.isNaN(d.getTime()) ? undefined : d;
        };

        const start = parseDate(start_date);
        const end = parseDate(end_date);
        const normalizedType = env_type?.trim().toLowerCase() || '';

        const byDate = all.filter((item) => {
            const created = item.env_created_at ? new Date(item.env_created_at) : undefined;
            if (!created || Number.isNaN(created.getTime())) return true;
            if (start && created < start) return false;
            if (end && created > end) return false;
            return true;
        });

        const byFilters = byDate.filter((item) => {
            if (normalizedType && !item.env_type.toLowerCase().includes(normalizedType)) return false;
            return true;
        });

        return paginateArray(byFilters, page, limit);
    }

    // Obtener un tipo de entorno por su env_id
    @Get(':id')
    @ApiOperation({ summary: 'Obtener un tipo de entorno por su env_id' })
    async findById(@Param('id') id: number) {
        const item = await this.tblEnvironmentTypeService.findById(id);
        return dataOne(item);
    }

    // Actualizar un tipo de entorno
    @Put(':id')
    @ApiOperation({ summary: 'Actualizar un tipo de entorno' })
    @ApiBody({
        description: 'El JSON de abajo sirve de guía.',
        schema: { allOf: [{ $ref: getSchemaPath(UpdateTblEnvironmentTypeDto) }], example: updateExampleSchema },
    })
    async update(@Param('id') id: number, @Body() body: UpdateTblEnvironmentTypeDto): Promise<TblEnvironmentTypeDto> {
        return this.tblEnvironmentTypeService.update({ ...body, env_id: Number(id) } as TblEnvironmentType);
    }

    // Eliminar un tipo de entorno
    @Delete(':id')
    @ApiOperation({ summary: 'Eliminar un tipo de entorno' })
    async delete(@Param('id') id: number) {
        await this.tblEnvironmentTypeService.delete(id);
        return dataEmpty();
    }
}

