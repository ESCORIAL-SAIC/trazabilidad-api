import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/errors';
import { resolverEscaneo } from '../services/resolver.service';

export const scanRouter = Router();

const resolverSchema = z.object({
  numero: z.coerce.number().int(),
  tipoProducto: z.string().min(1),
  tipoConfig: z.string().min(1),
  puestoConfigIndex: z.coerce.number().int(),
  puestoConfigNombre: z.string(),
  puestoConfigC: z.coerce.number().int(),
});

/**
 * POST /scan/resolver
 * Réplica de SearchEditButton1Click: decide qué pantalla mostrar
 * (controlador / reparador / estado) y con qué datos.
 */
scanRouter.post(
  '/resolver',
  asyncHandler(async (req, res) => {
    const input = resolverSchema.parse(req.body);
    res.json(await resolverEscaneo(input));
  }),
);
