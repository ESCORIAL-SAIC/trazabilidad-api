import request from 'supertest';
import { createApp } from '../app';
import * as resolverService from '../services/resolver.service';
import * as plantasConfig from '../config/plantas';

jest.mock('../services/resolver.service');
jest.mock('../config/plantas');

const mResolver = resolverService as jest.Mocked<typeof resolverService>;
const mPlantas = plantasConfig as jest.Mocked<typeof plantasConfig>;

const app = createApp();

beforeEach(() => {
  mPlantas.plantaDefault.mockReturnValue('25demayo');
  mPlantas.existePlanta.mockReturnValue(true);
});

const bodyValido = {
  numero: 220011,
  tipoProducto: 'TERMOTANQUE',
  tipoConfig: 'TERMOTANQUE',
  puestoConfigIndex: 1,
  puestoConfigNombre: 'Control eléctrico',
  puestoConfigC: 1,
};

test('POST /scan/resolver caso feliz -> 200', async () => {
  mResolver.resolverEscaneo.mockResolvedValue({ accion: 'CONTROLADOR' });

  const res = await request(app).post('/scan/resolver').send(bodyValido);

  expect(res.status).toBe(200);
  expect(res.body.accion).toBe('CONTROLADOR');
  expect(mResolver.resolverEscaneo).toHaveBeenCalledWith(bodyValido);
});

test('POST /scan/resolver body inválido -> 422', async () => {
  const res = await request(app).post('/scan/resolver').send({ numero: 220011 });
  expect(res.status).toBe(422);
});
