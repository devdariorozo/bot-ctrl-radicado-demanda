// Responsabilidad: módulo del job de sincronización de demandas pendientes (consulta multi-BD → management_demands_online).

import { Module, forwardRef } from '@nestjs/common';

import { DemandsPendingSyncService } from '@application/services/demandsPendingSync.service';
import { DataBasesModule } from './dataBases.module';
import { PortfolioCityConfigModule } from './portfolioCityConfig.module';
import { ManagementDemandsOnlineModule } from './managementDemandsOnline.module';
import { AmountTypeModule } from './amountType.module';
import { BotControlModule } from './botControl.module';
import { DemandsOnlineAutomationModule } from './demandsOnlineAutomation.module';

@Module({
  imports: [
    DataBasesModule,
    PortfolioCityConfigModule,
    ManagementDemandsOnlineModule,
    AmountTypeModule,
    forwardRef(() => BotControlModule),
    DemandsOnlineAutomationModule,
  ],
  providers: [DemandsPendingSyncService],
  exports: [DemandsPendingSyncService],
})
export class DemandsPendingSyncModule {}
