// Responsabilidad: crear/eliminar la tabla en la BD.

import { MigrationInterface, QueryRunner } from "typeorm";

export class TblEnvironmentTypeMigration1771978729001 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(`SET FOREIGN_KEY_CHECKS = 0`);
      await queryRunner.query(`DROP TABLE IF EXISTS tbl_environment_type`);
      await queryRunner.query(`SET FOREIGN_KEY_CHECKS = 1`);
      await queryRunner.query(`
        CREATE TABLE tbl_environment_type (
          env_id INT AUTO_INCREMENT PRIMARY KEY,
          env_type VARCHAR(50) NOT NULL,
          env_detail VARCHAR(200) NOT NULL,
          env_created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          env_updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          env_responsible VARCHAR(100) NOT NULL DEFAULT 'BOT ctrl radicado demanda',
          CONSTRAINT UQ_tbl_environment_type UNIQUE (env_type)
        )
      `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(`DROP TABLE IF EXISTS tbl_environment_type`);
    }
  }
