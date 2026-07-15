import { PoolClient } from 'pg';
import {
  insertControlPg,
  updateReparacionPg,
  liberarCocina,
  liberarTermo,
  DatosControlInsert,
  DatosReparacion,
} from '../repositories/controlWrite.repo';
import * as postgres from '../db/postgres';

jest.mock('../db/postgres');

const mPg = postgres as jest.Mocked<typeof postgres>;

function mockClient(): jest.Mocked<PoolClient> {
  return { query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }) } as unknown as jest.Mocked<PoolClient>;
}

const datosCompletos: DatosControlInsert = {
  id: 'id-1',
  puestocontrol_id: 'p1',
  puestocontrol_n: 'Control eléctrico',
  controlador_empleado_id: 'e1',
  controlador_empleado_n: 'Op1',
  controlador_estado: true,
  controlador_falla_id: 'f1',
  controlador_falla_n: 'Falla A',
  secundario_empleado_id: 'e2',
  secundario_empleado_n: 'Op2',
  etiqueta: 220011,
  barral: 'B123',
  etiqueta_asociada: 'assoc-1',
};

const datosMinimos: DatosControlInsert = {
  id: 'id-2',
  puestocontrol_id: 'p1',
  puestocontrol_n: 'Control eléctrico',
  controlador_empleado_id: 'e1',
  controlador_empleado_n: 'Op1',
  controlador_estado: true,
  secundario_empleado_id: 'e2',
  secundario_empleado_n: 'Op2',
};

describe('insertControlPg', () => {
  test('sin client -> pgQuery con params en orden', async () => {
    await insertControlPg(datosCompletos);

    expect(mPg.pgQuery).toHaveBeenCalledTimes(1);
    const [, params] = mPg.pgQuery.mock.calls[0];
    expect(params).toEqual([
      'id-1',
      'p1',
      'Control eléctrico',
      'e1',
      'Op1',
      true,
      'f1',
      'Falla A',
      'e2',
      'Op2',
      220011,
      'B123',
      'assoc-1',
    ]);
  });

  test('sin client, campos opcionales ausentes -> defaults null', async () => {
    await insertControlPg(datosMinimos);

    const [, params] = mPg.pgQuery.mock.calls[0];
    expect(params).toEqual([
      'id-2',
      'p1',
      'Control eléctrico',
      'e1',
      'Op1',
      true,
      null,
      null,
      'e2',
      'Op2',
      null,
      null,
      null,
    ]);
  });

  test('con client -> usa client.query en vez de pgQuery', async () => {
    const client = mockClient();

    await insertControlPg(datosCompletos, client);

    expect(client.query).toHaveBeenCalledTimes(1);
    expect(mPg.pgQuery).not.toHaveBeenCalled();
  });
});

describe('updateReparacionPg', () => {
  const datos: DatosReparacion = {
    id: 'reg1',
    reparador_empleado_id: 'e3',
    reparador_empleado_n: 'Op3',
    reparador_falla_id: 'n3a',
    reparador_falla_n: 'Repara X',
  };

  test('sin client -> pgQuery con params en orden', async () => {
    await updateReparacionPg(datos);

    expect(mPg.pgQuery).toHaveBeenCalledTimes(1);
    const [, params] = mPg.pgQuery.mock.calls[0];
    expect(params).toEqual(['reg1', 'e3', 'Op3', 'n3a', 'Repara X']);
  });

  test('con client -> usa client.query en vez de pgQuery', async () => {
    const client = mockClient();

    await updateReparacionPg(datos, client);

    expect(client.query).toHaveBeenCalledTimes(1);
    expect(mPg.pgQuery).not.toHaveBeenCalled();
  });
});

describe('liberarCocina / liberarTermo', () => {
  test('liberarCocina llama con el numero correcto', async () => {
    await liberarCocina(1456778);

    expect(mPg.pgQuery).toHaveBeenCalledWith(expect.any(String), [1456778]);
  });

  test('liberarCocina con client -> usa client.query', async () => {
    const client = mockClient();

    await liberarCocina(1456778, client);

    expect(client.query).toHaveBeenCalledWith(expect.any(String), [1456778]);
    expect(mPg.pgQuery).not.toHaveBeenCalled();
  });

  test('liberarTermo llama con el numero correcto', async () => {
    await liberarTermo(220011);

    expect(mPg.pgQuery).toHaveBeenCalledWith(expect.any(String), [220011]);
  });
});
