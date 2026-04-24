// Responsabilidad: módulo NestJS para holiday.

import { Module } from '@nestjs/common';
import { HolidayController } from '../http/controller/holiday.controller';
import { HolidayService } from '@application/services/holiday.service';
import { HolidayRepositoryImpl } from '@infrastructure/persistence/repositories/holiday.repositories';
import { HOLIDAY_REPOSITORY } from '@domain/ports/holiday.ports';
import { TblStateTypeModule } from './tblStateType.module';
import { TblStateTypeService } from '@application/services/tblStateType.service';
import { TBL_STATE_TYPE_REPOSITORY } from '@domain/ports/tblStateType.ports';
import { TblStateTypeRepositoryImpl } from '@infrastructure/persistence/repositories/tblStateType.repositories';

@Module({
  controllers: [HolidayController],
  providers: [
    HolidayService,
    TblStateTypeService,
    {
      provide: HOLIDAY_REPOSITORY,
      useClass: HolidayRepositoryImpl,
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
      useClass: HolidayRepositoryImpl,
    },
  ],
})
export class HolidayModule {}

