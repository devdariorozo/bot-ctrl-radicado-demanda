// Responsabilidad: módulo Nest para tipoEstado.

import { Module } from '@nestjs/common';
import { StateTypeController } from '../http/controller/stateType.controller';
import { StateTypeService } from '@application/services/stateType.service';
import { StateTypeRepositoryImpl } from '@infrastructure/persistence/repositories/stateType.repositories';
import { STATE_TYPE_REPOSITORY } from '@domain/ports/stateType.ports';

@Module({
    controllers: [StateTypeController],
    providers: [
        StateTypeService,
        {
            provide: STATE_TYPE_REPOSITORY,
            useClass: StateTypeRepositoryImpl,
        },
    ],
    exports: [StateTypeService, { provide: STATE_TYPE_REPOSITORY, useClass: StateTypeRepositoryImpl }],
})
export class StateTypeModule {}