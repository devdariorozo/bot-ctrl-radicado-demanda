// Responsabilidad: endpoints HTTP de Nest (controller).

import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiQuery, ApiTags, getSchemaPath } from '@nestjs/swagger';
import { TblStateTypeDto, UpdateTblStateTypeDto } from '../dto/tblStateType.dto';
import { TblStateTypeService } from '@application/services/tblStateType.service';
import { TblStateType } from '@domain/entities/tblStateType.entities';
import { CreateTblStateTypeInput } from '@domain/ports/tblStateType.ports';
import { PaginatedResult, paginateArray } from '@application/utils/pagination.utils';
import { dataEmpty, dataMany, dataOne } from '@application/utils/response.utils';

/** Ejemplo JSON que Swagger muestra por defecto en el body (guía visual para quien use la API). */
const createExampleSchema = {
    stty_type: 'Active',
    stty_detail: 'Registro activo',
    stty_responsible: 'BOT ctrl radicado demanda',
};

/** Ejemplo JSON para actualizar. El stty_id va solo en la URL (path), no en el body. */
const updateExampleSchema = {
    stty_type: 'Active',
    stty_detail: 'Registro activo',
    stty_responsible: 'BOT ctrl radicado demanda',
};

@ApiTags('tbl_state_type')
@Controller('tbl_state_type')
export class TblStateTypeController {
    constructor(private readonly tblStateTypeService: TblStateTypeService) {}

    // Crear un nuevo tipo de estado
    @Post()
    @ApiOperation({ summary: 'Crear un nuevo tipo de estado' })
    @ApiBody({
        description: 'El JSON de abajo sirve de guía.',
        schema: { allOf: [{ $ref: getSchemaPath(TblStateTypeDto) }], example: createExampleSchema },
    })
    async create(@Body() dto: TblStateTypeDto) {
        const created = await this.tblStateTypeService.create(dto as CreateTblStateTypeInput);
        return dataOne(created);
    }

    // Listado simple para selects (stty_id + label_name)
    @Get('options')
    @ApiOperation({ summary: 'Obtener opciones de tipos de estado para selects' })
    async options() {
        const all = await this.tblStateTypeService.findAll();
        const items = all.map((item) => ({ stty_id: item.stty_id, label_name: item.stty_type }));
        return dataMany(items);
    }

    // Obtener un tipo de estado por su stty_type (debe ir antes de :id para evitar conflictos de ruta)
    @Get('type/:type')
    @ApiOperation({ summary: 'Obtener un tipo de estado por su stty_type' })
    async findByType(@Param('type') type: string) {
        const item = await this.tblStateTypeService.findByType(type);
        return dataOne(item);
    }

    // Obtener todos los tipos de estado
    @Get()
    @ApiOperation({ summary: 'Obtener todos los tipos de estado' })
    @ApiQuery({ name: 'start_date', required: false, type: String, description: 'Fecha inicial de creación (YYYY-MM-DD).' })
    @ApiQuery({ name: 'end_date', required: false, type: String, description: 'Fecha final de creación (YYYY-MM-DD).' })
    @ApiQuery({ name: 'stty_type', required: false, type: String, description: 'Filtrar por stty_type (búsqueda parcial, opcional).' })
    @ApiQuery({ name: 'page', required: false, type: Number, description: 'Número de página (>=1).' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Registros por página (>=1).' })
    async findAll(
        @Query('start_date') start_date?: string,
        @Query('end_date') end_date?: string,
        @Query('stty_type') stty_type?: string,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
    ): Promise<PaginatedResult<TblStateTypeDto>> {
        const all = await this.tblStateTypeService.findAll();

        const parseDate = (value?: string): Date | undefined => {
            if (!value) return undefined;
            const d = new Date(value);
            return Number.isNaN(d.getTime()) ? undefined : d;
        };

        const start = parseDate(start_date);
        const end = parseDate(end_date);
        const normalizedType = stty_type?.trim().toLowerCase() || '';

        const byDate = all.filter((item) => {
            const created = item.stty_created_at ? new Date(item.stty_created_at) : undefined;
            if (!created || Number.isNaN(created.getTime())) return true;
            if (start && created < start) return false;
            if (end && created > end) return false;
            return true;
        });

        const byFilters = byDate.filter((item) => {
            if (normalizedType && !item.stty_type.toLowerCase().includes(normalizedType)) return false;
            return true;
        });

        return paginateArray(byFilters, page, limit);
    }

    // Obtener un tipo de estado por su stty_id
    @Get(':id')
    @ApiOperation({ summary: 'Obtener un tipo de estado por su stty_id' })
    async findById(@Param('id') id: number) {
        const item = await this.tblStateTypeService.findById(id);
        return dataOne(item);
    }

    // Actualizar un tipo de estado
    @Put(':id')
    @ApiOperation({ summary: 'Actualizar un tipo de estado' })
    @ApiBody({
        description: 'El JSON de abajo sirve de guía.',
        schema: { allOf: [{ $ref: getSchemaPath(UpdateTblStateTypeDto) }], example: updateExampleSchema },
    })
    async update(@Param('id') id: number, @Body() body: UpdateTblStateTypeDto): Promise<TblStateTypeDto> {
        return this.tblStateTypeService.update({ ...body, stty_id: Number(id) } as TblStateType);
    }

    // Eliminar un tipo de estado
    @Delete(':id')
    @ApiOperation({ summary: 'Eliminar un tipo de estado' })
    async delete(@Param('id') id: number) {
        await this.tblStateTypeService.delete(id);
        return dataEmpty();
    }
}