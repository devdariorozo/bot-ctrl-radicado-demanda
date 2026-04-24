// Responsabilidad: orquestar la ejecución de todas las seeds.

import { dataSource } from '../data_source';
import { tblEnvironmentTypeSeeds } from './1771978729001_tblEnvironmentType.seeds';
import { tblStateTypeSeeds } from './1771978729002_tblStateType.seeds';
import { tblPortfolioTypeSeeds } from './1771978729003_tblPortfolioType.seeds';
import { dataBasesSeeds } from './1771978729004_dataBases.seeds';
import { attentionScheduleSeeds } from './1771978729005_attentionSchedule.seeds';
import { portfolioCityConfigSeeds } from './1771978729006_portfolioCityConfig.seeds';
import { amountTypeSeeds } from './1771978729007_amountType.seeds';
import { companyTypeSeeds } from './1771978729008_companyType.seeds';
import { lawyerDataSeeds } from './1771978729013_lawyerData.seeds';
import { holidaySeeds } from './1771978729015_holiday.seeds';
import { managementDemandsOnlineSeeds } from './1771978729008_managementDemandsOnline.seeds';
import { botControlSeeds } from './1771978729009_botControl.seeds';

async function runSeeds() {
  try {
    await dataSource.initialize();

    const qr = dataSource.createQueryRunner();
    await qr.connect();
    try {
      await qr.query('SET FOREIGN_KEY_CHECKS = 0');
      await qr.query('TRUNCATE TABLE tbl_environment_type');
      await qr.query('TRUNCATE TABLE tbl_state_type');
      await qr.query('TRUNCATE TABLE tbl_portfolio_type');
      await qr.query('TRUNCATE TABLE company_type');
      await qr.query('TRUNCATE TABLE lawyer_data');
      await qr.query('TRUNCATE TABLE holiday');
      await qr.query('TRUNCATE TABLE amount_type');
      await qr.query('TRUNCATE TABLE data_bases');
      await qr.query('TRUNCATE TABLE attention_schedule');
      await qr.query('TRUNCATE TABLE portfolio_city_config');
      await qr.query('TRUNCATE TABLE management_demands_online');
      await qr.query('TRUNCATE TABLE bot_control');
      await qr.query('SET FOREIGN_KEY_CHECKS = 1');
    } finally {
      await qr.release();
    }

    await tblEnvironmentTypeSeeds(dataSource);
    await tblStateTypeSeeds(dataSource);
    await tblPortfolioTypeSeeds(dataSource);
    await dataBasesSeeds(dataSource);
    await attentionScheduleSeeds(dataSource);
    await portfolioCityConfigSeeds(dataSource);
    await amountTypeSeeds(dataSource);
    await companyTypeSeeds(dataSource);
    await lawyerDataSeeds(dataSource);
    await holidaySeeds(dataSource);
    await managementDemandsOnlineSeeds(dataSource);
    await botControlSeeds(dataSource);
  } catch (error) {
    console.error('Error ejecutando seeds:', error);
  } finally {
    await dataSource.destroy();
  }
}

runSeeds();