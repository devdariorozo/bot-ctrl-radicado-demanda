// Responsabilidad: módulo principal de la aplicación.

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthModule } from './interfaces/modules/health.module';
import { TblStateTypeEntity } from './infrastructure/persistence/entities/stateType.entities';
import { TblStateTypeModule } from './interfaces/modules/stateType.module';
import { TblPortfolioTypeEntity } from './infrastructure/persistence/entities/portfolioType.entities';
import { TblPortfolioTypeModule } from './interfaces/modules/portfolioType.module';
import { TblEnvironmentTypeEntity } from './infrastructure/persistence/entities/environmentType.entities';
import { TblEnvironmentTypeModule } from './interfaces/modules/environmentType.module';
import { TblEnvironmentTypeMigration1771978729001 } from '@infrastructure/persistence/migrations/1771978729001_environmentType.migrations';
import { TblStateTypeMigration1771978729002 } from '@infrastructure/persistence/migrations/1771978729002_stateType.migrations';
import { TblPortfolioTypeMigration1771978729003 } from '@infrastructure/persistence/migrations/1771978729003_portfolioType.migrations';
import { DataBasesEntity } from './infrastructure/persistence/entities/dataBases.entities';
import { DataBasesMigration1771978729004 } from '@infrastructure/persistence/migrations/1771978729004_dataBases.migrations';
import { DataBasesModule } from './interfaces/modules/dataBases.module';
import { TblAttentionScheduleEntity } from './infrastructure/persistence/entities/attentionSchedule.entities';
import { TblAttentionScheduleMigration1771978729005 } from '@infrastructure/persistence/migrations/1771978729005_attentionSchedule.migrations';
import { TblAttentionScheduleModule } from './interfaces/modules/attentionSchedule.module';
import { PortfolioCityConfigEntity } from './infrastructure/persistence/entities/portfolioCityConfig.entities';
import { PortfolioCityConfigMigration1771978729006 } from '@infrastructure/persistence/migrations/1771978729006_portfolioCityConfig.migrations';
import { PortfolioCityConfigModule } from './interfaces/modules/portfolioCityConfig.module';
import { AmountTypeEntity } from './infrastructure/persistence/entities/amountType.entities';
import { AmountTypeMigration1771978729007 } from '@infrastructure/persistence/migrations/1771978729007_amountType.migrations';
import { AlterAmountTypeJson1771978729010 } from '@infrastructure/persistence/migrations/1771978729010_alterAmountTypeJson.migrations';
import { AmountTypeModule } from './interfaces/modules/amountType.module';
import { CompanyTypeEntity } from './infrastructure/persistence/entities/companyType.entities';
import { CompanyTypeMigration1771978729008 } from '@infrastructure/persistence/migrations/1771978729008_companyType.migrations';
import { LawyerDataEntity } from './infrastructure/persistence/entities/lawyerData.entities';
import { LawyerDataMigration1771978729013 } from '@infrastructure/persistence/migrations/1771978729013_lawyerData.migrations';
import { HolidayEntity } from './infrastructure/persistence/entities/holiday.entities';
import { HolidayMigration1771978729015 } from '@infrastructure/persistence/migrations/1771978729015_holiday.migrations';
import { AutomationEmailEntity } from './infrastructure/persistence/entities/automationEmail.entities';
import { TblAutomationEmailMigration1771978729016 } from '@infrastructure/persistence/migrations/1771978729016_automationEmail.migrations';
import { ManagementCtrlFiledDemandEntity } from './infrastructure/persistence/entities/managementCtrlFiledDemand.entities';
import { TblManagementCtrlFiledDemandMigration1771978729017 } from '@infrastructure/persistence/migrations/1771978729017_managementCtrlFiledDemand.migrations';
import { CompanyTypeModule } from './interfaces/modules/companyType.module';
import { LawyerDataModule } from './interfaces/modules/lawyerData.module';
import { HolidayModule } from './interfaces/modules/holiday.module';
import { ManagementCtrlFiledDemandModule } from './interfaces/modules/managementCtrlFiledDemand.module';
import { AutomationEmailModule } from './interfaces/modules/automationEmail.module';
import { BotControlEntity } from './infrastructure/persistence/entities/botControl.entities';
import { BotControlMigration1771978729009 } from '@infrastructure/persistence/migrations/1771978729009_botControl.migrations';
import { TblBotControlMigration1771978729018 } from '@infrastructure/persistence/migrations/1771978729018_tblBotControl.migrations';
import { AlterAttentionScheduleTimeToVarchar1771978729021 } from '@infrastructure/persistence/migrations/1771978729021_alterAttentionScheduleTimeToVarchar.migrations';
import { CartPropiasDemandsModule } from './interfaces/modules/cartPropiasDemandsSync.module';
import { BotControlModule } from './interfaces/modules/botControl.module';
import { LoggerModule } from './infrastructure/logging/logger.module';
import { CartPropiasEmailAutomationModule } from './interfaces/modules/cartPropiasEmailAutomation.module';
import { LogsModule } from './interfaces/modules/logs.module';

@Module({
  imports: [
    ConfigModule.forRoot({  
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get('DB_CONFIG_HOST', 'localhost'),
        port: config.get<number>('DB_CONFIG_PORT', 3306),
        username: config.get('DB_CONFIG_USER', 'root'),
        password: config.get('DB_CONFIG_PASSWORD', ''),
        database: config.get('DB_CONFIG_DATABASE', 'dbd_demands_online'),
        entities: [
          TblEnvironmentTypeEntity,
          TblStateTypeEntity,
          TblPortfolioTypeEntity,
          DataBasesEntity,
          TblAttentionScheduleEntity,
          PortfolioCityConfigEntity,
          AmountTypeEntity,
          CompanyTypeEntity,
          LawyerDataEntity,
          HolidayEntity,
          BotControlEntity,
          ManagementCtrlFiledDemandEntity,
          AutomationEmailEntity,
        ],
        migrations: [
          TblEnvironmentTypeMigration1771978729001,
          TblStateTypeMigration1771978729002,
          TblPortfolioTypeMigration1771978729003,
          DataBasesMigration1771978729004,
          TblAttentionScheduleMigration1771978729005,
          PortfolioCityConfigMigration1771978729006,
          AmountTypeMigration1771978729007,
          AlterAmountTypeJson1771978729010,
          CompanyTypeMigration1771978729008,
          LawyerDataMigration1771978729013,
          HolidayMigration1771978729015,
          BotControlMigration1771978729009,
          TblBotControlMigration1771978729018,
          TblAutomationEmailMigration1771978729016,
          TblManagementCtrlFiledDemandMigration1771978729017,
          AlterAttentionScheduleTimeToVarchar1771978729021,
        ],
        migrationsTableName: 'migrations',
        synchronize: false,
        logging: config.get('DB_CONFIG_LOGGING') === 'true',
      }),
      inject: [ConfigService],
    }),
    LoggerModule,
    HealthModule,
    TblEnvironmentTypeModule,
    TblStateTypeModule,
    TblPortfolioTypeModule,
    DataBasesModule,
    TblAttentionScheduleModule,
    PortfolioCityConfigModule,
    AmountTypeModule,
    CompanyTypeModule,
    LawyerDataModule,
    HolidayModule,
    AutomationEmailModule,
    ManagementCtrlFiledDemandModule,
    BotControlModule,
    CartPropiasDemandsModule,
    CartPropiasEmailAutomationModule,
    LogsModule,
  ],
})
export class AppModule {}
