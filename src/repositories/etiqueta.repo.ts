import { pgQuery } from '../db/postgres';

/**
 * Búsqueda de etiquetas/productos, barrales y código frontal.
 * SQL portado 1:1 desde UnitModuloDatos.dfm.
 */

export interface Etiqueta {
  [key: string]: unknown;
  // Campos conocidos por el uso en Delphi:
  NUMERO?: number;
  PRODUCTO_N?: string;
  PRODUCTO_ID?: string;
  COLOR?: string; // formato #RRGGBB
}

/** QueryEtiqueta */
export async function buscarEtiqueta(
  numero: number,
  tipo: string,
): Promise<Etiqueta | null> {
  const r = await pgQuery<Etiqueta>(
    `SELECT * FROM vp_etiquetas_todos
      WHERE NUMERO = $1 AND TIPO = $2`,
    [numero, tipo],
  );
  return r.rowCount && r.rowCount > 0 ? r.rows[0] : null;
}

/** QueryBarral: valida una serie de barral (TIPO siempre 'BARRAL') */
export async function buscarBarral(serie: string): Promise<boolean> {
  const r = await pgQuery(
    `SELECT ET.*
       FROM vp_etiquetas_barrales et
      WHERE SERIE = $1 AND TIPO = $2`,
    [serie, 'BARRAL'],
  );
  return (r.rowCount ?? 0) > 0;
}

export interface CodigoFrontal {
  producto_id: string;
  codigo: string;
  codigo_barras: string;
}

/** QueryCBFrontal: valida que el código frontal corresponda al producto */
export async function validarFrontal(
  codigoBarras: string,
  productoId: string,
): Promise<boolean> {
  const r = await pgQuery<CodigoFrontal>(
    `SELECT producto_id, codigo, codigo_barras
       FROM vp_producto_frontal
      WHERE codigo_barras = $1 AND producto_id = $2`,
    [codigoBarras, productoId],
  );
  return (r.rowCount ?? 0) > 0;
}
