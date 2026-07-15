import { Request, Response } from 'express';
import { z, ZodError } from 'zod';
import { errorHandler, BusinessError } from '../middleware/errors';

function mockRes(): Response {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

const req = {} as Request;
const next = jest.fn();

beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('ZodError -> 422 con error y detalles', () => {
  const res = mockRes();
  let zodError: ZodError;
  try {
    z.object({ a: z.string() }).parse({});
    throw new Error('no debería llegar acá');
  } catch (err) {
    zodError = err as ZodError;
  }

  errorHandler(zodError, req, res, next);

  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.json).toHaveBeenCalledWith({ error: 'Datos inválidos', detalles: zodError.issues });
});

test('BusinessError con status custom -> ese status', () => {
  const res = mockRes();
  const err = new BusinessError('No encontrado', 404);

  errorHandler(err, req, res, next);

  expect(res.status).toHaveBeenCalledWith(404);
  expect(res.json).toHaveBeenCalledWith({ error: 'No encontrado' });
});

test('BusinessError sin status -> 400 default', () => {
  const res = mockRes();
  const err = new BusinessError('Dato inválido');

  errorHandler(err, req, res, next);

  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.json).toHaveBeenCalledWith({ error: 'Dato inválido' });
});

test('Error genérico -> 500 con mensaje interno', () => {
  const res = mockRes();
  const err = new Error('boom');

  errorHandler(err, req, res, next);

  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.json).toHaveBeenCalledWith({ error: 'Error interno del servidor', detalle: 'boom' });
});

test('algo no-Error lanzado (string) -> 500 sin romper', () => {
  const res = mockRes();

  expect(() => errorHandler('boom string', req, res, next)).not.toThrow();
  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.json).toHaveBeenCalledWith({ error: 'Error interno del servidor', detalle: 'Error interno' });
});
