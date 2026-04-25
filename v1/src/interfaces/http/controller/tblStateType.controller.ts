// Responsabilidad: endpoints HTTP de Nest (controller).

import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiQuery, ApiTags, getSchemaPath } from '@nestjs/swagger';
import { TblStateTypeDto, UpdateTblStateTypeDto } from '../dto/tblStateType.dto';
import { TblStateTypeService } from '@application/services/tblStateType.service';
import { TblStateType } from '@domain/entities/tblStateType.entities';
import { CreateTblStateTypeInput } from '@domain/ports/tblStateType.ports';
import { userMsg } from '@application/utils/apiUserMessages.utils';
import { getListQueryDateRange } from '@application/utils/listQueryDateRange.utils';
import { PaginatedResult, paginateArray } from '@application/utils/pagination.utils';
import { dataMany, dataOne } from '@application/utils/response.utils';

const createExampleSchema = {
    stty_type: 'Activo',
    stty_detail: 'Registro activo en el sistema',
    stty_responsible: 'BOT ctrl radicado demanda',
};

const updateExampleSchema = {
    stty_type: 'Activo',
    stty_detail: 'Registro activo en el sistema',
    stty_responsible: 'BOT ctrl radicado demanda',
};

@ApiTags('stateType')
@Controller('stateType')
export class TblStateTypeController {
    constructor(private readonly tblStateTypeService: TblStateTypeService) {}

    @Post('crear')
    @ApiOperation({ summary: 'Crear un nuevo tipo de estado' })
    @ApiBody({
        description: 'El JSON de abajo sirve de guía.',
        schema: { allOf: [{ $ref: getSchemaPath(TblStateTypeDto) }], example: createExampleSchema },
    })
    async create(@Body() dto: TblStateTypeDto) {
        const created = await this.tblStateTypeService.create(dto as CreateTblStateTypeInput);
        return { data: [this.toStateTypeRow(created)], message: 'Registro creado correctamente' };
    }

    @Get('opciones')
    @ApiOperation({ summary: 'Obtener opciones de tipos de estado para selects (stty_id, label_name)' })
    async options() {
        const all = await this.tblStateTypeService.findAll();
        const items = all.map((item) => ({ stty_id: item.stty_id, label_name: item.stty_type }));
        return dataMany(items);
    }

    @Get('opcionesActivas')
    @ApiOperation({ summary: 'Obtener opciones de tipos de estado activos para selects (stty_id, label_name)' })
    async optionsActive() {
        const all = await this.tblStateTypeService.findAllActive();
        const items = all.map((item) => ({ stty_id: item.stty_id, label_name: item.stty_type }));
        return dataMany(items);
    }

    @Get('listar')
    @ApiOperation({ summary: 'Listar todos los tipos de estado con filtros opcionales' })
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

        const { start, end } = getListQueryDateRange(start_date, end_date);
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

        return paginateArray(
            byFilters.map((s) => this.toStateTypeRow(s)),
            page,
            limit,
        ) as unknown as PaginatedResult<TblStateTypeDto>;
    }

    @Get('filtrar/:id')
    @ApiOperation({ summary: 'Obtener un tipo de estado por su stty_id' })
    async findById(@Param('id') id: string) {
        const numId = Number(id);
        if (!Number.isInteger(numId) || numId <= 0) {
            throw new BadRequestException(userMsg.idUrlEntero);
        }
        const item = await this.tblStateTypeService.findById(numId);
        return dataOne(this.toStateTypeRow(item));
    }

    @Put('actualizar/:id')
    @ApiOperation({ summary: 'Actualizar un tipo de estado por su stty_id (campos vía query)' })
    @ApiQuery({ name: 'stty_type', required: true, type: String, description: 'Tipo de estado', example: updateExampleSchema.stty_type })
    @ApiQuery({ name: 'stty_detail', required: true, type: String, description: 'Descripción del estado', example: updateExampleSchema.stty_detail })
    @ApiQuery({ name: 'stty_responsible', required: true, type: String, description: 'Responsable de la gestión', example: updateExampleSchema.stty_responsible })
    async update(@Param('id') id: string, @Query() query: UpdateTblStateTypeDto) {
        const numId = Number(id);
        if (!Number.isInteger(numId) || numId <= 0) {
            throw new BadRequestException(userMsg.idUrlEntero);
        }
        await this.tblStateTypeService.update({ ...query, stty_id: numId } as TblStateType);
        return { data: null, message: 'Registro actualizado correctamente' };
    }

    @Delete('eliminar/:id')
    @ApiOperation({ summary: 'Eliminar un tipo de estado por su stty_id' })
    async delete(@Param('id') id: string) {
        const numId = Number(id);
        if (!Number.isInteger(numId) || numId <= 0) {
            throw new BadRequestException(userMsg.idUrlEntero);
        }
        await this.tblStateTypeService.delete(numId);
        return { data: null, message: 'Registro eliminado correctamente' };
    }

    /** Misma fila y orden: crear / listar / filtrar. */
    private toStateTypeRow(s: TblStateType): Record<string, unknown> {
        return {
            stty_id: s.stty_id,
            stty_type: s.stty_type,
            stty_detail: s.stty_detail,
            stty_created_at: s.stty_created_at,
            stty_updated_at: s.stty_updated_at,
            stty_responsible: s.stty_responsible,
        };
    }
}
