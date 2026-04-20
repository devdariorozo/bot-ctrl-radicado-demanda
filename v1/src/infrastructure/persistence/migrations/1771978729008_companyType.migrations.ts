// Responsabilidad: crear/eliminar la tabla company_type en la BD.

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CompanyTypeMigration1771978729008 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE company_type (
        id INT AUTO_INCREMENT PRIMARY KEY,
        portfolio_type_id INT NOT NULL,
        campaings_format INT NOT NULL,
        document_type VARCHAR(20) NOT NULL,
        document_name VARCHAR(100) NOT NULL DEFAULT 'NÚMERO DE IDENTIFICACIÓN TRIBUTARIA',
        document_number VARCHAR(30) NOT NULL,
        company_name VARCHAR(255) NOT NULL,
        address VARCHAR(255) NOT NULL,
        contact_number VARCHAR(50) NOT NULL,
        email_notifications VARCHAR(255) NOT NULL,
        detail VARCHAR(255) NOT NULL,
        state_type_id INT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        responsible VARCHAR(100) NOT NULL DEFAULT 'BOT ctrl filed demand',
        CONSTRAINT UQ_company_type_document UNIQUE (document_type, document_number),
        CONSTRAINT FK_company_type_portfolio_type
          FOREIGN KEY (portfolio_type_id) REFERENCES portfolio_type(id),
        CONSTRAINT FK_company_type_state_type
          FOREIGN KEY (state_type_id) REFERENCES state_type(id)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE company_type');
  }
}

