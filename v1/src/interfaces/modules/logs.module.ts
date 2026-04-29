// Responsabilidad: módulo NestJS para exponer el servicio y controlador de logs.
import { Module } from '@nestjs/common';
import { LogsController } from '../http/controller/logs.controller';
import { LogsService } from '@application/services/logs.service';

@Module({
  controllers: [LogsController],
  providers: [LogsService],
  exports: [LogsService],
})
export class LogsModule {}

