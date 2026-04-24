// Responsabilidad: crear/eliminar la tabla en la BD.

import { MigrationInterface, QueryRunner } from "typeorm";

export class TblStateTypeMigration1771978729002 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
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

    public async down(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(`DROP TABLE tbl_state_type`);
    }
  }