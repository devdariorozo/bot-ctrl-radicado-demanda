// Responsabilidad: módulo Nest para DataBases.

import { Module } from '@nestjs/common';
import { DataBasesController } from '../http/controller/dataBases.controller';
import { DataBasesService } from '@application/services/dataBases.service';
import { DataBasesRepositoryImpl } from '@infrastructure/persistence/repositories/dataBases.repositories';
import { DATABASES_REPOSITORY } from '@domain/ports/dataBases.ports';
import { EnvironmentTypeModule } from './environmentType.module';
import { StateTypeModule } from './stateType.module';
import { PortfolioTypeModule } from './portfolioType.module';

@Module({
  controllers: [DataBasesController],
  providers: [
    DataBasesService,
    {
      provide: DATABASES_REPOSITORY,
      useClass: DataBasesRepositoryImpl,
    },
  ],
  imports: [EnvironmentTypeModule, StateTypeModule, PortfolioTypeModule],
  exports: [
    DataBasesService,
    { provide: DATABASES_REPOSITORY, useClass: DataBasesRepositoryImpl },
  ],
})
export class DataBasesModule {}

