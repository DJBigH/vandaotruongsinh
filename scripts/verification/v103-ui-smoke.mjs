// Run from server/ against a disposable local _test database and matching Vite proxy.
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { launchBrowser, installReadOnlySceneObserver, observeTransport, waitFor, sceneState } from './browser-helpers.mjs';
import { walkRoute } from './walking-route.mjs';
import { assertLocalTestConfiguration } from './evidence-utils.mjs';

const base = process.env.VANDAO_TEST_URL ?? 'http://127.0.0.1:5173';
await assertLocalTestConfiguration(base);
const out = resolve(process.env.VANDAO_EVIDENCE_DIR ?? '../docs/evidence/v103-ui-smoke');
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
  await page.getByPlaceholder('Nhập tên đăng nhập...').fill(`v103_${suffix}`);
  await page.getByPlaceholder('Nhập email...').fill(`v103_${suffix}@example.invalid`);
  await page.getByPlaceholder('Nhập mật khẩu...', { exact: true }).fill(password);
  await page.getByPlaceholder('Nhập lại mật khẩu...').fill(password);
  await page.getByRole('button', { name: /Đăng Ký/ }).click();
  await page.getByPlaceholder('Nhập tên đạo hiệu...').fill(`Đạo${suffix}`);
  await page.getByRole('button', { name: /Bước Vào Tu Tiên Giới/i }).click();

  await page.locator('canvas').waitFor({ timeout: 30000 });
  await waitFor(async () => (await sceneState(page))?.map === 'map_thanh_khe', 'rendered village', 30000);
  const guide = page.getByRole('dialog', { name: /Thanh Khê đang quên tên người/ });
  await guide.waitFor({ timeout: 10000 });
  await page.screenshot({ path: `${out}/guide.png` });
  for (let step = 0; step < 3; step++) await page.getByRole('button', { name: 'Tiếp tục' }).click();
  await page.getByRole('button', { name: 'Mở nhiệm vụ chính' }).click();
  await page.getByText('Xem sổ ký ức tại Linh Miếu giữa làng Thanh Khê').first().waitFor();
  await page.screenshot({ path: `${out}/quests.png` });
  await page.getByRole('button', { name: 'Xem địa đồ và di tích' }).click();
  await page.getByText('Chưa đặt chân tới').first().waitFor();
  assert.ok(await page.getByText('Chưa đặt chân tới').count() > 0, 'new regions remain undiscovered');
  await page.screenshot({ path: `${out}/map.png` });
  await page.getByRole('button', { name: 'Đóng bản đồ' }).click();

  await page.getByRole('button', { name: /Túi/ }).click();
  await page.locator('img[alt="Thanh Phong Kiếm"]').first().click();
  await page.getByText('Cường hóa 0/5').waitFor();
  assert.equal(await page.getByRole('button', { name: 'Cường hóa lên +1' }).isDisabled(), true);
  await page.screenshot({ path: `${out}/enhancement.png` });
  await page.getByRole('button', { name: '✕' }).last().click();

  const mapResponse = await context.request.get(`${base}/api/game/maps/map_thanh_khe`);
  assert.equal(mapResponse.status(), 200);
  const map = (await mapResponse.json()).data;
  await waitFor(() => transport.latest?.playerState, 'world snapshot', 10000);
  await walkRoute(page, transport, map, 1024, 368);
  await page.keyboard.press('e');
  await page.getByRole('img', { name: /Chân dung Trưởng Lão Thanh Khê/ }).waitFor({ timeout: 10000 });
  await page.screenshot({ path: `${out}/portrait.png` });
  await page.getByRole('button', { name: 'Đóng', exact: true }).click();
  await walkRoute(page, transport, map, 1024, 736);
  await page.keyboard.press('e');
  await page.getByText(/Phát hiện manh mối:/).waitFor({ timeout: 10000 });
  await page.getByRole('button', { name: /Bản Đồ/ }).click();
  await page.getByText('Tìm thấy 1/10 manh mối').waitFor({ timeout: 10000 });
  await page.screenshot({ path: `${out}/discovery.png` });
  assert.equal(transport.errors.length, 0, `browser errors: ${transport.errors.join('; ')}`);
  console.log(`V1.0.3 UI smoke passed; screenshots: ${out}`);
} catch (error) {
  await page.screenshot({ path: `${out}/failure.png` }).catch(() => {});
  console.error('Browser state:', JSON.stringify({ url: page.url(), text: (await page.locator('body').innerText().catch(() => '')).slice(0, 600),
    latestMap: transport.latest?.currentMapId, errors: transport.errors, scene: await sceneState(page).catch(() => null) }));
  throw error;
} finally {
  await context.close();
  await browser.close();
}
