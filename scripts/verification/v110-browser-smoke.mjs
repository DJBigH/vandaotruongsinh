import { chromium } from '../../server/node_modules/playwright-core/index.mjs';
import { randomUUID } from 'node:crypto';

const base = process.env.GAME_URL || 'http://127.0.0.1:5174';
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
const failures = [];
page.on('pageerror', (error) => failures.push(error.message));
page.on('response', (response) => {
  if (response.status() >= 400 && response.url().includes('/assets/')) failures.push(`${response.status()} ${response.url()}`);
});
try {
  const username = `v110${randomUUID().slice(0, 7)}`;
  await page.goto(`${base}/register`);
  await page.getByPlaceholder('Nhập tên đăng nhập...').fill(username);
  await page.getByPlaceholder('Nhập email...').fill(`${username}@test.local`);
  await page.getByPlaceholder('Nhập mật khẩu...').fill('browser-test-123');
  await page.getByPlaceholder('Nhập lại mật khẩu...').fill('browser-test-123');
  await page.getByRole('button', { name: /Đăng Ký/ }).click();
  await page.waitForURL('**/create-character', { timeout: 15000 });
  await page.locator('#hero-name').fill(`Dao${randomUUID().slice(0, 5)}`);
  await page.getByRole('button', { name: 'Bước vào Thanh Khê' }).click();
  await page.waitForURL('**/game', { timeout: 20000 });
  await page.locator('canvas').waitFor({ timeout: 30000 });
  const skip = page.getByRole('button', { name: 'Bỏ qua' });
  await skip.waitFor({ timeout: 30000 });
  await skip.click();
  await skip.waitFor({ state: 'hidden' });
  await page.getByText(/FPS:/).waitFor({ timeout: 30000 });
  await page.screenshot({ path: 'art/v110/qa-game-1366.png' });
  await page.keyboard.press('q');
  await page.locator('#game-system-menu').waitFor();
  await page.screenshot({ path: 'art/v110/qa-menu-1366.png' });
  await page.keyboard.press('Escape');
  await page.locator('#game-system-menu').waitFor({ state: 'hidden' });
  await page.keyboard.press('k');
  await page.getByRole('heading', { name: 'Lĩnh ngộ chiêu thức' }).waitFor();
  await page.keyboard.press('Escape');
  await page.getByRole('heading', { name: 'Lĩnh ngộ chiêu thức' }).waitFor({ state: 'hidden' });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.keyboard.press('q');
  await page.locator('#game-system-menu').waitFor();
  await page.screenshot({ path: 'art/v110/qa-menu-1920.png' });
  if (failures.length) throw new Error(failures.join('\n'));
  console.log(`PASS browser game/menu/shortcuts/assets at 1366 and 1920: ${username}`);
} finally { await browser.close(); }
