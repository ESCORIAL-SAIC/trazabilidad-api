import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, BusinessError } from '../middleware/errors';
import {
  registrarOk,
  registrarFalla,
  registrarReparacion,
} from '../services/control.service';
import { buscarBarral, validarFrontal } from '../repositories/etiqueta.repo';

export const controlRouter = Router();

const empleadoSchema = z.object({ id: z.string().uuid(), nombre: z.string() });
const puestoSchema = z.object({
  id: z.string().uuid(),
  nombre: z.string(),
  c: z.coerce.number().int(),
});

/** POST /control/ok */
controlRouter.post(
  '/ok',
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        etiqueta: z.coerce.number().int(),
        tipoProducto: z.string().min(1),
        productoId: z.string().uuid(),
        puesto: puestoSchema,
        controlador: empleadoSchema,
        secundario: empleadoSchema,
        barral: z.string().optional(),
      })
      .parse(req.body);
    res.json(await registrarOk(body));
  }),
);

/** POST /control/falla  (controlador registra falla Nivel 1) */
controlRouter.post(
  '/falla',
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        etiqueta: z.coerce.number().int(),
        puesto: puestoSchema,
        controlador: empleadoSchema,
        secundario: empleadoSchema,
        nivel1: z.object({ id: z.string().uuid(), nombre: z.string() }),
        barral: z.string().optional(),
      })
      .parse(req.body);
    res.json(await registrarFalla(body));
  }),
);

/** POST /control/reparacion  (reparador registra reparación Nivel 3) */
controlRouter.post(
  '/reparacion',
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        registroId: z.string().uuid(),
        etiqueta: z.coerce.number().int(),
        tipoProducto: z.string().min(1),
        puestoNombre: z.string(),
        reparador: empleadoSchema,
        nivel3: z.object({ id: z.string().uuid(), nombre: z.string() }),
      })
      .parse(req.body);
    res.json(await registrarReparacion(body));
  }),
);

/** POST /barral/validar */
controlRouter.post(
  '/barral/validar',
  asyncHandler(async (req, res) => {
    const serie = z.string().min(1).parse(req.body?.serie);
    const valido = await buscarBarral(serie);
    if (!valido) {
      throw new BusinessError(`Etiqueta Barral N° ${serie} no válida. Reintente nuevamente.`);
    }
    res.json({ valido: true });
  }),
);

/** POST /frontal/validar */
controlRouter.post(
  '/frontal/validar',
  asyncHandler(async (req, res) => {
    const body = z
      .object({ codigoBarras: z.string().min(1), productoId: z.string().uuid() })
      .parse(req.body);
    const valido = await validarFrontal(body.codigoBarras, body.productoId);
    if (!valido) {
      throw new BusinessError(
        `La grafica pickeada no coincide con el producto. Codigo leido: ${body.codigoBarras}.`,
      );
    }
    res.json({ valido: true });
  }),
);
