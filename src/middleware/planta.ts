import { NextFunction, Request, Response } from 'express';
import { existePlanta, plantaDefault } from '../config/plantas';
import { runConPlanta } from '../context/plantaContext';
import { BusinessError } from './errors';

/**
 * Resuelve la planta del request (header "X-Planta") y la fija en el contexto
 * para que los pools de DB usen la conexion correcta. Si no viene header, usa
 * la planta default del registro.
 */
export function plantaMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const header = (req.header('X-Planta') ?? '').trim();
  const planta = header === '' ? plantaDefault() : header;
  if (!existePlanta(planta)) {
    throw new BusinessError(`Planta desconocida: "${planta}".`, 400);
  }
  runConPlanta(planta, () => next());
}
