import { pgQuery } from '../db/postgres';

/**
 * Validación de usuario, equivalente a UsuarioValido() / QueryEmpleado del Delphi.
 * SQL original (.dfm):
 *   SELECT * FROM VP_APLICACIONES_EMPLEADO Q
 *   WHERE (Q.USUARIO = :USUARIO) AND (Q.PASSWORD = :PASSWORD)
 *
 * Nota: igual que hoy, el usuario se compara en MAYÚSCULAS y la clave en texto plano.
 */
export interface Empleado {
  [key: string]: unknown;
  // Campos conocidos por el uso en el código Delphi:
  ID?: string;
  NOMBRE?: string;
}

export async function buscarEmpleado(
  usuario: string,
  password: string,
): Promise<Empleado | null> {
  const r = await pgQuery<Empleado>(
    `SELECT * FROM VP_APLICACIONES_EMPLEADO Q
     WHERE (Q.USUARIO = $1) AND (Q.PASSWORD = $2)`,
    [usuario.toUpperCase(), password],
  );
  // En Delphi se exige RecordCount = 1 para considerar válido.
  return r.rowCount === 1 ? r.rows[0] : null;
}
