import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth.routes';
import { catalogosRouter } from './routes/catalogos.routes';
import { etiquetasRouter } from './routes/etiquetas.routes';
import { scanRouter } from './routes/scan.routes';
import { controlRouter } from './routes/control.routes';
import { plantasRouter } from './routes/plantas.routes';
import { errorHandler } from './middleware/errors';
import { plantaMiddleware } from './middleware/planta';
import { requestLogger } from './middleware/logger';
import { pgPool } from './db/postgres';
import { plantaActual } from './context/plantaContext';
import { env } from './config/env';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Loguea en consola todas las llamadas (entrada y salida).
  app.use(requestLogger);

  // --- Rutas sin contexto de planta (antes de plantaMiddleware) ---

  // Lista de plantas.
  app.use('/plantas', plantasRouter);

  // Versión de la app (inyectada por el build de Docker; ver env.appVersion).
  app.get('/version', (_req, res) => {
    res.json({ name: 'trazabilidad-api', version: env.appVersion });
  });

  // Liveness: el proceso está vivo. NO toca dependencias (DB, etc.); siempre 200.
  app.get('/health/live', (_req, res) => {
    res.json({ status: 'ok', version: env.appVersion });
  });

  // A partir de aca, cada request opera en el contexto de una planta.
  app.use(plantaMiddleware);

  // Readiness: ¿puede la API atender tráfico? Chequea la base con la que se conecta
  // (PostgreSQL de la planta activa). 503 si la DB no responde.
  const readiness = async (_req: express.Request, res: express.Response) => {
    const check = { name: 'postgres', status: 'up', description: `planta ${plantaActual()}` };
    try {
      await pgPool().query('SELECT 1');
      res.json({ status: 'ok', version: env.appVersion, checks: [check] });
    } catch (err) {
      check.status = 'down';
      check.description = err instanceof Error ? err.message : String(err);
      res.status(503).json({ status: 'degraded', version: env.appVersion, checks: [check] });
    }
  };

  app.get('/health/ready', readiness);
  // Alias histórico: clientes/monitores que ya consumen /health siguen funcionando.
  app.get('/health', readiness);

  app.use('/auth', authRouter);
  app.use('/', catalogosRouter);
  app.use('/etiquetas', etiquetasRouter);
  app.use('/scan', scanRouter);
  app.use('/control', controlRouter);

  app.use(errorHandler);
  return app;
}
