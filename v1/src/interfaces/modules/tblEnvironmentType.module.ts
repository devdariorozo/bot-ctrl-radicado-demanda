// Responsabilidad: módulo Nest para TblEnvironmentType.

import { Module } from '@nestjs/common';
import { TblEnvironmentTypeController } from '../http/controller/tblEnvironmentType.controller';
import { TblEnvironmentTypeService } from '@application/services/tblEnvironmentType.service';
import { TblEnvironmentTypeRepositoryImpl } from '@infrastructure/persistence/repositories/tblEnvironmentType.repositories';
import { TBL_ENVIRONMENT_TYPE_REPOSITORY } from '@domain/ports/tblEnvironmentType.ports';

@Module({
    controllers: [TblEnvironmentTypeController],
    providers: [
        TblEnvironmentTypeService,
        {
            provide: TBL_ENVIRONMENT_TYPE_REPOSITORY,
            useClass: TblEnvironmentTypeRepositoryImpl,
        },
    ],
    exports: [
        TblEnvironmentTypeService,
        { provide: TBL_ENVIRONMENT_TYPE_REPOSITORY, useClass: TblEnvironmentTypeRepositoryImpl },
    ],
})
export class TblEnvironmentTypeModule {}

