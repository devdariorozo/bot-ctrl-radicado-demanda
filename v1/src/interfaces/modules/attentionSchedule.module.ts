// Responsabilidad: módulo Nest para AttentionSchedule.

import { Module } from '@nestjs/common';
import { AttentionScheduleController } from '../http/controller/attentionSchedule.controller';
import { AttentionScheduleService } from '@application/services/attentionSchedule.service';
import { AttentionScheduleRepositoryImpl } from '@infrastructure/persistence/repositories/attentionSchedule.repositories';
import { ATTENTION_SCHEDULE_REPOSITORY } from '@domain/ports/attentionSchedule.ports';
import { PortfolioTypeModule } from './portfolioType.module';
import { StateTypeModule } from './stateType.module';

@Module({
  controllers: [AttentionScheduleController],
  providers: [
    AttentionScheduleService,
    {
      provide: ATTENTION_SCHEDULE_REPOSITORY,
      useClass: AttentionScheduleRepositoryImpl,
    },
  ],
  imports: [PortfolioTypeModule, StateTypeModule],
  exports: [
    AttentionScheduleService,
    { provide: ATTENTION_SCHEDULE_REPOSITORY, useClass: AttentionScheduleRepositoryImpl },
  ],
})
export class AttentionScheduleModule {}

