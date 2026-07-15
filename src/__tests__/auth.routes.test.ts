import request from 'supertest';
import { createApp } from '../app';
import * as empleadoRepo from '../repositories/empleado.repo';
import * as plantasConfig from '../config/plantas';

jest.mock('../repositories/empleado.repo');
jest.mock('../config/plantas');

const mEmpleado = empleadoRepo as jest.Mocked<typeof empleadoRepo>;
const mPlantas = plantasConfig as jest.Mocked<typeof plantasConfig>;

const app = createApp();

beforeEach(() => {
  mPlantas.plantaDefault.mockReturnValue('25demayo');
  mPlantas.existePlanta.mockReturnValue(true);
});

const emp1 = { ID: 'e1', NOMBRE: 'Op1' };
const emp2 = { ID: 'e2', NOMBRE: 'Op2' };

test('operario 2 vacío -> usa el 1 como secundario (200)', async () => {
  mEmpleado.buscarEmpleado.mockResolvedValue(emp1);

  const res = await request(app)
    .post('/auth/login')
    .send({ usuario1: 'op1', password1: 'pass1' });

  expect(res.status).toBe(200);
  expect(res.body.valido).toBe(true);
  expect(res.body.empleado2).toEqual(res.body.empleado1);
});

test('operario 1 inválido -> 401 "Datos de acceso incorrectos"', async () => {
  mEmpleado.buscarEmpleado.mockResolvedValue(null);

  const res = await request(app)
    .post('/auth/login')
    .send({ usuario1: 'bad', password1: 'bad' });

  expect(res.status).toBe(401);
  expect(res.body.error).toContain('Datos de acceso incorrectos');
});

test('operario 2 con usuario pero password incorrecta -> 401 mismo mensaje', async () => {
  mEmpleado.buscarEmpleado.mockImplementation(async (usuario) =>
    usuario === 'op1' ? emp1 : null,
  );

  const res = await request(app)
    .post('/auth/login')
    .send({ usuario1: 'op1', password1: 'pass1', usuario2: 'op2', password2: 'wrong' });

  expect(res.status).toBe(401);
  expect(res.body.error).toContain('Datos de acceso incorrectos');
});

test('falta usuario1 -> 422', async () => {
  const res = await request(app).post('/auth/login').send({ password1: 'pass1' });
  expect(res.status).toBe(422);
});
