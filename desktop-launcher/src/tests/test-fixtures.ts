import fs from 'node:fs';
import type net from 'node:net';
import os from 'node:os';
import path from 'node:path';

export async function withLauncherFixture(run: (dir: string) => Promise<void>): Promise<void> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vandao-launcher-test-'));
  const fixtureKeys = ['APPDATA', 'DATABASE_URL', 'JWT_SECRET', 'DB_USER', 'DB_PASSWORD', 'DB_HOST', 'DB_PORT',
    'DB_NAME', 'NODE_ENV', 'SERVER_HOST', 'SERVER_PORT'];
  const originalEnv = new Map(fixtureKeys.map((key) => [key, process.env[key]]));
  for (const key of fixtureKeys) delete process.env[key];
  process.env.APPDATA = path.join(dir, 'app-data');
  try {
    await run(dir);
  } finally {
    for (const [key, value] of originalEnv) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

export async function listenLocal(server: net.Server): Promise<number> {
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Expected a TCP address');
  return address.port;
}

export async function closeLocal(server: net.Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}

export function reportAssertions(passed: number, total: number): void {
  const percent = total ? Math.floor(passed / total * 100) : 0;
  console.log(`\n📊 KẾT QUẢ: ${passed}/${total} KIỂM THỬ ĐẠT (${percent}% THÀNH CÔNG)\n`);
  if (passed !== total || total === 0) process.exitCode = 1;
}
