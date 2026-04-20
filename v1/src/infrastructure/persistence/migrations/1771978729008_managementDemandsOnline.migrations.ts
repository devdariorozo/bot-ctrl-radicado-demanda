// Responsabilidad: crear/eliminar la tabla management_demands_online en la BD.

import { MigrationInterface, QueryRunner } from 'typeorm';

export class ManagementDemandsOnlineMigration1771978729008 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE management_demands_online (
        id INT AUTO_INCREMENT PRIMARY KEY,
        portfolio_type_id INT NOT NULL,
        name_data_base VARCHAR(255) NOT NULL,
        portfolio_city_config_id INT NOT NULL,
        campaign_id INT NOT NULL,
        lawsuit_id INT NOT NULL,
        lawsuit_court_assignments_id INT NOT NULL,
        client_id INT NOT NULL,
        path_law_doc VARCHAR(500) NOT NULL,
        lawsuit_status VARCHAR(100) NOT NULL,
        amount_type_id INT NOT NULL,
        user_id INT NOT NULL DEFAULT 0,
        user_name VARCHAR(100) NOT NULL DEFAULT 'BOT ctrl filed demand',
        number_filed VARCHAR(100) NOT NULL DEFAULT '-',
        management_status VARCHAR(100) NOT NULL DEFAULT 'Abierta',
        detail VARCHAR(500) NOT NULL DEFAULT 'Demanda pendiente para ser gestionada por el bot demands online',
        state_type_id INT NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        responsible VARCHAR(100) NOT NULL DEFAULT 'BOT ctrl filed demand',
        CONSTRAINT FK_management_demands_online_portfolio_type
          FOREIGN KEY (portfolio_type_id) REFERENCES portfolio_type(id),
        CONSTRAINT FK_management_demands_online_portfolio_city_config
          FOREIGN KEY (portfolio_city_config_id) REFERENCES portfolio_city_config(id),
        CONSTRAINT FK_management_demands_online_amount_type
          FOREIGN KEY (amount_type_id) REFERENCES amount_type(id),
        CONSTRAINT FK_management_demands_online_state_type
          FOREIGN KEY (state_type_id) REFERENCES state_type(id)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE management_demands_online`);
  }
}
