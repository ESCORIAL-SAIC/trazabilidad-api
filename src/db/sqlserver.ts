import sql, { ConnectionPool, IResult } from 'mssql';
import { getPlantaConfig } from '../config/plantas';
import { plantaActual } from '../context/plantaContext';

/** Un pool SQL Server por planta (lazy). Espejo "LOCAL" (QueryEstadoLocal). */
const poolPromises = new Map<string, Promise<ConnectionPool>>();

export function getMssqlPool(planta: string = plantaActual()): Promise<ConnectionPool> {
  let p = poolPromises.get(planta);
  if (!p) {
    const cfg = getPlantaConfig(planta).mssql;
    const config: sql.config = {
      server: cfg.host,
      port: cfg.port,
      database: cfg.database,
      user: cfg.user,
      password: cfg.password,
      // Timeouts cortos para que un espejo caído no cuelgue la operación principal.
      // connectionTimeout: detecta rapido un espejo caido.
      // requestTimeout alto: el UPDATE/INSERT puede tardar mientras no haya indice
      // en aux_controlcalidad(id) (ver db/indices_sqlserver.sql).
      connectionTimeout: cfg.connectionTimeout ?? 15000,
      requestTimeout: cfg.requestTimeout ?? 30000,
      options: {
        encrypt: cfg.encrypt ?? false,
        trustServerCertificate: cfg.trustServerCertificate ?? true,
      },
      pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
    };
    p = new sql.ConnectionPool(config)
      .connect()
      .then((pool) => {
        console.log(`[mssql:${planta}] conectado al espejo SQL Server`);
        return pool;
      })
      .catch((err) => {
        poolPromises.delete(planta);
        throw err;
      });
    poolPromises.set(planta, p);
  }
  return p;
}

export async function mssqlQuery<T = unknown>(
  text: string,
  params: unknown[] = [],
): Promise<IResult<T>> {
  const pool = await getMssqlPool();
  const request = pool.request();
  params.forEach((value, i) => request.input(`p${i}`, value));
  return request.query<T>(text);
}

export { sql };
