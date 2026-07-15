import { PoolClient } from 'pg';
import { pgQuery } from '../db/postgres';

/**
 * Escritura en aux_controlcalidad (PostgreSQL). Replica los INSERT/UPDATE
 * de ButtonOKClick y ButtonAceptarClick del Delphi.
 */

export interface DatosControlInsert {
  id: string;
  puestocontrol_id: string;
  puestocontrol_n: string;
  controlador_empleado_id: string;
  controlador_empleado_n: string;
  controlador_estado: boolean;
  controlador_falla_id?: string | null;
  controlador_falla_n?: string | null;
  secundario_empleado_id: string;
  secundario_empleado_n: string;
  etiqueta?: number | null;
  barral?: string | null;
  etiqueta_asociada?: string | null;
}

/**
 * INSERT en aux_controlcalidad. controlador_fechahora = now() (igual que Delphi).
 * Acepta un client opcional para participar en una transacción.
 */
export async function insertControlPg(
  d: DatosControlInsert,
  client?: PoolClient,
): Promise<void> {
  const sql = `
    INSERT INTO aux_controlcalidad (
      id, puestocontrol_id, puestocontrol_n,
      controlador_fechahora, controlador_empleado_id, controlador_empleado_n,
      controlador_estado, controlador_falla_id, controlador_falla_n,
      secundario_empleado_id, secundario_empleado_n,
      etiqueta, barral, etiqueta_asociada
    ) VALUES (
      $1, $2, $3,
      now(), $4, $5,
      $6, $7, $8,
      $9, $10,
      $11, $12, $13
    )`;
  const params = [
    d.id,
    d.puestocontrol_id,
    d.puestocontrol_n,
    d.controlador_empleado_id,
    d.controlador_empleado_n,
    d.controlador_estado,
    d.controlador_falla_id ?? null,
    d.controlador_falla_n ?? null,
    d.secundario_empleado_id,
    d.secundario_empleado_n,
    d.etiqueta ?? null,
    d.barral ?? null,
    d.etiqueta_asociada ?? null,
  ];
  if (client) {
    await client.query(sql, params);
  } else {
    await pgQuery(sql, params);
  }
}

export interface DatosReparacion {
  id: string; // id del registro aux_controlcalidad a actualizar
  reparador_empleado_id: string;
  reparador_empleado_n: string;
  reparador_falla_id: string;
  reparador_falla_n: string;
}

/**
 * UPDATE de reparación. reparador_fechahora = now(), reparador_estado = true.
 * Replica ButtonAceptarClick (modo reparador).
 */
export async function updateReparacionPg(
  d: DatosReparacion,
  client?: PoolClient,
): Promise<void> {
  const sql = `
    UPDATE aux_controlcalidad SET
      reparador_fechahora = now(),
      reparador_empleado_id = $2,
      reparador_empleado_n = $3,
      reparador_estado = true,
      reparador_falla_id = $4,
      reparador_falla_n = $5
    WHERE id = $1`;
  const params = [
    d.id,
    d.reparador_empleado_id,
    d.reparador_empleado_n,
    d.reparador_falla_id,
    d.reparador_falla_n,
  ];
  if (client) {
    await client.query(sql, params);
  } else {
    await pgQuery(sql, params);
  }
}

/** UPDATE etiquetas_maestro_cocinas: liberación en Control Final (UniQueryFinalCocina). */
export async function liberarCocina(
  etiqueta: number,
  client?: PoolClient,
): Promise<void> {
  const sql = `UPDATE etiquetas_maestro_cocinas
                  SET paso_lector = true, fecha_paso_lector = now()
                WHERE numero = $1`;
  if (client) {
    await client.query(sql, [etiqueta]);
  } else {
    await pgQuery(sql, [etiqueta]);
  }
}

/** UPDATE etiquetas_maestro_termotanques (UniQueryFinalTermo, hoy comentado en Delphi). */
export async function liberarTermo(
  etiqueta: number,
  client?: PoolClient,
): Promise<void> {
  const sql = `UPDATE etiquetas_maestro_termotanques
                  SET paso_lector = true, fecha_paso_lector = now()
                WHERE numero = $1`;
  if (client) {
    await client.query(sql, [etiqueta]);
  } else {
    await pgQuery(sql, [etiqueta]);
  }
}
