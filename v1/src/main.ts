// Responsabilidad: punto de entrada de la aplicación.

import { readFileSync } from 'fs';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';

const { description, version } = JSON.parse(
  readFileSync(join(process.cwd(), 'package.json'), 'utf-8'),
) as { description: string; version: string };
import { UnprocessableEntityException, Logger, ValidationPipe } from '@nestjs/common';
// import type { Request, Response, NextFunction } from 'express'; // usado por el middleware CORS (ver #region CORS)
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AppLogger } from './infrastructure/logging/appLogger.service';
import { JsonParseExceptionFilter } from './interfaces/http/filters/jsonParseException.filter';
import { translateValidationMessage } from '@application/utils/validation.utils';
import { StandardResponseInterceptor } from './interfaces/http/interceptors/standardResponse.interceptor';
import { TblEnvironmentTypeDto, UpdateTblEnvironmentTypeDto } from '@interfaces/http/dto/environmentType.dto';
import { TblStateTypeDto, UpdateTblStateTypeDto } from '@interfaces/http/dto/stateType.dto';
import { TblPortfolioTypeDto, UpdateTblPortfolioTypeDto } from '@interfaces/http/dto/portfolioType.dto';
import { DataBasesDto, UpdateDataBasesDto } from '@interfaces/http/dto/dataBases.dto';
import { CreateTblAttentionScheduleDto, UpdateTblAttentionScheduleDto } from '@interfaces/http/dto/attentionSchedule.dto';
import { HolidayDto, UpdateHolidayDto } from '@interfaces/http/dto/holiday.dto';

// Validar SCHEMA antes de inicializar la aplicación. Falla rápido para evitar errores crípticos en TypeORM.
const _dbSchema = (process.env.SCHEMA ?? '').trim().toLowerCase();
if (!['mysql', 'postgres'].includes(_dbSchema)) {
  new Logger('Bootstrap').error(
    `Variable de entorno SCHEMA no definida o inválida. ` +
    `Valor recibido: '${_dbSchema || '(vacío)'}'. ` +
    `Valores permitidos: 'mysql' | 'postgres'.`,
  );
  process.exit(1);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const versionApi = process.env.VERSION_API ?? 'v1';
  app.setGlobalPrefix(`api/${versionApi}`);

  const appLogger = app.get(AppLogger);
  app.useLogger(appLogger);
  const logger = new Logger('Bootstrap');

  // #region CORS — comentado temporalmente; descomentar si se requiere restringir orígenes
  // const corsRaw = process.env.CORS_ALLOWED_ORIGINS?.trim() ?? '';
  // const corsAllowAll = corsRaw === '*';
  // const corsAllowedOrigins = corsAllowAll
  //   ? []
  //   : corsRaw
  //       .split(',')
  //       .map((origin) => origin.trim())
  //       .filter((origin) => origin.length > 0);

  // app.enableCors({
  //   origin: (origin, callback) => {
  //     if (!origin || corsAllowAll || corsAllowedOrigins.length === 0) {
  //       return callback(null, true);
  //     }

  //     if (corsAllowedOrigins.includes(origin)) {
  //       return callback(null, true);
  //     }

  //     return callback(new Error(`Origin ${origin} not allowed by CORS`));
  //   },
  //   credentials: true,
  // });

  // const expressApp = app.getHttpAdapter().getInstance() as {
  //   use: (...args: unknown[]) => void;
  // };
  // expressApp.use(
  //   (err: Error, _req: Request, res: Response, next: NextFunction) => {
  //     if (err?.message?.includes('not allowed by CORS')) {
  //       res.status(403).json({
  //         status: 403,
  //         type: 'warning',
  //         title: 'Acceso denegado',
  //         message: 'Origen no autorizado para acceder a este recurso.',
  //         data: null,
  //       });
  //       return;
  //     }
  //     next(err);
  //   },
  // );
  // #endregion CORS

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => {
        const constraints = errors[0]?.constraints ?? {};
        const rawMsg = Object.values(constraints)[0] ?? 'Datos inválidos.';
        return new UnprocessableEntityException(translateValidationMessage(rawMsg));
      },
    }),
  );

  app.useGlobalFilters(new JsonParseExceptionFilter());
  app.useGlobalInterceptors(new StandardResponseInterceptor());

  const port = process.env.PORT_API ?? 5006;
  const urlApi = process.env.URL_API ?? `http://localhost:${port}`;

  const projectName = process.env.PROJECT_NAME ?? 'bot-ctrl-filed-demand';
  const swaggerTitle = `${projectName}-${versionApi}`;

  const config = new DocumentBuilder()
    .setTitle(swaggerTitle)
    .addServer(urlApi)
    .setDescription(description)
    .setVersion(version)
    .addTag('api', 'Verificación del servicio')
    .addTag('environmentType', 'Tipo de entorno (dev, qa, pro, etc.)')
    .addTag('stateType', 'Tipo de estado (activo, inactivo, en proceso, etc.)')
    .addTag('portfolioType', 'Tipos de cartera y relación con tipo de estado')
    .addTag('dataBases', 'Configuración de bases (tbl_data_bases) por entorno, cartera y estado')
    .addTag('attentionSchedule', 'Horarios de atención por tipo de cartera')
    .addTag('holiday', 'Días festivos por país')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    extraModels: [
      TblEnvironmentTypeDto,
      UpdateTblEnvironmentTypeDto,
      TblStateTypeDto,
      UpdateTblStateTypeDto,
      TblPortfolioTypeDto,
      UpdateTblPortfolioTypeDto,
      DataBasesDto,
      UpdateDataBasesDto,
      CreateTblAttentionScheduleDto,
      UpdateTblAttentionScheduleDto,
      HolidayDto,
      UpdateHolidayDto,
    ],
  });
  SwaggerModule.setup('docs', app, document);

  await app.listen(port);

  logger.log(`Application is running on: ${urlApi}`);
  logger.log(`Swagger UI: ${urlApi}/docs`);
}

bootstrap().catch((err) => {
  const logger = new Logger('Bootstrap');
  logger.error('Error al iniciar la aplicación', err as Error);
  process.exit(1);
});
