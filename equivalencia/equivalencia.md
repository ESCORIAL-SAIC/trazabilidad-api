# Pruebas de equivalencia (paridad con la app Delphi)

Objetivo: confirmar que, ante los mismos datos, la API genera en
`aux_controlcalidad` registros equivalentes a los que generaba la app Delphi.

Se hace sobre la base **TEST** (`<IP_BASE_TEST>`), NO producción.

## Cómo correrlo

1. La API debe estar levantada apuntando a TEST (plantas.config.json -> pg.host <IP_BASE_TEST>).
2. Tener `psql` disponible o usar el script SQL de verificación.
3. Procedimiento por cada caso:
   a. Elegir una etiqueta de prueba que esté en el puesto esperado.
   b. Ejecutar la operación por la API (curl/Postman) — ver ejemplos abajo.
   c. Ejecutar `verificacion.sql` para inspeccionar el último registro.
   d. Comparar contra el comportamiento de la app Delphi (mismo flujo).

## Casos a cubrir (matriz)

| # | Caso | Endpoint | Qué verificar en aux_controlcalidad |
|---|------|----------|--------------------------------------|
| 1 | Control OK puesto normal | POST /control/ok | controlador_estado=true, etiqueta set, barral null |
| 2 | Control OK Control Final COCINA | POST /control/ok | + etiquetas_maestro_cocinas.paso_lector=true |
| 3 | Falla controlador (Nivel1) | POST /control/falla | controlador_estado=false, controlador_falla_id |
| 4 | Reparación (Nivel3) | POST /control/reparacion | reparador_estado=true, reparador_falla_id |
| 5 | ATEQ (barral) | POST /control/ok | etiqueta null, etiqueta_asociada=numero, barral set |
| 6 | Duplicado mismo puesto | POST /control/ok | rechazo con error de negocio |
| 7 | Resolver secuencia | POST /scan/resolver | acción/puesto asignado = pestaña que abría el Delphi |

## Diferencias intencionales con el Delphi

- **Historial filtrado por tipo de producto** (`resolverEscaneo`). El Delphi
  (`QueryEstado`) toma todo `aux_controlcalidad` de la etiqueta, pero los números
  se repiten entre `etiquetas_maestro_cocinas` y `etiquetas_maestro_termotanques`
  (desde oct-2026 los termotanques reusan números de cocinas de 2022) y la tabla no
  guarda el tipo. La API sólo cuenta los registros cuyo `puestocontrol_id` pertenece
  a los puestos del `tipoConfig` de la terminal (cada id es de un único tipo en
  `VP_MENUFALLAS_PUESTOCONTROL_V1`). En etiquetas sin número repetido el resultado es
  idéntico; con número repetido el Delphi da "Control OK" falso o saltea puestos.

## Ejemplos curl

```bash
H='-H Content-Type:application/json -H X-Planta:25demayo'
BASE=http://localhost:3000

# Resolver (qué pantalla corresponde)
curl $H -X POST $BASE/scan/resolver -d '{
  "numero":220011,"tipoProducto":"TERMOTANQUE","tipoConfig":"TERMOTANQUE",
  "puestoConfigIndex":1,"puestoConfigNombre":"Control eléctrico","puestoConfigC":1}'

# Control OK
curl $H -X POST $BASE/control/ok -d '{
  "etiqueta":220011,"tipoProducto":"TERMOTANQUE","productoId":"<uuid>",
  "puesto":{"id":"<uuid-puesto>","nombre":"Control eléctrico","c":1},
  "controlador":{"id":"<uuid-emp>","nombre":"OP1"},
  "secundario":{"id":"<uuid-emp>","nombre":"OP1"}}'
```

## Comparación automática (opcional)

Para una etiqueta de prueba, registrar el mismo flujo con la app Delphi en una
etiqueta A y con la API en una etiqueta B equivalente, y comparar columna a
columna ignorando id/fechas:

```sql
-- ver verificacion.sql
```
