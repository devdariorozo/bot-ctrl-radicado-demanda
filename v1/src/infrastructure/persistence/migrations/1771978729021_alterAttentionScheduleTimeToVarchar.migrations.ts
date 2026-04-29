// Responsabilidad: cambiar columnas de tipo TIME a VARCHAR(5) en tbl_attention_schedule para mantener formato HH:MM.

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterAttentionScheduleTimeToVarchar1771978729021 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE tbl_attention_schedule
        MODIFY COLUMN atsh_start_time       VARCHAR(5) NOT NULL,
        MODIFY COLUMN atsh_start_recess_time VARCHAR(5) NOT NULL,
        MODIFY COLUMN atsh_end_recess_time  VARCHAR(5) NOT NULL,
        MODIFY COLUMN atsh_end_time         VARCHAR(5) NOT NULL
    `);
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
    await queryRunner.query(`
      ALTER TABLE tbl_attention_schedule
        MODIFY COLUMN atsh_start_time       TIME NOT NULL,
        MODIFY COLUMN atsh_start_recess_time TIME NOT NULL,
        MODIFY COLUMN atsh_end_recess_time  TIME NOT NULL,
        MODIFY COLUMN atsh_end_time         TIME NOT NULL
    `);
  }
}
