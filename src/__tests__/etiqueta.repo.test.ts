import { buscarEtiqueta, buscarBarral, validarFrontal } from '../repositories/etiqueta.repo';
import * as postgres from '../db/postgres';

jest.mock('../db/postgres');

const mPg = postgres as jest.Mocked<typeof postgres>;

function queryResult(rows: unknown[]) {
  return { rows, rowCount: rows.length } as never;
}

describe('buscarEtiqueta', () => {
  test('1 fila -> devuelve la fila', async () => {
    const fila = { NUMERO: 220011, PRODUCTO_N: 'Termotanque' };
    mPg.pgQuery.mockResolvedValue(queryResult([fila]));

    const r = await buscarEtiqueta(220011, 'TERMOTANQUE');

    expect(r).toEqual(fila);
    expect(mPg.pgQuery).toHaveBeenCalledWith(expect.any(String), [220011, 'TERMOTANQUE']);
  });

  test('0 filas -> null', async () => {
    mPg.pgQuery.mockResolvedValue(queryResult([]));

    const r = await buscarEtiqueta(999999, 'TERMOTANQUE');

    expect(r).toBeNull();
  });
});

describe('buscarBarral', () => {
  test('rowCount>0 -> true', async () => {
    mPg.pgQuery.mockResolvedValue(queryResult([{}]));

    const r = await buscarBarral('B123');

    expect(r).toBe(true);
    expect(mPg.pgQuery).toHaveBeenCalledWith(expect.any(String), ['B123', 'BARRAL']);
  });

  test('rowCount 0 -> false', async () => {
    mPg.pgQuery.mockResolvedValue(queryResult([]));

    const r = await buscarBarral('B999');

    expect(r).toBe(false);
  });
});

describe('validarFrontal', () => {
  test('rowCount>0 -> true', async () => {
    mPg.pgQuery.mockResolvedValue(queryResult([{}]));

    const r = await validarFrontal('CB123', 'prod-1');

    expect(r).toBe(true);
    expect(mPg.pgQuery).toHaveBeenCalledWith(expect.any(String), ['CB123', 'prod-1']);
  });

  test('rowCount 0 -> false', async () => {
    mPg.pgQuery.mockResolvedValue(queryResult([]));

    const r = await validarFrontal('CB999', 'prod-1');

    expect(r).toBe(false);
  });
});
