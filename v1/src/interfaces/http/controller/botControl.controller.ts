// Responsabilidad: endpoints HTTP para controlar el bot (start/stop/status).

import { Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { BotControlService, BotStatus } from '@application/services/botControl.service';
import { DemandsPendingSyncService } from '@application/services/demandsPendingSync.service';
import { dataOne, dataMany } from '@application/utils/response.utils';

@ApiTags('botControl')
@Controller('bot_control')
export class BotControlController {
  constructor(
    private readonly botControlService: BotControlService,
    private readonly demandsPendingSyncService: DemandsPendingSyncService,
  ) {}

  @Post('start')
  @ApiOperation({ summary: 'Iniciar el bot de demandas en línea' })
  @ApiQuery({
    name: 'data_bases_id',
    required: true,
    type: Number,
    description: 'ID de la configuración de bases (data_bases.id) que se desea activar para el bot',
  })
  async start(@Query('data_bases_id') data_bases_id?: number) {
    const status: BotStatus = await this.botControlService.start(
      data_bases_id !== undefined ? Number(data_bases_id) : undefined,
    );
    if (status.running) {
      // Ejecutar una sincronización inmediata de demandas pendientes al iniciar el bot.
      void this.demandsPendingSyncService.tick();
    }
    return dataOne(status);
  }

  @Post('stop')
  @ApiOperation({ summary: 'Detener el bot de demandas en línea' })
  @ApiQuery({
    name: 'data_bases_id',
    required: true,
    type: Number,
    description:
      'ID de data_bases a detener (obligatorio); el bot solo detiene la configuración indicada',
  })
  async stop(@Query('data_bases_id') data_bases_id?: number) {
    const status: BotStatus = await this.botControlService.stop(
      data_bases_id !== undefined ? Number(data_bases_id) : undefined,
    );
    return dataOne(status);
  }

  @Get('status')
  @ApiOperation({ summary: 'Consultar el estado actual del bot' })
  @ApiQuery({
    name: 'data_bases_id',
    required: false,
    type: Number,
    description:
      'ID de data_bases para consultar estado; si se omite, devuelve el estado global de la configuración activa (si existe)',
  })
  async status(@Query('data_bases_id') data_bases_id?: number) {
    // Normalizamos el filtro: solo se considera válido si es entero positivo.
    const parsed =
      data_bases_id !== undefined && data_bases_id !== null
        ? Number(data_bases_id)
        : undefined;
    const hasFilter =
      parsed !== undefined && Number.isInteger(parsed) && parsed > 0;

    const list: BotStatus[] = await this.botControlService.status(
      hasFilter ? parsed : undefined,
    );

    if (hasFilter) {
      // Si no hay elementos, devolvemos data: [] para evitar [null].
      if (!list || list.length === 0) {
        return dataMany([]);
      }
      return dataOne(list[0]);
    }

    return dataMany(list);
  }
}


