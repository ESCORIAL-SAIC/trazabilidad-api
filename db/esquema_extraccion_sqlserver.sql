-- ════════════════════════════════════════════════════════════════════
-- FASE 0 — Extracción de esquema SQL Server (base "Etiquetas", espejo LOCAL)
-- Ejecutar en SQL Server y enviar el resultado.
-- Sólo nos interesa la tabla espejo aux_controlcalidad y las maestras
-- que se actualizan en Control Final.
-- ════════════════════════════════════════════════════════════════════

-- 1) Columnas y tipos de la tabla espejo y las maestras.
SELECT
    c.TABLE_NAME,
    c.ORDINAL_POSITION,
    c.COLUMN_NAME,
    c.DATA_TYPE,
    c.CHARACTER_MAXIMUM_LENGTH,
    c.IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS c
WHERE LOWER(c.TABLE_NAME) IN (
    'aux_controlcalidad',
    'etiquetas_maestro_cocinas',
    'etiquetas_maestro_termotanques'
)
ORDER BY c.TABLE_NAME, c.ORDINAL_POSITION;

-- 2) Verificar que las columnas de aux_controlcalidad coincidan con PostgreSQL
--    (nombres y semántica). Diferencias acá impactan la doble escritura.

-- 3) Muestra (descomentar si se desea):
-- SELECT TOP 3 * FROM aux_controlcalidad ORDER BY controlador_fechahora DESC;
