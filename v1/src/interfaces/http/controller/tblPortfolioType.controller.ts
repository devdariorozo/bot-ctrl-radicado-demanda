// Responsabilidad: endpoints HTTP de Nest (controller).

import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiQuery, ApiTags, getSchemaPath } from '@nestjs/swagger';
import { TblPortfolioTypeDto, UpdateTblPortfolioTypeDto } from '../dto/tblPortfolioType.dto';
import { TblPortfolioTypeService } from '@application/services/tblPortfolioType.service';
import { TblPortfolioType } from '@domain/entities/tblPortfolioType.entities';
import { CreateTblPortfolioTypeInput } from '@domain/ports/tblPortfolioType.ports';
import { PaginatedResult, paginateArray } from '@application/utils/pagination.utils';
import { dataEmpty, dataMany, dataOne } from '@application/utils/response.utils';

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

@ApiTags('tbl_portfolio_type')
@Controller('tbl_portfolio_type')
export class TblPortfolioTypeController {
    constructor(private readonly portfolioTypeService: TblPortfolioTypeService) {}

    @Post()
    @ApiOperation({ summary: 'Crear un nuevo tipo de cartera' })
    @ApiBody({
        description: 'El JSON de abajo sirve de guía.',
        schema: { allOf: [{ $ref: getSchemaPath(TblPortfolioTypeDto) }], example: createExampleSchema },
    })
    async create(@Body() dto: TblPortfolioTypeDto) {
        const created = await this.portfolioTypeService.create(dto as CreateTblPortfolioTypeInput);
        return dataOne(created);
    }

    @Get('options')
    @ApiOperation({ summary: 'Obtener opciones de tipos de cartera para selects' })
    async options() {
        const all = await this.portfolioTypeService.findAll();
        const items = all.map((item) => ({ id: item.porty_id, label_name: item.porty_type }));
        return dataMany(items);
    }

    @Get('type/:type')
    @ApiOperation({ summary: 'Obtener un tipo de cartera por su tipo' })
    async findByType(@Param('type') type: string) {
        const item = await this.portfolioTypeService.findByType(type);
        return dataOne(item);
    }

    @Get()
    @ApiOperation({ summary: 'Obtener todos los tipos de cartera' })
    @ApiQuery({ name: 'start_date', required: false, type: String, description: 'Fecha inicial de creación (YYYY-MM-DD).' })
    @ApiQuery({ name: 'end_date', required: false, type: String, description: 'Fecha final de creación (YYYY-MM-DD).' })
    @ApiQuery({ name: 'porty_type', required: false, type: String, description: 'Filtrar por porty_type (búsqueda parcial, opcional)' })
    @ApiQuery({ name: 'porty_state_type_id', required: false, type: Number, description: 'Filtrar por porty_state_type_id (opcional)' })
    @ApiQuery({ name: 'page', required: false, type: Number, description: 'Número de página (>=1)' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Registros por página (>=1)' })
    async findAll(
        @Query('start_date') start_date?: string,
        @Query('end_date') end_date?: string,
        @Query('porty_type') porty_type?: string,
        @Query('porty_state_type_id') porty_state_type_id?: number,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
    ): Promise<PaginatedResult<TblPortfolioTypeDto>> {
        const all = await this.portfolioTypeService.findAll();

        const parseDate = (value?: string): Date | undefined => {
            if (!value) return undefined;
            const d = new Date(value);
            return Number.isNaN(d.getTime()) ? undefined : d;
        };

        const start = parseDate(start_date);
        const end = parseDate(end_date);
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

        return paginateArray(filtered, page, limit);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Obtener un tipo de cartera por su id' })
    async findById(@Param('id') id: number) {
        const item = await this.portfolioTypeService.findById(id);
        return dataOne(item);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Actualizar un tipo de cartera' })
    @ApiBody({
        description: 'El JSON de abajo sirve de guía.',
        schema: { allOf: [{ $ref: getSchemaPath(UpdateTblPortfolioTypeDto) }], example: updateExampleSchema },
    })
    async update(@Param('id') id: number, @Body() body: UpdateTblPortfolioTypeDto) {
        const updated = await this.portfolioTypeService.update({ ...body, porty_id: Number(id) } as TblPortfolioType);
        return dataOne(updated);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Eliminar un tipo de cartera' })
    async delete(@Param('id') id: number) {
        await this.portfolioTypeService.delete(id);
        return dataEmpty();
    }
}
