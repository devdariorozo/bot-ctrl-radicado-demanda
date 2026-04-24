// Responsabilidad: módulo Nest para AttentionSchedule.

import { Module } from '@nestjs/common';
import { AttentionScheduleController } from '../http/controller/attentionSchedule.controller';
import { AttentionScheduleService } from '@application/services/attentionSchedule.service';
import { AttentionScheduleRepositoryImpl } from '@infrastructure/persistence/repositories/attentionSchedule.repositories';
import { ATTENTION_SCHEDULE_REPOSITORY } from '@domain/ports/attentionSchedule.ports';
import { TblPortfolioTypeModule } from './tblPortfolioType.module';
import { TblStateTypeModule } from './tblStateType.module';

@Module({
  controllers: [AttentionScheduleController],
  providers: [
    AttentionScheduleService,
    {
      provide: ATTENTION_SCHEDULE_REPOSITORY,
      useClass: AttentionScheduleRepositoryImpl,
    },
  ],
  imports: [TblPortfolioTypeModule, TblStateTypeModule],
  exports: [
    AttentionScheduleService,
    { provide: ATTENTION_SCHEDULE_REPOSITORY, useClass: AttentionScheduleRepositoryImpl },
  ],
})
export class AttentionScheduleModule {}

