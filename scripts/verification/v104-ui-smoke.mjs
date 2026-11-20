// Run with a disposable *_test database, SERVER_PORT=3002 and Vite on :5174.
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { launchBrowser, installReadOnlySceneObserver, observeTransport, waitFor, sceneState } from './browser-helpers.mjs';
import { assertLocalTestConfiguration } from './evidence-utils.mjs';

const base = process.env.VANDAO_TEST_URL ?? 'http://127.0.0.1:5174';
await assertLocalTestConfiguration(base);
const out = resolve(process.env.VANDAO_EVIDENCE_DIR ?? 'docs/evidence/v104-ui-smoke');
mkdirSync(out, { recursive: true });
const browser = await launchBrowser();
const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
const page = await context.newPage();
await installReadOnlySceneObserver(page);
const transport = await observeTransport(page);
try {
  const suffix = randomBytes(5).toString('hex');
  const password = randomBytes(16).toString('hex');
  await page.goto(`${base}/register`);
  await page.getByPlaceholder('Nhập tên đăng nhập...').fill(`v104_${suffix}`);
  await page.getByPlaceholder('Nhập email...').fill(`v104_${suffix}@example.invalid`);
  await page.getByPlaceholder('Nhập mật khẩu...', { exact: true }).fill(password);
  await page.getByPlaceholder('Nhập lại mật khẩu...').fill(password);
  await page.getByRole('button', { name: /Đăng Ký/ }).click();
  await page.getByRole('button', { name: 'Nữ', exact: true }).click();
  await page.getByRole('button', { name: /Tu Ma/ }).click();
  await page.getByRole('button', { name: /Pháp Tu/ }).click();
  const portrait = page.getByRole('img', { name: /Ngoại hình nữ · tu ma/ });
  await portrait.waitFor();
  assert.ok((await portrait.getAttribute('src')).includes('hero_spell_female_demonic'));
  await page.screenshot({ path: `${out}/character-create.png` });
  await page.getByPlaceholder('Nhập tên đạo hiệu...').fill(`Đạo${suffix}`);
  await page.getByRole('button', { name: 'Bước vào Thanh Khê' }).click();
  await page.locator('canvas').waitFor({ timeout: 30000 });
  await waitFor(async () => (await sceneState(page))?.map === 'map_thanh_khe', 'village map', 30000);
  await page.getByRole('dialog', { name: /Thanh Khê đang quên tên người/ }).waitFor();
  await page.screenshot({ path: `${out}/guide.png` });
  for (let step = 0; step < 3; step++) await page.getByRole('button', { name: 'Tiếp tục' }).click();
  await page.getByRole('button', { name: 'Mở nhiệm vụ chính' }).click();
  await page.getByRole('button', { name: '✕' }).last().click();
  await page.getByRole('button', { name: /Sự Kiện/ }).click();
  await page.getByRole('dialog', { name: /Thiên thời/ }).waitFor();
  await page.getByText('Lịch tiếp theo').waitFor();
  await page.screenshot({ path: `${out}/events.png` });
  await page.getByRole('button', { name: 'Đóng sự kiện' }).click();
  await page.getByRole('button', { name: /Thú Cưỡi/ }).click();
  await page.getByRole('img', { name: /Huyền Lang|Tiên Hạc|Linh Hạc|Ảnh Lang/ }).first().waitFor();
  await page.screenshot({ path: `${out}/mount.png` });
  assert.equal(transport.errors.length, 0, transport.errors.join('; '));
  assert.ok(transport.ticks > 0, 'live WebSocket ticks');
  console.log(`V1.0.4 UI smoke passed; screenshots: ${out}`);
} catch (error) {
  await page.screenshot({ path: `${out}/failure.png` }).catch(() => {});
  console.error('Browser state:', JSON.stringify({ url: page.url(), text: (await page.locator('body').innerText().catch(() => '')).slice(0, 600),
    latestMap: transport.latest?.currentMapId, errors: transport.errors, scene: await sceneState(page).catch(() => null) }));
  throw error;
} finally { await context.close(); await browser.close(); }
