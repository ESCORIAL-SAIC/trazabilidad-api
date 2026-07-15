-- ════════════════════════════════════════════════════════════════════
-- FASE 0 — Extracción de esquema PostgreSQL (base "ESCORIAL")
-- Ejecutar en la base PostgreSQL y enviar el resultado.
-- Objetivo: conocer columnas y tipos reales para tipar la API.
-- ════════════════════════════════════════════════════════════════════

-- 1) Columnas y tipos de todas las vistas/tablas que usa la app.
SELECT
    c.table_name,
    c.ordinal_position,
    c.column_name,
    c.data_type,
    c.character_maximum_length,
    c.is_nullable
FROM information_schema.columns c
WHERE lower(c.table_name) IN (
    'vp_aplicaciones_empleado',
    'vp_menufallas_puestocontrol_v1',
    'vp_menufallas_controlador_v1',
    'vp_menufallas_v1',
    'vp_etiquetas_todos',
    'vp_etiquetas_barrales',
    'vp_producto_frontal',
    'aux_controlcalidad',
    'etiquetas_maestro_cocinas',
    'etiquetas_maestro_termotanques'
)
ORDER BY c.table_name, c.ordinal_position;

-- 2) Definición de las vistas (para entender de dónde sale cada campo).
SELECT table_name, view_definition
FROM information_schema.views
WHERE lower(table_name) IN (
    'vp_aplicaciones_empleado',
    'vp_menufallas_puestocontrol_v1',
    'vp_menufallas_controlador_v1',
    'vp_menufallas_v1',
    'vp_etiquetas_todos',
    'vp_etiquetas_barrales',
    'vp_producto_frontal'
);

-- 3) Muestras pequeñas (1-3 filas) para ver formato de datos reales.
--    Descomentar y ejecutar con cuidado (puede traer datos sensibles).
-- SELECT * FROM vp_menufallas_puestocontrol_v1 LIMIT 3;
-- SELECT * FROM aux_controlcalidad ORDER BY controlador_fechahora DESC LIMIT 3;
-- SELECT numero, tipo, color, producto_n, producto_id FROM vp_etiquetas_todos LIMIT 3;

-- 4) Restricciones / PK de la tabla escribible principal.
SELECT tc.constraint_type, kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE lower(tc.table_name) = 'aux_controlcalidad';
