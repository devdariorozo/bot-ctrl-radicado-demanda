// Responsabilidad: módulo NestJS para lawyer_data.

import { Module } from '@nestjs/common';
import { LawyerDataController } from '../http/controller/lawyerData.controller';
import { LawyerDataService } from '@application/services/lawyerData.service';
import { LawyerDataRepositoryImpl } from '@infrastructure/persistence/repositories/lawyerData.repositories';
import { LAWYER_DATA_REPOSITORY } from '@domain/ports/lawyerData.ports';
import { TblPortfolioTypeModule } from './tblPortfolioType.module';
import { TblStateTypeModule } from './tblStateType.module';
import { TBL_PORTFOLIO_TYPE_REPOSITORY } from '@domain/ports/tblPortfolioType.ports';
import { TblPortfolioTypeRepositoryImpl } from '@infrastructure/persistence/repositories/tblPortfolioType.repositories';
import { TblStateTypeService } from '@application/services/tblStateType.service';
import { TBL_STATE_TYPE_REPOSITORY } from '@domain/ports/tblStateType.ports';
import { TblStateTypeRepositoryImpl } from '@infrastructure/persistence/repositories/tblStateType.repositories';

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

