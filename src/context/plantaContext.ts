import { AsyncLocalStorage } from 'async_hooks';
import { plantaDefault } from '../config/plantas';

/**
 * Lleva la planta activa por request sin tener que pasarla por cada funcion.
 * El middleware setea la planta (header X-Planta) y los pools de DB la leen.
 */
const storage = new AsyncLocalStorage<string>();

export function runConPlanta<T>(planta: string, fn: () => T): T {
  return storage.run(planta, fn);
}

export function plantaActual(): string {
  return storage.getStore() ?? plantaDefault();
}
