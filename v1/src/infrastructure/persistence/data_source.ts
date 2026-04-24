// Responsabilidad: configuración de la conexión a la base de datos.

import 'dotenv/config';
import { DataSource } from 'typeorm';
import { TblEnvironmentTypeEntity } from './entities/tblEnvironmentType.entities';
import { TblEnvironmentTypeMigration1771978729001 } from './migrations/1771978729001_tblEnvironmentType.migrations';
import { TblStateTypeEntity } from './entities/tblStateType.entities';
import { TblStateTypeMigration1771978729002 } from './migrations/1771978729002_tblStateType.migrations';
import { TblPortfolioTypeEntity } from './entities/tblPortfolioType.entities';
import { TblPortfolioTypeMigration1771978729003 } from './migrations/1771978729003_tblPortfolioType.migrations';
import { DataBasesEntity } from './entities/dataBases.entities';
import { DataBasesMigration1771978729004 } from './migrations/1771978729004_dataBases.migrations';
import { AttentionScheduleEntity } from './entities/attentionSchedule.entities';
import { AttentionScheduleMigration1771978729005 } from './migrations/1771978729005_attentionSchedule.migrations';
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
import { ManagementDemandsOnlineEntity } from './entities/managementDemandsOnline.entities';
import { ManagementDemandsOnlineMigration1771978729008 } from './migrations/1771978729008_managementDemandsOnline.migrations';
import { BotControlEntity } from './entities/botControl.entities';
import { BotControlMigration1771978729009 } from './migrations/1771978729009_botControl.migrations';

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
    AttentionScheduleEntity,
    PortfolioCityConfigEntity,
    AmountTypeEntity,
    CompanyTypeEntity,
    LawyerDataEntity,
    HolidayEntity,
    ManagementDemandsOnlineEntity,
    BotControlEntity,
  ],
  migrations: [
    TblEnvironmentTypeMigration1771978729001,
    TblStateTypeMigration1771978729002,
    TblPortfolioTypeMigration1771978729003,
    DataBasesMigration1771978729004,
    AttentionScheduleMigration1771978729005,
    PortfolioCityConfigMigration1771978729006,
    AmountTypeMigration1771978729007,
    AlterAmountTypeJson1771978729010,
    CompanyTypeMigration1771978729008,
    LawyerDataMigration1771978729013,
    HolidayMigration1771978729015,
    ManagementDemandsOnlineMigration1771978729008,
    BotControlMigration1771978729009,
  ],
  synchronize: false,
  logging: process.env.DB_CONFIG_LOGGING === 'true',
});