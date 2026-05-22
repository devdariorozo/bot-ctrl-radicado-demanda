// Responsabilidad: módulo del job de sincronización de demandas Presentada / Presentada por aplicativo
// para el flujo de Carteras Propias.

import { Module, forwardRef } from '@nestjs/common';

import { CartPropiasDemandsSyncService } from '@application/services/cartPropiasDemandsSyncService.service';
import { DataBasesModule } from './dataBases.module';
import { ManagementCtrlFiledDemandModule } from './managementCtrlFiledDemand.module';
import { BotControlModule } from './botControl.module';
import { LogsModule } from './logs.module';

@Module({
  imports: [
    DataBasesModule,
    ManagementCtrlFiledDemandModule,
    forwardRef(() => BotControlModule),
    LogsModule,
  ],
  providers: [CartPropiasDemandsSyncService],
  exports: [CartPropiasDemandsSyncService],
})
export class CartPropiasDemandsModule {}
