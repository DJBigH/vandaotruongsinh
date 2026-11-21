import { chromium } from '../../server/node_modules/playwright-core/index.mjs';

if (!process.env.GAME_QA_USER) throw new Error('Set GAME_QA_USER to a disposable browser fixture.');
const browser = await chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://127.0.0.1:5174/');
  await page.getByPlaceholder('Nhập tên đăng nhập...').fill(process.env.GAME_QA_USER);
  await page.getByPlaceholder('Nhập mật khẩu...').fill('browser-test-123');
  await page.getByRole('button', { name: /Đăng Nhập/ }).click();
  await page.waitForURL('**/game');
  const skip = page.getByRole('button', { name: 'Bỏ qua' });
  await skip.waitFor({ timeout: 30000 });
  await skip.click();
  await skip.waitFor({ state: 'hidden' });
  await page.getByText(/FPS:/).waitFor({ timeout: 30000 });
  const mounts = await page.evaluate(async () => (await (await fetch('/api/game/mounts')).json()).data);
  if (mounts.activeMount !== 'mount_crane') throw new Error('Fixture mount is inactive.');
  await page.screenshot({ path: 'art/v105/qa-riding-idle.png' });
  await page.keyboard.down('d');
  await page.waitForTimeout(950);
  await page.screenshot({ path: 'art/v105/qa-riding-moving.png' });
  await page.keyboard.up('d');
  console.log('Ride visual: mount active and game world rendered.');
} finally { await browser.close(); }
