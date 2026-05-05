// Responsabilidad: crear/eliminar la tabla tbl_automation_email.

import { MigrationInterface, QueryRunner } from 'typeorm';

export class TblAutomationEmailMigration1771978729016 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`SET FOREIGN_KEY_CHECKS = 0`);
    await queryRunner.query(`DROP TABLE IF EXISTS tbl_automation_email`);
    await queryRunner.query(`SET FOREIGN_KEY_CHECKS = 1`);
    await queryRunner.query(`
      CREATE TABLE tbl_automation_email (
        autm_id INT AUTO_INCREMENT PRIMARY KEY,
        autm_message_id VARCHAR(500) NOT NULL,
        autm_from_email VARCHAR(255) NOT NULL,
        autm_to_email VARCHAR(255) NOT NULL,
        autm_date_received VARCHAR(255) NOT NULL,
        autm_subject VARCHAR(500) NOT NULL,
        autm_departament VARCHAR(100) NULL,
        autm_city VARCHAR(100) NULL,
        autm_locality VARCHAR(100) NULL,
        autm_specialty VARCHAR(100) NULL,
        autm_process_class VARCHAR(100) NULL,
        autm_subject_demanding VARCHAR(100) NULL,
        autm_artificial_person VARCHAR(255) NULL,
        autm_document_type_1 VARCHAR(100) NULL,
        autm_document_number_1 VARCHAR(100) NULL,
        autm_email_1 VARCHAR(255) NULL,
        autm_address_1 VARCHAR(255) NULL,
        autm_phone_number_1 VARCHAR(50) NULL,
        autm_subject_defendant VARCHAR(100) NULL,
        autm_natural_person VARCHAR(255) NULL,
        autm_document_type_2 VARCHAR(100) NULL,
        autm_document_number_2 VARCHAR(100) NULL,
        autm_email_2 VARCHAR(255) NULL,
        autm_address_2 VARCHAR(255) NULL,
        autm_phone_number_2 VARCHAR(50) NULL,
        autm_number_filed VARCHAR(23) NULL,
        autm_automation_status VARCHAR(100) NOT NULL,
        autm_detail TEXT NULL,
        autm_status_type_id INT NOT NULL,
        autm_created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        autm_updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        autm_responsible VARCHAR(100) NOT NULL DEFAULT 'BOT ctrl radicado demanda',
        CONSTRAINT FK_tbl_autm_state_type
          FOREIGN KEY (autm_status_type_id) REFERENCES tbl_state_type(stty_id),
        CONSTRAINT UQ_tbl_autm_message_id UNIQUE (autm_message_id)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS tbl_automation_email');
  }
}
