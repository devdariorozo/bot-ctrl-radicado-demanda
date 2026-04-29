// Responsabilidad: crear/eliminar la tabla amount_type en la BD.

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AmountTypeMigration1771978729007 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`SET FOREIGN_KEY_CHECKS = 0`);
    await queryRunner.query(`DROP TABLE IF EXISTS amount_type`);
    await queryRunner.query(`SET FOREIGN_KEY_CHECKS = 1`);
    await queryRunner.query(`
      CREATE TABLE amount_type (
        id INT AUTO_INCREMENT PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        specialty_process VARCHAR(255) NOT NULL,
        class_process VARCHAR(255) NOT NULL,
        detail VARCHAR(255) NOT NULL,
        state_type_id INT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        responsible VARCHAR(100) NOT NULL DEFAULT 'BOT ctrl filed demand',
        CONSTRAINT UQ_amount_type UNIQUE (type),
        CONSTRAINT FK_amount_type_state_type
          FOREIGN KEY (state_type_id) REFERENCES state_type(id)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS amount_type`);
  }
}

