# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

# ── Production stage ──────────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Versión inyectada por el CI (--build-arg VERSION), derivada de los git tags.
# No copiamos .git a la imagen: la versión llega por build-arg y se expone en runtime.
ARG VERSION=0.0.0-dev
ENV APP_VERSION=$VERSION
LABEL org.opencontainers.image.version=$VERSION

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

# El archivo de configuración de plantas se monta como volumen en producción.
# Esta copia sirve de fallback para desarrollo local con Docker.
COPY plantas.config.example.json ./plantas.config.json

ENV NODE_ENV=production
ENV PORT=3000
ENV PLANTAS_CONFIG=/app/plantas.config.json

EXPOSE 3000

# Healthcheck apunta a liveness (sin dependencias): 200 mientras el proceso viva.
# busybox trae wget en la imagen alpine, así que no hace falta instalar curl.
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget -q -O - http://localhost:3000/health/live || exit 1

CMD ["node", "dist/server.js"]
