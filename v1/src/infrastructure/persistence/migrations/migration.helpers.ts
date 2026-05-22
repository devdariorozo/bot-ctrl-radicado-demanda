// Responsabilidad: utilidades compartidas para migraciones multi-schema (MySQL / PostgreSQL).

import { QueryRunner } from 'typeorm';

export function isPostgres(qr: QueryRunner): boolean {
  return qr.connection.options.type === 'postgres';
}

/** Verifica si una tabla existe en el esquema activo de la conexión. */
export async function tableExists(qr: QueryRunner, tableName: string): Promise<boolean> {
  if (isPostgres(qr)) {
    const rows: unknown[] = await qr.query(
      `SELECT 1 FROM information_schema.tables
       WHERE table_schema = current_schema() AND table_name = $1 LIMIT 1`,
      [tableName],
    );
    return Array.isArray(rows) && rows.length > 0;
  }
  const rows: unknown[] = await qr.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1`,
    [tableName],
  );
  return Array.isArray(rows) && rows.length > 0;
}

/** Verifica si una columna existe en una tabla del esquema activo. */
export async function columnExists(
  qr: QueryRunner,
  tableName: string,
  columnName: string,
): Promise<boolean> {
  if (isPostgres(qr)) {
    const rows: unknown[] = await qr.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = current_schema() AND table_name = $1 AND column_name = $2 LIMIT 1`,
      [tableName, columnName],
    );
    return Array.isArray(rows) && rows.length > 0;
  }
  const rows: unknown[] = await qr.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ? LIMIT 1`,
    [tableName, columnName],
  );
  return Array.isArray(rows) && rows.length > 0;
}
