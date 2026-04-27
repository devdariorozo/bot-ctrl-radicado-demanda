// Responsabilidad: crear/eliminar la tabla en la BD.

import { MigrationInterface, QueryRunner } from "typeorm";

export class TblPortfolioTypeMigration1771978729003 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(`
        CREATE TABLE tbl_portfolio_type (
          porty_id INT AUTO_INCREMENT PRIMARY KEY,
          porty_type VARCHAR(20) NOT NULL,
          porty_detail VARCHAR(100) NOT NULL,
          porty_state_type_id INT NOT NULL,
          porty_created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          porty_updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          porty_responsible VARCHAR(100) NOT NULL DEFAULT 'BOT ctrl radicado demanda',
          CONSTRAINT UQ_tbl_portfolio_type UNIQUE (porty_type),
          CONSTRAINT FK_tbl_portfolio_type_state_type
            FOREIGN KEY (porty_state_type_id) REFERENCES tbl_state_type(stty_id)
        )
      `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(`DROP TABLE tbl_portfolio_type`);
    }
}
