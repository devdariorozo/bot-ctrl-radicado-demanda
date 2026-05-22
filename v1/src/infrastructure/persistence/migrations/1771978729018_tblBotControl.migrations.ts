// Responsabilidad: crear/eliminar la tabla tbl_bot_control.

import { MigrationInterface, QueryRunner } from 'typeorm';
import { isPostgres } from './migration.helpers';

export class TblBotControlMigration1771978729018 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    if (isPostgres(queryRunner)) {
      await queryRunner.query(`DROP TABLE IF EXISTS tbl_bot_control CASCADE`);
      await queryRunner.query(`
        CREATE TABLE tbl_bot_control (
          bctrl_id              SERIAL        PRIMARY KEY,
          bctrl_data_bases_id   INT           NOT NULL,
          bctrl_running         SMALLINT      NOT NULL DEFAULT 0,
          bctrl_last_started_at TIMESTAMP     NULL,
          bctrl_last_stopped_at TIMESTAMP     NULL,
          bctrl_reason          VARCHAR(255)  NULL,
          bctrl_detail          VARCHAR(500)  NULL,
          bctrl_created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
          bctrl_updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
          bctrl_responsible     VARCHAR(100)  NOT NULL DEFAULT 'BOT ctrl radicado demanda',
          CONSTRAINT FK_tbl_bctrl_data_bases
            FOREIGN KEY (bctrl_data_bases_id) REFERENCES tbl_data_bases(db_id)
        )
      `);
    } else {
      await queryRunner.query(`SET FOREIGN_KEY_CHECKS = 0`);
      await queryRunner.query(`DROP TABLE IF EXISTS tbl_bot_control`);
      await queryRunner.query(`SET FOREIGN_KEY_CHECKS = 1`);
      await queryRunner.query(`
        CREATE TABLE tbl_bot_control (
          bctrl_id INT AUTO_INCREMENT PRIMARY KEY,
          bctrl_data_bases_id INT NOT NULL,
          bctrl_running TINYINT(1) NOT NULL DEFAULT 0,
          bctrl_last_started_at DATETIME NULL,
          bctrl_last_stopped_at DATETIME NULL,
          bctrl_reason VARCHAR(255) NULL,
          bctrl_detail VARCHAR(500) NULL,
          bctrl_created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          bctrl_updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          bctrl_responsible VARCHAR(100) NOT NULL DEFAULT 'BOT ctrl radicado demanda',
          CONSTRAINT FK_tbl_bctrl_data_bases
            FOREIGN KEY (bctrl_data_bases_id) REFERENCES tbl_data_bases(db_id)
        )
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (isPostgres(queryRunner)) {
      await queryRunner.query(`DROP TABLE IF EXISTS tbl_bot_control CASCADE`);
    } else {
      await queryRunner.query('DROP TABLE IF EXISTS tbl_bot_control');
    }
  }
}
