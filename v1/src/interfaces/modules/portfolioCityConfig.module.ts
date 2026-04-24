// Responsabilidad: módulo Nest para PortfolioCityConfig.

import { Module } from '@nestjs/common';
import { PortfolioCityConfigController } from '../http/controller/portfolioCityConfig.controller';
import { PortfolioCityConfigService } from '@application/services/portfolioCityConfig.service';
import { PortfolioCityConfigRepositoryImpl } from '@infrastructure/persistence/repositories/portfolioCityConfig.repositories';
import { PORTFOLIO_CITY_CONFIG_REPOSITORY } from '@domain/ports/portfolioCityConfig.ports';
import { DataBasesModule } from './dataBases.module';
import { TblStateTypeModule } from './tblStateType.module';

@Module({
  controllers: [PortfolioCityConfigController],
  providers: [
    PortfolioCityConfigService,
    {
      provide: PORTFOLIO_CITY_CONFIG_REPOSITORY,
      useClass: PortfolioCityConfigRepositoryImpl,
    },
  ],
  imports: [DataBasesModule, TblStateTypeModule],
  exports: [
    PortfolioCityConfigService,
    {
      provide: PORTFOLIO_CITY_CONFIG_REPOSITORY,
      useClass: PortfolioCityConfigRepositoryImpl,
    },
  ],
})
export class PortfolioCityConfigModule {}
