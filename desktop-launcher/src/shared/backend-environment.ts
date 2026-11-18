import fs from 'node:fs';
import { isIP } from 'node:net';
import path from 'node:path';

export type BackendEnvFile = '.env' | 'server/.env';
type Environment = NodeJS.ProcessEnv & { DATABASE_URL: string; JWT_SECRET: string };
export type DatabaseEndpoint = { host: string; port: number };

export type BackendEnvironment = { file: BackendEnvFile | null } & (
  | { env: Environment; database: DatabaseEndpoint; fileNodeEnv: string | undefined }
  | { error: string }
);

// Each package supplies dotenv.parse from its own dependencies.
type ParseEnv = (input: Buffer) => Record<string, string>;

const envFiles: BackendEnvFile[] = ['.env', 'server/.env'];
const databaseVariableNames = new Set(['DB_USER', 'DB_PASSWORD', 'DB_HOST', 'DB_PORT', 'DB_NAME']);

/** Use one file for defaults, with explicit environment variables taking precedence. */
export function readBackendEnvironment(
  projectDir: string,
  parseEnv: ParseEnv,
  explicit: NodeJS.ProcessEnv = process.env,
): BackendEnvironment {
  let file: BackendEnvFile | null = null;
  let values: Record<string, string> = {};
  for (const candidate of envFiles) {
    try {
      values = parseEnv(fs.readFileSync(path.join(projectDir, candidate)));
      file = candidate;
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        return { file: candidate, error: `Không thể đọc cấu hình ${candidate}. Hãy kiểm tra tệp và quyền truy cập.` };
      }
    }
  }

  const env = { ...values, ...explicit };
  const source = file ?? 'biến môi trường (hoặc .env / server/.env)';
  if (!env.DATABASE_URL?.trim()) {
    return { file, error: `Thiếu DATABASE_URL trong ${source}.` };
  }
  if (!env.JWT_SECRET?.trim() || /\$\{[^}]*\}/.test(env.JWT_SECRET)) {
    return { file, error: `Cần JWT_SECRET hợp lệ trong ${source}.` };
  }

  try {
    const databaseUrl = env.DATABASE_URL.replace(/\$\{([^}]+)\}/g, (_placeholder, key: string) => {
      const value = env[key];
      if (!databaseVariableNames.has(key) || !value || /\$\{[^}]*\}/.test(value)) {
        // Only report variable names from the supported template, never arbitrary values.
        const variable = databaseVariableNames.has(key) ? ` ${key}` : '';
        throw new Error(`DATABASE_URL trong ${source} chứa biến${variable} chưa được cấu hình.`);
      }
      if (key === 'DB_HOST') {
        if (isIP(value) === 6) return `[${value}]`;
        if (/^(?:[\w.-]+|\[[a-f0-9:.]+\])$/i.test(value)) return value;
        throw new Error(`DATABASE_URL trong ${source} cần DB_HOST hợp lệ.`);
      }
      if (key === 'DB_PORT') {
        if (/^[0-9]+$/.test(value)) return value;
        throw new Error(`DATABASE_URL trong ${source} cần DB_PORT hợp lệ.`);
      }
      return encodeURIComponent(value);
    });

    if (databaseUrl.includes('${')) {
      return { file, error: `DATABASE_URL trong ${source} chứa placeholder chưa được cấu hình.` };
    }

    // Preserve concrete URLs exactly, including percent escapes and query options.
    let parsed: URL;
    try {
      parsed = new URL(databaseUrl);
    } catch {
      return { file, error: `DATABASE_URL trong ${source} cần URL PostgreSQL hợp lệ.` };
    }
    if (!['postgresql:', 'postgres:'].includes(parsed.protocol) || !parsed.hostname || parsed.port === '0') {
      return { file, error: `DATABASE_URL trong ${source} cần URL PostgreSQL hợp lệ.` };
    }
    return {
      file,
      env: { ...env, DATABASE_URL: databaseUrl, JWT_SECRET: env.JWT_SECRET },
      fileNodeEnv: values.NODE_ENV,
      database: { host: parsed.hostname.replace(/^\[|\]$/g, ''), port: Number(parsed.port || 5432) },
    };
  } catch (error) {
    return { file, error: (error as Error).message };
  }
}
