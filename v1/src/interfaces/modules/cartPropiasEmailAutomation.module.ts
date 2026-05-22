// Responsabilidad: módulo de automatización de correo para Carteras Propias.

import { Module, forwardRef } from '@nestjs/common';
import { CartPropiasEmailAutomationService } from '@application/services/cartPropiasEmailAutomation.service';
import { EmailInboxAutomationModule } from './emailInboxAutomation.module';
import { DataBasesModule } from './dataBases.module';
import { ManagementCtrlFiledDemandModule } from './managementCtrlFiledDemand.module';
import { BotControlModule } from './botControl.module';
import { LoggerModule } from '@infrastructure/logging/logger.module';

@Module({
  imports: [
    EmailInboxAutomationModule,
    DataBasesModule,
    ManagementCtrlFiledDemandModule,
    forwardRef(() => BotControlModule),
    LoggerModule,
  ],
  providers: [CartPropiasEmailAutomationService],
  exports: [CartPropiasEmailAutomationService],
})
export class CartPropiasEmailAutomationModule {}
