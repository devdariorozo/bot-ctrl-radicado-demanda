// Responsabilidad: endpoints HTTP de Nest (controller).

import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

@ApiTags('api')
@Controller()
export class HealthController {
  constructor(private readonly configService: ConfigService) {}

  @Get('health')
  @ApiOperation({ summary: 'Verificación de que el servicio está vivo' })
  check() {
    const projectName = this.configService.get<string>('PROJECT_NAME', 'bot-demands-online');
    const versionApi = this.configService.get<string>('VERSION_API', 'v1');
    const service = `${projectName}-${versionApi}`;
    return {
      status: 'ok',
      service,
      timestamp: new Date().toISOString(),
    };
  }
}
