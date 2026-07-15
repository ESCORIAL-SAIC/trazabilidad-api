import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { getPlantaConfig } from '../config/plantas';
import { plantaActual } from '../context/plantaContext';

/** Un pool PostgreSQL por planta (lazy). Reemplaza FDConnection del Delphi. */
const pools = new Map<string, Pool>();

function poolDe(planta: string): Pool {
  let pool = pools.get(planta);
  if (!pool) {
    const cfg = getPlantaConfig(planta).pg;
    pool = new Pool({
      host: cfg.host,
      port: cfg.port,
      database: cfg.database,
      user: cfg.user,
      password: cfg.password,
      connectionTimeoutMillis: cfg.connectionTimeoutMillis ?? 60000,
      max: 10,
    });
    pool.on('error', (err) => console.error(`[pg:${planta}] error en cliente inactivo:`, err.message));
    pools.set(planta, pool);
  }
  return pool;
}

/** Pool de la planta activa (segun el contexto del request). */
export function pgPool(): Pool {
  return poolDe(plantaActual());
}

export async function pgQuery<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<QueryResult<T>> {
  return pgPool().query<T>(text, params as never[]);
}

export async function pgTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pgPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
