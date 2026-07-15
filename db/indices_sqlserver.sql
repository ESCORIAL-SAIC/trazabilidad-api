-- ════════════════════════════════════════════════════════════════════
-- Performance del espejo SQL Server (base "Etiquetas")
-- El UPDATE/SELECT por id en aux_controlcalidad tarda varios segundos
-- porque NO hay indice en la columna id (escaneo de toda la tabla).
-- Este indice lo baja a milisegundos.
-- ════════════════════════════════════════════════════════════════════

USE Etiquetas;
GO

-- 1) Ver si ya existe un indice sobre id
SELECT i.name, i.type_desc
FROM sys.indexes i
JOIN sys.objects o ON o.object_id = i.object_id
WHERE o.name = 'aux_controlcalidad';
GO

-- 2) Cuantas filas tiene (para dimensionar)
SELECT COUNT(*) AS filas FROM dbo.aux_controlcalidad;
GO

-- 3) Crear el indice por id (clave de los UPDATE de reparacion)
CREATE NONCLUSTERED INDEX IX_aux_controlcalidad_id
    ON dbo.aux_controlcalidad (id);
GO

-- 4) (Opcional) indice por etiqueta, util si se hacen lecturas del espejo
CREATE NONCLUSTERED INDEX IX_aux_controlcalidad_etiqueta
    ON dbo.aux_controlcalidad (etiqueta);
GO

-- Tras crear el indice, el UPDATE por id debe tardar < 50 ms.
