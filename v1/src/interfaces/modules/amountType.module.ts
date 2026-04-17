// Responsabilidad: módulo Nest para amount_type.

import { Module } from '@nestjs/common';

import { AmountTypeController } from '../http/controller/amountType.controller';
import { AmountTypeService } from '@application/services/amountType.service';
import { AmountTypeRepositoryImpl } from '@infrastructure/persistence/repositories/amountType.repositories';
import { AMOUNT_TYPE_REPOSITORY } from '@domain/ports/amountType.ports';
import { StateTypeModule } from './stateType.module';
import { StateTypeService } from '@application/services/stateType.service';
import { STATE_TYPE_REPOSITORY } from '@domain/ports/stateType.ports';
import { StateTypeRepositoryImpl } from '@infrastructure/persistence/repositories/stateType.repositories';

@Module({
  controllers: [AmountTypeController],
  providers: [
    AmountTypeService,
    StateTypeService,
    {
      provide: AMOUNT_TYPE_REPOSITORY,
      useClass: AmountTypeRepositoryImpl,
    },
    {
      provide: STATE_TYPE_REPOSITORY,
      useClass: StateTypeRepositoryImpl,
    },
  ],
  exports: [
    AmountTypeService,
    { provide: AMOUNT_TYPE_REPOSITORY, useClass: AmountTypeRepositoryImpl },
    { provide: STATE_TYPE_REPOSITORY, useClass: StateTypeRepositoryImpl },
  ],
  imports: [StateTypeModule],
})
export class AmountTypeModule {}

