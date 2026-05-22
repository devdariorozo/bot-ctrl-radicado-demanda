// Responsabilidad: módulo NestJS para holiday.

import { Module } from '@nestjs/common';
import { HolidayController } from '../http/controller/holiday.controller';
import { HolidayService } from '@application/services/holiday.service';
import { TblHolidayRepositoryImpl } from '@infrastructure/persistence/repositories/holiday.repositories';
import { HOLIDAY_REPOSITORY } from '@domain/ports/holiday.ports';
import { TblStateTypeModule } from './stateType.module';
import { TblStateTypeService } from '@application/services/stateType.service';
import { TBL_STATE_TYPE_REPOSITORY } from '@domain/ports/stateType.ports';
import { TblStateTypeRepositoryImpl } from '@infrastructure/persistence/repositories/stateType.repositories';

@Module({
  controllers: [HolidayController],
  providers: [
    HolidayService,
    TblStateTypeService,
    {
      provide: HOLIDAY_REPOSITORY,
      useClass: TblHolidayRepositoryImpl,
    },
    {
      provide: TBL_STATE_TYPE_REPOSITORY,
      useClass: TblStateTypeRepositoryImpl,
    },
  ],
  imports: [TblStateTypeModule],
  exports: [
    HolidayService,
    {
      provide: HOLIDAY_REPOSITORY,
      useClass: TblHolidayRepositoryImpl,
    },
  ],
})
export class HolidayModule {}

