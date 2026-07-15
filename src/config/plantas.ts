import fs from 'fs';
import path from 'path';
import { env } from './env';

/** Conexiones de una planta. */
export interface PlantaConfig {
  nombre: string;
  pg: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    connectionTimeoutMillis?: number;
  };
  mssql: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    encrypt?: boolean;
    trustServerCertificate?: boolean;
    connectionTimeout?: number;
    requestTimeout?: number;
  };
}

interface PlantasFile {
  default: string;
  plantas: Record<string, PlantaConfig>;
}

let registro: PlantasFile;

function cargar(): PlantasFile {
  if (registro) return registro;
  const file = path.resolve(process.cwd(), env.plantasConfigPath);
  if (!fs.existsSync(file)) {
    throw new Error(
      `No se encontro el archivo de plantas: ${file}. ` +
        `Copiar plantas.config.example.json a plantas.config.json y completar credenciales.`,
    );
  }
  registro = JSON.parse(fs.readFileSync(file, 'utf-8')) as PlantasFile;
  if (!registro.plantas || Object.keys(registro.plantas).length === 0) {
    throw new Error('El archivo de plantas no define ninguna planta.');
  }
  if (!registro.plantas[registro.default]) {
    throw new Error(`La planta default "${registro.default}" no existe en el registro.`);
  }
  return registro;
}

export function plantaDefault(): string {
  return cargar().default;
}

export function getPlantaConfig(id: string): PlantaConfig {
  const reg = cargar();
  const cfg = reg.plantas[id];
  if (!cfg) {
    throw new Error(`Planta desconocida: "${id}". Plantas validas: ${Object.keys(reg.plantas).join(', ')}`);
  }
  return cfg;
}

export function existePlanta(id: string): boolean {
  return Boolean(cargar().plantas[id]);
}

export function listarPlantas(): Array<{ id: string; nombre: string }> {
  const reg = cargar();
  return Object.entries(reg.plantas).map(([id, c]) => ({ id, nombre: c.nombre }));
}
