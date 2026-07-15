import { buscarEmpleado } from '../repositories/empleado.repo';
import * as postgres from '../db/postgres';

jest.mock('../db/postgres');

const mPg = postgres as jest.Mocked<typeof postgres>;

function queryResult(rows: unknown[], rowCount: number) {
  return { rows, rowCount } as never;
}

test('pasa usuario en MAYÚSCULAS y password tal cual', async () => {
  mPg.pgQuery.mockResolvedValue(queryResult([{ ID: 'e1' }], 1));

  await buscarEmpleado('op1', 'MiPass');

  expect(mPg.pgQuery).toHaveBeenCalledWith(expect.any(String), ['OP1', 'MiPass']);
});

test('rowCount===1 -> devuelve la fila', async () => {
  const fila = { ID: 'e1', NOMBRE: 'Op1' };
  mPg.pgQuery.mockResolvedValue(queryResult([fila], 1));

  const r = await buscarEmpleado('op1', 'pass');

  expect(r).toEqual(fila);
});

test('rowCount===0 -> null', async () => {
  mPg.pgQuery.mockResolvedValue(queryResult([], 0));

  const r = await buscarEmpleado('op1', 'pass');

  expect(r).toBeNull();
});

test('rowCount>1 (caso borde) -> null', async () => {
  mPg.pgQuery.mockResolvedValue(queryResult([{ ID: 'e1' }, { ID: 'e2' }], 2));

  const r = await buscarEmpleado('op1', 'pass');

  expect(r).toBeNull();
});
