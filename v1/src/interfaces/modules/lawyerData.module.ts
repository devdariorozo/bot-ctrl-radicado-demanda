// Responsabilidad: módulo NestJS para lawyer_data.

import { Module } from '@nestjs/common';
import { LawyerDataController } from '../http/controller/lawyerData.controller';
import { LawyerDataService } from '@application/services/lawyerData.service';
import { LawyerDataRepositoryImpl } from '@infrastructure/persistence/repositories/lawyerData.repositories';
import { LAWYER_DATA_REPOSITORY } from '@domain/ports/lawyerData.ports';
import { PortfolioTypeModule } from './portfolioType.module';
import { StateTypeModule } from './stateType.module';
import { PORTFOLIO_TYPE_REPOSITORY } from '@domain/ports/portfolioType.ports';
import { PortfolioTypeRepositoryImpl } from '@infrastructure/persistence/repositories/portfolioType.repositories';
import { StateTypeService } from '@application/services/stateType.service';
import { STATE_TYPE_REPOSITORY } from '@domain/ports/stateType.ports';
import { StateTypeRepositoryImpl } from '@infrastructure/persistence/repositories/stateType.repositories';

@Module({
  controllers: [LawyerDataController],
  providers: [
    LawyerDataService,
    StateTypeService,
    {
      provide: LAWYER_DATA_REPOSITORY,
      useClass: LawyerDataRepositoryImpl,
    },
    {
      provide: PORTFOLIO_TYPE_REPOSITORY,
      useClass: PortfolioTypeRepositoryImpl,
    },
    {
      provide: STATE_TYPE_REPOSITORY,
      useClass: StateTypeRepositoryImpl,
    },
  ],
  imports: [PortfolioTypeModule, StateTypeModule],
  exports: [
    LawyerDataService,
    {
      provide: LAWYER_DATA_REPOSITORY,
      useClass: LawyerDataRepositoryImpl,
    },
  ],
})
export class LawyerDataModule {}

