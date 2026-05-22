// Responsabilidad: módulo NestJS para automationEmail.

import { Module } from '@nestjs/common';
import { AutomationEmailController } from '../http/controller/automationEmail.controller';
import { AutomationEmailService } from '@application/services/automationEmail.service';
import { AutomationEmailExpirationService } from '@application/services/automationEmailExpiration.service';
import { AutomationEmailRepositoryImpl } from '@infrastructure/persistence/repositories/automationEmail.repositories';
import { AUTOMATION_EMAIL_REPOSITORY } from '@domain/ports/automationEmail.ports';
import { TblStateTypeModule } from './stateType.module';

@Module({
  controllers: [AutomationEmailController],
  providers: [
    AutomationEmailService,
    AutomationEmailExpirationService,
    {
      provide: AUTOMATION_EMAIL_REPOSITORY,
      useClass: AutomationEmailRepositoryImpl,
    },
  ],
  imports: [TblStateTypeModule],
  exports: [
    AutomationEmailService,
    {
      provide: AUTOMATION_EMAIL_REPOSITORY,
      useClass: AutomationEmailRepositoryImpl,
    },
  ],
})
export class AutomationEmailModule {}
