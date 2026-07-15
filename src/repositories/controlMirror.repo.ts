import { mssqlQuery, sql } from '../db/sqlserver';
import { getMssqlPool } from '../db/sqlserver';
import { DatosControlInsert, DatosReparacion } from './controlWrite.repo';

/**
 * Espejo "LOCAL" en SQL Server (QueryEstadoLocal del Delphi).
 *
 * IMPORTANTE (segun esquema real de SQL Server):
 *  - aux_controlcalidad en SQL Server NO tiene la columna etiqueta_asociada.
 *  - El INSERT "LOCAL" del Delphi siempre guarda ETIQUETA = numero (nunca
 *    etiqueta_asociada) y BARRAL si corresponde. Por eso el espejo recibe el
 *    numero real de etiqueta aparte (etiquetaReal), independientemente de la
 *    logica por puesto que aplica PostgreSQL (p.ej. ATEQ).
 *  - En Android la app Delphi nunca abre MSSQL ({$IFNDEF ANDROID}); el uso del
 *    espejo se controla con MIRROR_ENABLED.
 */

export async function insertControlMirror(
  d: DatosControlInsert,
  etiquetaReal: number,
): Promise<void> {
  const pool = await getMssqlPool();
  const req = pool.request();
  req.input('id', sql.UniqueIdentifier, d.id);
  req.input('puestocontrol_id', sql.UniqueIdentifier, d.puestocontrol_id);
  req.input('puestocontrol_n', sql.NVarChar(200), d.puestocontrol_n);
  req.input('controlador_empleado_id', sql.UniqueIdentifier, d.controlador_empleado_id);
  req.input('controlador_empleado_n', sql.NVarChar(200), d.controlador_empleado_n);
  req.input('controlador_estado', sql.Bit, d.controlador_estado);
  req.input('controlador_falla_id', sql.UniqueIdentifier, d.controlador_falla_id ?? null);
  req.input('controlador_falla_n', sql.NVarChar(200), d.controlador_falla_n ?? null);
  req.input('secundario_empleado_id', sql.UniqueIdentifier, d.secundario_empleado_id);
  req.input('secundario_empleado_n', sql.NVarChar(200), d.secundario_empleado_n);
  req.input('etiqueta', sql.Int, etiquetaReal);
  req.input('barral', sql.NVarChar(100), d.barral ?? null);

  await req.query(`
    INSERT INTO aux_controlcalidad (
      id, puestocontrol_id, puestocontrol_n,
      controlador_fechahora, controlador_empleado_id, controlador_empleado_n,
      controlador_estado, controlador_falla_id, controlador_falla_n,
      secundario_empleado_id, secundario_empleado_n,
      etiqueta, barral
    ) VALUES (
      @id, @puestocontrol_id, @puestocontrol_n,
      GETDATE(), @controlador_empleado_id, @controlador_empleado_n,
      @controlador_estado, @controlador_falla_id, @controlador_falla_n,
      @secundario_empleado_id, @secundario_empleado_n,
      @etiqueta, @barral
    )`);
}

export async function updateReparacionMirror(d: DatosReparacion): Promise<void> {
  const pool = await getMssqlPool();
  const req = pool.request();
  req.input('id', sql.UniqueIdentifier, d.id);
  req.input('reparador_empleado_id', sql.UniqueIdentifier, d.reparador_empleado_id);
  req.input('reparador_empleado_n', sql.NVarChar(200), d.reparador_empleado_n);
  req.input('reparador_falla_id', sql.UniqueIdentifier, d.reparador_falla_id);
  req.input('reparador_falla_n', sql.NVarChar(200), d.reparador_falla_n);
  await req.query(`
    UPDATE aux_controlcalidad SET
      reparador_fechahora = GETDATE(),
      reparador_empleado_id = @reparador_empleado_id,
      reparador_empleado_n = @reparador_empleado_n,
      reparador_estado = 1,
      reparador_falla_id = @reparador_falla_id,
      reparador_falla_n = @reparador_falla_n
    WHERE id = @id`);
}

export async function mirrorDisponible(): Promise<boolean> {
  try {
    await mssqlQuery('SELECT 1 AS ok');
    return true;
  } catch {
    return false;
  }
}
