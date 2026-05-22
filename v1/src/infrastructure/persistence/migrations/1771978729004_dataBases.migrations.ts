// Responsabilidad: esquema completo de `tbl_data_bases` (creación, alineación legacy, renombre de columnas, FKs).
// Un solo archivo en desarrollo; la clase conserva el nombre registrado en la tabla `migrations`.

import { MigrationInterface, QueryRunner } from 'typeorm';
import { isPostgres } from './migration.helpers';

type FkMeta = {
  constraint_name: string;
  column_name: string;
  referenced_table_name: string;
  referenced_column_name: string;
};

export class DataBasesMigration1771978729004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    if (isPostgres(queryRunner)) {
      await queryRunner.query(`DROP TABLE IF EXISTS tbl_data_bases CASCADE`);
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS tbl_data_bases (
          db_id                  SERIAL        PRIMARY KEY,
          db_environment_type_id INT           NOT NULL,
          db_portfolio_type_id   INT           NOT NULL,
          db_bases               JSON          NOT NULL,
          db_detail              VARCHAR(255)  NOT NULL,
          db_state_type_id       INT           NOT NULL,
          db_created_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
          db_updated_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
          db_responsible         VARCHAR(100)  NOT NULL DEFAULT 'BOT ctrl radicado demanda',
          CONSTRAINT FK_tbl_data_bases_environment_type
            FOREIGN KEY (db_environment_type_id) REFERENCES tbl_environment_type(env_id),
          CONSTRAINT FK_tbl_data_bases_portfolio_type
            FOREIGN KEY (db_portfolio_type_id) REFERENCES tbl_portfolio_type(porty_id),
          CONSTRAINT FK_tbl_data_bases_state_type
            FOREIGN KEY (db_state_type_id) REFERENCES tbl_state_type(stty_id)
        )
      `);
      return;
    }

    // --- 1) Alineación: `data_bases` → `tbl_data_bases`, quitar unique env+cartera si existe (legacy)
    for (const table of ['data_bases', 'tbl_data_bases'] as const) {
      const hasTable = await queryRunner.query(
        `SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1`,
        [table],
      );
      if (!Array.isArray(hasTable) || hasTable.length === 0) continue;

      const hasUq = await queryRunner.query(
        `SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = 'UQ_data_bases_env_port' LIMIT 1`,
        [table],
      );
      if (!Array.isArray(hasUq) || hasUq.length === 0) continue;

      const fks: FkMeta[] = await queryRunner.query(
        `SELECT kcu.constraint_name, kcu.column_name, kcu.referenced_table_name, kcu.referenced_column_name
         FROM information_schema.key_column_usage kcu
         INNER JOIN information_schema.table_constraints tc
           ON tc.constraint_name = kcu.constraint_name
           AND tc.table_schema  = kcu.table_schema
           AND tc.table_name    = kcu.table_name
         WHERE kcu.table_schema    = DATABASE()
           AND kcu.table_name      = ?
           AND kcu.column_name     IN ('environment_type_id', 'portfolio_type_id')
           AND tc.constraint_type  = 'FOREIGN KEY'`,
        [table],
      );

      for (const fk of fks) {
        await queryRunner.query(`ALTER TABLE \`${table}\` DROP FOREIGN KEY \`${fk.constraint_name}\``);
      }

      await queryRunner.query(`ALTER TABLE \`${table}\` DROP INDEX UQ_data_bases_env_port`);

      for (const fk of fks) {
        await queryRunner.query(
          `ALTER TABLE \`${table}\` ADD CONSTRAINT \`${fk.constraint_name}\`
           FOREIGN KEY (\`${fk.column_name}\`) REFERENCES \`${fk.referenced_table_name}\`(\`${fk.referenced_column_name}\`)`,
        );
      }
    }

    const hasOldName = await queryRunner.query(`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = DATABASE() AND table_name = 'data_bases' LIMIT 1
    `);
    const hasNewName = await queryRunner.query(`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = DATABASE() AND table_name = 'tbl_data_bases' LIMIT 1
    `);
    if (Array.isArray(hasOldName) && hasOldName.length > 0 && (!Array.isArray(hasNewName) || hasNewName.length === 0)) {
      await queryRunner.query(`RENAME TABLE data_bases TO tbl_data_bases`);
    }

    // --- 2) Renombrar columnas antiguas → prefijo `db_` si aún existe `id`
    const hasOldId = await queryRunner.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = DATABASE() AND table_name = 'tbl_data_bases' AND column_name = 'id' LIMIT 1
    `);
    if (Array.isArray(hasOldId) && hasOldId.length > 0) {
      await queryRunner.query(`
        ALTER TABLE tbl_data_bases
          CHANGE COLUMN id              db_id              INT NOT NULL AUTO_INCREMENT,
          CHANGE COLUMN environment_type_id db_environment_type_id INT NOT NULL,
          CHANGE COLUMN portfolio_type_id   db_portfolio_type_id   INT NOT NULL,
          CHANGE COLUMN bases           db_bases           JSON NOT NULL,
          CHANGE COLUMN detail          db_detail          VARCHAR(255) NOT NULL,
          CHANGE COLUMN state_type_id   db_state_type_id   INT NOT NULL,
          CHANGE COLUMN created_at      db_created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CHANGE COLUMN updated_at      db_updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CHANGE COLUMN responsible     db_responsible     VARCHAR(100) NOT NULL DEFAULT 'BOT ctrl radicado demanda'
      `);
    }

    const hasTblAfterAlign = await queryRunner.query(`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = DATABASE() AND table_name = 'tbl_data_bases' LIMIT 1
    `);

    if (Array.isArray(hasTblAfterAlign) && hasTblAfterAlign.length > 0) {
      // --- 3) FKs hacia tablas actuales (corrige legacy portfolio_type / nombres viejos)
      const fkRows: FkMeta[] = await queryRunner.query(
        `
        SELECT
          kcu.constraint_name,
          kcu.column_name,
          kcu.referenced_table_name,
          kcu.referenced_column_name
        FROM information_schema.key_column_usage kcu
        INNER JOIN information_schema.table_constraints tc
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema  = kcu.table_schema
          AND tc.table_name    = kcu.table_name
        WHERE kcu.table_schema = DATABASE()
          AND kcu.table_name = 'tbl_data_bases'
          AND tc.constraint_type = 'FOREIGN KEY'
          AND kcu.column_name IN ('db_environment_type_id', 'db_portfolio_type_id', 'db_state_type_id')
        `,
      );

      for (const fk of fkRows) {
        await queryRunner.query(`ALTER TABLE \`tbl_data_bases\` DROP FOREIGN KEY \`${fk.constraint_name}\``);
      }

      await queryRunner.query(`SET FOREIGN_KEY_CHECKS = 0`);
      await queryRunner.query(`
        ALTER TABLE tbl_data_bases
          ADD CONSTRAINT FK_tbl_data_bases_environment_type
            FOREIGN KEY (db_environment_type_id) REFERENCES tbl_environment_type(env_id),
          ADD CONSTRAINT FK_tbl_data_bases_portfolio_type
            FOREIGN KEY (db_portfolio_type_id) REFERENCES tbl_portfolio_type(porty_id),
          ADD CONSTRAINT FK_tbl_data_bases_state_type
            FOREIGN KEY (db_state_type_id) REFERENCES tbl_state_type(stty_id)
      `);
      await queryRunner.query(`SET FOREIGN_KEY_CHECKS = 1`);

      // --- 5) Garantizar que db_bases sea columna JSON (no LONGTEXT)
      const isLongtext: unknown[] = await queryRunner.query(`
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name   = 'tbl_data_bases'
          AND column_name  = 'db_bases'
          AND data_type    = 'longtext'
        LIMIT 1
      `);
      if (Array.isArray(isLongtext) && isLongtext.length > 0) {
        await queryRunner.query(`
          ALTER TABLE tbl_data_bases MODIFY COLUMN db_bases JSON NOT NULL
        `);
      }
    } else {
      // --- 4) Crear tabla si no existía (instalación nueva)
      await queryRunner.query(`
        CREATE TABLE tbl_data_bases (
          db_id INT AUTO_INCREMENT PRIMARY KEY,
          db_environment_type_id INT NOT NULL,
          db_portfolio_type_id INT NOT NULL,
          db_bases JSON NOT NULL,
          db_detail VARCHAR(255) NOT NULL,
          db_state_type_id INT NOT NULL,
          db_created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          db_updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          db_responsible VARCHAR(100) NOT NULL DEFAULT 'BOT ctrl radicado demanda',
          CONSTRAINT FK_tbl_data_bases_environment_type
            FOREIGN KEY (db_environment_type_id) REFERENCES tbl_environment_type(env_id),
          CONSTRAINT FK_tbl_data_bases_portfolio_type
            FOREIGN KEY (db_portfolio_type_id) REFERENCES tbl_portfolio_type(porty_id),
          CONSTRAINT FK_tbl_data_bases_state_type
            FOREIGN KEY (db_state_type_id) REFERENCES tbl_state_type(stty_id)
        )
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (isPostgres(queryRunner)) {
      await queryRunner.query(`DROP TABLE IF EXISTS tbl_data_bases CASCADE`);
    } else {
      await queryRunner.query('DROP TABLE IF EXISTS `tbl_data_bases`');
    }
  }
}
