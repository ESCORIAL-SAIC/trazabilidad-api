import request from 'supertest';
import { createApp } from '../app';
import * as etiquetaRepo from '../repositories/etiqueta.repo';
import * as estadoRepo from '../repositories/estado.repo';
import * as plantasConfig from '../config/plantas';
import { etiquetaTermo, registro } from './_fixtures';

jest.mock('../repositories/etiqueta.repo');
jest.mock('../repositories/estado.repo');
jest.mock('../config/plantas');

const mEtiqueta = etiquetaRepo as jest.Mocked<typeof etiquetaRepo>;
const mEstado = estadoRepo as jest.Mocked<typeof estadoRepo>;
const mPlantas = plantasConfig as jest.Mocked<typeof plantasConfig>;

const app = createApp();

beforeEach(() => {
  mPlantas.plantaDefault.mockReturnValue('25demayo');
  mPlantas.existePlanta.mockReturnValue(true);
});

test('GET /etiquetas/:numero encontrada -> 200', async () => {
  mEtiqueta.buscarEtiqueta.mockResolvedValue(etiquetaTermo);

  const res = await request(app).get('/etiquetas/220011').query({ tipo: 'TERMOTANQUE' });

  expect(res.status).toBe(200);
  expect(res.body).toEqual(etiquetaTermo);
});

test('GET /etiquetas/:numero no encontrada -> 404 "no válida"', async () => {
  mEtiqueta.buscarEtiqueta.mockResolvedValue(null);

  const res = await request(app).get('/etiquetas/999999').query({ tipo: 'TERMOTANQUE' });

  expect(res.status).toBe(404);
  expect(res.body.error).toContain('no válida');
});

test('GET /etiquetas/:numero no numérico -> 422', async () => {
  const res = await request(app).get('/etiquetas/abc').query({ tipo: 'TERMOTANQUE' });
  expect(res.status).toBe(422);
});

test('GET /etiquetas/:numero sin tipo -> 422', async () => {
  const res = await request(app).get('/etiquetas/220011');
  expect(res.status).toBe(422);
});

test('GET /etiquetas/:numero/estado -> 200 con array del repo', async () => {
  mEstado.estadoPorEtiqueta.mockResolvedValue([registro({})]);

  const res = await request(app).get('/etiquetas/220011/estado');

  expect(res.status).toBe(200);
  expect(res.body).toHaveLength(1);
});

test('GET /etiquetas/:numero/estado vacío -> 200 array vacío', async () => {
  mEstado.estadoPorEtiqueta.mockResolvedValue([]);

  const res = await request(app).get('/etiquetas/220011/estado');

  expect(res.status).toBe(200);
  expect(res.body).toEqual([]);
});

test('GET /etiquetas/:numero/estado-asociada -> 200 con array del repo', async () => {
  mEstado.estadoPorEtiquetaAsociada.mockResolvedValue([registro({})]);

  const res = await request(app).get('/etiquetas/220011/estado-asociada');

  expect(res.status).toBe(200);
  expect(res.body).toHaveLength(1);
});

test('GET /etiquetas/:numero/estado-asociada vacío -> 200 array vacío', async () => {
  mEstado.estadoPorEtiquetaAsociada.mockResolvedValue([]);

  const res = await request(app).get('/etiquetas/220011/estado-asociada');

  expect(res.status).toBe(200);
  expect(res.body).toEqual([]);
});
