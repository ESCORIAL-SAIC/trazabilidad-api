import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

/** Error de negocio con mensaje destinado al usuario (equivalente a los MessageDialog de Delphi). */
export class BusinessError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = 'BusinessError';
  }
}

/** Envuelve handlers async para propagar errores al middleware. */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    res.status(422).json({ error: 'Datos inválidos', detalles: err.issues });
    return;
  }
  if (err instanceof BusinessError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  const message = err instanceof Error ? err.message : 'Error interno';
  console.error('[error]', err);
  res.status(500).json({ error: 'Error interno del servidor', detalle: message });
}
