# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es esto

API REST (Node 20 + TypeScript + Express) que reemplaza el acceso directo a base de
datos de la app **Trazabilidad**, mientras esa app migra de Delphi (FireMonkey/Android)
a Android nativo (Kotlin). El cliente Delphi hablaba directo con PostgreSQL / SQL
Server / SQLite; ahora consume esta API, que concentra toda la lógica de negocio y la
doble escritura (PostgreSQL principal + SQL Server espejo "LOCAL").

**El código es, a propósito, un port 1:1 del Delphi original** (queries del
`UnitModuloDatos.dfm`, handlers de botones como `ButtonOKClick`/`SearchEditButton1Click`).
Los comentarios en el código señalan explícitamente qué método/query Delphi replica cada
función — al modificar lógica de negocio, contrastar contra esa referencia en vez de
"mejorar" el comportamiento, porque el objetivo es paridad de comportamiento, no una
reescritura idiomática.

## Comandos

```bash
npm run dev         # desarrollo (ts-node-dev --respawn --transpile-only)
npm run build       # compila a dist/ (tsc -p tsconfig.json)
npm start           # corre dist/server.js (requiere build previo)
npm run typecheck   # tsc --noEmit
npm test            # jest — unitarios, sin DB (mocks de repos)
npx jest resolver.service.test.ts   # correr un solo archivo de test
npx jest -t "nombre del test"       # correr por nombre de test
```

Setup inicial (una sola vez):
```bash
cp .env.example .env
cp plantas.config.example.json plantas.config.json   # completar credenciales reales
```

No hay lint configurado (no ESLint/Prettier en el repo).

## Arquitectura

### Multiplanta (AsyncLocalStorage)

Una sola API atiende varias plantas industriales, cada una con su propio par de
conexiones (PostgreSQL + SQL Server), definidas en `plantas.config.json` (gitignored;
`plantas.config.example.json` es la plantilla). Cada request indica su planta con el
header **`X-Planta: <id>`**; si falta, se usa `plantas.default`.

Flujo: `plantaMiddleware` (`src/middleware/planta.ts`) resuelve el id de planta y lo fija
con `runConPlanta` en un `AsyncLocalStorage` (`src/context/plantaContext.ts`). Los pools de
DB (`src/db/postgres.ts`, `src/db/sqlserver.ts`) llaman a `plantaActual()` para elegir el
pool correcto (uno por planta, creado lazy y cacheado en un `Map`). Esto significa que
**los repositorios y servicios nunca reciben ni pasan un parámetro de planta explícito** —
confían en que el contexto ya está fijado por el middleware. Ojo con esto al escribir
código que corre fuera del ciclo request/response (scripts, jobs): sin `runConPlanta`, cae
a la planta default.

`GET /plantas` vive *antes* de `plantaMiddleware` en `src/app.ts` — es la única ruta que no
requiere contexto de planta.

### Doble escritura (PostgreSQL + SQL Server "LOCAL")

PostgreSQL es la base principal. El espejo SQL Server (tabla `aux_controlcalidad`,
"LOCAL" en la terminología Delphi) es opcional, controlado por `MIRROR_ENABLED` (default
`false`) — en Android la app Delphi nunca abría MSSQL (`{$IFNDEF ANDROID}`), así que el
espejo solo tiene sentido si algún cliente todavía lo necesita. `MIRROR_WRITE_MODE`
(`strict` | `lenient`) decide si un fallo del espejo aborta la operación o solo loguea un
warning (ver `conEspejo()` en `src/services/control.service.ts`).

Diferencias de esquema entre las dos bases que el código compensa explícitamente
(ver comentarios en `src/repositories/controlMirror.repo.ts`):
- SQL Server `aux_controlcalidad` **no tiene** columna `etiqueta_asociada`.
- El INSERT del espejo siempre guarda `ETIQUETA = numero` real, sin importar la lógica
  por puesto (p.ej. ATEQ) que en PostgreSQL usa `etiqueta_asociada` en su lugar.
- La liberación en Control Final (`etiquetas_maestro_cocinas`) es **solo PostgreSQL**.

### La máquina de estados (`resolver.service.ts`)

`resolverEscaneo()` en `src/services/resolver.service.ts` es la réplica de
`TFormTrazabilidad.SearchEditButton1Click`: dado un número de etiqueta escaneado y la
configuración de puesto del cliente, decide qué "pantalla" debe mostrar la app
(`AccionResolver`: `IGNORAR` | `ETIQUETA_INVALIDA` | `CONTROLADOR` | `REPARADOR` |
`ESTADO`) mirando el historial de registros en `aux_controlcalidad` para esa etiqueta.
La API es sin estado — toda la decisión se recalcula por request a partir de los datos en
DB más lo que el cliente envía (no hay sesión server-side). Esta función es la lógica más
densa del repo; antes de tocarla, leer los tests en
`src/__tests__/resolver.service.test.ts` para entender los casos cubiertos.

### Escritura de negocio (`control.service.ts`)

Tres operaciones, réplicas de los handlers de botón del Delphi:
- `registrarOk` — `ButtonOKClick` (INSERT, `controlador_estado=true`).
- `registrarFalla` — `ButtonAceptarClick` rama controlador (INSERT, `controlador_estado=false` + Nivel1).
- `registrarReparacion` — `ButtonAceptarClick` rama reparador (UPDATE del registro existente + Nivel3).

Puestos con comportamiento especial están centralizados como constantes de string en
`src/domain/puestos.ts` (`PUESTO.FUGA`, `PUESTO.ATEQ`, `PUESTO.CONTROL_FINAL`) — el Delphi
original compara por nombre literal, así que este código hace lo mismo; no reemplazar por
un enum/id sin verificar que el nombre siga siendo la clave real en DB.

### Capas

```
src/config/       env.ts (settings globales) + plantas.ts (carga/valida plantas.config.json)
src/context/      plantaContext.ts — AsyncLocalStorage de la planta activa
src/db/           postgres.ts y sqlserver.ts (pool por planta, lazy) + guid.ts
src/domain/       puestos.ts — constantes y normalización de tipos de producto
src/repositories/ SQL portado 1:1 de las queries del UnitModuloDatos.dfm
src/services/     resolver.service.ts (máquina de estados) + control.service.ts (escritura)
src/routes/       auth, catalogos, etiquetas, scan, control, plantas — validación con zod, delegan a services
src/middleware/   errors.ts (BusinessError + asyncHandler + errorHandler) , planta.ts, logger.ts
```

Los errores de negocio (equivalentes a los `MessageDialog` del Delphi, mensajes pensados
para mostrarse directo al usuario) se lanzan como `BusinessError` (`src/middleware/errors.ts`)
y los handlers de ruta se envuelven con `asyncHandler` para propagar rechazos de promesas al
`errorHandler` central. Los errores de `zod` se mapean a 422 automáticamente ahí mismo.

## Tests

`npm test` corre 100% mockeado (sin DB): cubre la máquina de estados
(`resolver.service`) y la lógica de escritura (`control.service`) — OK/falla/reparación,
validaciones de barral/frontal, duplicados, ATEQ, liberación en Control Final. Los repos se
mockean vía `jest.mock`.

Las **pruebas de equivalencia** contra la app Delphi real (en la base TEST
`<IP_BASE_TEST>`, nunca producción) están documentadas en `equivalencia/equivalencia.md` con
una matriz de casos y ejemplos `curl` — son manuales, no automatizadas, y sirven para
confirmar paridad de comportamiento cuando se cambia lógica de negocio.

## Notas operativas

- `plantas.config.json` y `.env` están en `.gitignore`-equivalente (no commitear
  credenciales); usar siempre los `*.example.json` como plantilla.
- El middleware `requestLogger` (`src/middleware/logger.ts`) loguea cada request/response a
  consola completo, redactando claves sensibles (`password`, `pass`, etc.) — no asumir que
  hay logging estructurado ni un sink externo.
- En Docker, `plantas.config.json` se monta como volumen (`docker-compose.yml`); la copia
  del `.example` en la imagen es solo fallback para dev local.
