// Responsabilidad: módulo Nest para DataBases.

import { Module } from '@nestjs/common';
import { DataBasesController } from '../http/controller/dataBases.controller';
import { DataBasesService } from '@application/services/dataBases.service';
import { DataBasesRepositoryImpl } from '@infrastructure/persistence/repositories/dataBases.repositories';
import { DATABASES_REPOSITORY } from '@domain/ports/dataBases.ports';
import { TblEnvironmentTypeModule } from './tblEnvironmentType.module';
import { TblStateTypeModule } from './tblStateType.module';
import { TblPortfolioTypeModule } from './tblPortfolioType.module';

@Module({
  controllers: [DataBasesController],
  providers: [
    DataBasesService,
    {
      provide: DATABASES_REPOSITORY,
      useClass: DataBasesRepositoryImpl,
    },
  ],
  imports: [TblEnvironmentTypeModule, TblStateTypeModule, TblPortfolioTypeModule],
  exports: [
    DataBasesService,
    { provide: DATABASES_REPOSITORY, useClass: DataBasesRepositoryImpl },
  ],
})
export class DataBasesModule {}

