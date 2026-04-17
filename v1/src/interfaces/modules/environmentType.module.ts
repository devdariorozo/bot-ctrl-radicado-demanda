// Responsabilidad: módulo Nest para EnvironmentType.

import { Module } from '@nestjs/common';
import { EnvironmentTypeController } from '../http/controller/environmentType.controller';
import { EnvironmentTypeService } from '@application/services/environmentType.service';
import { EnvironmentTypeRepositoryImpl } from '@infrastructure/persistence/repositories/environmentType.repositories';
import { ENVIRONMENT_TYPE_REPOSITORY } from '@domain/ports/environmentType.ports';

@Module({
    controllers: [EnvironmentTypeController],
    providers: [
        EnvironmentTypeService,
        {
            provide: ENVIRONMENT_TYPE_REPOSITORY,
            useClass: EnvironmentTypeRepositoryImpl,
        },
    ],
    exports: [
        EnvironmentTypeService,
        { provide: ENVIRONMENT_TYPE_REPOSITORY, useClass: EnvironmentTypeRepositoryImpl },
    ],
})
export class EnvironmentTypeModule {}

