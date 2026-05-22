// Responsabilidad: cambiar columnas de tipo TIME a VARCHAR(5) en tbl_attention_schedule para mantener formato HH:MM.

import { MigrationInterface, QueryRunner } from 'typeorm';
import { isPostgres } from './migration.helpers';

export class AlterAttentionScheduleTimeToVarchar1771978729021 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    if (isPostgres(queryRunner)) {
      await queryRunner.query(`
        ALTER TABLE tbl_attention_schedule
          ALTER COLUMN atsh_start_time        TYPE VARCHAR(5) USING SUBSTRING(atsh_start_time::text, 1, 5),
          ALTER COLUMN atsh_start_recess_time TYPE VARCHAR(5) USING SUBSTRING(atsh_start_recess_time::text, 1, 5),
          ALTER COLUMN atsh_end_recess_time   TYPE VARCHAR(5) USING SUBSTRING(atsh_end_recess_time::text, 1, 5),
          ALTER COLUMN atsh_end_time          TYPE VARCHAR(5) USING SUBSTRING(atsh_end_time::text, 1, 5)
      `);
    } else {
      await queryRunner.query(`
        ALTER TABLE tbl_attention_schedule
          MODIFY COLUMN atsh_start_time       VARCHAR(5) NOT NULL,
          MODIFY COLUMN atsh_start_recess_time VARCHAR(5) NOT NULL,
          MODIFY COLUMN atsh_end_recess_time  VARCHAR(5) NOT NULL,
          MODIFY COLUMN atsh_end_time         VARCHAR(5) NOT NULL
      `);
    }
    await queryRunner.query(`
      UPDATE tbl_attention_schedule
      SET
        atsh_start_time        = LEFT(atsh_start_time, 5),
        atsh_start_recess_time = LEFT(atsh_start_recess_time, 5),
        atsh_end_recess_time   = LEFT(atsh_end_recess_time, 5),
        atsh_end_time          = LEFT(atsh_end_time, 5)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (isPostgres(queryRunner)) {
      await queryRunner.query(`
        ALTER TABLE tbl_attention_schedule
          ALTER COLUMN atsh_start_time        TYPE TIME USING atsh_start_time::time,
          ALTER COLUMN atsh_start_recess_time TYPE TIME USING atsh_start_recess_time::time,
          ALTER COLUMN atsh_end_recess_time   TYPE TIME USING atsh_end_recess_time::time,
          ALTER COLUMN atsh_end_time          TYPE TIME USING atsh_end_time::time
      `);
    } else {
      await queryRunner.query(`
        ALTER TABLE tbl_attention_schedule
          MODIFY COLUMN atsh_start_time       TIME NOT NULL,
          MODIFY COLUMN atsh_start_recess_time TIME NOT NULL,
          MODIFY COLUMN atsh_end_recess_time  TIME NOT NULL,
          MODIFY COLUMN atsh_end_time         TIME NOT NULL
      `);
    }
  }
}
