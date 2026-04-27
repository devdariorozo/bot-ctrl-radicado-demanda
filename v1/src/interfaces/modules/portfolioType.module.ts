// Responsabilidad: módulo Nest para tblPortfolioType.

import { Module } from '@nestjs/common';
import { TblPortfolioTypeController } from '../http/controller/portfolioType.controller';
import { TblPortfolioTypeService } from '@application/services/portfolioType.service';
import { TblPortfolioTypeRepositoryImpl } from '@infrastructure/persistence/repositories/portfolioType.repositories';
import { TBL_PORTFOLIO_TYPE_REPOSITORY } from '@domain/ports/portfolioType.ports';
import { TblStateTypeModule } from './stateType.module';
import { TblStateTypeService } from '@application/services/stateType.service';
import { TBL_STATE_TYPE_REPOSITORY } from '@domain/ports/stateType.ports';
import { TblStateTypeRepositoryImpl } from '@infrastructure/persistence/repositories/stateType.repositories';

@Module({
    controllers: [TblPortfolioTypeController],
    providers: [
        TblPortfolioTypeService,
        TblStateTypeService,
        { provide: TBL_PORTFOLIO_TYPE_REPOSITORY, useClass: TblPortfolioTypeRepositoryImpl },
        { provide: TBL_STATE_TYPE_REPOSITORY, useClass: TblStateTypeRepositoryImpl },
    ],
    exports: [
        TblPortfolioTypeService,
        { provide: TBL_PORTFOLIO_TYPE_REPOSITORY, useClass: TblPortfolioTypeRepositoryImpl },
        { provide: TBL_STATE_TYPE_REPOSITORY, useClass: TblStateTypeRepositoryImpl },
    ],
    imports: [TblStateTypeModule],
})
export class TblPortfolioTypeModule {}
