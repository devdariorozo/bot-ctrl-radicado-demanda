// Responsabilidad: módulo genérico de automatización de bandeja de entrada.
// El adaptador activo (IMAP / POP3) se selecciona por la variable MAIL_PROTOCOL.
// Reutilizable por cualquier tipo de cartera.

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EmailInboxAutomationService } from '@application/services/emailInboxAutomation.service';
import { ImapInboxAdapter } from '@infrastructure/email/imapInbox.adapter';
import { Pop3InboxAdapter } from '@infrastructure/email/pop3Inbox.adapter';
import { EMAIL_INBOX_PORT, EmailInboxPort } from '@domain/ports/emailInbox.ports';
import { AutomationEmailModule } from './automationEmail.module';
import { LoggerModule } from '@infrastructure/logging/logger.module';

@Module({
  imports: [ConfigModule, AutomationEmailModule, LoggerModule],
  providers: [
    ImapInboxAdapter,
    Pop3InboxAdapter,
    {
      provide: EMAIL_INBOX_PORT,
      useFactory: (
        configService: ConfigService,
        imapAdapter: ImapInboxAdapter,
        pop3Adapter: Pop3InboxAdapter,
      ): EmailInboxPort => {
        const protocol = configService.get<string>('MAIL_PROTOCOL', 'IMAP').trim().toUpperCase();
        return protocol === 'POP3' ? pop3Adapter : imapAdapter;
      },
      inject: [ConfigService, ImapInboxAdapter, Pop3InboxAdapter],
    },
    EmailInboxAutomationService,
  ],
  exports: [EmailInboxAutomationService],
})
export class EmailInboxAutomationModule {}
