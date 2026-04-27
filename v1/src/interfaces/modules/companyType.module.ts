// Responsabilidad: módulo Nest para company_type.

import { Module } from '@nestjs/common';
import { CompanyTypeController } from '../http/controller/companyType.controller';
import { CompanyTypeService } from '@application/services/companyType.service';
import { CompanyTypeRepositoryImpl } from '@infrastructure/persistence/repositories/companyType.repositories';
import { COMPANY_TYPE_REPOSITORY } from '@domain/ports/companyType.ports';
import { TblPortfolioTypeModule } from './portfolioType.module';
import { TblStateTypeModule } from './stateType.module';
import { TBL_PORTFOLIO_TYPE_REPOSITORY } from '@domain/ports/portfolioType.ports';
import { TblPortfolioTypeRepositoryImpl } from '@infrastructure/persistence/repositories/portfolioType.repositories';
import { TblStateTypeService } from '@application/services/stateType.service';
import { TBL_STATE_TYPE_REPOSITORY } from '@domain/ports/stateType.ports';
import { TblStateTypeRepositoryImpl } from '@infrastructure/persistence/repositories/stateType.repositories';

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

