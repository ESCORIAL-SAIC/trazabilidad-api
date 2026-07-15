import request from 'supertest';
import { createApp } from '../app';
import * as catalogosRepo from '../repositories/catalogos.repo';
import * as plantasConfig from '../config/plantas';

jest.mock('../repositories/catalogos.repo');
jest.mock('../config/plantas');

const mCatalogos = catalogosRepo as jest.Mocked<typeof catalogosRepo>;
const mPlantas = plantasConfig as jest.Mocked<typeof plantasConfig>;

const app = createApp();

beforeEach(() => {
  mPlantas.plantaDefault.mockReturnValue('25demayo');
  mPlantas.existePlanta.mockReturnValue(true);
});

test('GET /puestos con tipo -> 200 con array del repo', async () => {
  mCatalogos.listarPuestos.mockResolvedValue([
    { puestocontrol_id: 'p1', puestocontrol_n: 'Control Final', puestocontrol_c: '01' },
  ]);

  const res = await request(app).get('/puestos').query({ tipo: 'COCINA' });

  expect(res.status).toBe(200);
  expect(res.body).toHaveLength(1);
  expect(mCatalogos.listarPuestos).toHaveBeenCalledWith('COCINA');
});

test('GET /puestos sin tipo -> 422', async () => {
  const res = await request(app).get('/puestos');
  expect(res.status).toBe(422);
});

test('GET /fallas/nivel1 con puesto y tipo -> 200', async () => {
  mCatalogos.listarNivel1.mockResolvedValue([
    { puestocontrol_id: 'p1', puestocontrol_n: 'Control Final', nivel1: 'Falla A', nivel1_id: 'n1' },
  ]);

  const res = await request(app)
    .get('/fallas/nivel1')
    .query({ puesto: 'Control Final', tipo: 'COCINA' });

  expect(res.status).toBe(200);
  expect(res.body).toHaveLength(1);
  expect(mCatalogos.listarNivel1).toHaveBeenCalledWith('Control Final', 'COCINA');
});

test('GET /fallas/nivel1 sin params requeridos -> 422 (validación manual)', async () => {
  const res = await request(app).get('/fallas/nivel1').query({ puesto: 'Control Final' });
  expect(res.status).toBe(422);
});

test('GET /fallas/nivel2 con nivel1Id -> 200', async () => {
  mCatalogos.listarNivel2.mockResolvedValue([
    { nivel1: 'Falla A', nivel1_id: 'n1', nivel2: 'Sub A', nivel2_id: 'n2' },
  ]);

  const res = await request(app).get('/fallas/nivel2').query({ nivel1Id: 'n1' });

  expect(res.status).toBe(200);
  expect(res.body).toHaveLength(1);
  expect(mCatalogos.listarNivel2).toHaveBeenCalledWith('n1');
});

test('GET /fallas/nivel2 sin nivel1Id -> 422', async () => {
  const res = await request(app).get('/fallas/nivel2');
  expect(res.status).toBe(422);
});

test('GET /fallas/nivel3 con nivel2Id -> 200', async () => {
  mCatalogos.listarNivel3.mockResolvedValue([
    {
      nivel1: 'Falla A', nivel1_id: 'n1', nivel2: 'Sub A', nivel2_id: 'n2',
      nivel3: 'Detalle A', nivel3_id: 'n3',
    },
  ]);

  const res = await request(app).get('/fallas/nivel3').query({ nivel2Id: 'n2' });

  expect(res.status).toBe(200);
  expect(res.body).toHaveLength(1);
  expect(mCatalogos.listarNivel3).toHaveBeenCalledWith('n2');
});

test('GET /fallas/nivel3 sin nivel2Id -> 422', async () => {
  const res = await request(app).get('/fallas/nivel3');
  expect(res.status).toBe(422);
});
