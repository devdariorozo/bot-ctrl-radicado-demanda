// Responsabilidad: crear/eliminar la tabla en la BD.

import { MigrationInterface, QueryRunner } from "typeorm";

export class EnvironmentTypeMigration1771978729001 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(`
        CREATE TABLE environment_type (
          id INT AUTO_INCREMENT PRIMARY KEY,
          type VARCHAR(20) NOT NULL,
          detail VARCHAR(100) NOT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          responsible VARCHAR(100) NOT NULL DEFAULT 'BOT demands online',
          CONSTRAINT UQ_environment_type UNIQUE (type)
        )
      `);
    }
  
    public async down(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(`DROP TABLE environment_type`);
    }
  }

