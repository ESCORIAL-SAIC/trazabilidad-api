import { resolverEscaneo, ResolverInput } from '../services/resolver.service';
import * as etiquetaRepo from '../repositories/etiqueta.repo';
import * as estadoRepo from '../repositories/estado.repo';
import * as catalogosRepo from '../repositories/catalogos.repo';
import { PuestoControl } from '../repositories/catalogos.repo';
import { Etiqueta } from '../repositories/etiqueta.repo';
import { registro } from './_fixtures';

/**
 * Casos reales de producción (25 de Mayo, 06/10/2026): termotanques/calefones
 * impresos con números que ya usaron cocinas en 2022. Ids de puesto, ids de
 * registro y fechas copiados de VP_MENUFALLAS_PUESTOCONTROL_V1 y
 * aux_controlcalidad; nombres de operarios reemplazados por genéricos.
 */

jest.mock('../repositories/etiqueta.repo');
jest.mock('../repositories/estado.repo');
jest.mock('../repositories/catalogos.repo');

const mEtiqueta = etiquetaRepo as jest.Mocked<typeof etiquetaRepo>;
const mEstado = estadoRepo as jest.Mocked<typeof estadoRepo>;
const mCatalogos = catalogosRepo as jest.Mocked<typeof catalogosRepo>;

// --- Puestos reales (listarPuestos incluye siempre el Reparador) ---
const REPARADOR: PuestoControl = {
  puestocontrol_id: '00000000-0000-0000-0000-000000000000',
  puestocontrol_n: 'Reparador',
  puestocontrol_c: '00',
};
const COCINA = {
  fuga: '95ce523c-3655-49ed-af6c-5d66e3badd60',
  hornalla: '6b560d6b-1a92-467c-8ae2-da91b85257a1',
  final: 'a82c68a6-3d92-4332-9d37-e18cf6b3f09e',
};
const puestosCalefon: PuestoControl[] = [
  REPARADOR,
  { puestocontrol_id: 'd694c27a-ebc4-46e2-b3fb-894670cb8e89', puestocontrol_n: 'Control Funcional', puestocontrol_c: '01' },
  { puestocontrol_id: '345de2cc-be8c-4c28-bce7-6a5ee90c0300', puestocontrol_n: 'Control Final', puestocontrol_c: '02' },
];
const puestosTermotanque: PuestoControl[] = [
  REPARADOR,
  { puestocontrol_id: '4e93e0c4-278c-4fc1-965e-19ffec513b1d', puestocontrol_n: 'Control eléctrico', puestocontrol_c: '01' },
  { puestocontrol_id: 'e5f8bdf9-1d40-48e3-a8a0-00ed7a429688', puestocontrol_n: 'Control Final', puestocontrol_c: '02' },
];

const etiqueta = (numero: number, producto_n: string): Etiqueta => ({
  numero,
  producto_id: 'producto-id',
  producto_n,
  color: '#000080',
  tipo: 'TERMOTANQUE',
});

const terminal = (
  tipo: string,
  index: number,
  nombre: string,
  numero: number,
): ResolverInput => ({
  numero,
  tipoProducto: tipo,
  tipoConfig: tipo,
  puestoConfigIndex: index,
  puestoConfigNombre: nombre,
  puestoConfigC: index,
});

beforeEach(() => {
  mCatalogos.listarNivel1.mockResolvedValue([]);
  mCatalogos.listarNivel2.mockResolvedValue([]);
});

describe('1740726 — CALEFON 14L GN con 2 controles OK de una cocina de 2022', () => {
  const N = 1740726;

  beforeEach(() => {
    mEtiqueta.buscarEtiqueta.mockResolvedValue(etiqueta(N, 'CALEFON 14L GN'));
    mCatalogos.listarPuestos.mockResolvedValue(puestosCalefon);
    mEstado.estadoPorEtiqueta.mockResolvedValue([
      registro({
        id: 'f4e331d9-7155-3449-d793-80f16ea5c27b',
        etiqueta: N,
        puestocontrol_id: COCINA.hornalla,
        puestocontrol_n: 'Control de Retencion de hornalla y encedido electrico',
        controlador_fechahora: new Date('2022-04-21T11:20:32.112Z'),
      }),
      registro({
        id: '4e949406-cf82-c7ca-93d0-11c5b1eda55e',
        etiqueta: N,
        puestocontrol_id: COCINA.fuga,
        puestocontrol_n: 'Control de Fuga y retencion de horno',
        controlador_fechahora: new Date('2022-04-21T11:01:30.162Z'),
      }),
    ]);
  });

  test('terminal Control Funcional -> pide el control (antes: "Control OK" falso)', async () => {
    const r = await resolverEscaneo(terminal('CALEFON', 1, 'Control Funcional', N));
    expect(r.accion).toBe('CONTROLADOR');
    expect(r.puestoAsignado?.nombre).toBe('Control Funcional');
  });

  test('terminal Control Final -> no disponible (antes: "Control OK" falso)', async () => {
    const r = await resolverEscaneo(terminal('CALEFON', 2, 'Control Final', N));
    expect(r.accion).toBe('ESTADO');
    expect(r.estado).toEqual({ texto: 'Producto no disponible.', color: 'rojo' });
  });

  test('terminal Reparador -> asigna Control Funcional', async () => {
    const r = await resolverEscaneo(terminal('CALEFON', 0, 'Reparador', N));
    expect(r.accion).toBe('CONTROLADOR');
    expect(r.puestoAsignado?.nombre).toBe('Control Funcional');
  });
});

describe('1738661 — CALEFON 14L GN GRAFITO con una falla de cocina de 2022 sin reparar', () => {
  const N = 1738661;

  beforeEach(() => {
    mEtiqueta.buscarEtiqueta.mockResolvedValue(etiqueta(N, 'CALEFON 14L GN GRAFITO'));
    mCatalogos.listarPuestos.mockResolvedValue(puestosCalefon);
    mEstado.estadoPorEtiqueta.mockResolvedValue([
      registro({
        id: 'da21ee21-283e-d1a2-b8ad-f4424025d73e',
        etiqueta: N,
        puestocontrol_id: COCINA.fuga,
        puestocontrol_n: 'Control de Fuga y retencion de horno',
        controlador_fechahora: new Date('2022-04-19T17:06:26.329Z'),
        controlador_estado: false,
        controlador_falla_id: 'a9fc5cf6-4399-43a0-9b4f-7f25a566f6b6',
        reparador_falla_id: null,
      }),
    ]);
  });

  test('terminal Reparador -> no ofrece reparar la falla de la cocina (antes: modo REPARADOR)', async () => {
    const r = await resolverEscaneo(terminal('CALEFON', 0, 'Reparador', N));
    expect(r.accion).toBe('CONTROLADOR');
    expect(r.registroFalla).toBe(false);
    expect(r.registroId).toBeUndefined();
    expect(r.puestoAsignado?.nombre).toBe('Control Funcional');
  });

  test('terminal Control Funcional -> pide el control (antes: "Control OK" falso)', async () => {
    const r = await resolverEscaneo(terminal('CALEFON', 1, 'Control Funcional', N));
    expect(r.accion).toBe('CONTROLADOR');
    expect(r.puestoAsignado?.nombre).toBe('Control Funcional');
  });
});

describe('1737162 — TermoTanque EL55-CS 1 que pasó Control Final salteando Control eléctrico', () => {
  // DATO DAÑADO: el 01/10 se le hizo Control Final porque el control de Fuga de la
  // cocina de 2022 contó como su paso 1. El filtro no repara eso: el historial
  // propio queda con un solo registro (Control Final) en la posición del paso 1.
  // Estos tests documentan cómo lo ve hoy el resolver; estos productos se
  // re-controlan a mano.
  const N = 1737162;

  beforeEach(() => {
    mEtiqueta.buscarEtiqueta.mockResolvedValue(etiqueta(N, 'TermoTanque EL55-CS 1'));
    mCatalogos.listarPuestos.mockResolvedValue(puestosTermotanque);
    mEstado.estadoPorEtiqueta.mockResolvedValue([
      registro({
        id: 'dd217510-b6a6-fbe3-b9a6-770a6f45b0cb',
        etiqueta: N,
        puestocontrol_id: 'e5f8bdf9-1d40-48e3-a8a0-00ed7a429688',
        puestocontrol_n: 'Control Final',
        controlador_fechahora: new Date('2026-10-01T17:35:10.532Z'),
      }),
      registro({
        id: 'f66efdce-27d8-4e39-5c58-14388cf67192',
        etiqueta: N,
        puestocontrol_id: COCINA.fuga,
        puestocontrol_n: 'Control de Fuga y retencion de horno',
        controlador_fechahora: new Date('2022-04-18T17:40:40.108Z'),
      }),
    ]);
  });

  test('terminal Control Final -> vuelve a ofrecer Control Final (el OK lo rechaza checkDuplicado)', async () => {
    const r = await resolverEscaneo(terminal('TERMOTANQUE', 2, 'Control Final', N));
    expect(r.accion).toBe('CONTROLADOR');
    expect(r.puestoAsignado?.nombre).toBe('Control Final');
  });

  test('terminal Control eléctrico -> "Control OK" sin registro de ese puesto (fallback de "ya pasó")', async () => {
    const r = await resolverEscaneo(terminal('TERMOTANQUE', 1, 'Control eléctrico', N));
    expect(r.accion).toBe('ESTADO');
    expect(r.estado?.texto).toBe('Control OK');
  });
});
