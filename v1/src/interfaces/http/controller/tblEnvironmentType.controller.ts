// Responsabilidad: endpoints HTTP de Nest (controller).

import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiQuery, ApiTags, getSchemaPath } from '@nestjs/swagger';
import { TblEnvironmentTypeDto, UpdateTblEnvironmentTypeDto } from '../dto/tblEnvironmentType.dto';
import { TblEnvironmentTypeService } from '@application/services/tblEnvironmentType.service';
import { TblEnvironmentType } from '@domain/entities/tblEnvironmentType.entities';
import { CreateTblEnvironmentTypeInput } from '@domain/ports/tblEnvironmentType.ports';
import { userMsg } from '@application/utils/apiUserMessages.utils';
import { getListQueryDateRange } from '@application/utils/listQueryDateRange.utils';
import { PaginatedResult, paginateArray } from '@application/utils/pagination.utils';
import { dataMany, dataOne } from '@application/utils/response.utils';

const createExampleSchema = {
    env_type: 'dev',
    env_detail: 'Ambiente de desarrollo',
    env_responsible: 'BOT ctrl radicado demanda',
};

const updateExampleSchema = {
    env_type: 'dev',
    env_detail: 'Ambiente de desarrollo',
    env_responsible: 'BOT ctrl radicado demanda',
};

@ApiTags('environmentType')
@Controller('environmentType')
export class TblEnvironmentTypeController {
    constructor(private readonly tblEnvironmentTypeService: TblEnvironmentTypeService) {}

    @Post('crear')
    @ApiOperation({ summary: 'Crear un nuevo tipo de entorno' })
    @ApiBody({
        description: 'El JSON de abajo sirve de guía.',
        schema: { allOf: [{ $ref: getSchemaPath(TblEnvironmentTypeDto) }], example: createExampleSchema },
    })
    async create(@Body() dto: TblEnvironmentTypeDto) {
        const created = await this.tblEnvironmentTypeService.create(dto as CreateTblEnvironmentTypeInput);
        return { data: [this.toEnvironmentRow(created)], message: 'Registro creado correctamente' };
    }

    @Get('opciones')
    @ApiOperation({ summary: 'Obtener opciones de tipos de entorno para selects (env_id, label_name)' })
    async options() {
        const all = await this.tblEnvironmentTypeService.findAll();
        const items = all.map((item) => ({ env_id: item.env_id, label_name: item.env_type }));
        return dataMany(items);
    }

    @Get('listar')
    @ApiOperation({ summary: 'Listar todos los tipos de entorno con filtros opcionales' })
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

        const { start, end } = getListQueryDateRange(start_date, end_date);
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

        return paginateArray(
            byFilters.map((e) => this.toEnvironmentRow(e)),
            page,
            limit,
        ) as unknown as PaginatedResult<TblEnvironmentTypeDto>;
    }

    @Get('filtrar/:id')
    @ApiOperation({ summary: 'Obtener un tipo de entorno por su env_id' })
    async findById(@Param('id') id: string) {
        const numId = Number(id);
        if (!Number.isInteger(numId) || numId <= 0) {
            throw new BadRequestException(userMsg.idUrlEntero);
        }
        const item = await this.tblEnvironmentTypeService.findById(numId);
        return dataOne(this.toEnvironmentRow(item));
    }

    @Put('actualizar/:id')
    @ApiOperation({ summary: 'Actualizar un tipo de entorno por su env_id' })
    @ApiBody({
        description: 'El JSON de abajo sirve de guía.',
        schema: { allOf: [{ $ref: getSchemaPath(UpdateTblEnvironmentTypeDto) }], example: updateExampleSchema },
    })
    async update(@Param('id') id: string, @Body() body: UpdateTblEnvironmentTypeDto) {
        const numId = Number(id);
        if (!Number.isInteger(numId) || numId <= 0) {
            throw new BadRequestException(userMsg.idUrlEntero);
        }
        await this.tblEnvironmentTypeService.update({ ...body, env_id: numId } as TblEnvironmentType);
        return { data: null, message: 'Registro actualizado correctamente' };
    }

    @Delete('eliminar/:id')
    @ApiOperation({ summary: 'Eliminar un tipo de entorno por su env_id' })
    async delete(@Param('id') id: string) {
        const numId = Number(id);
        if (!Number.isInteger(numId) || numId <= 0) {
            throw new BadRequestException(userMsg.idUrlEntero);
        }
        await this.tblEnvironmentTypeService.delete(numId);
        return { data: null, message: 'Registro eliminado correctamente' };
    }

    /** Misma fila y orden: crear / listar / filtrar. Orden = tabla. */
    private toEnvironmentRow(e: TblEnvironmentType): Record<string, unknown> {
        return {
            env_id: e.env_id,
            env_type: e.env_type,
            env_detail: e.env_detail,
            env_created_at: e.env_created_at,
            env_updated_at: e.env_updated_at,
            env_responsible: e.env_responsible,
        };
    }
}
