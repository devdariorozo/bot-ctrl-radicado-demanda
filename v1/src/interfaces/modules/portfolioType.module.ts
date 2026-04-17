// Responsabilidad: módulo Nest para tipoEstado.

import { Module } from '@nestjs/common';
import { PortfolioTypeController } from '../http/controller/portfolioType.controller';
import { PortfolioTypeService } from '@application/services/portfolioType.service';
import { PortfolioTypeRepositoryImpl } from '@infrastructure/persistence/repositories/portfolioType.repositories';
import { PORTFOLIO_TYPE_REPOSITORY } from '@domain/ports/portfolioType.ports';
import { StateTypeModule } from './stateType.module';
import { StateTypeService } from '@application/services/stateType.service';
import { STATE_TYPE_REPOSITORY } from '@domain/ports/stateType.ports';
import { StateTypeRepositoryImpl } from '@infrastructure/persistence/repositories/stateType.repositories';

@Module({
    controllers: [PortfolioTypeController],
    providers: [
        PortfolioTypeService,
        StateTypeService,
        {
            provide: PORTFOLIO_TYPE_REPOSITORY,
            useClass: PortfolioTypeRepositoryImpl,
        },
        {
            provide: STATE_TYPE_REPOSITORY,
            useClass: StateTypeRepositoryImpl,
        },
    ],
    exports: [PortfolioTypeService, { provide: PORTFOLIO_TYPE_REPOSITORY, useClass: PortfolioTypeRepositoryImpl }, { provide: STATE_TYPE_REPOSITORY, useClass: StateTypeRepositoryImpl }],
    imports: [StateTypeModule],
})
export class PortfolioTypeModule {}