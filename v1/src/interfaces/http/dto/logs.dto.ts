// Responsabilidad: DTOs de entrada/salida para el módulo de logs.
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LogsQueryDto {
  @ApiProperty({
    example: '2026-03-18',
    description: 'Fecha del archivo de log en formato YYYY-MM-DD',
  })
  log_date: string;

  @ApiProperty({
    example: 20,
    description: 'Número de líneas a obtener desde la más reciente (>= 1)',
    minimum: 1,
  })
  number_lines: number;
}

export class LogEntryDto {
  @ApiProperty({ example: '2026-03-18T12:34:56.789Z' })
  timestamp: string;

  @ApiProperty({ example: 'log' })
  level: string;

  @ApiPropertyOptional({
    example: 'Success',
    description: 'Estado del log (Success, Info, Warning, Error)',
  })
  status?: 'Success' | 'Info' | 'Warning' | 'Error';

  @ApiProperty({
    example: '✅',
    description: 'Símbolo sugerido según el estado (✅, ℹ️, ⚠️, ❌)',
  })
  icon: string;

  @ApiPropertyOptional({ example: 'PROCESS_EXECUTION', description: 'Tipo o categoría del log' })
  type?: string;

  @ApiPropertyOptional({ example: 'BotControlService' })
  context?: string;

  @ApiProperty({ example: 'Bot started successfully' })
  message: string;

  @ApiPropertyOptional({ description: 'Metadatos adicionales del log' })
  meta?: Record<string, unknown> | null;

  @ApiPropertyOptional({ description: 'Stacktrace en caso de errores' })
  stack?: string | null;
}

export class LogsTotalsDto {
  @ApiProperty({ example: 120, description: 'Total de ejecuciones exitosas (status = Success)' })
  success: number;

  @ApiProperty({ example: 3, description: 'Total de errores (status = Error)' })
  error: number;

  @ApiProperty({ example: 5, description: 'Total de advertencias (status = Warning)' })
  warning: number;

  @ApiProperty({ example: 10, description: 'Total de mensajes informativos' })
  info: number;
}

export class LogsResponseDto {
  @ApiProperty({
    example: '2026-03-18',
    description: 'Fecha para la cual se obtuvieron los logs',
  })
  log_date: string;

  @ApiProperty({
    example: '2026-03-18-logs-bot-demands-online.log',
    description: 'Nombre físico del archivo de log',
  })
  file_name: string;

  @ApiProperty({
    example: 20,
    description: 'Número real de líneas devueltas',
  })
  number_lines: number;

  @ApiProperty({ type: [LogEntryDto], description: 'Listado de líneas de log desde la más reciente' })
  lines: LogEntryDto[];

  @ApiProperty({ type: LogsTotalsDto, description: 'Totales por tipo de log' })
  totals: LogsTotalsDto;
}

