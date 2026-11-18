// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Configuration
// ============================================================

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { readBackendEnvironment } from '../../desktop-launcher/src/shared/backend-environment';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const environment = readBackendEnvironment(path.resolve(__dirname, '../..'), dotenv.parse);
if ('error' in environment) throw new Error(environment.error);
const nodeEnv = environment.env.NODE_ENV || 'development';
// Keep auth cookie handling on the selected mode if Prisma has a different .env.
Object.assign(process.env, environment.env, { NODE_ENV: nodeEnv });

export const config = {
  server: {
    port: parseInt(process.env.SERVER_PORT || '3001', 10),
    host: process.env.SERVER_HOST || '0.0.0.0',
    nodeEnv,
  },
  database: {
    url: environment.env.DATABASE_URL,
  },
  jwt: {
    secret: environment.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  cors: {
    origin: process.env.VITE_API_URL || 'http://localhost:5173',
  },
} as const;
