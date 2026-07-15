import { NextFunction, Request, Response } from 'express';

/** Claves cuyo valor no debe imprimirse en el log. */
const CLAVES_SENSIBLES = ['password', 'password1', 'password2', 'pass'];

function redactar(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(redactar);
  if (obj && typeof obj === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      out[k] = CLAVES_SENSIBLES.includes(k.toLowerCase()) ? '***' : redactar(v);
    }
    return out;
  }
  return obj;
}

function hora(): string {
  return new Date().toLocaleTimeString('es-AR', { hour12: false }) +
    '.' + String(new Date().getMilliseconds()).padStart(3, '0');
}

/**
 * Loguea en consola cada llamada: entrada (método, ruta, planta, body)
 * y salida (status + duración en ms).
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const inicio = Date.now();
  const planta = req.header('X-Planta') ?? '-';

  // Entrada
  let linea = `→ ${hora()} ${req.method} ${req.originalUrl} [planta:${planta}]`;
  if (req.body && Object.keys(req.body).length > 0) {
    linea += ` body=${JSON.stringify(redactar(req.body))}`;
  }
  console.log(linea);

  // Salida (cuando termina la respuesta)
  res.on('finish', () => {
    const ms = Date.now() - inicio;
    const ico = res.statusCode >= 500 ? '✖' : res.statusCode >= 400 ? '⚠' : '←';
    console.log(`${ico} ${hora()} ${req.method} ${req.originalUrl} ${res.statusCode} (${ms}ms)`);
  });

  next();
}
