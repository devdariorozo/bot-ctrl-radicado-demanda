// Responsabilidad: crear/eliminar la tabla en la BD.

import { MigrationInterface, QueryRunner } from "typeorm";

export class StateTypeMigration1771978729002 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(`
        CREATE TABLE state_type (
          id INT AUTO_INCREMENT PRIMARY KEY,
          type VARCHAR(20) NOT NULL,
          detail VARCHAR(100) NOT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          responsible VARCHAR(100) NOT NULL DEFAULT 'BOT ctrl filed demand',
          CONSTRAINT UQ_state_type UNIQUE (type)
        )
      `);
    }
  
    public async down(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(`DROP TABLE state_type`);
    }
  }