// Responsabilidad: crear tabla bot_control para manejar el estado del bot por configuración de data_bases.

import { MigrationInterface, QueryRunner } from 'typeorm';
import { isPostgres } from './migration.helpers';

export class BotControlMigration1771978729009 implements MigrationInterface {
  name = 'BotControlMigration1771978729009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (isPostgres(queryRunner)) {
      await queryRunner.query(`DROP TABLE IF EXISTS bot_control CASCADE`);
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS bot_control (
          id              SERIAL       PRIMARY KEY,
          data_bases_id   INT          NOT NULL,
          running         SMALLINT     NOT NULL DEFAULT 0,
          last_started_at TIMESTAMP    NULL,
          last_stopped_at TIMESTAMP    NULL,
          reason          VARCHAR(255) NULL,
          created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
          responsible     VARCHAR(100) NOT NULL,
          CONSTRAINT UQ_bot_control_data_bases UNIQUE (data_bases_id),
          CONSTRAINT FK_bot_control_data_bases
            FOREIGN KEY (data_bases_id) REFERENCES tbl_data_bases(db_id)
              ON DELETE CASCADE ON UPDATE CASCADE
        )
      `);
    } else {
      await queryRunner.query(`SET FOREIGN_KEY_CHECKS = 0`);
      await queryRunner.query(`DROP TABLE IF EXISTS bot_control`);
      await queryRunner.query(`
        CREATE TABLE bot_control (
          id INT NOT NULL AUTO_INCREMENT,
          data_bases_id INT NOT NULL,
          running TINYINT(1) NOT NULL DEFAULT 0,
          last_started_at DATETIME NULL,
          last_stopped_at DATETIME NULL,
          reason VARCHAR(255) NULL,
          created_at DATETIME NOT NULL,
          updated_at DATETIME NOT NULL,
          responsible VARCHAR(100) NOT NULL,
          CONSTRAINT UQ_bot_control_data_bases UNIQUE (data_bases_id),
          CONSTRAINT PK_bot_control PRIMARY KEY (id),
          CONSTRAINT FK_bot_control_data_bases
            FOREIGN KEY (data_bases_id) REFERENCES tbl_data_bases(db_id)
              ON DELETE CASCADE
              ON UPDATE CASCADE
        )
        ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      await queryRunner.query(`SET FOREIGN_KEY_CHECKS = 1`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (isPostgres(queryRunner)) {
      await queryRunner.query(`DROP TABLE IF EXISTS bot_control CASCADE`);
    } else {
      await queryRunner.query(`DROP TABLE IF EXISTS bot_control`);
    }
  }
}
