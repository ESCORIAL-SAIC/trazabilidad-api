import request from 'supertest';
import { createApp } from '../app';
import * as plantasConfig from '../config/plantas';

jest.mock('../config/plantas');

const mPlantas = plantasConfig as jest.Mocked<typeof plantasConfig>;

const app = createApp();

test('GET /plantas -> 200 con array de listarPlantas(), sin header X-Planta', async () => {
  mPlantas.listarPlantas.mockReturnValue([
    { id: '25demayo', nombre: '25 de Mayo' },
    { id: 'suipacha', nombre: 'Suipacha' },
  ]);

  const res = await request(app).get('/plantas');

  expect(res.status).toBe(200);
  expect(res.body).toEqual([
    { id: '25demayo', nombre: '25 de Mayo' },
    { id: 'suipacha', nombre: 'Suipacha' },
  ]);
});
