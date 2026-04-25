// Responsabilidad: punto de entrada de la aplicación.

import { readFileSync } from 'fs';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';

const { description, version } = JSON.parse(
  readFileSync(join(process.cwd(), 'package.json'), 'utf-8'),
) as { description: string; version: string };
import { UnprocessableEntityException, Logger, ValidationPipe } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AppLogger } from './infrastructure/logging/appLogger.service';
import { JsonParseExceptionFilter } from './interfaces/http/filters/jsonParseException.filter';
import { translateValidationMessage } from '@application/utils/validation.utils';
import { StandardResponseInterceptor } from './interfaces/http/interceptors/standardResponse.interceptor';
import { TblEnvironmentTypeDto, UpdateTblEnvironmentTypeDto } from '@interfaces/http/dto/tblEnvironmentType.dto';
import { TblStateTypeDto, UpdateTblStateTypeDto } from '@interfaces/http/dto/tblStateType.dto';
import { TblPortfolioTypeDto, UpdateTblPortfolioTypeDto } from '@interfaces/http/dto/tblPortfolioType.dto';
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
    .addTag('tbl_data_bases', 'Configuración de bases (tbl_data_bases) por entorno, cartera y estado')
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
      TblEnvironmentTypeDto,
      UpdateTblEnvironmentTypeDto,
      TblStateTypeDto,
      UpdateTblStateTypeDto,
      TblPortfolioTypeDto,
      UpdateTblPortfolioTypeDto,
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
