// Responsabilidad: módulo NestJS para holiday.

import { Module } from '@nestjs/common';
import { HolidayController } from '../http/controller/holiday.controller';
import { HolidayService } from '@application/services/holiday.service';
import { HolidayRepositoryImpl } from '@infrastructure/persistence/repositories/holiday.repositories';
import { HOLIDAY_REPOSITORY } from '@domain/ports/holiday.ports';
import { StateTypeModule } from './stateType.module';
import { StateTypeService } from '@application/services/stateType.service';
import { STATE_TYPE_REPOSITORY } from '@domain/ports/stateType.ports';
import { StateTypeRepositoryImpl } from '@infrastructure/persistence/repositories/stateType.repositories';

@Module({
  controllers: [HolidayController],
  providers: [
    HolidayService,
    StateTypeService,
    {
      provide: HOLIDAY_REPOSITORY,
      useClass: HolidayRepositoryImpl,
    },
    {
      provide: STATE_TYPE_REPOSITORY,
      useClass: StateTypeRepositoryImpl,
    },
  ],
  imports: [StateTypeModule],
  exports: [
    HolidayService,
    {
      provide: HOLIDAY_REPOSITORY,
      useClass: HolidayRepositoryImpl,
    },
  ],
})
export class HolidayModule {}

