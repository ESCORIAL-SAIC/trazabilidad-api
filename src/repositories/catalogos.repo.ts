import { pgQuery } from '../db/postgres';

/**
 * Catálogos de solo lectura: puestos de control y jerarquía de fallas
 * (Nivel 1 -> 2 -> 3). SQL portado 1:1 desde UnitModuloDatos.dfm.
 */

export interface PuestoControl {
  puestocontrol_id: string;
  puestocontrol_n: string;
  puestocontrol_c: number | string;
}

/** QueryPuestoControl */
export async function listarPuestos(tipo: string): Promise<PuestoControl[]> {
  const r = await pgQuery<PuestoControl>(
    `SELECT PUESTOCONTROL_ID, PUESTOCONTROL_N, PUESTOCONTROL_C
       FROM VP_MENUFALLAS_PUESTOCONTROL_V1
      WHERE (TIPO = 'REPARADOR') OR (TIPO = $1)
      ORDER BY puestocontrol_c`,
    [tipo],
  );
  return r.rows;
}

export interface FallaNivel1 {
  puestocontrol_id: string;
  puestocontrol_n: string;
  nivel1: string;
  nivel1_id: string;
}

/** QueryNivel1 */
export async function listarNivel1(
  puestoControl: string,
  tipo: string,
): Promise<FallaNivel1[]> {
  const r = await pgQuery<FallaNivel1>(
    `SELECT PUESTOCONTROL_ID, PUESTOCONTROL_N, NIVEL1, NIVEL1_ID
       FROM VP_MENUFALLAS_CONTROLADOR_V1
      WHERE PUESTOCONTROL_N = $1
        AND TIPO = $2
      ORDER BY nivel1`,
    [puestoControl, tipo],
  );
  return r.rows;
}

export interface FallaNivel2 {
  nivel1: string;
  nivel1_id: string;
  nivel2: string;
  nivel2_id: string;
}

/** QueryNivel2 */
export async function listarNivel2(nivel1Id: string): Promise<FallaNivel2[]> {
  const r = await pgQuery<FallaNivel2>(
    `SELECT NIVEL1, NIVEL1_ID, NIVEL2, NIVEL2_ID
       FROM vp_menufallas_V1
      WHERE NIVEL1_ID = $1
      GROUP BY 1,2,3,4
      ORDER BY nivel2`,
    [nivel1Id],
  );
  return r.rows;
}

export interface FallaNivel3 {
  nivel1: string;
  nivel1_id: string;
  nivel2: string;
  nivel2_id: string;
  nivel3: string;
  nivel3_id: string;
}

/** QueryNivel3 */
export async function listarNivel3(nivel2Id: string): Promise<FallaNivel3[]> {
  const r = await pgQuery<FallaNivel3>(
    `SELECT NIVEL1, NIVEL1_ID, NIVEL2, NIVEL2_ID, NIVEL3, NIVEL3_ID
       FROM vp_menufallas_V1
      WHERE NIVEL2_ID = $1
      ORDER BY nivel3`,
    [nivel2Id],
  );
  return r.rows;
}
