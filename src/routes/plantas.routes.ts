import { Router } from 'express';
import { listarPlantas } from '../config/plantas';
import { asyncHandler } from '../middleware/errors';

export const plantasRouter = Router();

/** GET /plantas — lista de plantas disponibles (para que la app elija). */
plantasRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json(listarPlantas());
  }),
);
