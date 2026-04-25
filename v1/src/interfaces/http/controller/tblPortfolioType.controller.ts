// Responsabilidad: endpoints HTTP de Nest (controller).

import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiQuery, ApiTags, getSchemaPath } from '@nestjs/swagger';
import { TblPortfolioTypeDto, UpdateTblPortfolioTypeDto } from '../dto/tblPortfolioType.dto';
import { TblPortfolioTypeService } from '@application/services/tblPortfolioType.service';
import { TblPortfolioType } from '@domain/entities/tblPortfolioType.entities';
import { CreateTblPortfolioTypeInput } from '@domain/ports/tblPortfolioType.ports';
import { userMsg } from '@application/utils/apiUserMessages.utils';
import { getListQueryDateRange } from '@application/utils/listQueryDateRange.utils';
import { PaginatedResult, paginateArray } from '@application/utils/pagination.utils';
import { dataMany, dataOne } from '@application/utils/response.utils';

const createExampleSchema = {
    porty_type: 'Propias',
    porty_detail: 'Propias registered',
    porty_state_type_id: 1,
    porty_responsible: 'BOT ctrl radicado demanda',
};

const updateExampleSchema = {
    porty_type: 'Propias',
    porty_detail: 'Propias registered',
    porty_state_type_id: 1,
    porty_responsible: 'BOT ctrl radicado demanda',
};

@ApiTags('portfolioType')
@Controller('portfolioType')
export class TblPortfolioTypeController {
    constructor(private readonly portfolioTypeService: TblPortfolioTypeService) {}

    @Post('crear')
    @ApiOperation({ summary: 'Crear un nuevo tipo de cartera' })
    @ApiBody({
        description: 'El JSON de abajo sirve de guía.',
        schema: { allOf: [{ $ref: getSchemaPath(TblPortfolioTypeDto) }], example: createExampleSchema },
    })
    async create(@Body() dto: TblPortfolioTypeDto) {
        const created = await this.portfolioTypeService.create(dto as CreateTblPortfolioTypeInput);
        const full = await this.portfolioTypeService.findById(created.porty_id);
        return { data: [this.toPortfolioRow(full)], message: 'Registro creado correctamente' };
    }

    @Get('opciones')
    @ApiOperation({ summary: 'Obtener opciones de tipos de cartera para selects (porty_id, label_name)' })
    async options() {
        const all = await this.portfolioTypeService.findAll();
        const items = all.map((item) => ({ porty_id: item.porty_id, label_name: item.porty_type }));
        return dataMany(items);
    }

    @Get('opcionesActivas')
    @ApiOperation({ summary: 'Obtener opciones de carteras activas para selects (porty_id, label_name = porty_type)' })
    async optionsActive() {
        const all = await this.portfolioTypeService.findAllActive();
        const items = all.map((item) => ({ porty_id: item.porty_id, label_name: item.porty_type }));
        return dataMany(items);
    }

    @Get('listar')
    @ApiOperation({ summary: 'Listar tipos de cartera con filtros opcionales' })
    @ApiQuery({ name: 'start_date', required: false, type: String, description: 'Fecha inicial de creación (YYYY-MM-DD).' })
    @ApiQuery({ name: 'end_date', required: false, type: String, description: 'Fecha final de creación (YYYY-MM-DD).' })
    @ApiQuery({ name: 'porty_type', required: false, type: String, description: 'Filtrar por porty_type (búsqueda parcial, opcional).' })
    @ApiQuery({ name: 'porty_state_type_id', required: false, type: Number, description: 'Filtrar por stty_id del tipo de estado (opcional).' })
    @ApiQuery({ name: 'page', required: false, type: Number, description: 'Número de página (>=1).' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Registros por página (>=1).' })
    async findAll(
        @Query('start_date') start_date?: string,
        @Query('end_date') end_date?: string,
        @Query('porty_type') porty_type?: string,
        @Query('porty_state_type_id') porty_state_type_id?: number,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
    ): Promise<PaginatedResult<TblPortfolioTypeDto>> {
        const all = await this.portfolioTypeService.findAll();

        const { start, end } = getListQueryDateRange(start_date, end_date);
        const normalizedType = porty_type?.trim().toLowerCase() || '';

        const byDate = all.filter((item) => {
            const created = item.porty_created_at ? new Date(item.porty_created_at) : undefined;
            if (!created || Number.isNaN(created.getTime())) return true;
            if (start && created < start) return false;
            if (end && created > end) return false;
            return true;
        });

        const filtered = byDate.filter((item) => {
            const normalizedStateId =
                porty_state_type_id === undefined || porty_state_type_id === null
                    ? undefined
                    : (() => {
                          const n =
                              typeof porty_state_type_id === 'number'
                                  ? porty_state_type_id
                                  : Number(porty_state_type_id as unknown);
                          if (!Number.isFinite(n) || n <= 0) return undefined;
                          return Math.floor(n);
                      })();
            if (normalizedType && !item.porty_type.toLowerCase().includes(normalizedType)) return false;
            if (normalizedStateId !== undefined && Number(item.porty_state_type_id) !== normalizedStateId) return false;
            return true;
        });

        return paginateArray(
            filtered.map((p) => this.toPortfolioRow(p)),
            page,
            limit,
        ) as unknown as PaginatedResult<TblPortfolioTypeDto>;
    }

    @Get('filtrar/:id')
    @ApiOperation({ summary: 'Obtener un tipo de cartera por su porty_id' })
    async findById(@Param('id') id: string) {
        const numId = Number(id);
        if (!Number.isInteger(numId) || numId <= 0) {
            throw new BadRequestException(userMsg.idUrlEntero);
        }
        const item = await this.portfolioTypeService.findById(numId);
        return dataOne(this.toPortfolioRow(item));
    }

    @Put('actualizar/:id')
    @ApiOperation({ summary: 'Actualizar un tipo de cartera por su porty_id (campos vía query)' })
    @ApiQuery({ name: 'porty_type', required: true, type: String, description: 'Tipo de cartera', example: updateExampleSchema.porty_type })
    @ApiQuery({ name: 'porty_detail', required: true, type: String, description: 'Descripción de la cartera', example: updateExampleSchema.porty_detail })
    @ApiQuery({ name: 'porty_state_type_id', required: true, type: Number, description: 'ID del tipo de estado', example: updateExampleSchema.porty_state_type_id })
    @ApiQuery({ name: 'porty_responsible', required: true, type: String, description: 'Responsable de la gestión', example: updateExampleSchema.porty_responsible })
    async update(@Param('id') id: string, @Query() query: UpdateTblPortfolioTypeDto) {
        const numId = Number(id);
        if (!Number.isInteger(numId) || numId <= 0) {
            throw new BadRequestException(userMsg.idUrlEntero);
        }
        await this.portfolioTypeService.update({ ...query, porty_id: numId } as TblPortfolioType);
        return { data: null, message: 'Registro actualizado correctamente' };
    }

    @Delete('eliminar/:id')
    @ApiOperation({ summary: 'Eliminar un tipo de cartera por su porty_id' })
    async delete(@Param('id') id: string) {
        const numId = Number(id);
        if (!Number.isInteger(numId) || numId <= 0) {
            throw new BadRequestException(userMsg.idUrlEntero);
        }
        await this.portfolioTypeService.delete(numId);
        return { data: null, message: 'Registro eliminado correctamente' };
    }

    /** Misma fila, orden e includes que listar (incl. state_type_name). */
    private toPortfolioRow(p: TblPortfolioType): Record<string, unknown> {
        const o: Record<string, unknown> = {
            porty_id: p.porty_id,
            porty_type: p.porty_type,
            porty_detail: p.porty_detail,
            porty_state_type_id: p.porty_state_type_id,
        };
        if (p.state_type_name != null && String(p.state_type_name).length > 0) {
            o.state_type_name = p.state_type_name;
        }
        o.porty_created_at = p.porty_created_at;
        o.porty_updated_at = p.porty_updated_at;
        o.porty_responsible = p.porty_responsible;
        return o;
    }
}
