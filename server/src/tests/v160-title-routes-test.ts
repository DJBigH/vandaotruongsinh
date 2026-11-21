import './require-disposable-database';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { AccountRole, CultivationPath, DaoAlignment, CharacterGender } from '@shared';
import { buildServer, prisma } from '../index';
import { ArpgSessionManager } from '../engine/realtime-arpg-engine';

test('new Tiên and Ma births equip only unlocked titles on their own character',async t=>{
  const app=await buildServer();await app.ready();
  t.after(async()=>{await app.close();await prisma.$disconnect();});
  const suffix=randomUUID().slice(0,8);
  const account=await prisma.account.create({data:{username:`v160_${suffix}`,email:`v160_${suffix}@test.local`,
    passwordHash:'fixture',role:AccountRole.PLAYER}});
  t.after(async()=>{await prisma.account.delete({where:{id:account.id}});});
  const token=app.jwt.sign({userId:account.id,username:account.username,role:AccountRole.PLAYER});
  const headers={authorization:`Bearer ${token}`};
  const create=async(name:string,alignment:DaoAlignment)=>app.inject({method:'POST',url:'/api/game/character',headers,
    payload:{name,cultivationPath:CultivationPath.SWORD,gender:CharacterGender.FEMALE,alignment,appearance:0}});
  const first=await create(`Tien_${suffix}`,DaoAlignment.IMMORTAL);
  assert.equal(first.statusCode,200,first.body);
  assert.equal(first.json().data.currentMapId,'map_thanh_khe');
  const firstId=first.json().data.id as string;
  t.after(()=>ArpgSessionManager.getInstance().removeSession(firstId));
  const second=await create(`Ma_${suffix}`,DaoAlignment.DEMONIC);
  assert.equal(second.statusCode,200,second.body);
  assert.equal(second.json().data.currentMapId,'map_huyen_u_khe');
  assert.equal(second.json().data.equippedTitleId,'heir');
  const secondId=second.json().data.id as string;
  t.after(()=>ArpgSessionManager.getInstance().removeSession(secondId));
  const maForest=await app.inject({url:'/api/game/maps/map_u_lam',headers});
  assert.equal(maForest.statusCode,200,maForest.body);
  assert.deepEqual(maForest.json().data.portals.map((portal:{targetMapId:string})=>portal.targetMapId),['map_huyen_u_khe']);
  const wrongBirthplace=await app.inject({method:'POST',url:'/api/game/maps/teleport',headers,
    payload:{targetMapId:'map_thanh_khe'}});
  assert.equal(wrongBirthplace.statusCode,403,wrongBirthplace.body);
  const titles=await app.inject({url:'/api/game/titles',headers});
  assert.equal(titles.statusCode,200,titles.body);
  assert.equal(titles.json().data.titles[0].name,'Ma Tôn Hậu Duệ');
  assert.equal(titles.json().data.titles[0].unlocked,true);
  const forbidden=await app.inject({method:'POST',url:'/api/game/titles/equip',headers,payload:{titleId:'ascendant'}});
  assert.equal(forbidden.statusCode,403,forbidden.body);
  const invalid=await app.inject({method:'POST',url:'/api/game/titles/equip',headers,payload:{titleId:'gm'}});
  assert.equal(invalid.statusCode,400);
  const remove=await app.inject({method:'POST',url:'/api/game/titles/equip',headers,payload:{titleId:null}});
  assert.equal(remove.statusCode,200,remove.body);
  const summary=await app.inject({url:'/api/game/character',headers});
  assert.equal(summary.json().data.equippedTitleId,null);
  const oldFlag=await prisma.storyFlag.findUnique({where:{characterId_flagKey:{characterId:firstId,flagKey:'EQUIPPED_TITLE'}}});
  assert.equal(oldFlag,null);
  const equip=await app.inject({method:'POST',url:'/api/game/titles/equip',headers,payload:{titleId:'heir',characterId:firstId}});
  assert.equal(equip.statusCode,200,equip.body);
  const maFlag=await prisma.storyFlag.findUnique({where:{characterId_flagKey:{characterId:secondId,flagKey:'EQUIPPED_TITLE'}}});
  assert.equal(maFlag?.flagValue,'heir');
  await prisma.storyFlag.update({where:{characterId_flagKey:{characterId:secondId,flagKey:'EQUIPPED_TITLE'}},
    data:{flagValue:'invalid_old_save'}});
  const repaired=await app.inject({url:'/api/game/character',headers});
  assert.equal(repaired.json().data.equippedTitleId,null);
});
