// Responsabilidad: módulo NestJS para managementCtrlFiledDemand.

import { Module } from '@nestjs/common';
import { ManagementCtrlFiledDemandController } from '../http/controller/managementCtrlFiledDemand.controller';
import { ManagementCtrlFiledDemandService } from '@application/services/managementCtrlFiledDemand.service';
import { ManagementCtrlFiledDemandRepositoryImpl } from '@infrastructure/persistence/repositories/managementCtrlFiledDemand.repositories';
import { MANAGEMENT_CTRL_FILED_DEMAND_REPOSITORY } from '@domain/ports/managementCtrlFiledDemand.ports';
import { TblStateTypeModule } from './stateType.module';

@Module({
  controllers: [ManagementCtrlFiledDemandController],
  providers: [
    ManagementCtrlFiledDemandService,
    {
      provide: MANAGEMENT_CTRL_FILED_DEMAND_REPOSITORY,
      useClass: ManagementCtrlFiledDemandRepositoryImpl,
    },
  ],
  imports: [TblStateTypeModule],
  exports: [
    ManagementCtrlFiledDemandService,
    {
      provide: MANAGEMENT_CTRL_FILED_DEMAND_REPOSITORY,
      useClass: ManagementCtrlFiledDemandRepositoryImpl,
    },
  ],
})
export class ManagementCtrlFiledDemandModule {}
