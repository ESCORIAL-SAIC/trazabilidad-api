import { estadoPorEtiqueta, estadoPorEtiquetaAsociada } from '../repositories/estado.repo';
import * as postgres from '../db/postgres';
import { registro } from './_fixtures';

jest.mock('../db/postgres');

const mPg = postgres as jest.Mocked<typeof postgres>;

function queryResult(rows: unknown[]) {
  return { rows, rowCount: rows.length } as never;
}

test('estadoPorEtiqueta devuelve las rows tal cual', async () => {
  const rows = [registro({}), registro({ id: 'reg2' })];
  mPg.pgQuery.mockResolvedValue(queryResult(rows));

  const r = await estadoPorEtiqueta(220011);

  expect(r).toEqual(rows);
  expect(mPg.pgQuery).toHaveBeenCalledWith(expect.any(String), [220011]);
});

test('estadoPorEtiquetaAsociada pasa el parámetro como STRING, no número', async () => {
  mPg.pgQuery.mockResolvedValue(queryResult([]));

  await estadoPorEtiquetaAsociada(1456778);

  const params = mPg.pgQuery.mock.calls[0][1] as unknown[];
  expect(params[0]).toBe('1456778');
  expect(typeof params[0]).toBe('string');
});

test('estadoPorEtiquetaAsociada devuelve las rows tal cual', async () => {
  const rows = [registro({ etiqueta_asociada: '1456778' })];
  mPg.pgQuery.mockResolvedValue(queryResult(rows));

  const r = await estadoPorEtiquetaAsociada(1456778);

  expect(r).toEqual(rows);
});
