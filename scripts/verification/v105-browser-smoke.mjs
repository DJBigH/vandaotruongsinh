import { chromium } from '../../server/node_modules/playwright-core/index.mjs';
import { randomUUID } from 'node:crypto';

const base = process.env.GAME_URL || 'http://127.0.0.1:5174';
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const failures = [];
page.on('pageerror', (error) => failures.push(error.message));
page.on('response', (response) => { if (response.status() >= 400 && response.url().includes('/assets/'))
  failures.push(`${response.status()} ${response.url()}`); });
try {
  const name = `browser${randomUUID().slice(0, 7)}`;
  await page.goto(`${base}/register`);
  await page.getByPlaceholder('Nhập tên đăng nhập...').fill(name);
  await page.getByPlaceholder('Nhập email...').fill(`${name}@test.local`);
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
  await page.screenshot({ path: 'art/v105/qa-world.png', fullPage: true });
  await page.getByRole('button', { name: /Bí Kíp/ }).click();
  await page.getByRole('heading', { name: 'Lĩnh ngộ chiêu thức' }).waitFor();
  await page.getByText('Kiếm Khí Trảm', { exact: true }).first().waitFor();
  await page.screenshot({ path: 'art/v105/qa-skill-panel.png', fullPage: true });
  await page.getByRole('button', { name: 'Đóng bảng chiêu' }).click();
  await page.getByRole('button', { name: /Thú Cưỡi/ }).click();
  await page.getByRole('heading', { name: 'Thú cưỡi của đạo hữu' }).waitFor();
  await page.getByText('Linh Hạc Bạch Vân', { exact: true }).first().waitFor();
  await page.screenshot({ path: 'art/v105/qa-mount-panel.png', fullPage: true });
  await page.getByRole('button', { name: 'Đóng thú cưỡi' }).click();
  await page.getByRole('button', { name: /Luyện/ }).click();
  await page.getByRole('heading', { name: 'Lò rèn & đan phòng' }).waitFor();
  await page.getByText('Thanh Phong Kiếm', { exact: true }).first().waitFor();
  await page.screenshot({ path: 'art/v105/qa-craft-panel.png', fullPage: true });
  if (failures.length) throw new Error(failures.join('\n'));
  console.log('Browser smoke: entered game; skill, mount, craft panels loaded; assets responded.');
} finally { await browser.close(); }
