import { Router } from 'express';
import { z } from 'zod';
import {
  listarPuestos,
  listarNivel1,
  listarNivel2,
  listarNivel3,
} from '../repositories/catalogos.repo';
import { asyncHandler, BusinessError } from '../middleware/errors';

export const catalogosRouter = Router();

/** GET /puestos?tipo=COCINA */
catalogosRouter.get(
  '/puestos',
  asyncHandler(async (req, res) => {
    const tipo = z.string().min(1).parse(req.query.tipo);
    res.json(await listarPuestos(tipo));
  }),
);

/** GET /fallas/nivel1?puesto=...&tipo=... */
catalogosRouter.get(
  '/fallas/nivel1',
  asyncHandler(async (req, res) => {
    const puesto = req.query.puesto;
    const tipo = req.query.tipo;
    if (typeof puesto !== 'string' || typeof tipo !== 'string') {
      throw new BusinessError('Parámetros "puesto" y "tipo" requeridos', 422);
    }
    res.json(await listarNivel1(puesto, tipo));
  }),
);

/** GET /fallas/nivel2?nivel1Id=... */
catalogosRouter.get(
  '/fallas/nivel2',
  asyncHandler(async (req, res) => {
    const nivel1Id = z.string().min(1).parse(req.query.nivel1Id);
    res.json(await listarNivel2(nivel1Id));
  }),
);

/** GET /fallas/nivel3?nivel2Id=... */
catalogosRouter.get(
  '/fallas/nivel3',
  asyncHandler(async (req, res) => {
    const nivel2Id = z.string().min(1).parse(req.query.nivel2Id);
    res.json(await listarNivel3(nivel2Id));
  }),
);
