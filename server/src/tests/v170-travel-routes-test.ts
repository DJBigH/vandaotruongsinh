import './require-disposable-database';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { after, before, test } from 'node:test';
import { AccountRole, CultivationPath, DaoAlignment } from '@shared';
import { buildServer, prisma } from '../index';
import { computeCharacterStats } from '../modules/character/stats';
import { ArpgSessionManager } from '../engine/realtime-arpg-engine';

let app: Awaited<ReturnType<typeof buildServer>>;
before(async () => { app = await buildServer(); await app.ready(); });
after(async () => { await app?.close(); await prisma.$disconnect(); });

test('Ma travel is branch locked and a low-realm cast cannot be skipped', async t => {
  const name=`v170_${randomUUID().slice(0,8)}`;
  const account=await prisma.account.create({data:{username:name,email:`${name}@vandao.test`,passwordHash:'fixture'}});
  t.after(()=>prisma.account.delete({where:{id:account.id}}));
  const character=await prisma.character.create({data:{accountId:account.id,name,
    alignment:DaoAlignment.DEMONIC,cultivationPath:CultivationPath.SWORD,isActive:true,
    stats:{...computeCharacterStats(CultivationPath.SWORD,0,0)},
    currentMapId:'map_u_lam',positionX:1024,positionY:128}});
  t.after(()=>ArpgSessionManager.getInstance().removeSession(character.id));
  const token=app.jwt.sign({userId:account.id,username:name,role:AccountRole.PLAYER});
  const headers={authorization:`Bearer ${token}`};
  const post=(path:string,payload:object)=>app.inject({method:'POST',url:`/api/game${path}`,headers,payload});
  const maps=await app.inject({url:'/api/game/maps',headers});
  assert.equal(maps.statusCode,200,maps.body);
  assert.equal(maps.json().data.length,10);
  assert.ok(maps.json().data.every((entry:{id:string})=>entry.id!=='map_thanh_khe'));
  assert.equal((await post('/maps/teleport',{targetMapId:'map_thanh_khe'})).statusCode,403);
  assert.equal((await post('/maps/teleport',{targetMapId:'map_huyen_u_khe'})).statusCode,409);

  const begin=await post('/maps/teleport/begin',{targetMapId:'map_huyen_u_khe'});
  assert.equal(begin.statusCode,200,begin.body);
  const cast=begin.json().data as {token:string;durationMs:number};
  assert.equal(cast.durationMs,2500);
  assert.equal((await post('/maps/teleport',{targetMapId:'map_huyen_u_khe',castToken:cast.token})).statusCode,409);
  await delay(cast.durationMs+80);
  const arrived=await post('/maps/teleport',{targetMapId:'map_huyen_u_khe',castToken:cast.token});
  assert.equal(arrived.statusCode,200,arrived.body);
  assert.equal(arrived.json().data.mapId,'map_huyen_u_khe');
  assert.equal((await prisma.character.findUniqueOrThrow({where:{id:character.id}})).currentMapId,'map_huyen_u_khe');

  await prisma.character.update({where:{id:character.id},data:{realmIndex:3}});
  assert.equal((await post('/maps/teleport',{targetMapId:'map_u_lam'})).statusCode,200);
});
