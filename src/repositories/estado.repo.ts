import { pgQuery } from '../db/postgres';

export interface RegistroControl {
  id: string;
  etiqueta: number | null;
  puestocontrol_id: string | null;
  puestocontrol_n: string | null;
  controlador_estado: boolean | null;
  controlador_falla_id: string | null;
  controlador_falla_n: string | null;
  controlador_fechahora: Date | null;
  controlador_empleado_id: string | null;
  controlador_empleado_n: string | null;
  reparador_estado: boolean | null;
  reparador_falla_id: string | null;
  reparador_falla_n: string | null;
  reparador_fechahora: Date | null;
  reparador_empleado_id: string | null;
  reparador_empleado_n: string | null;
  secundario_empleado_id: string | null;
  secundario_empleado_n: string | null;
  barral: string | null;
  etiqueta_asociada: string | null;
}

export async function estadoPorEtiqueta(etiqueta: number): Promise<RegistroControl[]> {
  const r = await pgQuery<RegistroControl>(
    `SELECT * FROM aux_controlcalidad WHERE ETIQUETA = $1 ORDER BY controlador_fechahora DESC`,
    [etiqueta],
  );
  return r.rows;
}

export async function estadoPorEtiquetaAsociada(etiqueta: number): Promise<RegistroControl[]> {
  const r = await pgQuery<RegistroControl>(
    `SELECT * FROM aux_controlcalidad WHERE ETIQUETA_ASOCIADA = $1 ORDER BY controlador_fechahora DESC`,
    [String(etiqueta)],
  );
  return r.rows;
}
