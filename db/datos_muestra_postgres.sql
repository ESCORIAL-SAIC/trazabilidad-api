-- ════════════════════════════════════════════════════════════════════
-- Datos de MUESTRA para validar la maquina de estados (paridad exacta).
-- Solo lecturas. Ejecutar en PostgreSQL ESCORIAL y enviar resultados.
-- ════════════════════════════════════════════════════════════════════

-- 1) CRITICO: puestos por tipo, con su numero de orden (puestocontrol_c).
--    Permite verificar que c es 0..n contiguo y que "Reparador" = 0.
SELECT tipo, puestocontrol_c, puestocontrol_n
FROM vp_menufallas_puestocontrol_v1
ORDER BY tipo, puestocontrol_c::int;

-- 2) Tipos de producto reales (confirmar normalizacion COCINA/TERMOTANQUE/etc).
SELECT DISTINCT tipo FROM vp_etiquetas_todos ORDER BY 1;

-- 3) Formato del color (confirmar que es #RRGGBB). 5 ejemplos.
SELECT DISTINCT color FROM vp_etiquetas_todos WHERE color IS NOT NULL LIMIT 5;

-- 4) Multiplanta: valores de planta en empleados (para decidir si la API
--    debe filtrar por planta o apuntar a distinto servidor).
SELECT DISTINCT planta FROM vp_aplicaciones_empleado ORDER BY 1;

-- 5) Un par de registros reales de aux_controlcalidad para ver formato
--    (sobre todo etiqueta_asociada y barral). Anonimizar si hace falta.
SELECT id, etiqueta, etiqueta_asociada, barral, puestocontrol_n,
       controlador_estado, controlador_falla_id, reparador_estado, reparador_falla_id
FROM aux_controlcalidad
ORDER BY controlador_fechahora DESC
LIMIT 5;

-- 6) ¿vp_aplicaciones_empleado es tabla, vista o matview? (view_definition vino null)
SELECT relname, relkind  -- r=tabla, v=vista, m=matview
FROM pg_class
WHERE relname = 'vp_aplicaciones_empleado';
