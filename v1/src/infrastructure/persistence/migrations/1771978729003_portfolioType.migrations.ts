// Responsabilidad: crear/eliminar la tabla en la BD.

import { MigrationInterface, QueryRunner } from "typeorm";

export class PortfolioTypeMigration1771978729003 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(`
        CREATE TABLE portfolio_type (
          id INT AUTO_INCREMENT PRIMARY KEY,
          type VARCHAR(20) NOT NULL,
          detail VARCHAR(100) NOT NULL,
          state_type_id INT NOT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          responsible VARCHAR(100) NOT NULL DEFAULT 'BOT ctrl filed demand',
          CONSTRAINT UQ_portfolio_type UNIQUE (type),
          CONSTRAINT FK_portfolio_type_state_type
            FOREIGN KEY (state_type_id) REFERENCES state_type(id)
        )
      `);
    }
  
    public async down(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(`DROP TABLE portfolio_type`);
    }
  }