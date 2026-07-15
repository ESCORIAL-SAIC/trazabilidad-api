# Deploy, versionado y publicación de imágenes

Esta API se versiona con **SemVer derivado de git tags** (única fuente de verdad, sin
números hardcodeados), se containeriza con Docker y se publica en **GitHub Container
Registry (GHCR)** vía GitHub Actions.

- Imagen: `ghcr.io/escorial-saic/trazabilidad-api`
- Workflow: `.github/workflows/docker-publish.yml`
- Cálculo de versión: `.github/scripts/compute-version.sh`

## Esquema de versionado (auto por label de PR)

El número de versión sale de los git tags; el bump lo decide la **label de la PR** al mergear:

| Label de la PR      | Efecto al mergear                     |
|---------------------|---------------------------------------|
| `release:major`     | sube MAJOR (`1.2.3 → 2.0.0`)          |
| `release:minor`     | sube MINOR (`1.2.3 → 1.3.0`)          |
| _(ninguna)_         | sube PATCH (`1.2.3 → 1.2.4`)          |
| `release:skip`      | no versiona (republica `:latest`)     |

- **PR → `dev`**: pre-release `vX.Y.Z-rc.N` → imágenes `:X.Y.Z-rc.N` y `:dev`.
- **PR → `main`**: release final `vX.Y.Z` → imágenes `:X.Y.Z`, `:X.Y`, `:latest`.
- Toda imagen lleva además el tag `:sha-XXXXXXX` del commit.

El workflow crea y pushea el tag de versión, y buildea en la **misma** corrida con
`GITHUB_TOKEN` (no hace falta un PAT). El `.git` nunca entra a la imagen: la versión se
pasa por `--build-arg VERSION` y se expone en runtime como `APP_VERSION`.

## Endpoints de estado

| Endpoint          | Qué hace                                                        |
|-------------------|-----------------------------------------------------------------|
| `GET /version`    | `{ name, version }` — versión inyectada en el build.            |
| `GET /health/live`| Liveness. **Nunca** toca la DB. 200 mientras el proceso viva.   |
| `GET /health/ready`| Readiness. Hace `SELECT 1` en el PostgreSQL de la planta activa. 200 si responde, 503 si no. |
| `GET /health`     | Alias histórico de `/health/ready` (compat con clientes existentes). |

El `HEALTHCHECK` del container y el `docker-compose` apuntan a `/health/live`.

## Setup único (una sola vez, en GitHub)

```bash
# 1) Labels de release en el repo
gh label create release:minor -c 0e8a16 -d "Sube MINOR al mergear"
gh label create release:major -c b60205 -d "Sube MAJOR al mergear"
gh label create release:skip  -c cccccc -d "No versiona esta PR"

# 2) Sembrar el primer tag (de ahí en más, automático por label de PR)
git tag v0.1.0 && git push origin v0.1.0
```

- **Permisos de Actions**: Settings → Actions → General → *Workflow permissions* →
  **Read and write permissions** (necesario para que el workflow cree tags y publique en GHCR).
- **Visibilidad del package**: la imagen GHCR nace **privada**. Para que el server la baje
  sin login, hacerla pública en GHCR → *Package settings* → *Change visibility* → Public.
  (Si se deja privada, el server necesita `docker login ghcr.io` con un token con `read:packages`.)

## Deploy en el server

```bash
# plantas.config.json real montado como volumen (nunca dentro de la imagen)
cp plantas.config.example.json plantas.config.json   # y completar credenciales

# fijar una versión concreta (opcional; por defecto :latest)
echo "IMAGE_TAG=0.1.0" > .env

docker compose pull
docker compose up -d
docker compose ps          # STATUS debe mostrar (healthy)
```

## Build local de la imagen

```bash
docker build --build-arg VERSION=0.1.0 -t trazabilidad-api:local .
docker run --rm -p 3000:3000 -v "$PWD/plantas.config.json:/app/plantas.config.json:ro" trazabilidad-api:local
curl localhost:3000/version        # {"name":"trazabilidad-api","version":"0.1.0"}
curl localhost:3000/health/live    # 200 siempre
curl localhost:3000/health/ready   # 200 si la DB responde, 503 si no
```
