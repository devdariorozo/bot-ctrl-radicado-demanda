// Responsabilidad: módulo Nest para TblStateType.

import { Module } from '@nestjs/common';
import { TblStateTypeController } from '../http/controller/tblStateType.controller';
import { TblStateTypeService } from '@application/services/tblStateType.service';
import { TblStateTypeRepositoryImpl } from '@infrastructure/persistence/repositories/tblStateType.repositories';
import { TBL_STATE_TYPE_REPOSITORY } from '@domain/ports/tblStateType.ports';

@Module({
    controllers: [TblStateTypeController],
    providers: [
        TblStateTypeService,
        {
            provide: TBL_STATE_TYPE_REPOSITORY,
            useClass: TblStateTypeRepositoryImpl,
        },
    ],
    exports: [TblStateTypeService, { provide: TBL_STATE_TYPE_REPOSITORY, useClass: TblStateTypeRepositoryImpl }],
})
export class TblStateTypeModule {}