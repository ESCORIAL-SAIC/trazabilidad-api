import dotenv from 'dotenv';

dotenv.config();

function optional(name: string, fallback: string): string {
  const v = process.env[name];
  return v === undefined || v === '' ? fallback : v;
}

export type MirrorWriteMode = 'strict' | 'lenient';

/** Ajustes globales de la API (no dependientes de planta). */
export const env = {
  port: parseInt(optional('PORT', '3000'), 10),

  // Versión de la app. La inyecta el build de Docker (--build-arg VERSION -> ENV APP_VERSION),
  // derivada de los git tags por el CI. En dev local cae a '0.0.0-dev'.
  appVersion: optional('APP_VERSION', '0.0.0-dev'),

  // Ruta al archivo de configuracion de plantas (conexiones por planta).
  plantasConfigPath: optional('PLANTAS_CONFIG', 'plantas.config.json'),

  // Espejo SQL Server (ver controlMirror.repo.ts). Desactivado por defecto.
  mirrorEnabled: optional('MIRROR_ENABLED', 'false') === 'true',
  mirrorWriteMode: optional('MIRROR_WRITE_MODE', 'strict') as MirrorWriteMode,

  liberacion: {
    cocinaEnabled: optional('LIBERACION_COCINA_ENABLED', 'true') === 'true',
    termoEnabled: optional('LIBERACION_TERMO_ENABLED', 'false') === 'true',
  },
};
