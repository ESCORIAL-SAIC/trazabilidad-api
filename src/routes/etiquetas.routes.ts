import { Router } from 'express';
import { z } from 'zod';
import { buscarEtiqueta } from '../repositories/etiqueta.repo';
import {
  estadoPorEtiqueta,
  estadoPorEtiquetaAsociada,
} from '../repositories/estado.repo';
import { asyncHandler, BusinessError } from '../middleware/errors';

export const etiquetasRouter = Router();

const numeroParam = z.coerce.number().int();

/** GET /etiquetas/:numero?tipo=COCINA  (QueryEtiqueta) */
etiquetasRouter.get(
  '/:numero',
  asyncHandler(async (req, res) => {
    const numero = numeroParam.parse(req.params.numero);
    const tipo = z.string().min(1).parse(req.query.tipo);
    const etiqueta = await buscarEtiqueta(numero, tipo);
    if (!etiqueta) {
      throw new BusinessError(
        `Etiqueta N° ${numero} no válida. Reintente nuevamente.`,
        404,
      );
    }
    res.json(etiqueta);
  }),
);

/** GET /etiquetas/:numero/estado  (QueryEstado) */
etiquetasRouter.get(
  '/:numero/estado',
  asyncHandler(async (req, res) => {
    const numero = numeroParam.parse(req.params.numero);
    res.json(await estadoPorEtiqueta(numero));
  }),
);

/** GET /etiquetas/:numero/estado-asociada  (QueryEstado_Asociada) */
etiquetasRouter.get(
  '/:numero/estado-asociada',
  asyncHandler(async (req, res) => {
    const numero = numeroParam.parse(req.params.numero);
    res.json(await estadoPorEtiquetaAsociada(numero));
  }),
);
