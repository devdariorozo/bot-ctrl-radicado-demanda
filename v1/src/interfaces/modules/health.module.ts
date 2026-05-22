// Responsabilidad: módulo Nest para el health check.

import { Module } from '@nestjs/common';
import { HealthController } from '../http/controller/health.controller';

@Module({
  controllers: [HealthController],
})
export class HealthModule {}
