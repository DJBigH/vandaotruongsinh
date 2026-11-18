import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import test from 'node:test';

const harness = new URL('../../../scripts/verification/evidence-utils.mjs', import.meta.url).href;
const loader = createRequire(import.meta.url).resolve('tsx');
for (const [name, url, accepted] of [
  ['direct loopback test database', 'postgresql://127.0.0.1/world_test?schema=public', true],
  ['ordinary database', 'postgresql://localhost/world', false],
  ['non-loopback authority', 'postgresql://other.invalid/world_test', false],
  ['host override', 'postgresql://localhost/world_test?host=other.invalid', false],
  ['encoded mixed-case hostaddr override', 'postgresql://localhost/world_test?%48ostAddr=192.0.2.2', false],
  ['database override', 'postgresql://localhost/world_test?dbname=world', false],
] as const) {
  test('verification target guard: ' + name, () => {
    const probe = `import {assertLocalTestConfiguration} from ${JSON.stringify(harness)};
      await assertLocalTestConfiguration('http://127.0.0.1');`;
    const result = spawnSync(process.execPath, ['--import', loader, '--input-type=module', '-e', probe], {
      env: { ...process.env, DATABASE_URL: url, JWT_SECRET: 'synthetic', NODE_ENV: 'test' },
      encoding: 'utf8',
    });
    assert.equal(result.status === 0, accepted);
    if (!accepted) {
      assert.match(result.stderr, /local.*database|disposable/i);
      const bootstrap = new URL('./require-disposable-database.ts', import.meta.url).href;
      const direct = spawnSync(process.execPath, ['--import', loader, '--input-type=module', '-e', `await import(${JSON.stringify(bootstrap)})`], {
        env: { ...process.env, DATABASE_URL: url, JWT_SECRET: 'synthetic', NODE_ENV: 'test' },
        encoding: 'utf8',
      });
      assert.notEqual(direct.status, 0);
      assert.match(direct.stderr, /disposable/i);
    }
  });
}
