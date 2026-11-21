import { chromium } from '../../server/node_modules/playwright-core/index.mjs';

const base = process.env.GAME_URL || 'http://127.0.0.1:5174';
const browser = await chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
try {
  const login = await context.request.post(`${base}/api/auth/login`, {
    data: { username: 'v110ceb06b1', password: 'browser-test-123' },
  });
  if (!login.ok()) throw new Error(`Login ${login.status()}: ${await login.text()}`);
  await page.goto(base);
  await page.waitForURL('**/game', { timeout: 15000 });
  await page.getByRole('button', { name: 'Quản Trị (Admin)' }).click();
  await page.getByRole('button', { name: /Công cụ GM/i }).click();
  await page.getByRole('heading', { name: 'Bảng điều khiển GM' }).waitFor();
  await page.getByRole('heading', { name: 'Chiến đấu' }).waitFor();
  await page.screenshot({ path: 'art/v110/qa-gm-panel.png', fullPage: true });
  await page.getByRole('button', { name: /Bất tử:/ }).click();
  await page.getByRole('status').getByText(/Bất tử đã áp dụng/).waitFor();
  if (errors.length) throw new Error(errors.join('\n'));
  console.log('PASS browser GM panel loaded and owner command applied');
} finally { await browser.close(); }
