// Responsabilidad: módulo Nest para company_type.

import { Module } from '@nestjs/common';
import { CompanyTypeController } from '../http/controller/companyType.controller';
import { CompanyTypeService } from '@application/services/companyType.service';
import { CompanyTypeRepositoryImpl } from '@infrastructure/persistence/repositories/companyType.repositories';
import { COMPANY_TYPE_REPOSITORY } from '@domain/ports/companyType.ports';
import { PortfolioTypeModule } from './portfolioType.module';
import { StateTypeModule } from './stateType.module';
import { PORTFOLIO_TYPE_REPOSITORY } from '@domain/ports/portfolioType.ports';
import { PortfolioTypeRepositoryImpl } from '@infrastructure/persistence/repositories/portfolioType.repositories';
import { StateTypeService } from '@application/services/stateType.service';
import { STATE_TYPE_REPOSITORY } from '@domain/ports/stateType.ports';
import { StateTypeRepositoryImpl } from '@infrastructure/persistence/repositories/stateType.repositories';

@Module({
  controllers: [CompanyTypeController],
  providers: [
    CompanyTypeService,
    StateTypeService,
    {
      provide: COMPANY_TYPE_REPOSITORY,
      useClass: CompanyTypeRepositoryImpl,
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
    CompanyTypeService,
    {
      provide: COMPANY_TYPE_REPOSITORY,
      useClass: CompanyTypeRepositoryImpl,
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
})
export class CompanyTypeModule {}

