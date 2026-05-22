// Responsabilidad: módulo del ciclo de gestión unificado (correo + portal) para Carteras Propias.

import { Module, forwardRef } from '@nestjs/common';
import { CartPropiasManagementCycleService } from '@application/services/cartPropiasManagementCycle.service';
import { PortalQueriesAutomationModule } from './portalQueriesAutomation.module';
import { EmailInboxAutomationModule } from './emailInboxAutomation.module';
import { AutomationEmailModule } from './automationEmail.module';
import { ManagementCtrlFiledDemandModule } from './managementCtrlFiledDemand.module';
import { DataBasesModule } from './dataBases.module';
import { BotControlModule } from './botControl.module';
import { LoggerModule } from '@infrastructure/logging/logger.module';

@Module({
  imports: [
    PortalQueriesAutomationModule,
    EmailInboxAutomationModule,
    AutomationEmailModule,
    ManagementCtrlFiledDemandModule,
    DataBasesModule,
    forwardRef(() => BotControlModule),
    LoggerModule,
  ],
  providers: [CartPropiasManagementCycleService],
  exports: [CartPropiasManagementCycleService],
})
export class CartPropiasManagementCycleModule {}
