// Responsabilidad: endpoints HTTP para listar y eliminar archivos de logs.
import { Controller, Delete, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { LogsService } from '@application/services/logs.service';
import { LogsResponseDto } from '../dto/logs.dto';
import { dataEmpty, dataOne } from '@application/utils/response.utils';

@ApiTags('logs')
@Controller('logs')
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar líneas de logs por fecha',
    description:
      'Obtiene las últimas N líneas del archivo de logs correspondiente a la fecha indicada, junto con los totales de success, error, warning e info.',
  })
  @ApiQuery({
    name: 'log_date',
    required: true,
    type: String,
    description: 'Fecha del log en formato YYYY-MM-DD (ej. 2026-03-18)',
  })
  @ApiQuery({
    name: 'number_lines',
    required: true,
    type: Number,
    description: 'Número de líneas a obtener desde la más reciente (>= 1)',
  })
  async list(@Query('log_date') log_date: string, @Query('number_lines') number_lines: number) {
    const result = await this.logsService.listByDate(log_date, Number(number_lines));

    const response: LogsResponseDto = result;

    // Estructura estándar enriquecida para este endpoint.
    return {
      status: 200,
      type: 'success',
      title: 'Filtrar Registros',
      message: 'Operación de consulta ejecutada correctamente.',
      ...dataOne(response),
    };
  }

  @Delete()
  @ApiOperation({
    summary: 'Eliminar archivo de logs por fecha',
    description:
      'Elimina el archivo de logs que corresponda a la fecha indicada. Este endpoint se usa desde el botón "Limpiar" del frontend.',
  })
  @ApiQuery({
    name: 'log_date',
    required: true,
    type: String,
    description: 'Fecha del log en formato YYYY-MM-DD (ej. 2026-03-18)',
  })
  async delete(@Query('log_date') log_date: string) {
    await this.logsService.deleteByDate(log_date);
    return {
      status: 200,
      type: 'success',
      title: 'Eliminar Registros de Logs',
      message: 'Registros de logs eliminados correctamente.',
      ...dataEmpty(),
    };
  }
}

