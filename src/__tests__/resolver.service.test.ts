import { resolverEscaneo, ResolverInput } from '../services/resolver.service';
import * as etiquetaRepo from '../repositories/etiqueta.repo';
import * as estadoRepo from '../repositories/estado.repo';
import * as catalogosRepo from '../repositories/catalogos.repo';
import {
  puestosCocina,
  puestosTermo,
  puestosConAteq,
  etiquetaCocina,
  etiquetaTermo,
  registro,
} from './_fixtures';

jest.mock('../repositories/etiqueta.repo');
jest.mock('../repositories/estado.repo');
jest.mock('../repositories/catalogos.repo');

const mEtiqueta = etiquetaRepo as jest.Mocked<typeof etiquetaRepo>;
const mEstado = estadoRepo as jest.Mocked<typeof estadoRepo>;
const mCatalogos = catalogosRepo as jest.Mocked<typeof catalogosRepo>;

beforeEach(() => {
  mCatalogos.listarNivel1.mockResolvedValue([
    { puestocontrol_id: 't1', puestocontrol_n: 'Control eléctrico', nivel1: 'Falla A', nivel1_id: 'n1a' },
  ]);
  mCatalogos.listarNivel2.mockResolvedValue([
    { nivel1: 'Falla A', nivel1_id: 'n1a', nivel2: 'Sub A', nivel2_id: 'n2a' },
  ]);
});

const baseInput = (over: Partial<ResolverInput>): ResolverInput => ({
  numero: 1456778,
  tipoProducto: 'TERMOTANQUE',
  tipoConfig: 'TERMOTANQUE',
  puestoConfigIndex: 1,
  puestoConfigNombre: 'Control eléctrico',
  puestoConfigC: 1,
  ...over,
});

test('etiqueta comercial 7790 -> IGNORAR', async () => {
  const r = await resolverEscaneo(baseInput({ numero: 7790123 }));
  expect(r.accion).toBe('IGNORAR');
});

test('etiqueta inexistente -> ETIQUETA_INVALIDA', async () => {
  mEtiqueta.buscarEtiqueta.mockResolvedValue(null);
  const r = await resolverEscaneo(baseInput({}));
  expect(r.accion).toBe('ETIQUETA_INVALIDA');
});

test('puesto fijo normal sin registros previos -> CONTROLADOR con nivel1', async () => {
  mEtiqueta.buscarEtiqueta.mockResolvedValue(etiquetaTermo);
  mEstado.estadoPorEtiqueta.mockResolvedValue([]);
  mCatalogos.listarPuestos.mockResolvedValue(puestosTermo);

  const r = await resolverEscaneo(baseInput({ numero: 220011 }));
  expect(r.accion).toBe('CONTROLADOR');
  expect(r.puestoAsignado?.nombre).toBe('Control eléctrico');
  expect(r.campoBarral).toBeUndefined();
  expect(r.nivel1?.length).toBe(1);
  expect(r.color).toBe('#00FFFF');
});

test('Control Final fijo -> CONTROLADOR con campoBarral y cámara', async () => {
  mEtiqueta.buscarEtiqueta.mockResolvedValue(etiquetaTermo);
  // ya tiene un control previo OK en c1 => corresponde el c2 (Control Final)
  mEstado.estadoPorEtiqueta.mockResolvedValue([
    registro({ puestocontrol_n: 'Control eléctrico', puestocontrol_id: 't1', controlador_estado: true }),
  ]);
  mCatalogos.listarPuestos.mockResolvedValue(puestosTermo);

  const r = await resolverEscaneo(
    baseInput({ numero: 220011, puestoConfigIndex: 2, puestoConfigNombre: 'Control Final', puestoConfigC: 2 }),
  );
  expect(r.accion).toBe('CONTROLADOR');
  expect(r.campoBarral?.conCamara).toBe(true);
  expect(r.campoBarral?.prompt).toBe('Codigo Frontal');
});

test('terminal Reparador (index 0) sin registros -> asigna primer puesto real', async () => {
  mEtiqueta.buscarEtiqueta.mockResolvedValue(etiquetaTermo);
  mEstado.estadoPorEtiqueta.mockResolvedValue([]);
  mCatalogos.listarPuestos.mockResolvedValue(puestosTermo);

  const r = await resolverEscaneo(
    baseInput({ numero: 220011, puestoConfigIndex: 0, puestoConfigNombre: 'Reparador', puestoConfigC: 0 }),
  );
  expect(r.accion).toBe('CONTROLADOR');
  expect(r.puestoAsignado?.nombre).toBe('Control eléctrico');
});

test('terminal Reparador con falla pendiente -> modo REPARADOR con nivel2', async () => {
  mEtiqueta.buscarEtiqueta.mockResolvedValue(etiquetaTermo);
  mEstado.estadoPorEtiqueta.mockResolvedValue([
    registro({
      id: 'reg1',
      puestocontrol_n: 'Control eléctrico',
      controlador_estado: false,
      controlador_falla_id: 'n1a',
      reparador_falla_id: null,
    }),
  ]);
  mCatalogos.listarPuestos.mockResolvedValue(puestosTermo);

  const r = await resolverEscaneo(
    baseInput({ numero: 220011, puestoConfigIndex: 0, puestoConfigNombre: 'Reparador', puestoConfigC: 0 }),
  );
  expect(r.accion).toBe('REPARADOR');
  expect(r.registroFalla).toBe(true);
  expect(r.registroId).toBe('reg1');
  expect(r.controladorFallaId).toBe('n1a');
  expect(r.nivel2?.length).toBe(1);
});

test('producto que ya pasó el control OK -> ESTADO verde', async () => {
  mEtiqueta.buscarEtiqueta.mockResolvedValue(etiquetaTermo);
  mEstado.estadoPorEtiqueta.mockResolvedValue([
    registro({ puestocontrol_n: 'Control eléctrico', puestocontrol_id: 't1', controlador_estado: true }),
  ]);
  mCatalogos.listarPuestos.mockResolvedValue(puestosTermo);

  // config en c1 pero ya hay 1 registro => length+1=2 > 1 => ya pasó
  const r = await resolverEscaneo(baseInput({ numero: 220011, puestoConfigIndex: 1, puestoConfigNombre: 'Control eléctrico', puestoConfigC: 1 }));
  expect(r.accion).toBe('ESTADO');
  expect(r.estado?.texto).toBe('Control OK');
  expect(r.estado?.color).toBe('verde');
});

test('Fuga (COCINA) sin etiqueta asociada -> ESTADO no disponible', async () => {
  mEtiqueta.buscarEtiqueta.mockResolvedValue(etiquetaCocina);
  mEstado.estadoPorEtiqueta.mockResolvedValue([]);
  mEstado.estadoPorEtiquetaAsociada.mockResolvedValue([]);
  mCatalogos.listarPuestos.mockResolvedValue(puestosCocina);

  const r = await resolverEscaneo({
    numero: 1456778,
    tipoProducto: 'COCINA',
    tipoConfig: 'COCINA',
    puestoConfigIndex: 1,
    puestoConfigNombre: 'Control de Fuga y retencion de horno',
    puestoConfigC: 1,
  });
  expect(r.accion).toBe('ESTADO');
  expect(r.estado?.texto).toBe('Producto no disponible.');
});

test('ATEQ al llegar su turno -> campoBarral visible, sin cámara, prompt Barral', async () => {
  mEtiqueta.buscarEtiqueta.mockResolvedValue(etiquetaCocina);
  // 1 registro previo OK en Control eléctrico (c=1) => corresponde ATEQ (c=2)
  mEstado.estadoPorEtiqueta.mockResolvedValue([
    registro({ puestocontrol_n: 'Control eléctrico', puestocontrol_id: 'a1', controlador_estado: true }),
  ]);
  mCatalogos.listarPuestos.mockResolvedValue(puestosConAteq);

  const r = await resolverEscaneo(
    baseInput({
      numero: 1456778,
      tipoProducto: 'COCINA',
      tipoConfig: 'COCINA',
      puestoConfigIndex: 2,
      puestoConfigNombre: 'ATEQ',
      puestoConfigC: 2,
    }),
  );
  expect(r.accion).toBe('CONTROLADOR');
  expect(r.campoBarral).toEqual({ visible: true, readOnly: false, conCamara: false, prompt: 'Barral' });
});

test('Fuga con etiquetas asociadas existentes -> campoBarral.valor precargado con el barral de la primera', async () => {
  mEtiqueta.buscarEtiqueta.mockResolvedValue(etiquetaCocina);
  mEstado.estadoPorEtiqueta.mockResolvedValue([]);
  mEstado.estadoPorEtiquetaAsociada.mockResolvedValue([
    registro({ barral: 'BARRAL-1' }),
    registro({ barral: 'BARRAL-2' }),
  ]);
  mCatalogos.listarPuestos.mockResolvedValue(puestosCocina);

  const r = await resolverEscaneo({
    numero: 1456778,
    tipoProducto: 'COCINA',
    tipoConfig: 'COCINA',
    puestoConfigIndex: 1,
    puestoConfigNombre: 'Control de Fuga y retencion de horno',
    puestoConfigC: 1,
  });
  expect(r.accion).toBe('CONTROLADOR');
  expect(r.campoBarral?.valor).toBe('BARRAL-1');
});

test('rama "reparado" (controlador_estado false + reparador_falla_id no vacío) -> avanza al siguiente puesto como OK', async () => {
  mEtiqueta.buscarEtiqueta.mockResolvedValue(etiquetaTermo);
  mEstado.estadoPorEtiqueta.mockResolvedValue([
    registro({
      puestocontrol_n: 'Control eléctrico',
      puestocontrol_id: 't1',
      controlador_estado: false,
      reparador_falla_id: 'n3a',
    }),
  ]);
  mCatalogos.listarPuestos.mockResolvedValue(puestosTermo);

  const r = await resolverEscaneo(
    baseInput({ numero: 220011, puestoConfigIndex: 0, puestoConfigNombre: 'Reparador', puestoConfigC: 0 }),
  );
  expect(r.accion).toBe('CONTROLADOR');
  expect(r.puestoAsignado?.nombre).toBe('Control Final');
});

test('estados.length + 1 < puestoAsignadoC -> ESTADO "Producto no disponible." en rojo', async () => {
  mEtiqueta.buscarEtiqueta.mockResolvedValue(etiquetaTermo);
  mEstado.estadoPorEtiqueta.mockResolvedValue([]); // ningún registro todavía
  mCatalogos.listarPuestos.mockResolvedValue(puestosTermo);

  // config apunta directo a Control Final (c=2) sin haber pasado por c=1
  const r = await resolverEscaneo(
    baseInput({ numero: 220011, puestoConfigIndex: 2, puestoConfigNombre: 'Control Final', puestoConfigC: 2 }),
  );
  expect(r.accion).toBe('ESTADO');
  expect(r.estado?.texto).toBe('Producto no disponible.');
  expect(r.estado?.color).toBe('rojo');
});

test('re-escanear en modo controlador ya en el último puesto -> se reasigna el mismo puesto', async () => {
  mEtiqueta.buscarEtiqueta.mockResolvedValue(etiquetaTermo);
  // ya tiene un OK en el último puesto (Control Final, c=2, índice final de puestosTermo)
  mEstado.estadoPorEtiqueta.mockResolvedValue([
    registro({ puestocontrol_n: 'Control Final', puestocontrol_id: 't2', controlador_estado: true }),
  ]);
  mCatalogos.listarPuestos.mockResolvedValue(puestosTermo);

  const r = await resolverEscaneo(
    baseInput({ numero: 220011, puestoConfigIndex: 0, puestoConfigNombre: 'Reparador', puestoConfigC: 0 }),
  );
  // no debe salir de rango: se reasigna el mismo último puesto (Control Final)
  expect(r.puestoAsignado?.nombre).toBe('Control Final');
});

test('DISCREPANCIA: "estados vacío pero reparador_falla_id no vacío" es un caso imposible en el código actual', async () => {
  // Si estados=[] no existe "primero", por lo que no puede haber reparador_falla_id.
  // sinRegistros domina la condición (ctrlOk || reparado || sinRegistros) y el
  // comportamiento observado es idéntico al de "terminal Reparador sin registros":
  // asigna el primer puesto real, nunca entra a modo REPARADOR ni a un hipotético "ya reparado".
  mEtiqueta.buscarEtiqueta.mockResolvedValue(etiquetaTermo);
  mEstado.estadoPorEtiqueta.mockResolvedValue([]);
  mCatalogos.listarPuestos.mockResolvedValue(puestosTermo);

  const r = await resolverEscaneo(
    baseInput({ numero: 220011, puestoConfigIndex: 0, puestoConfigNombre: 'Reparador', puestoConfigC: 0 }),
  );
  expect(r.accion).toBe('CONTROLADOR');
  expect(r.registroFalla).toBe(false);
  expect(r.puestoAsignado?.nombre).toBe('Control eléctrico');
});

describe('números de etiqueta repetidos entre cocina y termotanque', () => {
  // Historial de una cocina de 2022 con el mismo número que un termotanque nuevo
  // (puestos con ids de puestosCocina: p1/p2/p3).
  const fugaCocina = registro({
    id: 'coc-1',
    puestocontrol_id: 'p1',
    puestocontrol_n: 'Control de Fuga y retencion de horno',
    controlador_fechahora: new Date('2022-04-21T11:01:30Z'),
  });
  const hornallaCocina = registro({
    id: 'coc-2',
    puestocontrol_id: 'p2',
    puestocontrol_n: 'Control de Retencion de hornalla y encedido electrico',
    controlador_fechahora: new Date('2022-04-21T11:20:32Z'),
  });

  beforeEach(() => {
    mEtiqueta.buscarEtiqueta.mockResolvedValue(etiquetaTermo);
    mCatalogos.listarPuestos.mockResolvedValue(puestosTermo);
  });

  test('sin controles propios, en el primer puesto -> CONTROLADOR (ignora el historial de la cocina)', async () => {
    mEstado.estadoPorEtiqueta.mockResolvedValue([hornallaCocina, fugaCocina]);

    const r = await resolverEscaneo(baseInput({ numero: 220011 }));
    expect(r.accion).toBe('CONTROLADOR');
    expect(r.puestoAsignado?.nombre).toBe('Control eléctrico');
  });

  test('sin controles propios, en Control Final -> no disponible (antes daba "Control OK" falso)', async () => {
    mEstado.estadoPorEtiqueta.mockResolvedValue([hornallaCocina, fugaCocina]);

    const r = await resolverEscaneo(
      baseInput({ numero: 220011, puestoConfigIndex: 2, puestoConfigNombre: 'Control Final', puestoConfigC: 2 }),
    );
    expect(r.accion).toBe('ESTADO');
    expect(r.estado).toEqual({ texto: 'Producto no disponible.', color: 'rojo' });
  });

  test('un solo registro de cocina no permite saltear el primer puesto hacia Control Final', async () => {
    mEstado.estadoPorEtiqueta.mockResolvedValue([fugaCocina]);

    const r = await resolverEscaneo(
      baseInput({ numero: 220011, puestoConfigIndex: 2, puestoConfigNombre: 'Control Final', puestoConfigC: 2 }),
    );
    expect(r.accion).toBe('ESTADO');
    expect(r.estado?.texto).toBe('Producto no disponible.');
  });

  test('controles propios mezclados con los de la cocina -> cuenta sólo los propios', async () => {
    mEstado.estadoPorEtiqueta.mockResolvedValue([
      registro({ id: 'own-1', puestocontrol_id: 't1', puestocontrol_n: 'Control eléctrico' }),
      hornallaCocina,
      fugaCocina,
    ]);

    const r = await resolverEscaneo(
      baseInput({ numero: 220011, puestoConfigIndex: 2, puestoConfigNombre: 'Control Final', puestoConfigC: 2 }),
    );
    expect(r.accion).toBe('CONTROLADOR');
    expect(r.puestoAsignado?.nombre).toBe('Control Final');
  });

  test('terminal Reparador: una falla pendiente de la cocina no activa el modo REPARADOR', async () => {
    mEstado.estadoPorEtiqueta.mockResolvedValue([
      registro({
        id: 'coc-falla',
        puestocontrol_id: 'p3',
        puestocontrol_n: 'Control Final',
        controlador_estado: false,
        controlador_falla_id: 'n1-cocina',
        reparador_falla_id: null,
      }),
    ]);

    const r = await resolverEscaneo(
      baseInput({ numero: 220011, puestoConfigIndex: 0, puestoConfigNombre: 'Reparador', puestoConfigC: 0 }),
    );
    expect(r.accion).toBe('CONTROLADOR');
    expect(r.registroFalla).toBe(false);
    expect(r.puestoAsignado?.nombre).toBe('Control eléctrico');
  });

  test('terminal Reparador: repara la falla propia aunque haya registros más nuevos de otro tipo', async () => {
    mEstado.estadoPorEtiqueta.mockResolvedValue([
      registro({ id: 'coc-3', puestocontrol_id: 'p3', puestocontrol_n: 'Control Final' }),
      registro({
        id: 'own-falla',
        puestocontrol_id: 't1',
        puestocontrol_n: 'Control eléctrico',
        controlador_estado: false,
        controlador_falla_id: 'n1a',
        reparador_falla_id: null,
      }),
    ]);

    const r = await resolverEscaneo(
      baseInput({ numero: 220011, puestoConfigIndex: 0, puestoConfigNombre: 'Reparador', puestoConfigC: 0 }),
    );
    expect(r.accion).toBe('REPARADOR');
    expect(r.registroId).toBe('own-falla');
  });
});
