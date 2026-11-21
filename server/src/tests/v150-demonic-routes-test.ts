import './require-disposable-database';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { AccountRole, CultivationPath, DaoAlignment } from '@shared';
import { buildServer, prisma } from '../index';
import { breakthroughRng } from '../engine/breakthrough-chance';
import { ArpgSessionManager } from '../engine/realtime-arpg-engine';
import { computeCharacterStats } from '../modules/character/stats';

test('a Ma character sees Ma realm names in summary, preview and successful breakthrough', async (t) => {
  const app = await buildServer(); await app.ready();
  t.after(async () => { await app.close(); await prisma.$disconnect(); });
  const suffix = randomUUID().slice(0, 8);
  const account = await prisma.account.create({ data: {
    username: `v150_${suffix}`, email: `v150_${suffix}@test.local`, passwordHash: 'fixture', role: AccountRole.PLAYER,
  } });
  t.after(async () => { await prisma.account.delete({ where: { id: account.id } }); });
  const character = await prisma.character.create({ data: {
    accountId: account.id, name: `Ma_${suffix}`, isActive: true,
    cultivationPath: CultivationPath.SWORD, alignment: DaoAlignment.DEMONIC,
    exp: 50n, level: 2, cultivationExp: 1000n, gold: 120,
    stats: { ...computeCharacterStats(CultivationPath.SWORD, 0, 0) },
  } });
  t.after(() => ArpgSessionManager.getInstance().removeSession(character.id));
  const token = app.jwt.sign({ userId: account.id, username: account.username, role: AccountRole.PLAYER });
  const headers = { authorization: `Bearer ${token}` };
  const summary = await app.inject({ url: '/api/game/character', headers });
  assert.equal(summary.statusCode, 200, summary.body);
  assert.equal(summary.json().data.realmName, 'Luyện Ma - Sơ Kỳ');
  const preview = await app.inject({ url: '/api/game/character/breakthrough-info', headers });
  assert.equal(preview.json().data.currentRealmName, 'Luyện Ma - Sơ Kỳ');
  assert.equal(preview.json().data.nextRealmName, 'Luyện Ma - Trung Kỳ');
  t.mock.method(breakthroughRng, 'roll', () => 0);
  const result = await app.inject({ method: 'POST', url: '/api/game/character/breakthrough', headers,
    payload: { characterId: character.id, realmIndex: 0, realmTier: 0, requestId: randomUUID() } });
  assert.equal(result.statusCode, 200, result.body);
  assert.equal(result.json().data.newRealm, 'Luyện Ma - Trung Kỳ');
  await prisma.character.update({ where: { id: character.id }, data: { realmIndex: 8, realmTier: 3 } });
  const oldSave = await app.inject({ url: '/api/game/character', headers });
  assert.equal(oldSave.json().data.realmName, 'Ma Kiếp - Đại Viên Mãn');
});
