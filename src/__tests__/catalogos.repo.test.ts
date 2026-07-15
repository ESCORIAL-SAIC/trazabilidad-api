import {
  listarPuestos,
  listarNivel1,
  listarNivel2,
  listarNivel3,
} from '../repositories/catalogos.repo';
import * as postgres from '../db/postgres';

jest.mock('../db/postgres');

const mPg = postgres as jest.Mocked<typeof postgres>;

function queryResult(rows: unknown[]) {
  return { rows, rowCount: rows.length } as never;
}

test('listarPuestos devuelve rows y pasa tipo como param', async () => {
  const rows = [{ puestocontrol_id: 'p1', puestocontrol_n: 'Control Final', puestocontrol_c: '01' }];
  mPg.pgQuery.mockResolvedValue(queryResult(rows));

  const r = await listarPuestos('COCINA');

  expect(r).toEqual(rows);
  expect(mPg.pgQuery).toHaveBeenCalledWith(expect.any(String), ['COCINA']);
});

test('listarNivel1 devuelve rows con params [puestoControl, tipo]', async () => {
  const rows = [{ puestocontrol_id: 'p1', puestocontrol_n: 'Control Final', nivel1: 'Falla A', nivel1_id: 'n1' }];
  mPg.pgQuery.mockResolvedValue(queryResult(rows));

  const r = await listarNivel1('Control Final', 'COCINA');

  expect(r).toEqual(rows);
  expect(mPg.pgQuery).toHaveBeenCalledWith(expect.any(String), ['Control Final', 'COCINA']);
});

test('listarNivel2 devuelve rows con param nivel1Id', async () => {
  const rows = [{ nivel1: 'Falla A', nivel1_id: 'n1', nivel2: 'Sub A', nivel2_id: 'n2' }];
  mPg.pgQuery.mockResolvedValue(queryResult(rows));

  const r = await listarNivel2('n1');

  expect(r).toEqual(rows);
  expect(mPg.pgQuery).toHaveBeenCalledWith(expect.any(String), ['n1']);
});

test('listarNivel3 devuelve rows con param nivel2Id', async () => {
  const rows = [
    { nivel1: 'Falla A', nivel1_id: 'n1', nivel2: 'Sub A', nivel2_id: 'n2', nivel3: 'Det A', nivel3_id: 'n3' },
  ];
  mPg.pgQuery.mockResolvedValue(queryResult(rows));

  const r = await listarNivel3('n2');

  expect(r).toEqual(rows);
  expect(mPg.pgQuery).toHaveBeenCalledWith(expect.any(String), ['n2']);
});
