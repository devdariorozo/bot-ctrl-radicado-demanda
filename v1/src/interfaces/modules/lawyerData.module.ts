// Responsabilidad: módulo NestJS para lawyer_data.

import { Module } from '@nestjs/common';
import { LawyerDataController } from '../http/controller/lawyerData.controller';
import { LawyerDataService } from '@application/services/lawyerData.service';
import { LawyerDataRepositoryImpl } from '@infrastructure/persistence/repositories/lawyerData.repositories';
import { LAWYER_DATA_REPOSITORY } from '@domain/ports/lawyerData.ports';
import { TblPortfolioTypeModule } from './portfolioType.module';
import { TblStateTypeModule } from './stateType.module';
import { TBL_PORTFOLIO_TYPE_REPOSITORY } from '@domain/ports/portfolioType.ports';
import { TblPortfolioTypeRepositoryImpl } from '@infrastructure/persistence/repositories/portfolioType.repositories';
import { TblStateTypeService } from '@application/services/stateType.service';
import { TBL_STATE_TYPE_REPOSITORY } from '@domain/ports/stateType.ports';
import { TblStateTypeRepositoryImpl } from '@infrastructure/persistence/repositories/stateType.repositories';

@Module({
  controllers: [LawyerDataController],
  providers: [
    LawyerDataService,
    TblStateTypeService,
    {
      provide: LAWYER_DATA_REPOSITORY,
      useClass: LawyerDataRepositoryImpl,
    },
    {
      provide: TBL_PORTFOLIO_TYPE_REPOSITORY,
      useClass: TblPortfolioTypeRepositoryImpl,
    },
    {
      provide: TBL_STATE_TYPE_REPOSITORY,
      useClass: TblStateTypeRepositoryImpl,
    },
  ],
  imports: [TblPortfolioTypeModule, TblStateTypeModule],
  exports: [
    LawyerDataService,
    {
      provide: LAWYER_DATA_REPOSITORY,
      useClass: LawyerDataRepositoryImpl,
    },
  ],
})
export class LawyerDataModule {}

