// Responsabilidad: crear/eliminar la tabla en la BD.

import { MigrationInterface, QueryRunner } from 'typeorm';
import { isPostgres } from './migration.helpers';

export class TblAttentionScheduleMigration1771978729005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    if (isPostgres(queryRunner)) {
      await queryRunner.query(`DROP TABLE IF EXISTS tbl_attention_schedule CASCADE`);
      await queryRunner.query(`
        CREATE TABLE tbl_attention_schedule (
          atsh_id               SERIAL        PRIMARY KEY,
          atsh_portfolio_type_id INT          NOT NULL,
          atsh_days              JSON          NOT NULL,
          atsh_start_time        TIME          NOT NULL,
          atsh_start_recess_time TIME          NOT NULL,
          atsh_end_recess_time   TIME          NOT NULL,
          atsh_end_time          TIME          NOT NULL,
          atsh_detail            VARCHAR(255)  NOT NULL,
          atsh_state_type_id     INT           NOT NULL,
          atsh_created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          atsh_updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          atsh_responsible VARCHAR(100) NOT NULL DEFAULT 'BOT ctrl radicado demanda',
          CONSTRAINT FK_tbl_attention_schedule_portfolio_type
            FOREIGN KEY (atsh_portfolio_type_id) REFERENCES tbl_portfolio_type(porty_id),
          CONSTRAINT FK_tbl_attention_schedule_state_type
            FOREIGN KEY (atsh_state_type_id) REFERENCES tbl_state_type(stty_id)
        )
      `);
    } else {
      await queryRunner.query(`SET FOREIGN_KEY_CHECKS = 0`);
      await queryRunner.query(`DROP TABLE IF EXISTS tbl_attention_schedule`);
      await queryRunner.query(`SET FOREIGN_KEY_CHECKS = 1`);
      await queryRunner.query(`
        CREATE TABLE tbl_attention_schedule (
          atsh_id INT AUTO_INCREMENT PRIMARY KEY,
          atsh_portfolio_type_id INT NOT NULL,
          atsh_days JSON NOT NULL,
          atsh_start_time TIME NOT NULL,
          atsh_start_recess_time TIME NOT NULL,
          atsh_end_recess_time TIME NOT NULL,
          atsh_end_time TIME NOT NULL,
          atsh_detail VARCHAR(255) NOT NULL,
          atsh_state_type_id INT NOT NULL,
          atsh_created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          atsh_updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          atsh_responsible VARCHAR(100) NOT NULL DEFAULT 'BOT ctrl radicado demanda',
          CONSTRAINT FK_tbl_attention_schedule_portfolio_type
            FOREIGN KEY (atsh_portfolio_type_id) REFERENCES tbl_portfolio_type(porty_id),
          CONSTRAINT FK_tbl_attention_schedule_state_type
            FOREIGN KEY (atsh_state_type_id) REFERENCES tbl_state_type(stty_id)
        )
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (isPostgres(queryRunner)) {
      await queryRunner.query(`DROP TABLE IF EXISTS tbl_attention_schedule CASCADE`);
    } else {
      await queryRunner.query(`DROP TABLE IF EXISTS tbl_attention_schedule`);
    }
  }
}
