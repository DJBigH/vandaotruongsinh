import './require-disposable-database';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { AccountRole, CultivationPath } from '@shared';
import { buildServer, prisma } from '../index';
import { ArpgGameSession, ArpgSessionManager } from '../engine/realtime-arpg-engine';
import { breakthroughRng } from '../engine/breakthrough-chance';
import { computeCharacterStats } from '../modules/character/stats';
import bcrypt from 'bcrypt';

test('v1.0.4 protects GM commands, applies equipment runes, and records failed breakthroughs once', async (t) => {
  const app = await buildServer(); await app.ready();
  t.after(async () => { await app.close(); await prisma.$disconnect(); });
  const suffix = randomUUID().slice(0, 8);
  const accounts = await Promise.all(['PLAYER', 'OWNER'].map((role) => prisma.account.create({ data: {
    username: `v104_${role.toLowerCase()}_${suffix}`, email: `v104_${role.toLowerCase()}_${suffix}@test.local`,
    passwordHash: 'fixture', role: role as AccountRole,
  } })));
  t.after(async () => {
    await prisma.auditLog.deleteMany({ where: { adminId: accounts[1].id } });
    for (const account of accounts) await prisma.account.delete({ where: { id: account.id } });
  });
  const [player, owner] = accounts;
  const char = await prisma.character.create({ data: {
    accountId: owner.id, name: `GM_${suffix}`, isActive: true, cultivationPath: CultivationPath.SWORD,
    realmIndex: 0, realmTier: 0, cultivationExp: 1000n, gold: 2000,
    stats: { ...computeCharacterStats(CultivationPath.SWORD, 0, 0) },
  } });
  t.after(() => ArpgSessionManager.getInstance().removeSession(char.id));
  const item = await prisma.inventoryItem.create({ data: { characterId: char.id, templateId: 'item_001', quantity: 1, isEquipped: true } });
  await prisma.inventoryItem.create({ data: { characterId: char.id, templateId: 'item_013', quantity: 5 } });
  const token = (account: typeof owner) => app.jwt.sign({ userId: account.id, username: account.username, role: account.role as AccountRole, tokenVersion: 0 });
  const send = async (account: typeof owner, url: string, payload?: Record<string, unknown>) => app.inject({ method: payload === undefined ? 'GET' : 'POST', url,
    headers: { authorization: `Bearer ${token(account)}` }, payload });

  assert.equal((await send(player, '/api/admin/cheats', { godMode: true })).statusCode, 403);
  const gm = await send(owner, '/api/admin/cheats', { godMode: true, gold: 1000, cultivationExp: 1000 });
  assert.equal(gm.statusCode, 200, gm.body);
  assert.equal((await prisma.character.findUniqueOrThrow({ where: { id: char.id } })).godMode, true);
  assert.equal(await prisma.auditLog.count({ where: { targetId: char.id, action: 'OWNER_CHEAT' } }), 1);
  const session = await ArpgSessionManager.getInstance().openSession(char.id, owner.id);
  assert.ok(session);
  const fullHp = session.player.hp;
  (session as any).applyDamageToPlayer(999, 'GM test');
  assert.equal(session.player.hp, fullHp, 'server denies damage while OWNER cheat is active');
  assert.equal((await send(owner, '/api/admin/cheats', { godMode: false })).statusCode, 200);
  (session as any).applyDamageToPlayer(10, 'GM test');
  assert.ok(session.player.hp < fullHp, 'turning the cheat off restores ordinary damage');

  const enchant = await send(owner, `/api/game/inventory/${item.id}/enchant`, { type: 'FURY' });
  assert.equal(enchant.statusCode, 200, enchant.body);
  const equipped = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: item.id } });
  assert.equal(equipped.enchantType, 'FURY');
  const postEnchant = await prisma.character.findUniqueOrThrow({ where: { id: char.id } });
  assert.equal((postEnchant.stats as { atk: number }).atk,
    computeCharacterStats(CultivationPath.SWORD, 0, 0, [{ templateId: 'item_001' }]).atk + 8);
  assert.equal((await send(owner, `/api/game/inventory/${item.id}/enchant`, { type: 'WARD' })).statusCode, 400);

  const prior = await prisma.character.findUniqueOrThrow({ where: { id: char.id } });
  const requestId = randomUUID();
  t.mock.method(breakthroughRng, 'roll', () => 0.99);
  const payload = { characterId: char.id, realmIndex: 0, realmTier: 0, requestId };
  const first = await send(owner, '/api/game/character/breakthrough', payload);
  assert.equal(first.statusCode, 200, first.body);
  assert.equal(first.json().data.success, false);
  const afterFailure = await prisma.character.findUniqueOrThrow({ where: { id: char.id } });
  assert.equal(afterFailure.realmTier, 0);
  assert.ok(afterFailure.cultivationExp < prior.cultivationExp);
  assert.equal((await send(owner, '/api/game/character/breakthrough', payload)).statusCode, 200);
  assert.equal((await prisma.character.findUniqueOrThrow({ where: { id: char.id } })).cultivationExp, afterFailure.cultivationExp);
  assert.equal(await prisma.breakthroughAttempt.count({ where: { characterId: char.id } }), 1);
});

test('bootstrap password must change before game access and old token is revoked', async (t) => {
  const app = await buildServer(); await app.ready();
  t.after(async () => { await app.close(); await prisma.$disconnect(); });
  const suffix = randomUUID().slice(0, 8);
  const account = await prisma.account.create({ data: {
    username: `bootstrap_${suffix}`, email: `bootstrap_${suffix}@test.local`,
    passwordHash: await bcrypt.hash('admin@1234', 10), role: AccountRole.OWNER, mustChangePassword: true,
  } });
  t.after(async () => { await prisma.account.delete({ where: { id: account.id } }); });
  const login = await app.inject({ method: 'POST', url: '/api/auth/login',
    payload: { username: account.username, password: 'admin@1234' } });
  assert.equal(login.statusCode, 200, login.body);
  assert.equal(login.json().data.mustChangePassword, true);
  const oldCookie = login.cookies.find((entry) => entry.name === 'token')?.value;
  assert.ok(oldCookie);
  const restricted = await app.inject({ url: '/api/admin/dashboard', headers: { cookie: `token=${oldCookie}` } });
  assert.equal(restricted.statusCode, 403);
  const change = await app.inject({ method: 'POST', url: '/api/auth/change-password',
    headers: { cookie: `token=${oldCookie}` },
    payload: { currentPassword: 'admin@1234', newPassword: 'different_admin_password_123' } });
  assert.equal(change.statusCode, 200, change.body);
  assert.equal((await app.inject({ url: '/api/auth/me', headers: { cookie: `token=${oldCookie}` } })).statusCode, 401);
  const newCookie = change.cookies.find((entry) => entry.name === 'token')?.value;
  assert.ok(newCookie);
  assert.equal((await app.inject({ url: '/api/auth/me', headers: { cookie: `token=${newCookie}` } })).statusCode, 200);
});

test('the timed Lang Vương has a distinct empowered form and returns to ordinary combat after the window', () => {
  const session = new ArpgGameSession({ id: randomUUID(), name: 'boss_fixture', cultivationPath: 'SWORD',
    realmIndex: 0, realmTier: 0, currentMapId: 'map_thanh_khe_rung' });
  const boss = session.monsters.find((monster) => monster.templateId === 'boss_001');
  assert.ok(boss);
  const baseHp = boss.maxHp;
  const baseAtk = boss.atk;
  (session as any).syncWorldBossPower(Date.parse('2026-11-20T13:05:00Z'));
  assert.equal(boss.maxHp, baseHp * 2);
  assert.ok(boss.atk > baseAtk);
  assert.match(boss.name, /Thiên Khế/);
  (session as any).syncWorldBossPower(Date.parse('2026-11-20T13:35:00Z'));
  assert.equal(boss.maxHp, baseHp);
  assert.equal(boss.atk, baseAtk);
});
