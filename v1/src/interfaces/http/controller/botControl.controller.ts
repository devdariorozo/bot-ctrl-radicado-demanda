// Responsabilidad: controller HTTP para botControl.

import {
  Body,
  Controller,
  Get,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBody,
  ApiExtraModels,
  ApiOperation,
  ApiQuery,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { BotControlService } from '@application/services/botControl.service';
import { CartPropiasDemandsSyncService } from '@application/services/cartPropiasDemandsSyncService.service';
import { CartPropiasManagementCycleService } from '@application/services/cartPropiasManagementCycle.service';
import { IniciarBotControlDto, DetenerBotControlDto } from '../dto/botControl.dto';
import { getListQueryDateRange } from '@application/utils/listQueryDateRange.utils';
import { paginateArray } from '@application/utils/pagination.utils';
import { BotControl } from '@domain/entities/botControl.entities';

@ApiTags('botControl')
@ApiExtraModels(IniciarBotControlDto, DetenerBotControlDto)
@Controller('botControl')
export class BotControlController {
  constructor(
    private readonly botControlService: BotControlService,
    private readonly cartPropiasDemandsSyncService: CartPropiasDemandsSyncService,
    private readonly cartPropiasManagementCycleService: CartPropiasManagementCycleService,
  ) {}

  @Post('iniciar')
  @ApiOperation({ summary: 'Iniciar el bot para una base de datos' })
  @ApiBody({
    description: 'El JSON de abajo sirve de guía.',
    schema: {
      allOf: [{ $ref: getSchemaPath(IniciarBotControlDto) }],
      example: {
        bctrl_data_bases_id: 1,
        bctrl_reason: 'Bot iniciado',
        bctrl_detail: 'Bot iniciado correctamente.',
        bctrl_responsible: 'BOT ctrl radicado demanda',
      },
    },
  })
  async iniciar(@Body() dto: IniciarBotControlDto) {
    const record = await this.botControlService.iniciar({
      bctrl_data_bases_id: dto.bctrl_data_bases_id,
      bctrl_running: true,
      bctrl_reason: dto.bctrl_reason ?? 'Bot iniciado',
      bctrl_detail: dto.bctrl_detail,
      bctrl_responsible: dto.bctrl_responsible,
    });
    void this.cartPropiasDemandsSyncService.tick();
    void this.cartPropiasManagementCycleService.tick();
    return { data: [this.toRow(record)], message: 'Bot iniciado correctamente' };
  }

  @Post('detener')
  @ApiOperation({ summary: 'Detener el bot para una base de datos' })
  @ApiBody({
    description: 'El JSON de abajo sirve de guía.',
    schema: {
      allOf: [{ $ref: getSchemaPath(DetenerBotControlDto) }],
      example: {
        bctrl_data_bases_id: 1,
        bctrl_reason: 'Bot detenido',
        bctrl_detail: 'Bot detenido correctamente.',
        bctrl_responsible: 'BOT ctrl radicado demanda',
      },
    },
  })
  async detener(@Body() dto: DetenerBotControlDto) {
    await this.botControlService.detener(
      dto.bctrl_data_bases_id,
      dto.bctrl_reason ?? 'Bot detenido',
      dto.bctrl_responsible,
      dto.bctrl_detail,
    );
    return { data: null, message: 'Bot detenido correctamente' };
  }

  @Get('listar')
  @ApiOperation({ summary: 'Listar historial de control del bot con filtros opcionales' })
  @ApiQuery({ name: 'start_date', required: false, type: String, description: 'Fecha inicial de creación (YYYY-MM-DD).' })
  @ApiQuery({ name: 'end_date', required: false, type: String, description: 'Fecha final de creación (YYYY-MM-DD).' })
  @ApiQuery({ name: 'bctrl_data_bases_id', required: false, type: Number, description: 'Filtrar por ID de base de datos.' })
  @ApiQuery({ name: 'bctrl_running', required: false, type: Number, description: 'Filtrar por estado de ejecución (0=detenido, 1=en ejecución).' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Número de página (>=1).' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Registros por página (>=1).' })
  async listar(
    @Query('start_date') start_date?: string,
    @Query('end_date') end_date?: string,
    @Query('bctrl_data_bases_id') bctrl_data_bases_id?: string,
    @Query('bctrl_running') bctrl_running?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const { start, end } = getListQueryDateRange(start_date, end_date);

    const items = await this.botControlService.findAll({
      start_date: start,
      end_date: end,
      bctrl_data_bases_id: parseOptionalId(bctrl_data_bases_id),
      bctrl_running: bctrl_running !== undefined && bctrl_running !== '' ? bctrl_running === '1' : undefined,
    });

    return paginateArray(items.map((item) => this.toRow(item)), page, limit);
  }

  private toRow(item: BotControl): Record<string, unknown> {
    return {
      bctrl_id: item.bctrl_id,
      bctrl_data_bases_id: item.bctrl_data_bases_id,
      environment_type_name: item.environment_type_name ?? null,
      portfolio_type_name: item.portfolio_type_name ?? null,
      bctrl_running: item.bctrl_running,
      bctrl_last_started_at: this.formatDate(item.bctrl_last_started_at),
      bctrl_last_stopped_at: this.formatDate(item.bctrl_last_stopped_at),
      bctrl_reason: item.bctrl_reason,
      bctrl_detail: item.bctrl_detail,
      bctrl_created_at: this.formatDate(item.bctrl_created_at),
      bctrl_updated_at: this.formatDate(item.bctrl_updated_at),
      bctrl_responsible: item.bctrl_responsible,
    };
  }

  private formatDate(value: Date | null | undefined): string | null {
    if (!value) return null;
    return value instanceof Date
      ? value.toISOString().replace('T', ' ').slice(0, 19)
      : String(value).replace('T', ' ').slice(0, 19);
  }
}

function parseOptionalId(value: unknown): number | undefined {
  if (value === undefined || value === null || (value as string) === '') return undefined;
  const n = typeof value === 'number' ? value : Number(value as string);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return Math.floor(n);
}
