// Responsabilidad: módulo Nest para DataBases.

import { Module } from '@nestjs/common';
import { DataBasesController } from '../http/controller/dataBases.controller';
import { DataBasesService } from '@application/services/dataBases.service';
import { TblDataBasesRepositoryImpl } from '@infrastructure/persistence/repositories/dataBases.repositories';
import { DATABASES_REPOSITORY } from '@domain/ports/dataBases.ports';
import { TblEnvironmentTypeModule } from './environmentType.module';
import { TblStateTypeModule } from './stateType.module';
import { TblPortfolioTypeModule } from './portfolioType.module';

@Module({
  controllers: [DataBasesController],
  providers: [
    DataBasesService,
    {
      provide: DATABASES_REPOSITORY,
      useClass: TblDataBasesRepositoryImpl,
    },
  ],
  imports: [TblEnvironmentTypeModule, TblStateTypeModule, TblPortfolioTypeModule],
  exports: [
    DataBasesService,
    { provide: DATABASES_REPOSITORY, useClass: TblDataBasesRepositoryImpl },
  ],
})
export class DataBasesModule {}

