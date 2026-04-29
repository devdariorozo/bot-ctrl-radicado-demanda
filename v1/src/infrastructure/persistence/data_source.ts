// Responsabilidad: configuración de la conexión a la base de datos.

import 'dotenv/config';
import { DataSource } from 'typeorm';
import { TblEnvironmentTypeEntity } from './entities/environmentType.entities';
import { TblEnvironmentTypeMigration1771978729001 } from './migrations/1771978729001_environmentType.migrations';
import { TblStateTypeEntity } from './entities/stateType.entities';
import { TblStateTypeMigration1771978729002 } from './migrations/1771978729002_stateType.migrations';
import { TblPortfolioTypeEntity } from './entities/portfolioType.entities';
import { TblPortfolioTypeMigration1771978729003 } from './migrations/1771978729003_portfolioType.migrations';
import { DataBasesEntity } from './entities/dataBases.entities';
import { DataBasesMigration1771978729004 } from './migrations/1771978729004_dataBases.migrations';
import { TblAttentionScheduleEntity } from './entities/attentionSchedule.entities';
import { TblAttentionScheduleMigration1771978729005 } from './migrations/1771978729005_attentionSchedule.migrations';
import { PortfolioCityConfigEntity } from './entities/portfolioCityConfig.entities';
import { PortfolioCityConfigMigration1771978729006 } from './migrations/1771978729006_portfolioCityConfig.migrations';
import { AmountTypeEntity } from './entities/amountType.entities';
import { AmountTypeMigration1771978729007 } from './migrations/1771978729007_amountType.migrations';
import { AlterAmountTypeJson1771978729010 } from './migrations/1771978729010_alterAmountTypeJson.migrations';
import { CompanyTypeEntity } from './entities/companyType.entities';
import { CompanyTypeMigration1771978729008 } from './migrations/1771978729008_companyType.migrations';
import { LawyerDataEntity } from './entities/lawyerData.entities';
import { LawyerDataMigration1771978729013 } from './migrations/1771978729013_lawyerData.migrations';
import { HolidayEntity } from './entities/holiday.entities';
import { HolidayMigration1771978729015 } from './migrations/1771978729015_holiday.migrations';
import { BotControlEntity } from './entities/botControl.entities';
import { BotControlMigration1771978729009 } from './migrations/1771978729009_botControl.migrations';
import { TblBotControlMigration1771978729018 } from './migrations/1771978729018_tblBotControl.migrations';
import { ManagementCtrlFiledDemandEntity } from './entities/managementCtrlFiledDemand.entities';
import { TblAutomationEmailMigration1771978729016 } from './migrations/1771978729016_automationEmail.migrations';
import { AutomationEmailEntity } from './entities/automationEmail.entities';
import { TblManagementCtrlFiledDemandMigration1771978729017 } from './migrations/1771978729017_managementCtrlFiledDemand.migrations';

const dbPort = parseInt(process.env.DB_CONFIG_PORT ?? '3306', 10);

export const dataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_CONFIG_HOST ?? 'localhost',
  port: Number.isNaN(dbPort) ? 3306 : dbPort,
  username: process.env.DB_CONFIG_USER ?? 'root',
  password: process.env.DB_CONFIG_PASSWORD ?? '',
  database: process.env.DB_CONFIG_DATABASE ?? 'bot_demandas_online',
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
  ],
  synchronize: false,
  logging: process.env.DB_CONFIG_LOGGING === 'true',
});