import request from 'supertest';
import { createApp } from '../app';
import * as controlService from '../services/control.service';
import * as etiquetaRepo from '../repositories/etiqueta.repo';
import * as plantasConfig from '../config/plantas';
import { BusinessError } from '../middleware/errors';

jest.mock('../services/control.service');
jest.mock('../repositories/etiqueta.repo');
jest.mock('../config/plantas');

const mControl = controlService as jest.Mocked<typeof controlService>;
const mEtiqueta = etiquetaRepo as jest.Mocked<typeof etiquetaRepo>;
const mPlantas = plantasConfig as jest.Mocked<typeof plantasConfig>;

const app = createApp();

beforeEach(() => {
  mPlantas.plantaDefault.mockReturnValue('25demayo');
  mPlantas.existePlanta.mockReturnValue(true);
});

const uuid1 = '11111111-1111-1111-1111-111111111111';
const uuid2 = '22222222-2222-2222-2222-222222222222';
const uuid3 = '33333333-3333-3333-3333-333333333333';

const empleado = { id: uuid1, nombre: 'Op1' };
const secundario = { id: uuid2, nombre: 'Op2' };

describe('POST /control/ok', () => {
  const bodyValido = {
    etiqueta: 220011,
    tipoProducto: 'TERMOTANQUE',
    productoId: uuid3,
    puesto: { id: uuid1, nombre: 'Control eléctrico', c: 1 },
    controlador: empleado,
    secundario,
  };

  test('caso feliz -> 200', async () => {
    mControl.registrarOk.mockResolvedValue({ id: 'new-id', liberado: false });

    const res = await request(app).post('/control/ok').send(bodyValido);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 'new-id', liberado: false });
  });

  test('body inválido -> 422', async () => {
    const res = await request(app).post('/control/ok').send({ etiqueta: 220011 });
    expect(res.status).toBe(422);
  });

  test('BusinessError del service -> status+mensaje se propaga', async () => {
    mControl.registrarOk.mockRejectedValue(
      new BusinessError('La etiqueta seleccionada ya cuenta con registro en este puesto de control.'),
    );

    const res = await request(app).post('/control/ok').send(bodyValido);

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('ya cuenta con registro');
  });
});

describe('POST /control/falla', () => {
  const bodyValido = {
    etiqueta: 220011,
    puesto: { id: uuid1, nombre: 'Control eléctrico', c: 1 },
    controlador: empleado,
    secundario,
    nivel1: { id: uuid3, nombre: 'Falla A' },
  };

  test('caso feliz -> 200', async () => {
    mControl.registrarFalla.mockResolvedValue({ id: 'new-id' });

    const res = await request(app).post('/control/falla').send(bodyValido);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 'new-id' });
  });

  test('body inválido -> 422', async () => {
    const res = await request(app).post('/control/falla').send({ etiqueta: 220011 });
    expect(res.status).toBe(422);
  });

  test('BusinessError del service -> status+mensaje se propaga', async () => {
    mControl.registrarFalla.mockRejectedValue(new BusinessError('Falla no válida', 404));

    const res = await request(app).post('/control/falla').send(bodyValido);

    expect(res.status).toBe(404);
    expect(res.body.error).toContain('Falla no válida');
  });
});

describe('POST /control/reparacion', () => {
  const bodyValido = {
    registroId: uuid1,
    etiqueta: 220011,
    tipoProducto: 'COCINA',
    puestoNombre: 'Control de Fuga y retencion de horno',
    reparador: empleado,
    nivel3: { id: uuid3, nombre: 'Repara X' },
  };

  test('caso feliz -> 200', async () => {
    mControl.registrarReparacion.mockResolvedValue({ mensaje: 'Es obligatorio re controlar Fuga y retención de horno' });

    const res = await request(app).post('/control/reparacion').send(bodyValido);

    expect(res.status).toBe(200);
    expect(res.body.mensaje).toContain('re controlar');
  });

  test('body inválido -> 422', async () => {
    const res = await request(app).post('/control/reparacion').send({ etiqueta: 220011 });
    expect(res.status).toBe(422);
  });

  test('BusinessError del service -> status+mensaje se propaga', async () => {
    mControl.registrarReparacion.mockRejectedValue(new BusinessError('Registro no encontrado', 404));

    const res = await request(app).post('/control/reparacion').send(bodyValido);

    expect(res.status).toBe(404);
    expect(res.body.error).toContain('Registro no encontrado');
  });
});

describe('POST /control/barral/validar', () => {
  test('buscarBarral true -> 200 valido:true', async () => {
    mEtiqueta.buscarBarral.mockResolvedValue(true);

    const res = await request(app).post('/control/barral/validar').send({ serie: 'B123' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ valido: true });
  });

  test('buscarBarral false -> 400 "no válida"', async () => {
    mEtiqueta.buscarBarral.mockResolvedValue(false);

    const res = await request(app).post('/control/barral/validar').send({ serie: 'B999' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('no válida');
  });

  test('body inválido -> 422', async () => {
    const res = await request(app).post('/control/barral/validar').send({});
    expect(res.status).toBe(422);
  });
});

describe('POST /control/frontal/validar', () => {
  const bodyValido = { codigoBarras: 'CB123', productoId: uuid3 };

  test('validarFrontal true -> 200 valido:true', async () => {
    mEtiqueta.validarFrontal.mockResolvedValue(true);

    const res = await request(app).post('/control/frontal/validar').send(bodyValido);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ valido: true });
  });

  test('validarFrontal false -> 400 "no coincide con el producto"', async () => {
    mEtiqueta.validarFrontal.mockResolvedValue(false);

    const res = await request(app).post('/control/frontal/validar').send(bodyValido);

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('no coincide con el producto');
  });

  test('body inválido -> 422', async () => {
    const res = await request(app).post('/control/frontal/validar').send({ codigoBarras: 'CB123' });
    expect(res.status).toBe(422);
  });
});
