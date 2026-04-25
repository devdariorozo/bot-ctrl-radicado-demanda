// Responsabilidad: renombrar `data_bases` → `tbl_data_bases` y quitar unique env+cartera (duplicado por `db_bases` en app).

import { MigrationInterface, QueryRunner } from 'typeorm';

export class TblDataBasesAlign1771978729016 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of ['data_bases', 'tbl_data_bases'] as const) {
      const hasTable = await queryRunner.query(
        `
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1
      `,
        [table],
      );
      if (!Array.isArray(hasTable) || hasTable.length === 0) continue;

      const hasUq = await queryRunner.query(
        `
        SELECT 1 FROM information_schema.statistics
        WHERE table_schema = DATABASE() AND table_name = ? AND index_name = 'UQ_data_bases_env_port' LIMIT 1
      `,
        [table],
      );
      if (Array.isArray(hasUq) && hasUq.length > 0) {
        await queryRunner.query(
          `ALTER TABLE \`${table}\` DROP INDEX UQ_data_bases_env_port`,
        );
      }
    }

    const hasOld = await queryRunner.query(`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = DATABASE() AND table_name = 'data_bases' LIMIT 1
    `);
    const hasNew = await queryRunner.query(`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = DATABASE() AND table_name = 'tbl_data_bases' LIMIT 1
    `);
    if (Array.isArray(hasOld) && hasOld.length > 0 && (!Array.isArray(hasNew) || hasNew.length === 0)) {
      await queryRunner.query(`RENAME TABLE data_bases TO tbl_data_bases`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasNew = await queryRunner.query(`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = DATABASE() AND table_name = 'tbl_data_bases' LIMIT 1
    `);
    if (Array.isArray(hasNew) && hasNew.length > 0) {
      await queryRunner.query(`RENAME TABLE tbl_data_bases TO data_bases`);
    }
    const hasUq = await queryRunner.query(`
      SELECT 1 FROM information_schema.statistics
      WHERE table_schema = DATABASE() AND table_name = 'data_bases' AND index_name = 'UQ_data_bases_env_port' LIMIT 1
    `);
    if (Array.isArray(hasUq) && hasUq.length === 0) {
      await queryRunner.query(`
        ALTER TABLE data_bases
        ADD CONSTRAINT UQ_data_bases_env_port UNIQUE (environment_type_id, portfolio_type_id)
      `);
    }
  }
}
