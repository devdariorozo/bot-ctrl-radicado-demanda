// Responsabilidad: módulo Nest para TblEnvironmentType.

import { Module } from '@nestjs/common';
import { TblEnvironmentTypeController } from '../http/controller/environmentType.controller';
import { TblEnvironmentTypeService } from '@application/services/environmentType.service';
import { TblEnvironmentTypeRepositoryImpl } from '@infrastructure/persistence/repositories/environmentType.repositories';
import { TBL_ENVIRONMENT_TYPE_REPOSITORY } from '@domain/ports/environmentType.ports';

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

