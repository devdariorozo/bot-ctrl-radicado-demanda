// Responsabilidad: crear tabla bot_control para manejar el estado del bot por configuración de data_bases.

import { MigrationInterface, QueryRunner } from 'typeorm';

export class BotControlMigration1771978729009 implements MigrationInterface {
  name = 'BotControlMigration1771978729009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`SET FOREIGN_KEY_CHECKS = 0`);
    await queryRunner.query(`DROP TABLE IF EXISTS bot_control`);
    await queryRunner.query(`SET FOREIGN_KEY_CHECKS = 1`);
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
          FOREIGN KEY (data_bases_id) REFERENCES data_bases(id)
            ON DELETE CASCADE
            ON UPDATE CASCADE
      )
      ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS bot_control');
  }
}

