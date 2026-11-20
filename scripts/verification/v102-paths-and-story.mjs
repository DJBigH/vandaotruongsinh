// Run from server/ against a disposable loopback stack with Playwright/Chrome paths set.
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { launchBrowser, installReadOnlySceneObserver, sceneState, waitFor } from './browser-helpers.mjs';
import { assertLocalTestConfiguration, writeJson } from './evidence-utils.mjs';

const base = process.env.VANDAO_TEST_URL ?? 'http://127.0.0.1:5173';
await assertLocalTestConfiguration(base);
const { prisma } = await import('../../server/src/index.ts');
const out = resolve(process.env.VANDAO_EVIDENCE_DIR ?? '../docs/evidence/v102-paths-story');
mkdirSync(out, { recursive: true });
const browser = await launchBrowser();
const results = [];
const suffix = Date.now().toString().slice(-8);
let failure = null;

async function probe(page) {
  return page.evaluate(() => {
    const scene = window.__acceptanceScene?.();
    if (!scene?.player) return null;
    const disciple = scene.latestEntities?.find((entity) => entity.type === 'DISCIPLE');
    const sprite = disciple && scene.entitySprites?.get(disciple.id)?.getData('monsterSprite');
    return {
      map: scene.currentMapId,
      playerTexture: scene.player.texture.key,
      playerAnimation: scene.player.anims.currentAnim?.key,
      disciple: disciple && { name: disciple.name, texture: sprite?.texture.key, animation: sprite?.anims.currentAnim?.key },
      fps: Math.round(scene.game.loop.actualFps),
    };
  });
}

try {
  for (const [path, label, prefix] of [
    ['SWORD', 'Kiếm Tu', 'player'],
    ['SPELL', 'Pháp Tu', 'player_magic'],
    ['BODY', 'Thể Tu', 'player_body'],
  ]) {
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const page = await context.newPage();
    await installReadOnlySceneObserver(page);
    const username = `v102_${path.toLowerCase()}_${suffix}`;
    const password = randomBytes(16).toString('hex');
    await page.goto(`${base}/register`);
    await page.getByPlaceholder('Nhập tên đăng nhập...').fill(username);
    await page.getByPlaceholder('Nhập email...').fill(`${username}@example.invalid`);
    await page.getByPlaceholder('Nhập mật khẩu...', { exact: true }).fill(password);
    await page.getByPlaceholder('Nhập lại mật khẩu...').fill(password);
    await page.getByRole('button', { name: /Đăng Ký/ }).click();
    await page.getByPlaceholder('Nhập tên đạo hiệu...').fill(`Đạo${path}${suffix}`);
    await page.getByText(label, { exact: true }).click();
    await page.getByRole('button', { name: /Bước Vào Tu Tiên Giới/i }).click();
    await waitFor(async () => (await sceneState(page))?.map === 'map_thanh_khe', `${path} world`, 30000);
    await delay(450);
    const idle = await probe(page);
    assert.equal(idle.playerTexture, `${prefix}_idle`);
    assert.ok(idle.playerAnimation?.startsWith(`${prefix}_idle_`), JSON.stringify(idle));
    await page.keyboard.down('d');
    await delay(180);
    const walking = await probe(page);
    await page.keyboard.up('d');
    assert.ok(walking.playerAnimation?.startsWith(`${prefix}_walk_`), JSON.stringify(walking));
    await page.screenshot({ path: `${out}/${path.toLowerCase()}-1366x768.png` });
    await page.mouse.click(680, 360);
    await waitFor(async () => (await probe(page))?.playerAnimation?.startsWith(`${prefix}_attack_`),
      `${path} attack animation`, 3000);
    const attack = await probe(page);
    await page.screenshot({ path: `${out}/${path.toLowerCase()}-attack-1366x768.png` });
    await delay(500);
    await page.keyboard.press('1', { delay: 60 });
    await waitFor(async () => (await probe(page))?.playerAnimation?.startsWith(`${prefix}_cast_`),
      `${path} skill cast animation`, 3000);
    const cast = await probe(page);
    await page.screenshot({ path: `${out}/${path.toLowerCase()}-cast-1366x768.png` });
    results.push({ path, idle, walking, attack, cast });

    if (path === 'SWORD') {
      const account = await prisma.account.findUniqueOrThrow({ where: { username } });
      const character = await prisma.character.findFirstOrThrow({ where: { accountId: account.id } });
      await prisma.characterQuest.create({ data: { characterId: character.id, questId: 'quest_main_03',
        status: 'TURNED_IN', progress: [] } });
      await prisma.character.update({ where: { id: character.id }, data: { gold: 500 } });
      await page.reload();
      await waitFor(async () => (await sceneState(page))?.map === 'map_thanh_khe', 'disciple fixture world', 30000);
      await page.getByRole('button', { name: /Đệ Tử/ }).click();
      await page.getByRole('button', { name: 'Chiêu mộ Liễu Muội' }).click();
      await page.getByText('Đang đồng hành').waitFor();
      await page.getByRole('button', { name: 'Đóng bảng đệ tử' }).click();
      await waitFor(async () => (await probe(page))?.disciple?.texture === 'disciple_lieu_muoi_idle',
        'dedicated disciple sprite', 10000);
      const disciple = await probe(page);
      await page.screenshot({ path: `${out}/disciple-1366x768.png` });
      results.push({ disciple });

      for (const number of [6, 9, 12, 15, 18, 21, 24]) {
        await prisma.characterQuest.create({ data: { characterId: character.id,
          questId: `quest_main_${String(number).padStart(2, '0')}`, status: 'TURNED_IN', progress: [] } });
      }
      for (const questId of ['quest_memory_evidence', 'quest_memory_rebirth']) {
        await prisma.characterQuest.create({ data: { characterId: character.id, questId, status: 'TURNED_IN', progress: [] } });
      }
      await page.reload();
      await waitFor(async () => (await sceneState(page))?.map === 'map_thanh_khe', 'story fixture world', 30000);
      await page.getByRole('button', { name: /Sử Ký/ }).click();
      await page.getByRole('button', { name: /Chương 8/ }).click();
      await page.getByText('Nghịch Thiên Phá Đạo', { exact: true }).locator('..')
        .getByRole('button', { name: 'Chọn kết cục' }).click();
      await page.getByRole('button', { name: 'Tiếp tục tu luyện' }).waitFor();
      await page.screenshot({ path: `${out}/story-ending-1366x768.png` });
      const flag = await prisma.storyFlag.findUniqueOrThrow({ where: { characterId_flagKey: {
        characterId: character.id, flagKey: 'CHOSEN_ENDING',
      } } });
      assert.equal(flag.flagValue, 'DESTROY_PACT');
      results.push({ ending: flag.flagValue });
      await page.getByRole('button', { name: 'Tiếp tục tu luyện' }).click();

      await page.getByRole('button', { name: /Tháp/ }).click();
      await page.getByRole('button', { name: /Khiêu Chiến/ }).first().click();
      await waitFor(async () => (await sceneState(page))?.map === 'map_tran_yeu_thap', 'tower world', 15000);
      const tower = await probe(page);
      await page.screenshot({ path: `${out}/tower-floor1-1366x768.png` });
      results.push({ tower });
    }
    await context.close();
  }
} catch (error) {
  failure = String(error?.stack ?? error);
  process.exitCode = 1;
} finally {
  writeJson(`${out}/result.json`, { passed: !failure, results, failure });
  console.log(JSON.stringify({ passed: !failure, checks: results.length, evidence: out, failure: failure?.split('\n')[0] }));
  await browser.close();
  await prisma.$disconnect();
}
