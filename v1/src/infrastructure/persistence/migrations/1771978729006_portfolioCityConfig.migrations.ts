// Responsabilidad: crear/eliminar la tabla en la BD.

import { MigrationInterface, QueryRunner } from 'typeorm';

export class PortfolioCityConfigMigration1771978729006 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE portfolio_city_config (
        id INT AUTO_INCREMENT PRIMARY KEY,
        id_data_bases INT NOT NULL,
        id_city_views INT NOT NULL,
        name_departament VARCHAR(255) NOT NULL,
        name_city VARCHAR(255) NOT NULL,
        city VARCHAR(255) NOT NULL,
        detail VARCHAR(500) NOT NULL,
        state_type_id INT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        responsible VARCHAR(100) NOT NULL DEFAULT 'BOT ctrl filed demand',
        CONSTRAINT UQ_portfolio_city_config_data_bases_city UNIQUE (id_data_bases, id_city_views),
        CONSTRAINT FK_portfolio_city_config_data_bases
          FOREIGN KEY (id_data_bases) REFERENCES data_bases(id),
        CONSTRAINT FK_portfolio_city_config_state_type
          FOREIGN KEY (state_type_id) REFERENCES state_type(id)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE portfolio_city_config');
  }
}
