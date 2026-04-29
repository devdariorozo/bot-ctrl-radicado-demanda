// Responsabilidad: cambiar autm_date_received a texto informativo.

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterAutomationEmailDateReceivedToVarchar1771978729020 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const rows: unknown[] = await queryRunner.query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'tbl_automation_email' LIMIT 1`,
    );
    if (!Array.isArray(rows) || rows.length === 0) return;
    await queryRunner.query(`
      ALTER TABLE tbl_automation_email
      MODIFY COLUMN autm_date_received VARCHAR(255) NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE tbl_automation_email
      MODIFY COLUMN autm_date_received DATETIME NOT NULL
    `);
  }
}

