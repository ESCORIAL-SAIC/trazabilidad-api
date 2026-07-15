import { createApp } from './app';
import { env } from './config/env';
import { listarPlantas, plantaDefault } from './config/plantas';

const app = createApp();

app.listen(env.port, () => {
  console.log(`[trazabilidad-api] escuchando en http://0.0.0.0:${env.port}`);
  try {
    const plantas = listarPlantas().map((p) => p.id).join(', ');
    console.log(`[trazabilidad-api] plantas: ${plantas} (default: ${plantaDefault()})`);
  } catch (e) {
    console.error('[trazabilidad-api] ERROR cargando plantas:', e instanceof Error ? e.message : e);
  }
  console.log(`[trazabilidad-api] modo espejo: ${env.mirrorEnabled ? env.mirrorWriteMode : 'desactivado'}`);
});
