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
import { HolidayEntity } from './entities/holiday.entities';
import { HolidayMigration1771978729015 } from './migrations/1771978729015_holiday.migrations';
import { BotControlEntity } from './entities/botControl.entities';
import { BotControlMigration1771978729009 } from './migrations/1771978729009_botControl.migrations';
import { TblBotControlMigration1771978729018 } from './migrations/1771978729018_tblBotControl.migrations';
import { ManagementCtrlFiledDemandEntity } from './entities/managementCtrlFiledDemand.entities';
import { TblAutomationEmailMigration1771978729016 } from './migrations/1771978729016_automationEmail.migrations';
import { AutomationEmailEntity } from './entities/automationEmail.entities';
import { TblManagementCtrlFiledDemandMigration1771978729017 } from './migrations/1771978729017_managementCtrlFiledDemand.migrations';
import { AlterAutomationEmailDateReceivedToVarchar1771978729020 } from './migrations/1771978729020_alter_automationEmail_date_received_to_varchar.migrations';
import { AlterAttentionScheduleTimeToVarchar1771978729021 } from './migrations/1771978729021_alterAttentionScheduleTimeToVarchar.migrations';

const schema = ((process.env.SCHEMA ?? '').trim().toLowerCase()) as 'mysql' | 'postgres';
const defaultPort = schema === 'postgres' ? '5432' : '3306';
const dbPort = parseInt(process.env.DB_CONFIG_PORT ?? defaultPort, 10);

export const dataSource = new DataSource({
  type: schema,
  host: process.env.DB_CONFIG_HOST ?? 'localhost',
  port: Number.isNaN(dbPort) ? (schema === 'postgres' ? 5432 : 3306) : dbPort,
  username: process.env.DB_CONFIG_USER ?? 'root',
  password: process.env.DB_CONFIG_PASSWORD ?? '',
  database: process.env.DB_CONFIG_DATABASE ?? 'bot_demandas_online',
  entities: [
    TblEnvironmentTypeEntity,
    TblStateTypeEntity,
    TblPortfolioTypeEntity,
    DataBasesEntity,
    TblAttentionScheduleEntity,
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
    HolidayMigration1771978729015,
    BotControlMigration1771978729009,
    TblBotControlMigration1771978729018,
    TblAutomationEmailMigration1771978729016,
    TblManagementCtrlFiledDemandMigration1771978729017,
    AlterAutomationEmailDateReceivedToVarchar1771978729020,
    AlterAttentionScheduleTimeToVarchar1771978729021,
  ],
  synchronize: false,
  logging: process.env.DB_CONFIG_LOGGING === 'true',
});
