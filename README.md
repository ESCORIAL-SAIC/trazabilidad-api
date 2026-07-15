# Trazabilidad API (Node)

API REST que reemplaza el acceso directo a base de datos de la app Trazabilidad
durante la migracion de Delphi (FireMonkey/Android) a Android nativo (Kotlin).

La app cliente deja de conectarse a PostgreSQL / SQL Server / SQLite y consume
esta API. Toda la logica de negocio y la doble escritura (PostgreSQL principal +
SQL Server espejo "LOCAL") vive aqui.

## Stack

- Node 20 LTS + TypeScript + Express
- `pg` (PostgreSQL) + `mssql` (SQL Server)
- `zod` (validacion). Multiplanta via AsyncLocalStorage.

## Puesta en marcha

```bash
npm install
cp .env.example .env                              # ajustes globales (puerto, espejo)
cp plantas.config.example.json plantas.config.json # conexiones por planta
# completar credenciales en plantas.config.json
npm run dev        # desarrollo
# o
npm run build && npm start
```

## Multiplanta

Una sola API atiende varias plantas. Las conexiones (PostgreSQL + SQL Server) de
cada planta se definen en `plantas.config.json`:

```json
{
  "default": "25demayo",
  "plantas": {
    "25demayo": { "nombre": "25 de Mayo", "pg": {…}, "mssql": {…} },
    "suipacha": { "nombre": "Suipacha",  "pg": {…}, "mssql": {…} }
  }
}
```

Cada request indica su planta con el header **`X-Planta: <id>`** (la app lo envia
segun su configuracion). Si falta, se usa la planta `default`. El middleware fija
la planta en el contexto del request (AsyncLocalStorage) y los pools de DB eligen
la conexion correcta automaticamente, sin tocar los repositorios.

`GET /plantas` devuelve la lista de plantas disponibles.

## Endpoints

### Lectura

| Metodo | Ruta | Reemplaza |
|---|---|---|
| GET | `/plantas` | (nuevo) lista de plantas |
| GET | `/health` | estado + planta activa |
| POST | `/auth/login` | `UsuarioValido` |
| GET | `/puestos?tipo=` | `QueryPuestoControl` |
| GET | `/etiquetas/:numero?tipo=` | `QueryEtiqueta` |
| GET | `/etiquetas/:numero/estado` | `QueryEstado` |
| GET | `/etiquetas/:numero/estado-asociada` | `QueryEstado_Asociada` |
| GET | `/fallas/nivel1?puesto=&tipo=` | `QueryNivel1` |
| GET | `/fallas/nivel2?nivel1Id=` | `QueryNivel2` |
| GET | `/fallas/nivel3?nivel2Id=` | `QueryNivel3` |

### Escritura / logica de negocio

| Metodo | Ruta | Reemplaza |
|---|---|---|
| POST | `/scan/resolver` | `SearchEditButton1Click` (maquina de estados) |
| POST | `/control/ok` | `ButtonOKClick` |
| POST | `/control/falla` | `ButtonAceptarClick` (controlador) |
| POST | `/control/reparacion` | `ButtonAceptarClick` (reparador) |
| POST | `/control/barral/validar` | `QueryBarral` |
| POST | `/control/frontal/validar` | `QueryCBFrontal` |

## Doble escritura (PostgreSQL + SQL Server)

Controlada por `MIRROR_ENABLED` (default **false**): en Android la app Delphi
nunca abre MSSQL (`{$IFNDEF ANDROID}`). El espejo SQL Server `aux_controlcalidad`
NO tiene la columna `etiqueta_asociada` y el INSERT "LOCAL" siempre guarda
`etiqueta` = numero (replicado fielmente). La liberacion en Control Final
(`etiquetas_maestro_cocinas`) es solo PostgreSQL. `MIRROR_WRITE_MODE` = strict|lenient.

## Tests

```
npm test          # tests unitarios (sin DB): resolver + control + normalizacion
```

17 tests cubren la maquina de estados (resolver.service) y la logica de escritura
(control.service): OK/falla/reparacion, validaciones de barral/frontal, duplicados,
ATEQ, liberacion en Control Final. Los repos se mockean, no requieren base de datos.

Pruebas de equivalencia contra la app Delphi (base TEST): ver `equivalencia/`.

## Estructura

```
src/
├── config/        # env.ts (global) + plantas.ts (registro de plantas)
├── context/       # plantaContext.ts (AsyncLocalStorage)
├── db/            # postgres.ts y sqlserver.ts (pool por planta) + guid.ts
├── domain/        # puestos.ts
├── repositories/  # SQL portado 1:1 del UnitModuloDatos.dfm
├── services/      # resolver.service.ts + control.service.ts
├── routes/        # auth, catalogos, etiquetas, scan, control, plantas
├── middleware/    # errors.ts + planta.ts
├── app.ts
└── server.ts
```

## Pendiente

- Tests de equivalencia contra la app Delphi (base TEST <IP_BASE_TEST>).
- Cargar credenciales reales en plantas.config.json y activar espejo si aplica.
- Fase 4/5: pantallas de escaneo/controlador/reparador/estado en la app Android.
