// Responsabilidad: módulo Nest para management_demands_online.

import { Module } from '@nestjs/common';
import { ManagementDemandsOnlineController } from '../http/controller/managementDemandsOnline.controller';
import { ManagementDemandsOnlineService } from '@application/services/managementDemandsOnline.service';
import { ManagementDemandsOnlineRepositoryImpl } from '@infrastructure/persistence/repositories/managementDemandsOnline.repositories';
import { MANAGEMENT_DEMANDS_ONLINE_REPOSITORY } from '@domain/ports/managementDemandsOnline.ports';
import { TblStateTypeModule } from './stateType.module';
import { AmountTypeModule } from './amountType.module';
import { PortfolioCityConfigModule } from './portfolioCityConfig.module';

@Module({
  controllers: [ManagementDemandsOnlineController],
  providers: [
    ManagementDemandsOnlineService,
    {
      provide: MANAGEMENT_DEMANDS_ONLINE_REPOSITORY,
      useClass: ManagementDemandsOnlineRepositoryImpl,
    },
  ],
  imports: [TblStateTypeModule, AmountTypeModule, PortfolioCityConfigModule],
  exports: [
    ManagementDemandsOnlineService,
    {
      provide: MANAGEMENT_DEMANDS_ONLINE_REPOSITORY,
      useClass: ManagementDemandsOnlineRepositoryImpl,
    },
  ],
})
export class ManagementDemandsOnlineModule {}
