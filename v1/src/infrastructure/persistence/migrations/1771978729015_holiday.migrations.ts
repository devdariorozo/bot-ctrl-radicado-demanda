// Responsabilidad: crear/eliminar la tabla holiday.

import { MigrationInterface, QueryRunner } from 'typeorm';

export class HolidayMigration1771978729015 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE holiday (
        id INT AUTO_INCREMENT PRIMARY KEY,
        date DATE NOT NULL,
        name VARCHAR(150) NOT NULL,
        country_code CHAR(2) NOT NULL,
        type VARCHAR(50) NOT NULL,
        is_working_day TINYINT(1) NOT NULL DEFAULT 0,
        detail VARCHAR(255) NOT NULL,
        state_type_id INT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        responsible VARCHAR(100) NOT NULL DEFAULT 'BOT demands online',
        CONSTRAINT UQ_holiday_country_date_type UNIQUE (country_code, date, type),
        CONSTRAINT FK_holiday_state_type
          FOREIGN KEY (state_type_id) REFERENCES state_type(id)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE holiday');
  }
}

