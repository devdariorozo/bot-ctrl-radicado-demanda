// Responsabilidad: módulo Nest para control del bot (start/stop/status).

import { Module, forwardRef } from '@nestjs/common';

import { BotControlController } from '../http/controller/botControl.controller';
import { BotControlService } from '@application/services/botControl.service';
import { DataBasesModule } from './dataBases.module';
import { TblAttentionScheduleModule } from './attentionSchedule.module';
import { HolidayModule } from './holiday.module';
import { CartPropiasDemandsModule } from './cartPropiasDemandsSync.module';
import { CartPropiasEmailAutomationModule } from './cartPropiasEmailAutomation.module';
import { BOT_CONTROL_REPOSITORY } from '@domain/ports/botControl.ports';
import { BotControlRepositoryImpl } from '@infrastructure/persistence/repositories/botControl.repositories';

@Module({
  controllers: [BotControlController],
  imports: [
    DataBasesModule,
    TblAttentionScheduleModule,
    HolidayModule,
    forwardRef(() => CartPropiasDemandsModule),
    forwardRef(() => CartPropiasEmailAutomationModule),
  ],
  providers: [
    BotControlService,
    {
      provide: BOT_CONTROL_REPOSITORY,
      useClass: BotControlRepositoryImpl,
    },
  ],
  exports: [BotControlService, { provide: BOT_CONTROL_REPOSITORY, useClass: BotControlRepositoryImpl }],
})
export class BotControlModule {}

