import { Router } from 'express';
import { z } from 'zod';
import { buscarEmpleado } from '../repositories/empleado.repo';
import { asyncHandler } from '../middleware/errors';

export const authRouter = Router();

const loginSchema = z.object({
  usuario1: z.string().min(1),
  password1: z.string(),
  usuario2: z.string().optional().default(''),
  password2: z.string().optional().default(''),
});

/**
 * POST /auth/login
 * Replica la lógica de UnitIngreso.ButtonIngresarClick + UsuarioValido:
 *  - Operario 1 obligatorio.
 *  - Operario 2 opcional; si viene, debe ser válido.
 *  - Si operario 2 está vacío, el operario 1 actúa también como secundario.
 */
authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const body = loginSchema.parse(req.body);

    const emp1 = await buscarEmpleado(body.usuario1, body.password1);
    if (!emp1) {
      res
        .status(401)
        .json({ valido: false, error: 'Datos de acceso incorrectos. Vuelva a intentarlo.' });
      return;
    }

    let emp2 = emp1; // por defecto, secundario = principal (caso operario 2 vacío)
    if (body.usuario2 && body.usuario2 !== '') {
      const candidato = await buscarEmpleado(body.usuario2, body.password2);
      if (!candidato) {
        res
          .status(401)
          .json({ valido: false, error: 'Datos de acceso incorrectos. Vuelva a intentarlo.' });
        return;
      }
      emp2 = candidato;
    }

    res.json({ valido: true, empleado1: emp1, empleado2: emp2 });
  }),
);
