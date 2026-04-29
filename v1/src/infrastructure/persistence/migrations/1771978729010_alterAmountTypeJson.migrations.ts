// Responsabilidad: alterar specialty_process y class_process a JSON en amount_type.

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterAmountTypeJson1771978729010 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const rows: unknown[] = await queryRunner.query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'amount_type' LIMIT 1`,
    );
    if (!Array.isArray(rows) || rows.length === 0) return;
    await queryRunner.query(`
      ALTER TABLE amount_type
        MODIFY COLUMN specialty_process JSON NOT NULL,
        MODIFY COLUMN class_process JSON NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE amount_type
        MODIFY COLUMN specialty_process VARCHAR(255) NOT NULL,
        MODIFY COLUMN class_process VARCHAR(255) NOT NULL
    `);
  }
}
