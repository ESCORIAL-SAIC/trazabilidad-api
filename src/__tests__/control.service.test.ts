import {
  registrarOk,
  registrarFalla,
  registrarReparacion,
} from '../services/control.service';
import * as guid from '../db/guid';
import * as estadoRepo from '../repositories/estado.repo';
import * as etiquetaRepo from '../repositories/etiqueta.repo';
import * as writeRepo from '../repositories/controlWrite.repo';
import * as mirrorRepo from '../repositories/controlMirror.repo';
import { env } from '../config/env';

jest.mock('../db/guid');
jest.mock('../repositories/estado.repo');
jest.mock('../repositories/etiqueta.repo');
jest.mock('../repositories/controlWrite.repo');
jest.mock('../repositories/controlMirror.repo');
jest.mock('../config/env', () => ({
  env: {
    mirrorEnabled: false,
    mirrorWriteMode: 'strict',
    liberacion: { cocinaEnabled: true, termoEnabled: false },
  },
}));

const mGuid = guid as jest.Mocked<typeof guid>;
const mEstado = estadoRepo as jest.Mocked<typeof estadoRepo>;
const mEtiqueta = etiquetaRepo as jest.Mocked<typeof etiquetaRepo>;
const mWrite = writeRepo as jest.Mocked<typeof writeRepo>;
const mMirror = mirrorRepo as jest.Mocked<typeof mirrorRepo>;

const emp = { id: 'e1', nombre: 'Op1' };
const emp2 = { id: 'e2', nombre: 'Op2' };

beforeEach(() => {
  mGuid.nuevoGuid.mockResolvedValue('NEW-GUID');
  mEstado.estadoPorEtiqueta.mockResolvedValue([]); // sin duplicados por defecto
  env.mirrorEnabled = false;
  env.mirrorWriteMode = 'strict';
  env.liberacion.cocinaEnabled = true;
  env.liberacion.termoEnabled = false;
});

test('OK en puesto normal -> INSERT con controlador_estado true y etiqueta', async () => {
  const res = await registrarOk({
    etiqueta: 220011,
    tipoProducto: 'TERMOTANQUE',
    productoId: 'prod',
    puesto: { id: 't1', nombre: 'Control eléctrico', c: 1 },
    controlador: emp,
    secundario: emp2,
  });
  expect(res.liberado).toBe(false);
  expect(mWrite.insertControlPg).toHaveBeenCalledTimes(1);
  const datos = mWrite.insertControlPg.mock.calls[0][0];
  expect(datos.controlador_estado).toBe(true);
  expect(datos.etiqueta).toBe(220011);
  expect(datos.barral).toBeNull();
});

test('OK en Control Final (COCINA) válido -> libera y mensaje LIBERADO', async () => {
  mEtiqueta.validarFrontal.mockResolvedValue(true);
  const res = await registrarOk({
    etiqueta: 1456778,
    tipoProducto: 'COCINA',
    productoId: 'prod',
    puesto: { id: 'p3', nombre: 'Control Final', c: 3 },
    controlador: emp,
    secundario: emp2,
    barral: 'CB123',
  });
  expect(mEtiqueta.validarFrontal).toHaveBeenCalledWith('CB123', 'prod');
  expect(mWrite.liberarCocina).toHaveBeenCalledWith(1456778);
  expect(res.liberado).toBe(true);
  expect(res.mensaje).toBe('Producto LIBERADO.');
});

test('OK Control Final sin código frontal -> error', async () => {
  await expect(
    registrarOk({
      etiqueta: 1456778, tipoProducto: 'COCINA', productoId: 'prod',
      puesto: { id: 'p3', nombre: 'Control Final', c: 3 },
      controlador: emp, secundario: emp2, barral: '',
    }),
  ).rejects.toThrow('Codigo frontal no ingresado.');
});

test('OK con barral inválido -> error', async () => {
  mEtiqueta.buscarBarral.mockResolvedValue(false);
  await expect(
    registrarOk({
      etiqueta: 1456778, tipoProducto: 'COCINA', productoId: 'prod',
      puesto: { id: 'pAteq', nombre: 'ATEQ', c: 1 },
      controlador: emp, secundario: emp2, barral: 'B999',
    }),
  ).rejects.toThrow(/no válida/);
});

test('OK en ATEQ -> etiqueta null y etiqueta_asociada = numero (string)', async () => {
  mEtiqueta.buscarBarral.mockResolvedValue(true);
  await registrarOk({
    etiqueta: 1456778, tipoProducto: 'COCINA', productoId: 'prod',
    puesto: { id: 'pAteq', nombre: 'ATEQ', c: 1 },
    controlador: emp, secundario: emp2, barral: 'B123',
  });
  const datos = mWrite.insertControlPg.mock.calls[0][0];
  expect(datos.etiqueta).toBeNull();
  expect(datos.etiqueta_asociada).toBe('1456778');
  expect(datos.barral).toBe('B123');
});

test('duplicado en el mismo puesto -> error', async () => {
  mEstado.estadoPorEtiqueta.mockResolvedValue([
    { puestocontrol_id: 't1' } as never,
  ]);
  await expect(
    registrarOk({
      etiqueta: 220011, tipoProducto: 'TERMOTANQUE', productoId: 'prod',
      puesto: { id: 't1', nombre: 'Control eléctrico', c: 1 },
      controlador: emp, secundario: emp2,
    }),
  ).rejects.toThrow(/ya cuenta con registro/);
});

test('Falla del controlador -> INSERT con estado false y falla Nivel1', async () => {
  await registrarFalla({
    etiqueta: 220011,
    puesto: { id: 't1', nombre: 'Control eléctrico', c: 1 },
    controlador: emp, secundario: emp2,
    nivel1: { id: 'n1a', nombre: 'Falla A' },
  });
  const datos = mWrite.insertControlPg.mock.calls[0][0];
  expect(datos.controlador_estado).toBe(false);
  expect(datos.controlador_falla_id).toBe('n1a');
  expect(datos.controlador_falla_n).toBe('Falla A');
});

test('Reparación -> UPDATE Nivel3 y mensaje COCINA', async () => {
  const res = await registrarReparacion({
    registroId: 'reg1',
    etiqueta: 1456778,
    tipoProducto: 'COCINA',
    puestoNombre: 'Control de Retencion de hornalla y encedido electrico',
    reparador: emp,
    nivel3: { id: 'n3a', nombre: 'Repara X' },
  });
  expect(mWrite.updateReparacionPg).toHaveBeenCalledTimes(1);
  const datos = mWrite.updateReparacionPg.mock.calls[0][0];
  expect(datos.id).toBe('reg1');
  expect(datos.reparador_falla_id).toBe('n3a');
  expect(res.mensaje).toContain('re controlar');
});

test('registrarFalla en puesto Fuga -> camposPorPuesto se aplica igual que en puesto normal', async () => {
  await registrarFalla({
    etiqueta: 1456778,
    puesto: { id: 'p1', nombre: 'Control de Fuga y retencion de horno', c: 1 },
    controlador: emp, secundario: emp2,
    nivel1: { id: 'n1a', nombre: 'Falla A' },
    barral: 'BARRAL-X',
  });
  const datos = mWrite.insertControlPg.mock.calls[0][0];
  expect(datos.etiqueta).toBe(1456778);
  expect(datos.barral).toBe('BARRAL-X');
  expect(datos.etiqueta_asociada).toBeNull();
});

test('registrarFalla en ATEQ -> camposPorPuesto se aplica igual que en registrarOk', async () => {
  await registrarFalla({
    etiqueta: 1456778,
    puesto: { id: 'pAteq', nombre: 'ATEQ', c: 2 },
    controlador: emp, secundario: emp2,
    nivel1: { id: 'n1a', nombre: 'Falla A' },
    barral: 'B123',
  });
  const datos = mWrite.insertControlPg.mock.calls[0][0];
  expect(datos.etiqueta).toBeNull();
  expect(datos.etiqueta_asociada).toBe('1456778');
  expect(datos.barral).toBe('B123');
});

test('registrarFalla en Control Final -> camposPorPuesto se aplica igual que en puesto normal', async () => {
  await registrarFalla({
    etiqueta: 1456778,
    puesto: { id: 'p3', nombre: 'Control Final', c: 3 },
    controlador: emp, secundario: emp2,
    nivel1: { id: 'n1a', nombre: 'Falla A' },
    barral: 'CB123',
  });
  const datos = mWrite.insertControlPg.mock.calls[0][0];
  expect(datos.etiqueta).toBe(1456778);
  expect(datos.barral).toBe('CB123');
  expect(datos.etiqueta_asociada).toBeNull();
});

describe('espejo SQL Server (MIRROR_ENABLED)', () => {
  test('MIRROR_ENABLED=true -> llama a insertControlMirror', async () => {
    env.mirrorEnabled = true;
    mMirror.insertControlMirror.mockResolvedValue(undefined);

    await registrarOk({
      etiqueta: 220011,
      tipoProducto: 'TERMOTANQUE',
      productoId: 'prod',
      puesto: { id: 't1', nombre: 'Control eléctrico', c: 1 },
      controlador: emp,
      secundario: emp2,
    });

    expect(mMirror.insertControlMirror).toHaveBeenCalledTimes(1);
  });

  test('modo strict + mirror falla -> el error se propaga', async () => {
    env.mirrorEnabled = true;
    env.mirrorWriteMode = 'strict';
    mMirror.insertControlMirror.mockRejectedValue(new Error('espejo caído'));

    await expect(
      registrarOk({
        etiqueta: 220011,
        tipoProducto: 'TERMOTANQUE',
        productoId: 'prod',
        puesto: { id: 't1', nombre: 'Control eléctrico', c: 1 },
        controlador: emp,
        secundario: emp2,
      }),
    ).rejects.toThrow('espejo caído');
  });

  test('modo lenient + mirror falla -> se traga el error (solo warning) y devuelve éxito', async () => {
    env.mirrorEnabled = true;
    env.mirrorWriteMode = 'lenient';
    mMirror.insertControlMirror.mockRejectedValue(new Error('espejo caído'));
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    const res = await registrarOk({
      etiqueta: 220011,
      tipoProducto: 'TERMOTANQUE',
      productoId: 'prod',
      puesto: { id: 't1', nombre: 'Control eléctrico', c: 1 },
      controlador: emp,
      secundario: emp2,
    });

    expect(res.liberado).toBe(false);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

describe('liberación en Control Final', () => {
  test('registrarReparacion en Control Final + COCINA con cocinaEnabled=true -> llama liberarCocina', async () => {
    env.liberacion.cocinaEnabled = true;

    await registrarReparacion({
      registroId: 'reg1',
      etiqueta: 1456778,
      tipoProducto: 'COCINA',
      puestoNombre: 'Control Final',
      reparador: emp,
      nivel3: { id: 'n3a', nombre: 'Repara X' },
    });

    expect(mWrite.liberarCocina).toHaveBeenCalledWith(1456778);
  });

  test('registrarReparacion en Control Final + COCINA con cocinaEnabled=false -> no llama liberarCocina', async () => {
    env.liberacion.cocinaEnabled = false;

    await registrarReparacion({
      registroId: 'reg1',
      etiqueta: 1456778,
      tipoProducto: 'COCINA',
      puestoNombre: 'Control Final',
      reparador: emp,
      nivel3: { id: 'n3a', nombre: 'Repara X' },
    });

    expect(mWrite.liberarCocina).not.toHaveBeenCalled();
  });

  test('registrarReparacion con tipoProducto !== COCINA -> mensaje es undefined', async () => {
    const res = await registrarReparacion({
      registroId: 'reg1',
      etiqueta: 220011,
      tipoProducto: 'TERMOTANQUE',
      puestoNombre: 'Control eléctrico',
      reparador: emp,
      nivel3: { id: 'n3a', nombre: 'Repara X' },
    });

    expect(res.mensaje).toBeUndefined();
  });

  test('registrarOk en Control Final con tipoProducto !== COCINA -> no pide gráfica frontal, liberado true sin liberarCocina', async () => {
    const res = await registrarOk({
      etiqueta: 220011,
      tipoProducto: 'TERMOTANQUE',
      productoId: 'prod',
      puesto: { id: 't2', nombre: 'Control Final', c: 2 },
      controlador: emp,
      secundario: emp2,
    });

    expect(res.liberado).toBe(true);
    expect(mEtiqueta.validarFrontal).not.toHaveBeenCalled();
    expect(mWrite.liberarCocina).not.toHaveBeenCalled();
  });
});
