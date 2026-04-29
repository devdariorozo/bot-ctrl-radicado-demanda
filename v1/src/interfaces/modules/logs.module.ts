// Responsabilidad: módulo NestJS para exponer el servicio y controlador de logs, y la trazabilidad de demandas.
import { Module } from '@nestjs/common';
import { LogsController } from '../http/controller/logs.controller';
import { LogsService } from '@application/services/logs.service';
import { DemandsTraceService } from '@application/services/demandsTrace.service';

@Module({
  controllers: [LogsController],
  providers: [LogsService, DemandsTraceService],
  exports: [DemandsTraceService],
})
export class LogsModule {}

