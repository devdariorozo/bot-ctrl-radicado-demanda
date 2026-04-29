import { Module } from '@nestjs/common';

import { DemandsOnlineAutomationService } from '@application/services/demandsOnlineAutomation.service';
import { ManagementDemandsOnlineModule } from './managementDemandsOnline.module';
import { PortfolioCityConfigModule } from './portfolioCityConfig.module';
import { AmountTypeModule } from './amountType.module';
import { BotControlModule } from './botControl.module';
import { DataBasesModule } from './dataBases.module';
import { LoggerModule } from '@infrastructure/logging/logger.module';
import { BROWSER_AUTOMATION_PORT } from '@domain/ports/browserAutomation.ports';
import { DEMAND_PDF_PORT } from '@domain/ports/demandPdf.ports';
import { BrowserlessPuppeteerAdapter } from '@infrastructure/browser/browserlessPuppeteer.adapter';
import { BrowserlessHealthService } from '@infrastructure/browser/browserlessHealth.service';
import { DemandPdfHttpAdapter } from '@infrastructure/http/demandPdfHttp.adapter';
import { CompanyTypeModule } from './companyType.module';
import { LawyerDataModule } from './lawyerData.module';
import { LogsModule } from './logs.module';

@Module({
  imports: [
    ManagementDemandsOnlineModule,
    PortfolioCityConfigModule,
    AmountTypeModule,
    BotControlModule,
    DataBasesModule,
    CompanyTypeModule,
    LawyerDataModule,
    LoggerModule,
    LogsModule,
  ],
  providers: [
    DemandsOnlineAutomationService,
    BrowserlessHealthService,
    DemandPdfHttpAdapter,
    { provide: DEMAND_PDF_PORT, useExisting: DemandPdfHttpAdapter },
    {
      provide: BROWSER_AUTOMATION_PORT,
      useClass: BrowserlessPuppeteerAdapter,
    },
  ],
  exports: [DemandsOnlineAutomationService],
})
export class DemandsOnlineAutomationModule {}

