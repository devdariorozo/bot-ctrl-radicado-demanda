// Responsabilidad: módulo Nest para company_type.

import { Module } from '@nestjs/common';
import { CompanyTypeController } from '../http/controller/companyType.controller';
import { CompanyTypeService } from '@application/services/companyType.service';
import { CompanyTypeRepositoryImpl } from '@infrastructure/persistence/repositories/companyType.repositories';
import { COMPANY_TYPE_REPOSITORY } from '@domain/ports/companyType.ports';
import { TblPortfolioTypeModule } from './tblPortfolioType.module';
import { TblStateTypeModule } from './tblStateType.module';
import { TBL_PORTFOLIO_TYPE_REPOSITORY } from '@domain/ports/tblPortfolioType.ports';
import { TblPortfolioTypeRepositoryImpl } from '@infrastructure/persistence/repositories/tblPortfolioType.repositories';
import { TblStateTypeService } from '@application/services/tblStateType.service';
import { TBL_STATE_TYPE_REPOSITORY } from '@domain/ports/tblStateType.ports';
import { TblStateTypeRepositoryImpl } from '@infrastructure/persistence/repositories/tblStateType.repositories';

@Module({
  controllers: [CompanyTypeController],
  providers: [
    CompanyTypeService,
    TblStateTypeService,
    {
      provide: COMPANY_TYPE_REPOSITORY,
      useClass: CompanyTypeRepositoryImpl,
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
    CompanyTypeService,
    {
      provide: COMPANY_TYPE_REPOSITORY,
      useClass: CompanyTypeRepositoryImpl,
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
})
export class CompanyTypeModule {}

