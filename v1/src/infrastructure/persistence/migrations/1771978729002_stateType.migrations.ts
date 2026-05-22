// Responsabilidad: crear/eliminar la tabla en la BD.

import { MigrationInterface, QueryRunner } from 'typeorm';
import { isPostgres } from './migration.helpers';

export class TblStateTypeMigration1771978729002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    if (isPostgres(queryRunner)) {
      await queryRunner.query(`DROP TABLE IF EXISTS tbl_state_type CASCADE`);
      await queryRunner.query(`
        CREATE TABLE tbl_state_type (
          stty_id      SERIAL        PRIMARY KEY,
          stty_type    VARCHAR(50)   NOT NULL,
          stty_detail  VARCHAR(200)  NOT NULL,
          stty_created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          stty_updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          stty_responsible VARCHAR(100) NOT NULL DEFAULT 'BOT ctrl radicado demanda',
          CONSTRAINT UQ_tbl_state_type UNIQUE (stty_type)
        )
      `);
    } else {
      await queryRunner.query(`SET FOREIGN_KEY_CHECKS = 0`);
      await queryRunner.query(`DROP TABLE IF EXISTS tbl_state_type`);
      await queryRunner.query(`SET FOREIGN_KEY_CHECKS = 1`);
      await queryRunner.query(`
        CREATE TABLE tbl_state_type (
          stty_id INT AUTO_INCREMENT PRIMARY KEY,
          stty_type VARCHAR(50) NOT NULL,
          stty_detail VARCHAR(200) NOT NULL,
          stty_created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          stty_updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          stty_responsible VARCHAR(100) NOT NULL DEFAULT 'BOT ctrl radicado demanda',
          CONSTRAINT UQ_tbl_state_type UNIQUE (stty_type)
        )
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (isPostgres(queryRunner)) {
      await queryRunner.query(`DROP TABLE IF EXISTS tbl_state_type CASCADE`);
    } else {
      await queryRunner.query(`DROP TABLE IF EXISTS tbl_state_type`);
    }
  }
}
