import { Request, Response } from 'express';
import { plantaMiddleware } from '../middleware/planta';
import * as plantasConfig from '../config/plantas';
import * as plantaContext from '../context/plantaContext';
import { BusinessError } from '../middleware/errors';

jest.mock('../config/plantas');
jest.mock('../context/plantaContext');

const mPlantas = plantasConfig as jest.Mocked<typeof plantasConfig>;
const mContext = plantaContext as jest.Mocked<typeof plantaContext>;

function req(headerValue: string | undefined): Request {
  return {
    header: (name: string) => (name === 'X-Planta' ? headerValue : undefined),
  } as unknown as Request;
}

const res = {} as Response;

beforeEach(() => {
  mContext.runConPlanta.mockImplementation((_planta, fn) => fn());
});

test('sin header X-Planta -> usa plantaDefault()', () => {
  mPlantas.plantaDefault.mockReturnValue('25demayo');
  mPlantas.existePlanta.mockReturnValue(true);
  const next = jest.fn();

  plantaMiddleware(req(undefined), res, next);

  expect(mPlantas.plantaDefault).toHaveBeenCalled();
  expect(mContext.runConPlanta).toHaveBeenCalledWith('25demayo', expect.any(Function));
  expect(next).toHaveBeenCalled();
});

test('header con id existente -> runConPlanta se llama con ese id', () => {
  mPlantas.existePlanta.mockReturnValue(true);
  const next = jest.fn();

  plantaMiddleware(req('suipacha'), res, next);

  expect(mContext.runConPlanta).toHaveBeenCalledWith('suipacha', expect.any(Function));
  expect(next).toHaveBeenCalled();
});

test('header con id inexistente -> BusinessError 400 "Planta desconocida"', () => {
  mPlantas.existePlanta.mockReturnValue(false);
  const next = jest.fn();

  expect(() => plantaMiddleware(req('inexistente'), res, next)).toThrow(BusinessError);
  try {
    plantaMiddleware(req('inexistente'), res, next);
  } catch (err) {
    expect(err).toBeInstanceOf(BusinessError);
    expect((err as BusinessError).status).toBe(400);
    expect((err as BusinessError).message).toContain('Planta desconocida');
  }
});

test('header con espacios -> se usa trim()', () => {
  mPlantas.existePlanta.mockReturnValue(true);
  const next = jest.fn();

  plantaMiddleware(req('  suipacha  '), res, next);

  expect(mPlantas.existePlanta).toHaveBeenCalledWith('suipacha');
  expect(mContext.runConPlanta).toHaveBeenCalledWith('suipacha', expect.any(Function));
});
