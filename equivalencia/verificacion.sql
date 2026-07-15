-- Inspección del último registro generado para una etiqueta (parametrizar :et)
-- Uso: psql ... -v et=220011 -f verificacion.sql

SELECT id, etiqueta, etiqueta_asociada, barral, puestocontrol_n,
       controlador_estado, controlador_falla_n,
       reparador_estado, reparador_falla_n,
       controlador_empleado_n, secundario_empleado_n,
       controlador_fechahora, reparador_fechahora
FROM aux_controlcalidad
WHERE etiqueta = :et
ORDER BY controlador_fechahora DESC
LIMIT 5;

-- Comparar columnas de negocio entre dos etiquetas (Delphi vs API),
-- ignorando id y timestamps:
-- \set delphi 111111
-- \set api    222222
-- SELECT puestocontrol_n, controlador_estado, controlador_falla_n,
--        reparador_estado, reparador_falla_n, barral, etiqueta_asociada
-- FROM aux_controlcalidad WHERE etiqueta IN (:delphi, :api)
-- ORDER BY etiqueta, puestocontrol_n;

-- Verificar liberación en Control Final (COCINA):
-- SELECT numero, paso_lector, fecha_paso_lector FROM etiquetas_maestro_cocinas WHERE numero = :et;
