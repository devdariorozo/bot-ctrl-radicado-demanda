// Responsabilidad: crear/eliminar la tabla tbl_management_ctrl_filed_demand.

import { MigrationInterface, QueryRunner } from 'typeorm';

export class TblManagementCtrlFiledDemandMigration1771978729017 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`SET FOREIGN_KEY_CHECKS = 0`);
    await queryRunner.query(`DROP TABLE IF EXISTS tbl_management_ctrl_filed_demand`);
    await queryRunner.query(`SET FOREIGN_KEY_CHECKS = 1`);
    await queryRunner.query(`
      CREATE TABLE tbl_management_ctrl_filed_demand (
        mcfd_id INT AUTO_INCREMENT PRIMARY KEY,
        mcfd_portfolio_type_id INT NOT NULL,
        mcfd_name_data_base VARCHAR(100) NOT NULL,
        mcfd_lawsuit_id INT NOT NULL,
        mcfd_lawsuits_filings_id INT NOT NULL,
        mcfd_client_id INT NOT NULL,
        mcfd_automation_email_id INT NULL,
        mcfd_last_execution DATETIME NULL,
        mcfd_retries INT NOT NULL DEFAULT 0,
        mcfd_filing_date DATE NULL,
        mcfd_filing_date_action DATE NULL,
        mcfd_number_filed VARCHAR(23) NULL,
        mcfd_management_status VARCHAR(100) NOT NULL,
        mcfd_detail TEXT NULL,
        mcfd_state_type_id INT NOT NULL,
        mcfd_created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        mcfd_updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        mcfd_responsible VARCHAR(100) NOT NULL DEFAULT 'BOT ctrl radicado demanda',
        CONSTRAINT FK_tbl_mcfd_state_type
          FOREIGN KEY (mcfd_state_type_id) REFERENCES tbl_state_type(stty_id)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS tbl_management_ctrl_filed_demand');
  }
}
