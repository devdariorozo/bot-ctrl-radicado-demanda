// Responsabilidad: crear/eliminar la tabla en la BD.

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AttentionScheduleMigration1771978729005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE attention_schedule (
        id INT AUTO_INCREMENT PRIMARY KEY,
        portfolio_type_id INT NOT NULL,
        days JSON NOT NULL,
        start_time TIME NOT NULL,
        start_recess TIME NOT NULL,
        end_recess TIME NOT NULL,
        end_time TIME NOT NULL,
        detail VARCHAR(255) NOT NULL,
        state_type_id INT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        responsible VARCHAR(100) NOT NULL DEFAULT 'BOT ctrl filed demand',
        CONSTRAINT UQ_attention_schedule UNIQUE (portfolio_type_id, start_time, end_time),
        CONSTRAINT FK_attention_schedule_portfolio_type
          FOREIGN KEY (portfolio_type_id) REFERENCES portfolio_type(id),
        CONSTRAINT FK_attention_schedule_state_type
          FOREIGN KEY (state_type_id) REFERENCES state_type(id)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE attention_schedule');
  }
}

