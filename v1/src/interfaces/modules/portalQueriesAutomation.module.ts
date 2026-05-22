// Responsabilidad: módulo independiente del servicio de automatización del portal de consultas.
// Reutilizable por cualquier tipo de cartera.

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PortalQueriesAutomationService } from '@application/services/portalQueriesAutomation.service';
import { LoggerModule } from '@infrastructure/logging/logger.module';

@Module({
  imports: [ConfigModule, LoggerModule],
  providers: [PortalQueriesAutomationService],
  exports: [PortalQueriesAutomationService],
})
export class PortalQueriesAutomationModule {}
