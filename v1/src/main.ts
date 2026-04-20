// Responsabilidad: punto de entrada de la aplicación.

import { NestFactory } from '@nestjs/core';
import { description, version } from '../package.json';
import { Logger, ValidationPipe } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AppLogger } from './infrastructure/logging/appLogger.service';
import { JsonParseExceptionFilter } from './interfaces/http/filters/jsonParseException.filter';
import { StandardResponseInterceptor } from './interfaces/http/interceptors/standardResponse.interceptor';
import { EnvironmentTypeDto, UpdateEnvironmentTypeDto } from '@interfaces/http/dto/environmentType.dto';
import { StateTypeDto, UpdateStateTypeDto } from '@interfaces/http/dto/stateType.dto';
import { PortfolioTypeDto, UpdatePortfolioTypeDto } from '@interfaces/http/dto/portfolioType.dto';
import { DataBasesDto, UpdateDataBasesDto } from '@interfaces/http/dto/dataBases.dto';
import { CreateAttentionScheduleDto, AttentionScheduleDto, UpdateAttentionScheduleDto } from '@interfaces/http/dto/attentionSchedule.dto';
import { PortfolioCityConfigDto, UpdatePortfolioCityConfigDto } from '@interfaces/http/dto/portfolioCityConfig.dto';
import { AmountTypeDto, UpdateAmountTypeDto } from '@interfaces/http/dto/amountType.dto';
import { CompanyTypeDto, UpdateCompanyTypeDto } from '@interfaces/http/dto/companyType.dto';
import { LawyerDataDto, UpdateLawyerDataDto } from '@interfaces/http/dto/lawyerData.dto';
import { HolidayDto, UpdateHolidayDto } from '@interfaces/http/dto/holiday.dto';
import {
  ManagementDemandsOnlineDto,
  UpdateManagementDemandsOnlineDto,
} from '@interfaces/http/dto/managementDemandsOnline.dto';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Prefijo global: api/{VERSION_API} (ej. api/v1)
  const versionApi = process.env.VERSION_API ?? 'v1';
  app.setGlobalPrefix(`api/${versionApi}`);

  const appLogger = app.get(AppLogger);
  app.useLogger(appLogger);
  const logger = new Logger('Bootstrap');

  const corsRaw = process.env.CORS_ALLOWED_ORIGINS?.trim() ?? '';
  const corsAllowAll = corsRaw === '*';
  const corsAllowedOrigins = corsAllowAll
    ? []
    : corsRaw
        .split(',')
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || corsAllowAll || corsAllowedOrigins.length === 0) {
        return callback(null, true);
      }

      if (corsAllowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  });

  // Handler Express-level para errores CORS (ocurren antes del pipeline de NestJS).
  // El middleware cors llama a next(err) cuando el origen no está permitido,
  // lo que escapa al ExceptionFilter global y produciría un 500 sin formato.
  const expressApp = app.getHttpAdapter().getInstance() as {
    use: (...args: unknown[]) => void;
  };
  expressApp.use(
    (err: Error, _req: Request, res: Response, next: NextFunction) => {
      if (err?.message?.includes('not allowed by CORS')) {
        res.status(403).json({
          status: 403,
          type: 'warning',
          title: 'Acceso denegado',
          message: 'Origen no autorizado para acceder a este recurso.',
          data: null,
        });
        return;
      }
      next(err);
    },
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
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
    .addTag('environmentType', 'Tipo de entorno que se puede tener en el sistema')
    .addTag('stateType', 'Tipo de estado que puede tener un registro')
    .addTag('portfolioType', 'Tipo de cartera que se puede tener en el sistema')
    .addTag('dataBases', 'Configuración de bases de datos por entorno y cartera')
    .addTag('attentionSchedule', 'Horarios de atención por cartera')
    .addTag('holiday', 'Días festivos por país')
    .addTag('portfolioCityConfig', 'Configuración de ciudades por cartera')
    .addTag('amountType', 'Tipo de cuantía (mayor, menor, mínima)')
    .addTag('companyType', 'Configuración de compañías por cartera')
    .addTag('lawyerData', 'Datos base de abogados por cartera')
    .addTag('managementDemandsOnline', 'Gestión de demandas pendientes')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    extraModels: [
      EnvironmentTypeDto,
      UpdateEnvironmentTypeDto,
      StateTypeDto,
      UpdateStateTypeDto,
      PortfolioTypeDto,
      UpdatePortfolioTypeDto,
      DataBasesDto,
      UpdateDataBasesDto,
      CreateAttentionScheduleDto,
      AttentionScheduleDto,
      UpdateAttentionScheduleDto,
      PortfolioCityConfigDto,
      UpdatePortfolioCityConfigDto,
      AmountTypeDto,
      UpdateAmountTypeDto,
      CompanyTypeDto,
      UpdateCompanyTypeDto,
      HolidayDto,
      UpdateHolidayDto,
      LawyerDataDto,
      UpdateLawyerDataDto,
      ManagementDemandsOnlineDto,
      UpdateManagementDemandsOnlineDto,
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
