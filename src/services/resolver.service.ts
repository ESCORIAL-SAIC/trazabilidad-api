import { buscarEtiqueta, Etiqueta } from '../repositories/etiqueta.repo';
import {
  estadoPorEtiqueta,
  estadoPorEtiquetaAsociada,
  RegistroControl,
} from '../repositories/estado.repo';
import {
  listarPuestos,
  listarNivel1,
  listarNivel2,
  FallaNivel1,
  FallaNivel2,
  PuestoControl,
} from '../repositories/catalogos.repo';
import { normalizarTipo, PUESTO } from '../domain/puestos';

/**
 * Réplica de TFormTrazabilidad.SearchEditButton1Click.
 *
 * La API es sin estado: el cliente envía la etiqueta, el tipo de producto
 * seleccionado (ComboBoxTipo) y su configuración de puesto. El resolver
 * devuelve una "intención de UI" que el cliente Kotlin refleja, igual que
 * hacía el formulario Delphi al cambiar de pestaña.
 */

export interface ResolverInput {
  numero: number; // EditEtiqueta
  tipoProducto: string; // ComboBoxTipo.Selected.Text (texto completo)
  tipoConfig: string; // configuración local TIPO (para listar puestos)
  puestoConfigIndex: number; // ComboBoxPuestoControl.ItemIndex configurado
  puestoConfigNombre: string; // PUESTOCONTROL_N configurado
  puestoConfigC: number; // PUESTOCONTROL_C configurado (entero)
}

export type AccionResolver =
  | 'IGNORAR' // etiqueta 7790...
  | 'ETIQUETA_INVALIDA'
  | 'CONTROLADOR' // mostrar pantalla controlador (registrar OK / falla)
  | 'REPARADOR' // modo reparación (Nivel2/3)
  | 'ESTADO'; // pantalla de estado (semáforo)

export interface CampoBarral {
  visible: boolean;
  readOnly: boolean;
  conCamara: boolean;
  prompt?: string;
  valor?: string; // valor precargado (caso Fuga)
}

export interface ResolverResult {
  accion: AccionResolver;
  mensaje?: string; // diálogo equivalente a MessageDialog
  color?: string; // #RRGGBB de la etiqueta
  etiqueta?: Etiqueta;
  descripcion?: string; // PRODUCTO_N
  puestoAsignado?: { id: string; nombre: string; c: number };
  registroFalla?: boolean; // true = modo reparación (UPDATE), false = controlador (INSERT)
  registroId?: string; // id de aux_controlcalidad a reparar (modo reparador)
  controladorFallaId?: string | null; // para filtrar Nivel2 en reparación
  campoBarral?: CampoBarral;
  estado?: { texto: string; color: 'verde' | 'rojo' }; // pantalla ESTADO
  nivel1?: FallaNivel1[]; // catálogo para controlador
  nivel2?: FallaNivel2[]; // catálogo precargado para reparador
}

const cInt = (v: string | number | null | undefined): number =>
  typeof v === 'number' ? v : parseInt(String(v ?? '0'), 10) || 0;

const fallaVacia = (id: string | null | undefined): boolean =>
  id === null || id === undefined || id === '';

export async function resolverEscaneo(
  input: ResolverInput,
): Promise<ResolverResult> {
  const texto = String(input.numero);

  // 1) Etiqueta comercial 7790... -> ignorar
  if (texto.length > 3 && texto.slice(0, 4) === '7790') {
    return { accion: 'IGNORAR' };
  }

  const tipo = normalizarTipo(input.tipoProducto);
  const tipoBusqueda = tipo === 'BARRAL' ? 'COCINA' : tipo;

  // 2) Buscar etiqueta
  const etiqueta = await buscarEtiqueta(input.numero, tipoBusqueda);
  if (!etiqueta) {
    return {
      accion: 'ETIQUETA_INVALIDA',
      mensaje: `Etiqueta N° ${input.numero} no válida. Reintente nuevamente.`,
    };
  }

  const color = (etiqueta.COLOR as string) ?? (etiqueta.color as string);
  const descripcion = (etiqueta.PRODUCTO_N as string) ?? (etiqueta.producto_n as string);
  const productoId = (etiqueta.PRODUCTO_ID as string) ?? (etiqueta.producto_id as string);

  // 3) Estados existentes (orden desc por fecha)
  const puestos = await listarPuestos(input.tipoConfig); // == ComboBoxPuestoControl.Items (ordenado)
  // DIFERENCIA CON DELPHI (intencional): QueryEstado traía todo el historial de la
  // etiqueta, pero los números se repiten entre maestros (cocinas / termotanques) y
  // aux_controlcalidad no guarda el tipo de producto. Cada puestocontrol_id pertenece
  // a un único tipo, así que sólo se cuentan los registros de puestos de este tipo;
  // si no, el historial de una cocina de 2022 se toma como controles de un calefón nuevo.
  const idsPuestos = new Set(puestos.map((p) => p.puestocontrol_id));
  const estados = (await estadoPorEtiqueta(input.numero)).filter((e) =>
    idsPuestos.has(e.puestocontrol_id ?? ''),
  );

  // esControlador := ComboBoxPuestoControl.ItemIndex = 0  (terminal "Reparador" dinámica)
  const esControlador = input.puestoConfigIndex === 0;

  let puestoAsignadoNombre = input.puestoConfigNombre;
  let puestoAsignadoC = input.puestoConfigC;
  let puestoAsignadoId = '';
  let registroFalla = false;

  const localizarPuesto = (nombre: string): PuestoControl | undefined =>
    puestos.find((p) => p.puestocontrol_n === nombre);

  if (esControlador) {
    const primero = estados[0]; // QueryEstado.First (más reciente)
    const sinRegistros = estados.length === 0;
    const ctrlOk = primero?.controlador_estado === true;
    const reparado =
      primero?.controlador_estado === false && !fallaVacia(primero?.reparador_falla_id);

    if (ctrlOk || reparado || sinRegistros) {
      // Determinar próximo puesto
      if (sinRegistros) {
        // ComboBoxPuestoControl.Items[1] (índice 0 = Reparador)
        puestoAsignadoNombre = puestos[1]?.puestocontrol_n ?? '';
      } else {
        const pActual = localizarPuesto(primero!.puestocontrol_n ?? '');
        const cActual = cInt(pActual?.puestocontrol_c);
        if (cActual === puestos.length - 1) {
          puestoAsignadoNombre = primero!.puestocontrol_n ?? '';
        } else {
          puestoAsignadoNombre =
            puestos[cActual + 1]?.puestocontrol_n ?? primero!.puestocontrol_n ?? '';
        }
      }
      const pAsig = localizarPuesto(puestoAsignadoNombre);
      puestoAsignadoNombre = pAsig?.puestocontrol_n ?? puestoAsignadoNombre;
      puestoAsignadoC = cInt(pAsig?.puestocontrol_c);
      puestoAsignadoId = pAsig?.puestocontrol_id ?? '';
    } else if (fallaVacia(primero?.reparador_falla_id)) {
      // === MODO REPARADOR ===
      registroFalla = true;
      const nombre = primero!.puestocontrol_n ?? '';
      const pAsig = localizarPuesto(nombre);
      puestoAsignadoNombre = pAsig?.puestocontrol_n ?? nombre;
      puestoAsignadoC = cInt(pAsig?.puestocontrol_c);
      puestoAsignadoId = pAsig?.puestocontrol_id ?? '';

      const nivel1 = await listarNivel1(puestoAsignadoNombre, input.tipoProducto);
      const nivel2 = await listarNivel2(primero!.controlador_falla_id ?? '');

      return {
        accion: 'REPARADOR',
        color,
        etiqueta,
        descripcion,
        registroFalla: true,
        registroId: primero!.id,
        controladorFallaId: primero!.controlador_falla_id,
        puestoAsignado: { id: puestoAsignadoId, nombre: puestoAsignadoNombre, c: puestoAsignadoC },
        nivel1,
        nivel2,
      };
    }
  } else {
    // Puesto fijo de configuración
    const pConf = localizarPuesto(input.puestoConfigNombre);
    puestoAsignadoNombre = input.puestoConfigNombre;
    puestoAsignadoC = input.puestoConfigC;
    puestoAsignadoId = pConf?.puestocontrol_id ?? '';
  }

  // 4) ¿Corresponde registro en este puesto?  (RecordCount + 1) == c
  if (estados.length + 1 === puestoAsignadoC) {
    const primero = estados[0];
    if (
      estados.length > 0 &&
      primero?.controlador_estado === false &&
      fallaVacia(primero?.reparador_falla_id)
    ) {
      return {
        accion: 'ESTADO',
        color,
        etiqueta,
        descripcion,
        estado: { texto: 'Producto no disponible.', color: 'rojo' },
      };
    }

    // Pantalla CONTROLADOR
    const nivel1 = await listarNivel1(puestoAsignadoNombre, input.tipoProducto);
    const base: ResolverResult = {
      accion: 'CONTROLADOR',
      color,
      etiqueta,
      descripcion,
      registroFalla: false,
      puestoAsignado: { id: puestoAsignadoId, nombre: puestoAsignadoNombre, c: puestoAsignadoC },
      nivel1,
    };

    if (puestoAsignadoNombre === PUESTO.FUGA) {
      const asociadas = await estadoPorEtiquetaAsociada(input.numero);
      if (asociadas.length > 0) {
        base.campoBarral = {
          visible: true,
          readOnly: false,
          conCamara: false,
          valor: asociadas[0].barral ?? '',
        };
      } else {
        return {
          accion: 'ESTADO',
          color,
          etiqueta,
          descripcion,
          estado: { texto: 'Producto no disponible.', color: 'rojo' },
        };
      }
    } else if (puestoAsignadoNombre === PUESTO.ATEQ) {
      base.campoBarral = { visible: true, readOnly: false, conCamara: false, prompt: 'Barral' };
    } else if (puestoAsignadoNombre === PUESTO.CONTROL_FINAL) {
      base.campoBarral = {
        visible: true,
        readOnly: false,
        conCamara: true,
        prompt: 'Codigo Frontal',
      };
    }

    void productoId; // disponible para el cliente vía etiqueta
    return base;
  }

  // 5) No corresponde registro -> pantalla ESTADO
  if (estados.length + 1 > puestoAsignadoC) {
    // Ya pasó el control: buscar el registro de ese puesto
    const reg = estados.find((e) => e.puestocontrol_n === puestoAsignadoNombre);
    if (reg) {
      if (reg.controlador_estado === true || reg.reparador_estado === true) {
        return {
          accion: 'ESTADO',
          color,
          etiqueta,
          descripcion,
          estado: { texto: 'Control OK', color: 'verde' },
        };
      }
      if (reg.controlador_estado === false && fallaVacia(reg.reparador_falla_id)) {
        return {
          accion: 'ESTADO',
          color,
          etiqueta,
          descripcion,
          estado: { texto: 'Pendiente Reparación', color: 'rojo' },
        };
      }
    }
    return {
      accion: 'ESTADO',
      color,
      etiqueta,
      descripcion,
      estado: { texto: 'Control OK', color: 'verde' },
    };
  }

  // estados.length + 1 < c  -> no llegó todavía
  return {
    accion: 'ESTADO',
    color,
    etiqueta,
    descripcion,
    estado: { texto: 'Producto no disponible.', color: 'rojo' },
  };
}
