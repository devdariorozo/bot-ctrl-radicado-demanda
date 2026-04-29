// Responsabilidad: orquestar la ejecución de todas las seeds.

import { dataSource } from '../data_source';
import { tblEnvironmentTypeSeeds } from './1771978729001_environmentType.seeds';
import { tblStateTypeSeeds } from './1771978729002_stateType.seeds';
import { tblPortfolioTypeSeeds } from './1771978729003_portfolioType.seeds';
import { dataBasesSeeds } from './1771978729004_dataBases.seeds';
import { tblAttentionScheduleSeeds } from './1771978729005_attentionSchedule.seeds';
import { portfolioCityConfigSeeds } from './1771978729006_portfolioCityConfig.seeds';
import { amountTypeSeeds } from './1771978729007_amountType.seeds';
import { companyTypeSeeds } from './1771978729008_companyType.seeds';
import { lawyerDataSeeds } from './1771978729013_lawyerData.seeds';
import { holidaySeeds } from './1771978729015_holiday.seeds';
import { botControlSeeds } from './1771978729009_botControl.seeds';
import { QueryRunner } from 'typeorm';
import { HolidayMigration1771978729015 } from '../migrations/1771978729015_holiday.migrations';

async function truncateIfExists(qr: QueryRunner, tableName: string): Promise<void> {
  const rows: unknown[] = await qr.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1`,
    [tableName],
  );
  if (Array.isArray(rows) && rows.length > 0) {
    await qr.query(`TRUNCATE TABLE \`${tableName}\``);
  }
}

async function runSeeds() {
  try {
    await dataSource.initialize();

    await dataSource.runMigrations();

    // En algunos entornos la tabla puede no existir aunque la migración figure ejecutada.
    // Garantizamos que exista antes de truncar/sembrar.
    const ensureQr = dataSource.createQueryRunner();
    await ensureQr.connect();
    try {
      const hasHoliday: unknown[] = await ensureQr.query(
        `SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1`,
        ['tbl_holiday'],
      );
      if (!Array.isArray(hasHoliday) || hasHoliday.length === 0) {
        await new HolidayMigration1771978729015().up(ensureQr);
      }
    } finally {
      await ensureQr.release();
    }

    const qr = dataSource.createQueryRunner();
    await qr.connect();
    try {
      await qr.query('SET FOREIGN_KEY_CHECKS = 0');
      await truncateIfExists(qr, 'tbl_environment_type');
      await truncateIfExists(qr, 'tbl_state_type');
      await truncateIfExists(qr, 'tbl_portfolio_type');
      await truncateIfExists(qr, 'company_type');
      await truncateIfExists(qr, 'lawyer_data');
      await truncateIfExists(qr, 'tbl_holiday');
      await truncateIfExists(qr, 'amount_type');
      await truncateIfExists(qr, 'tbl_data_bases');
      await truncateIfExists(qr, 'tbl_attention_schedule');
      await truncateIfExists(qr, 'portfolio_city_config');
      await truncateIfExists(qr, 'bot_control');
      await qr.query('SET FOREIGN_KEY_CHECKS = 1');
    } finally {
      await qr.release();
    }

    await tblEnvironmentTypeSeeds(dataSource);
    await tblStateTypeSeeds(dataSource);
    await tblPortfolioTypeSeeds(dataSource);
    await dataBasesSeeds(dataSource);
    await tblAttentionScheduleSeeds(dataSource);
    await portfolioCityConfigSeeds(dataSource);
    await amountTypeSeeds(dataSource);
    await companyTypeSeeds(dataSource);
    await lawyerDataSeeds(dataSource);
    await holidaySeeds(dataSource);
    await botControlSeeds(dataSource);
  } catch (error) {
    console.error('Error ejecutando seeds:', error);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

runSeeds();
