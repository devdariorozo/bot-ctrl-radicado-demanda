// Responsabilidad: crear/eliminar la tabla lawyer_data.

import { MigrationInterface, QueryRunner } from 'typeorm';

export class LawyerDataMigration1771978729013 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE lawyer_data (
        id INT AUTO_INCREMENT PRIMARY KEY,
        portfolio_type_id INT NOT NULL,
        document_type VARCHAR(10) NOT NULL,
        document_name VARCHAR(100) NOT NULL DEFAULT 'CÉDULA DE CIUDADANÍA',
        document_number VARCHAR(30) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        second_name VARCHAR(100) NULL,
        first_last_name VARCHAR(100) NOT NULL,
        second_last_name VARCHAR(100) NULL,
        address VARCHAR(255) NOT NULL,
        contact_number VARCHAR(50) NOT NULL,
        email_notifications VARCHAR(255) NOT NULL,
        detail VARCHAR(255) NOT NULL,
        state_type_id INT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        responsible VARCHAR(100) NOT NULL DEFAULT 'BOT ctrl filed demand',
        CONSTRAINT UQ_lawyer_data_portfolio_type_document UNIQUE (portfolio_type_id, document_type, document_number),
        CONSTRAINT FK_lawyer_data_portfolio_type
          FOREIGN KEY (portfolio_type_id) REFERENCES portfolio_type(id),
        CONSTRAINT FK_lawyer_data_state_type
          FOREIGN KEY (state_type_id) REFERENCES state_type(id)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE lawyer_data');
  }
}

