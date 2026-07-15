import { pgQuery } from './postgres';

/**
 * Genera un GUID en PostgreSQL, igual que la función CreateGUID() de Delphi
 * (QueryNuevoID). Se genera en la base para que el mismo ID se use al
 * escribir en PostgreSQL y en el espejo SQL Server.
 *
 * SQL original (.dfm):
 *   SELECT CAST(md5(current_database()|| user ||current_timestamp ||random()) as uuid) AS ID
 */
export async function nuevoGuid(): Promise<string> {
  const r = await pgQuery<{ id: string }>(
    "SELECT CAST(md5(current_database() || user || current_timestamp || random()) AS uuid) AS id",
  );
  return r.rows[0].id;
}
