import { env } from '../config/env';
import { nuevoGuid } from '../db/guid';
import { BusinessError } from '../middleware/errors';
import { PUESTO } from '../domain/puestos';
import { estadoPorEtiqueta } from '../repositories/estado.repo';
import { buscarBarral, validarFrontal } from '../repositories/etiqueta.repo';
import {
  insertControlPg,
  updateReparacionPg,
  liberarCocina,
  DatosControlInsert,
  DatosReparacion,
} from '../repositories/controlWrite.repo';
import {
  insertControlMirror,
  updateReparacionMirror,
} from '../repositories/controlMirror.repo';

/**
 * Lógica de negocio de escritura. Replica ButtonOKClick (OK), y
 * ButtonAceptarClick en sus dos ramas (falla del controlador / reparación).
 */

interface Empleado {
  id: string;
  nombre: string;
}

export interface RegistrarOkInput {
  etiqueta: number;
  tipoProducto: string;
  productoId: string; // para validar código frontal
  puesto: { id: string; nombre: string; c: number };
  controlador: Empleado;
  secundario: Empleado;
  barral?: string; // código de barral o frontal según puesto
}

export interface RegistrarFallaInput {
  etiqueta: number;
  puesto: { id: string; nombre: string; c: number };
  controlador: Empleado;
  secundario: Empleado;
  nivel1: { id: string; nombre: string };
  barral?: string;
}

export interface RegistrarReparacionInput {
  registroId: string;
  etiqueta: number;
  tipoProducto: string;
  puestoNombre: string;
  reparador: Empleado;
  nivel3: { id: string; nombre: string };
}

/** Verifica que no exista ya un registro de la etiqueta en el puesto (check de Delphi). */
async function checkDuplicado(etiqueta: number, puestoId: string): Promise<void> {
  const estados = await estadoPorEtiqueta(etiqueta);
  const dup = estados.some((e) => e.puestocontrol_id === puestoId);
  if (dup) {
    throw new BusinessError(
      'La etiqueta seleccionada ya cuenta con registro en este puesto de control.',
    );
  }
}

/** Ejecuta el espejo SQL Server respetando MIRROR_ENABLED y MIRROR_WRITE_MODE. */
async function conEspejo(fn: () => Promise<void>): Promise<void> {
  if (!env.mirrorEnabled) return;
  try {
    await fn();
  } catch (err) {
    if (env.mirrorWriteMode === 'strict') throw err;
    console.warn('[mirror] escritura en SQL Server falló (lenient):', err);
  }
}

/** Construye los campos etiqueta/barral/etiqueta_asociada según el puesto. */
function camposPorPuesto(
  puestoNombre: string,
  etiqueta: number,
  barral: string | undefined,
): Pick<DatosControlInsert, 'etiqueta' | 'barral' | 'etiqueta_asociada'> {
  const b = barral ?? '';
  if (b === '') {
    return { etiqueta, barral: null, etiqueta_asociada: null };
  }
  if (puestoNombre === PUESTO.FUGA) {
    return { etiqueta, barral: b, etiqueta_asociada: null };
  }
  if (puestoNombre === PUESTO.ATEQ) {
    // ATEQ: no setea etiqueta; usa barral + etiqueta_asociada (varchar)
    return { etiqueta: null, barral: b, etiqueta_asociada: String(etiqueta) };
  }
  if (puestoNombre === PUESTO.CONTROL_FINAL) {
    return { etiqueta, barral: b, etiqueta_asociada: null };
  }
  return { etiqueta, barral: b, etiqueta_asociada: null };
}

const requiereBarral = (puesto: string): boolean =>
  puesto === PUESTO.FUGA || puesto === PUESTO.ATEQ || puesto === PUESTO.CONTROL_FINAL;

/** ButtonOKClick: registra control OK. */
export async function registrarOk(
  input: RegistrarOkInput,
): Promise<{ id: string; liberado: boolean; mensaje?: string }> {
  // Validaciones de barral / código frontal (sólo si el puesto lo requiere)
  if (requiereBarral(input.puesto.nombre)) {
    const b = input.barral ?? '';
    if (input.puesto.nombre === PUESTO.CONTROL_FINAL) {
      if (b === '') throw new BusinessError('Codigo frontal no ingresado.');
      const ok = await validarFrontal(b, input.productoId);
      if (!ok) {
        throw new BusinessError(
          `La grafica pickeada no coincide con el producto. Codigo leido: ${b}.`,
        );
      }
    } else {
      if (b === '') throw new BusinessError('Codigo de barral no ingresado.');
      const ok = await buscarBarral(b);
      if (!ok) {
        throw new BusinessError(
          `Etiqueta Barral N° ${b} no válida. Reintente nuevamente.`,
        );
      }
    }
  }

  await checkDuplicado(input.etiqueta, input.puesto.id);

  const id = await nuevoGuid();
  const campos = camposPorPuesto(input.puesto.nombre, input.etiqueta, input.barral);

  const datos: DatosControlInsert = {
    id,
    puestocontrol_id: input.puesto.id,
    puestocontrol_n: input.puesto.nombre,
    controlador_empleado_id: input.controlador.id,
    controlador_empleado_n: input.controlador.nombre,
    controlador_estado: true,
    secundario_empleado_id: input.secundario.id,
    secundario_empleado_n: input.secundario.nombre,
    ...campos,
  };

  await insertControlPg(datos);
  await conEspejo(() => insertControlMirror(datos, input.etiqueta));

  // Liberación en Control Final (COCINA)
  let liberado = false;
  let mensaje: string | undefined;
  if (input.puesto.nombre === PUESTO.CONTROL_FINAL) {
    if (env.liberacion.cocinaEnabled && input.tipoProducto === 'COCINA') {
      await liberarCocina(input.etiqueta);
    }
    liberado = true;
    mensaje = 'Producto LIBERADO.';
  }

  return { id, liberado, mensaje };
}

/** ButtonAceptarClick (rama controlador): registra falla Nivel 1 (CONTROLADOR_ESTADO=false). */
export async function registrarFalla(
  input: RegistrarFallaInput,
): Promise<{ id: string }> {
  await checkDuplicado(input.etiqueta, input.puesto.id);

  const id = await nuevoGuid();
  const campos = camposPorPuesto(input.puesto.nombre, input.etiqueta, input.barral);

  const datos: DatosControlInsert = {
    id,
    puestocontrol_id: input.puesto.id,
    puestocontrol_n: input.puesto.nombre,
    controlador_empleado_id: input.controlador.id,
    controlador_empleado_n: input.controlador.nombre,
    controlador_estado: false,
    controlador_falla_id: input.nivel1.id,
    controlador_falla_n: input.nivel1.nombre,
    secundario_empleado_id: input.secundario.id,
    secundario_empleado_n: input.secundario.nombre,
    ...campos,
  };

  await insertControlPg(datos);
  await conEspejo(() => insertControlMirror(datos, input.etiqueta));
  return { id };
}

/** ButtonAceptarClick (rama reparador): UPDATE de reparación Nivel 3. */
export async function registrarReparacion(
  input: RegistrarReparacionInput,
): Promise<{ mensaje?: string }> {
  const datos: DatosReparacion = {
    id: input.registroId,
    reparador_empleado_id: input.reparador.id,
    reparador_empleado_n: input.reparador.nombre,
    reparador_falla_id: input.nivel3.id,
    reparador_falla_n: input.nivel3.nombre,
  };

  await updateReparacionPg(datos);
  await conEspejo(() => updateReparacionMirror(datos));

  // Liberación si era Control Final + COCINA
  if (
    input.puestoNombre === PUESTO.CONTROL_FINAL &&
    env.liberacion.cocinaEnabled &&
    input.tipoProducto === 'COCINA'
  ) {
    await liberarCocina(input.etiqueta);
  }

  // Aviso especial COCINA (re-control de fuga/hornalla/encendido)
  let mensaje: string | undefined;
  if (input.tipoProducto === 'COCINA') {
    mensaje =
      input.puestoNombre === PUESTO.FUGA
        ? 'Es obligatorio re controlar Fuga y retención de horno'
        : 'Es obligatorio re controlar Fuga y retención de horno, hornalla y encendido';
  }

  return { mensaje };
}
