// Responsabilidad: crear/eliminar la tabla en la BD.

import { MigrationInterface, QueryRunner } from 'typeorm';

export class DataBasesMigration1771978729004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE data_bases (
        id INT AUTO_INCREMENT PRIMARY KEY,
        environment_type_id INT NOT NULL,
        portfolio_type_id INT NOT NULL,
        bases JSON NOT NULL,
        detail VARCHAR(255) NOT NULL,
        state_type_id INT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        responsible VARCHAR(100) NOT NULL DEFAULT 'BOT demands online',
        CONSTRAINT UQ_data_bases_env_port UNIQUE (environment_type_id, portfolio_type_id),
        CONSTRAINT FK_data_bases_environment_type
          FOREIGN KEY (environment_type_id) REFERENCES environment_type(id),
        CONSTRAINT FK_data_bases_portfolio_type
          FOREIGN KEY (portfolio_type_id) REFERENCES portfolio_type(id),
        CONSTRAINT FK_data_bases_state_type
          FOREIGN KEY (state_type_id) REFERENCES state_type(id)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE data_bases');
  }
}

