/**
 * Nombres de puestos de control con comportamiento especial, tomados
 * literalmente del código Delphi (comparaciones por string).
 */
export const PUESTO = {
  FUGA: 'Control de Fuga y retencion de horno',
  ATEQ: 'ATEQ',
  CONTROL_FINAL: 'Control Final',
  REPARADOR: 'Reparador',
} as const;

/** Tipos de producto seleccionables (ComboBoxTipo). */
export type TipoProducto =
  | 'COCINA'
  | 'TERMOTANQUE'
  | 'TERMOTANQUE GAS'
  | 'TERMOTANQUE GEISER'
  | 'CALEFON'
  | 'BARRAL';

/**
 * Normaliza el tipo de producto para la búsqueda de etiqueta,
 * replicando el mapeo de SearchEditButton1Click:
 *   COCINA -> COCINA
 *   TERMOTANQUE / GAS / GEISER / CALEFON -> TERMOTANQUE
 *   BARRAL -> BARRAL
 */
export function normalizarTipo(tipoCombo: string): string {
  if (tipoCombo === 'COCINA') return 'COCINA';
  if (
    tipoCombo === 'TERMOTANQUE' ||
    tipoCombo === 'TERMOTANQUE GAS' ||
    tipoCombo === 'TERMOTANQUE GEISER'
  )
    return 'TERMOTANQUE';
  if (tipoCombo === 'CALEFON') return 'TERMOTANQUE';
  if (tipoCombo === 'BARRAL') return 'BARRAL';
  return tipoCombo;
}
