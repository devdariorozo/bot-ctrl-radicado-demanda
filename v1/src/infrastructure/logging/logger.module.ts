// Responsabilidad: exponer AppLogger como logger inyectable y global.

import { Global, Module } from '@nestjs/common';
import { AppLogger } from './appLogger.service';

@Global()
@Module({
  providers: [AppLogger],
  exports: [AppLogger],
})
export class LoggerModule {}

