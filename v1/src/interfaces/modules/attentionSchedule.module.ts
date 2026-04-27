// Responsabilidad: módulo Nest para tblAttentionSchedule.

import { Module } from '@nestjs/common';
import { TblAttentionScheduleController } from '../http/controller/attentionSchedule.controller';
import { TblAttentionScheduleService } from '@application/services/attentionSchedule.service';
import { TblAttentionScheduleRepositoryImpl } from '@infrastructure/persistence/repositories/attentionSchedule.repositories';
import { TBL_ATTENTION_SCHEDULE_REPOSITORY } from '@domain/ports/attentionSchedule.ports';
import { TblPortfolioTypeModule } from './portfolioType.module';
import { TblStateTypeModule } from './stateType.module';
import { TBL_PORTFOLIO_TYPE_REPOSITORY } from '@domain/ports/portfolioType.ports';
import { TblPortfolioTypeRepositoryImpl } from '@infrastructure/persistence/repositories/portfolioType.repositories';
import { TBL_STATE_TYPE_REPOSITORY } from '@domain/ports/stateType.ports';
import { TblStateTypeRepositoryImpl } from '@infrastructure/persistence/repositories/stateType.repositories';
import { TblPortfolioTypeService } from '@application/services/portfolioType.service';
import { TblStateTypeService } from '@application/services/stateType.service';

@Module({
  controllers: [TblAttentionScheduleController],
  providers: [
    TblAttentionScheduleService,
    TblPortfolioTypeService,
    TblStateTypeService,
    { provide: TBL_ATTENTION_SCHEDULE_REPOSITORY, useClass: TblAttentionScheduleRepositoryImpl },
    { provide: TBL_PORTFOLIO_TYPE_REPOSITORY, useClass: TblPortfolioTypeRepositoryImpl },
    { provide: TBL_STATE_TYPE_REPOSITORY, useClass: TblStateTypeRepositoryImpl },
  ],
  imports: [TblPortfolioTypeModule, TblStateTypeModule],
  exports: [
    TblAttentionScheduleService,
    { provide: TBL_ATTENTION_SCHEDULE_REPOSITORY, useClass: TblAttentionScheduleRepositoryImpl },
  ],
})
export class TblAttentionScheduleModule {}
