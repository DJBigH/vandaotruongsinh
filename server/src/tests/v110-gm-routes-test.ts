import './require-disposable-database';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { AccountRole, CultivationPath } from '@shared';
import { buildServer, prisma } from '../index';
import { ArpgSessionManager } from '../engine/realtime-arpg-engine';
import { computeCharacterStats } from '../modules/character/stats';

test('owner GM bench validates commands, updates the game state, and audits every write', async (t) => {
  const app = await buildServer(); await app.ready();
  const suffix = randomUUID().slice(0, 8);
  const accounts = await Promise.all(['PLAYER', 'OWNER'].map((role) => prisma.account.create({ data: {
    username: `v110_${role.toLowerCase()}_${suffix}`, email: `v110_${role.toLowerCase()}_${suffix}@test.local`,
    passwordHash: 'fixture', role: role as AccountRole,
  } })));
  const [player, owner] = accounts;
  const char = await prisma.character.create({ data: {
    accountId: player.id, name: `V110_${suffix}`, isActive: true, cultivationPath: CultivationPath.SWORD,
    realmIndex: 0, realmTier: 0, gold: 100, stats: { ...computeCharacterStats(CultivationPath.SWORD, 0, 0) },
  } });
  t.after(async () => {
    ArpgSessionManager.getInstance().removeSession(char.id);
    await prisma.auditLog.deleteMany({ where: { adminId: owner.id } });
    for (const account of accounts) await prisma.account.delete({ where: { id: account.id } });
    await app.close(); await prisma.$disconnect();
  });
  const headers = (account: typeof owner) => ({ authorization: `Bearer ${app.jwt.sign({ userId: account.id,
    username: account.username, role: account.role as AccountRole, tokenVersion: 0 })}` });
  const post = (account: typeof owner, command: object) => app.inject({ method: 'POST', url: '/api/admin/gm/apply',
    headers: headers(account), payload: { characterId: char.id, command } });

  assert.equal((await app.inject({ url: '/api/admin/gm/catalog', headers: headers(player) })).statusCode, 403);
  assert.equal((await post(player, { kind: 'godMode', value: true })).statusCode, 403);
  assert.equal((await post(owner, { kind: 'item', templateId: 'made_up', quantity: 1, enhanceLevel: 0 })).statusCode, 400);
  assert.equal((await post(owner, { kind: 'item', templateId: 'item_001', quantity: 2, enhanceLevel: 0 })).statusCode, 400);
  assert.equal((await post(owner, { kind: 'skill', skillId: 'skill_body_01', level: 1 })).statusCode, 400);
  assert.equal((await post(owner, { kind: 'resources', gold: 1_000_001, exp: 0, cultivationExp: 0 })).statusCode, 400);
  assert.equal(await prisma.auditLog.count({ where: { adminId: owner.id } }), 0);

  const commands = [
    { kind: 'godMode', value: true },
    { kind: 'resources', gold: 500, exp: 700, cultivationExp: 900 },
    { kind: 'realm', realmIndex: 2, realmTier: 1 },
    { kind: 'item', templateId: 'item_001', quantity: 1, enhanceLevel: 5 },
    { kind: 'skill', skillId: 'skill_sword_01', level: 5 },
    { kind: 'mount', mountId: 'mount_crane' },
    { kind: 'heal' },
    { kind: 'teleport', mapId: 'map_thanh_khe_rung' },
  ];
  for (const command of commands) {
    const session = command.kind === 'heal' ? await ArpgSessionManager.getInstance().openSession(char.id, player.id) : null;
    if (session) session.player.hp = Math.max(1, session.player.maxHp - 20);
    const response = await post(owner, command);
    assert.equal(response.statusCode, 200, `${command.kind}: ${response.body}`);
    if (session) assert.equal(session.player.hp, session.player.maxHp, 'GM heal reaches the live ARPG session');
  }
  const saved = await prisma.character.findUniqueOrThrow({ where: { id: char.id },
    include: { inventory: true, skills: true, storyFlags: true } });
  assert.equal(saved.godMode, true);
  assert.equal(saved.gold, 600);
  assert.equal(saved.exp, 700n);
  assert.equal(saved.cultivationExp, 900n);
  assert.deepEqual([saved.realmIndex, saved.realmTier], [2, 1]);
  assert.equal(saved.inventory[0]?.enhanceLevel, 5);
  assert.equal(saved.skills[0]?.level, 5);
  assert.equal(saved.activeMount, 'mount_crane');
  assert.equal(saved.currentMapId, 'map_thanh_khe_rung');
  assert.equal(await prisma.auditLog.count({ where: { adminId: owner.id, targetId: char.id } }), commands.length);
  const state = await app.inject({ url: `/api/admin/gm/state/${char.id}`, headers: headers(owner) });
  assert.equal(state.statusCode, 200, state.body);
  assert.equal(state.json().data.mountIds[0], 'mount_crane');
});
