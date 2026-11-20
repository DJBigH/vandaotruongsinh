import './require-disposable-database';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import { AccountRole, CultivationPath } from '@shared';
import { buildServer, prisma } from '../index';
import { computeCharacterStats } from '../modules/character/stats';

let app: Awaited<ReturnType<typeof buildServer>>;
before(async () => { app = await buildServer(); await app.ready(); });
after(async () => { await app?.close(); await prisma.$disconnect(); });

for (const [sectId, missionId, itemId, count] of [
  ['sect_thanh_van', 'sm_02', 'item_013', 5],
  ['sect_dan_ha', 'sm_05', 'item_014', 4],
  ['sect_bach_luyen', 'sm_08', 'item_014', 5],
] as const) {
  test(`${sectId} has an earned, once-daily mission`, async (t) => {
    const username = `sect_${randomUUID().slice(0, 8)}`;
    const account = await prisma.account.create({
      data: { username, email: `${username}@vandao.test`, passwordHash: 'fixture' },
    });
    t.after(async () => { await prisma.account.delete({ where: { id: account.id } }); });
    const character = await prisma.character.create({
      data: { accountId: account.id, name: username, cultivationPath: CultivationPath.SWORD,
        stats: { ...computeCharacterStats(CultivationPath.SWORD, 0, 0) }, isActive: true },
    });
    const token = app.jwt.sign({ userId: account.id, username, role: AccountRole.PLAYER });
    const post = (path: string, payload: Record<string, unknown> = {}) => app.inject({
      method: 'POST', url: `/api/game${path}`, headers: { authorization: `Bearer ${token}` }, payload,
    });
    assert.equal((await post('/sect/join', { sectId })).statusCode, 200);
    assert.equal((await post(`/sect/mission/${missionId}/complete`)).statusCode, 400);
    const item = await prisma.inventoryItem.create({
      data: { characterId: character.id, templateId: itemId, quantity: count * 2 },
    });
    assert.equal((await post(`/sect/mission/${missionId}/complete`)).statusCode, 200);
    const first = await prisma.character.findUniqueOrThrow({ where: { id: character.id } });
    assert.equal(first.sectContribution > 0, true);
    assert.equal((await prisma.inventoryItem.findUniqueOrThrow({ where: { id: item.id } })).quantity, count);
    assert.equal((await post(`/sect/mission/${missionId}/complete`)).statusCode, 400);
    const second = await prisma.character.findUniqueOrThrow({ where: { id: character.id } });
    assert.equal(second.sectContribution, first.sectContribution);
  });
}

test('all three sects apply their advertised combat specialties', () => {
  const base = computeCharacterStats(CultivationPath.SWORD, 0, 0);
  const sword = computeCharacterStats(CultivationPath.SWORD, 0, 0, [], 'sect_thanh_van');
  const spell = computeCharacterStats(CultivationPath.SWORD, 0, 0, [], 'sect_dan_ha');
  const body = computeCharacterStats(CultivationPath.SWORD, 0, 0, [], 'sect_bach_luyen');
  assert.ok(sword.atk > base.atk && sword.spd > base.spd);
  assert.ok(spell.maxMp > base.maxMp);
  assert.ok(body.def > base.def && body.maxHp > base.maxHp);
});
