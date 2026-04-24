// Responsabilidad: módulo Nest para tblPortfolioType.

import { Module } from '@nestjs/common';
import { TblPortfolioTypeController } from '../http/controller/tblPortfolioType.controller';
import { TblPortfolioTypeService } from '@application/services/tblPortfolioType.service';
import { TblPortfolioTypeRepositoryImpl } from '@infrastructure/persistence/repositories/tblPortfolioType.repositories';
import { TBL_PORTFOLIO_TYPE_REPOSITORY } from '@domain/ports/tblPortfolioType.ports';
import { TblStateTypeModule } from './tblStateType.module';
import { TblStateTypeService } from '@application/services/tblStateType.service';
import { TBL_STATE_TYPE_REPOSITORY } from '@domain/ports/tblStateType.ports';
import { TblStateTypeRepositoryImpl } from '@infrastructure/persistence/repositories/tblStateType.repositories';

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
