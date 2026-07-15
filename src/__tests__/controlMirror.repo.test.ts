import {
  insertControlMirror,
  updateReparacionMirror,
  mirrorDisponible,
} from '../repositories/controlMirror.repo';
import * as sqlserver from '../db/sqlserver';
import { DatosControlInsert, DatosReparacion } from '../repositories/controlWrite.repo';

jest.mock('../db/sqlserver');

const mSqlServer = sqlserver as jest.Mocked<typeof sqlserver>;

function mockRequest() {
  return {
    input: jest.fn(),
    query: jest.fn().mockResolvedValue({}),
  };
}

function mockPool(request: ReturnType<typeof mockRequest>) {
  return { request: jest.fn().mockReturnValue(request) } as never;
}

const datos: DatosControlInsert = {
  id: 'id-1',
  puestocontrol_id: 'p1',
  puestocontrol_n: 'ATEQ',
  controlador_empleado_id: 'e1',
  controlador_empleado_n: 'Op1',
  controlador_estado: true,
  secundario_empleado_id: 'e2',
  secundario_empleado_n: 'Op2',
  etiqueta: null, // ATEQ no setea etiqueta en PostgreSQL
  barral: 'B123',
  etiqueta_asociada: '1456778',
};

describe('insertControlMirror', () => {
  test('usa etiquetaReal (no d.etiqueta) para el input etiqueta', async () => {
    const request = mockRequest();
    mSqlServer.getMssqlPool.mockResolvedValue(mockPool(request));

    await insertControlMirror(datos, 1456778);

    const etiquetaCall = request.input.mock.calls.find((c) => c[0] === 'etiqueta');
    expect(etiquetaCall).toBeDefined();
    expect(etiquetaCall?.[2]).toBe(1456778);
    expect(etiquetaCall?.[2]).not.toBe(datos.etiqueta);
  });

  test('ejecuta el query de INSERT', async () => {
    const request = mockRequest();
    mSqlServer.getMssqlPool.mockResolvedValue(mockPool(request));

    await insertControlMirror(datos, 1456778);

    expect(request.query).toHaveBeenCalledTimes(1);
    expect(request.query.mock.calls[0][0]).toContain('INSERT INTO aux_controlcalidad');
  });
});

describe('updateReparacionMirror', () => {
  const reparacion: DatosReparacion = {
    id: 'reg1',
    reparador_empleado_id: 'e3',
    reparador_empleado_n: 'Op3',
    reparador_falla_id: 'n3a',
    reparador_falla_n: 'Repara X',
  };

  test('inputs correctos', async () => {
    const request = mockRequest();
    mSqlServer.getMssqlPool.mockResolvedValue(mockPool(request));

    await updateReparacionMirror(reparacion);

    const inputNames = request.input.mock.calls.map((c) => c[0]);
    expect(inputNames).toEqual([
      'id',
      'reparador_empleado_id',
      'reparador_empleado_n',
      'reparador_falla_id',
      'reparador_falla_n',
    ]);
    const inputValues = Object.fromEntries(request.input.mock.calls.map((c) => [c[0], c[2]]));
    expect(inputValues.id).toBe('reg1');
    expect(inputValues.reparador_falla_id).toBe('n3a');
  });
});

describe('mirrorDisponible', () => {
  test('mssqlQuery resuelve -> true', async () => {
    mSqlServer.mssqlQuery.mockResolvedValue({} as never);

    const r = await mirrorDisponible();

    expect(r).toBe(true);
  });

  test('mssqlQuery rechaza -> false, no propaga la excepción', async () => {
    mSqlServer.mssqlQuery.mockRejectedValue(new Error('conexión caída'));

    await expect(mirrorDisponible()).resolves.toBe(false);
  });
});
