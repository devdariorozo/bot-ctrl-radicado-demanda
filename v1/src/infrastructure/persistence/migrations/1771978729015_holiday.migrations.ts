// Responsabilidad: crear/eliminar la tabla tbl_holiday.

import { MigrationInterface, QueryRunner } from 'typeorm';
import { isPostgres } from './migration.helpers';

export class HolidayMigration1771978729015 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    if (isPostgres(queryRunner)) {
      await queryRunner.query(`DROP TABLE IF EXISTS tbl_holiday CASCADE`);
      await queryRunner.query(`
        CREATE TABLE tbl_holiday (
          hldy_id           SERIAL       PRIMARY KEY,
          hldy_date         DATE         NOT NULL,
          hldy_name         VARCHAR(150) NOT NULL,
          hldy_country_code CHAR(2)      NOT NULL,
          hldy_type         VARCHAR(50)  NOT NULL,
          hldy_is_working_day SMALLINT   NOT NULL DEFAULT 0,
          hldy_detail       VARCHAR(255) NOT NULL,
          hldy_state_type_id INT         NOT NULL,
          hldy_created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
          hldy_updated_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
          hldy_responsible  VARCHAR(100) NOT NULL DEFAULT 'BOT ctrl radicado demanda',
          CONSTRAINT UQ_tbl_holiday_country_date UNIQUE (hldy_country_code, hldy_date),
          CONSTRAINT FK_tbl_holiday_state_type
            FOREIGN KEY (hldy_state_type_id) REFERENCES tbl_state_type(stty_id)
        )
      `);
    } else {
      await queryRunner.query(`SET FOREIGN_KEY_CHECKS = 0`);
      await queryRunner.query(`DROP TABLE IF EXISTS tbl_holiday`);
      await queryRunner.query(`SET FOREIGN_KEY_CHECKS = 1`);
      await queryRunner.query(`
        CREATE TABLE tbl_holiday (
          hldy_id INT AUTO_INCREMENT PRIMARY KEY,
          hldy_date DATE NOT NULL,
          hldy_name VARCHAR(150) NOT NULL,
          hldy_country_code CHAR(2) NOT NULL,
          hldy_type VARCHAR(50) NOT NULL,
          hldy_is_working_day TINYINT(1) NOT NULL DEFAULT 0,
          hldy_detail VARCHAR(255) NOT NULL,
          hldy_state_type_id INT NOT NULL,
          hldy_created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          hldy_updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          hldy_responsible VARCHAR(100) NOT NULL DEFAULT 'BOT ctrl radicado demanda',
          CONSTRAINT UQ_tbl_holiday_country_date UNIQUE (hldy_country_code, hldy_date),
          CONSTRAINT FK_tbl_holiday_state_type
            FOREIGN KEY (hldy_state_type_id) REFERENCES tbl_state_type(stty_id)
        )
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (isPostgres(queryRunner)) {
      await queryRunner.query(`DROP TABLE IF EXISTS tbl_holiday CASCADE`);
    } else {
      await queryRunner.query(`DROP TABLE IF EXISTS tbl_holiday`);
    }
  }
}
