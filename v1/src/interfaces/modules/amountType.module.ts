// Responsabilidad: módulo Nest para amount_type.

import { Module } from '@nestjs/common';

import { AmountTypeController } from '../http/controller/amountType.controller';
import { AmountTypeService } from '@application/services/amountType.service';
import { AmountTypeRepositoryImpl } from '@infrastructure/persistence/repositories/amountType.repositories';
import { AMOUNT_TYPE_REPOSITORY } from '@domain/ports/amountType.ports';
import { TblStateTypeModule } from './stateType.module';
import { TblStateTypeService } from '@application/services/stateType.service';
import { TBL_STATE_TYPE_REPOSITORY } from '@domain/ports/stateType.ports';
import { TblStateTypeRepositoryImpl } from '@infrastructure/persistence/repositories/stateType.repositories';

@Module({
  controllers: [AmountTypeController],
  providers: [
    AmountTypeService,
    TblStateTypeService,
    {
      provide: AMOUNT_TYPE_REPOSITORY,
      useClass: AmountTypeRepositoryImpl,
    },
    {
      provide: TBL_STATE_TYPE_REPOSITORY,
      useClass: TblStateTypeRepositoryImpl,
    },
  ],
  exports: [
    AmountTypeService,
    { provide: AMOUNT_TYPE_REPOSITORY, useClass: AmountTypeRepositoryImpl },
    { provide: TBL_STATE_TYPE_REPOSITORY, useClass: TblStateTypeRepositoryImpl },
  ],
  imports: [TblStateTypeModule],
})
export class AmountTypeModule {}

