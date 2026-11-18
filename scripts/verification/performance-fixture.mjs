// Original combat rules under an explicitly prepared local load fixture.
import assert from 'node:assert/strict';
import {mkdirSync,readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes} from 'node:crypto';
import {cpus,totalmem,platform,arch} from 'node:os';
import {setTimeout as delay} from 'node:timers/promises';
import {launchBrowser,installReadOnlySceneObserver,observeTransport,waitFor,sceneState,startFrameMeasure,stopFrameMeasure,aimAt} from './browser-helpers.mjs';
import {sourceStamp,writeJson,assertLocalTestConfiguration} from './evidence-utils.mjs';
import {freezeClientBuild,serveFrozenClient} from './frozen-preview.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const out=resolve(process.env.VANDAO_EVIDENCE_DIR??`${root}/docs/evidence/performance`);mkdirSync(out,{recursive:true});
const networkOnly=process.env.VANDAO_FIXTURE_SCOPE==='network';
const results=[],accounts=[],characters=[];
let server,frontend,browser,prisma,manager,maps,original;
const cgroup=path=>{try{return readFileSync(path,'utf8').trim();}catch{return null;}};
const manifest={source:sourceStamp(root),scope:networkOnly?'server-socket-reload-only':'four-skills-and-load',hardware:{cpu:cpus()[0]?.model,logicalCpus:cpus().length,totalMemoryBytes:totalmem(),platform:platform(),arch:arch(),cpuQuota:cgroup('/sys/fs/cgroup/cpu.max'),memoryLimit:cgroup('/sys/fs/cgroup/memory.max')},results,cleanupErrors:[]};
const base='http://127.0.0.1:5185';
const places=[[47,53],[49,53],[51,53],[53,53],[47,55],[53,55],[47,57],[49,57],[51,57],[53,57]];

async function fixture(context,kind,mapId){
  const suffix=`${Date.now()}_${randomBytes(3).toString('hex')}`,username=`m1_perf_${suffix}`;
  const registered=await context.request.post(`${base}/api/auth/register`,{data:{username,email:`${username}@example.invalid`,password:randomBytes(20).toString('hex')}});
  assert(registered.ok(),`register: ${registered.status()}`);
  const account=(await registered.json()).data;assert(account.id,'Registration did not return its account ID');accounts.push(account.id);
  const response=await context.request.post(`${base}/api/game/character`,{data:{name:`Đo${suffix.slice(-13)}`,cultivationPath:'SWORD',appearance:0}});
  assert(response.ok(),`character: ${response.status()}`);const character=(await response.json()).data;characters.push(character.id);
  await prisma.character.update({where:{id:character.id},data:{realmIndex:kind==='skills'?1:8,realmTier:kind==='skills'?1:3,currentMapId:mapId,positionX:mapId===original.id?1600:1024,positionY:mapId===original.id?1760:1100}});
  for(const skillId of ['skill_sword_01','skill_sword_02','skill_sword_03','skill_sword_04'])await prisma.characterSkill.upsert({where:{characterId_skillId:{characterId:character.id,skillId}},create:{characterId:character.id,skillId,level:1,isEquipped:true},update:{isEquipped:true}});
  return character.id;
}
async function enter(context){
  const page=await context.newPage();await installReadOnlySceneObserver(page);const transport=await observeTransport(page);
  await page.goto(`${base}/game`);await waitFor(()=>transport.latest?.type==='TICK'&&transport.latest.cooldowns?.skillsRemainingSec.length===4,'four equipped fixture skills',30000);
  await waitFor(async()=>Boolean(await sceneState(page)),'live Phaser scene');return {page,transport};
}

try{
  process.env.NODE_ENV='test';await assertLocalTestConfiguration(base);
  ({MAP_TEMPLATES:maps}=await import('../../server/src/data/maps.ts'));
  const backend=await import('../../server/src/index.ts');prisma=backend.prisma;
  const {ArpgSessionManager}=await import('../../server/src/engine/realtime-arpg-engine.ts');manager=ArpgSessionManager.getInstance();
  original=maps.map_thanh_khe_rung;
  maps.map_thanh_khe_rung={...original,spawnPoint:{x:50,y:55},monsters:[...places.map(([x,y],i)=>({id:`perf_spawn_${i}`,monsterId:['mon_001','mon_002','mon_003','mon_004'][i%4],position:{x,y},respawnTime:25,level:1})),{id:'perf_boss',monsterId:'boss_001',position:{x:50,y:58},respawnTime:60,level:5}]};
  server=await backend.buildServer();await server.listen({host:'127.0.0.1',port:0});
  const frozen=freezeClientBuild(root);manifest.clientBuild=frozen.stamp;
  frontend=await serveFrozenClient(root,frozen,{backendUrl:`http://127.0.0.1:${server.server.address().port}`,port:5185});
  browser=await launchBrowser();manifest.browser=browser.version();
  manifest.fixture={map:original.id,normalMonsters:10,bosses:1,spawnPositions:places,skillsRealm:{index:1,tier:1},loadRealm:{index:8,tier:3},equippedSkills:['skill_sword_01','skill_sword_02','skill_sword_03','skill_sword_04'],reason:'Only disposable save preparation and this process spawn layout differ. Original monster stats, AI and damage/cost/cooldown formulas remain. High-realm defense keeps the measured player alive. The player casts the target AoE on empty ground within its 200px range so no load actor dies.',loadSampling:'Every Phaser post-render: join snapshot IDs to visible in-camera sprites, require combat-active states, a living player and snapshot age <=250ms.',video:false};
  {
    const context=await browser.newContext({viewport:{width:1366,height:768}});await fixture(context,'skills','map_thanh_khe');
    const {page,transport:t}=await enter(context),skillResults=[];
    for(let slot=0;slot<(networkOnly?0:4);slot++){
      const cost=[15,25,50,35][slot],cooldown=[1.5,3,6,4.5][slot];
      await waitFor(()=>t.latest.playerState.mp>=cost&&t.latest.tick%20>=1&&t.latest.tick%20<=5,'MP and a post-regeneration measurement window',45000);
      const before=t.latest,initialStarts=t.starts[`SKILL_${slot+1}`]??0;
      await aimAt(page,before.playerState.x+150,before.playerState.y);await page.keyboard.press(String(slot+1),{delay:80});
      await waitFor(()=>(t.starts[`SKILL_${slot+1}`]??0)>initialStarts,`confirmed skill ${slot+1}`,3000);
      const after=t.history.find(h=>h.id===t.latestSocket&&h.tick>before.tick&&h.cooldowns.skillsRemainingSec[slot]>0);assert(after,'Missing matching authoritative cast tick');
      assert.equal(Math.floor(after.tick/20),Math.floor(before.tick/20),'Cast measurement crossed MP regeneration; evidence is inconclusive');
      assert.equal(before.playerState.mp-after.player.mp,cost,`Skill ${slot+1} MP cost`);
      const remaining=after.cooldowns.skillsRemainingSec[slot];assert(remaining<=cooldown&&remaining>=cooldown-.2,`Skill ${slot+1} cooldown`);
      const displacement=Math.hypot(after.player.x-before.playerState.x,after.player.y-before.playerState.y);
      if(slot===0)assert(after.projectiles?.some(p=>p.ownerId===after.player.id),'Sword projectile must exist on the confirmed tick');
      if(slot===3)assert(displacement>=159&&displacement<=161,'Sword dash must land at its 160px open-ground endpoint');
      await waitFor(async()=>/player_(cast|attack|dodge)/.test((await sceneState(page))?.player.animation??''),'accepted action animation',1200);
      const scene=await sceneState(page);await page.screenshot({path:`${out}/skill-${slot+1}.png`});
      skillResults.push({slot:slot+1,mpCost:cost,cooldownSeconds:remaining,displacement,authoritativeTick:after.tick,scene});await delay(700);
    }
    if(!networkOnly)results.push({kind:'four-slot-cost-cooldown-animation',skills:skillResults,limitation:'Empty-ground fixture: projectile existence and dash landing are checked; melee/AoE hit damage is covered separately by combat tests and playthrough.',errors:t.errors});
    const oldSocket=t.latestSocket;await page.reload();
    await waitFor(()=>t.latestSocket>oldSocket&&t.latest?.type==='TICK','TICK from replacement socket',30000);
    await waitFor(()=>server.websocketServer.clients.size===1&&[...server.websocketServer.clients][0].readyState===1,'one settled server OPEN socket',5000);
    const sockets=[...server.websocketServer.clients];
    results.push({kind:'server-socket-ownership-after-reload',open:sockets.filter(s=>s.readyState===1).length,closing:sockets.filter(s=>s.readyState===2).length,total:sockets.length,replacementSocket:t.latestSocket,currentDocumentObservations:t.open.size});
    assert.equal(t.errors.length,0,'Uncaught skill/reload browser errors');await context.close();
    // Some headless-shell builds terminate their single-process browser when
    // the final context closes. Each independent fixture gets a fresh browser.
    await browser.close();browser=null;
  }
  for(const viewport of (networkOnly?[]:[{width:1366,height:768},{width:1920,height:1080}])){
    browser=await launchBrowser();
    const context=await browser.newContext({viewport});await fixture(context,'load',original.id);
    const {page,transport:t}=await enter(context);await waitFor(()=>t.latest.entities.length===11,'eleven fixture actors');await delay(2500);
    await startFrameMeasure(page,{observeLoad:true});const began=Date.now(),starts=t.starts.SKILL_3??0;
    let cycle=0,lastCast=-Infinity;
    while(Date.now()-began<45000){
      const key=['w','d','s','a'][cycle++%4];await page.keyboard.down(key);await delay(160);await page.keyboard.up(key);await delay(100);
      if(Date.now()-lastCast>6500&&t.latest.cooldowns.skillsRemainingSec[2]===0){const p=t.latest.playerState;await aimAt(page,p.x-190,p.y);await page.keyboard.press('3',{delay:80});lastCast=Date.now();}
      if(cycle%4===0)writeJson(`${out}/progress.json`,{viewport,elapsedMs:Date.now()-began,ticks:t.ticks,confirmedCasts:(t.starts.SKILL_3??0)-starts,playerHp:t.latest.playerState.hp});
    }
    const frames=await stopFrameMeasure(page),confirmedCasts=(t.starts.SKILL_3??0)-starts;
    const sufficientCoverage=frames.valid&&frames.wallDurationMs>=44000&&frames.coverage>=.98;
    const fullLoad=frames.load.observedFrames>0&&frames.load.fullFrames===frames.load.observedFrames;
    const passed=sufficientCoverage&&fullLoad&&confirmedCasts>=5&&frames.averageFps>=55&&frames.p95Ms<=25&&t.errors.length===0;
    results.push({kind:'load',viewport,frames,confirmedCasts,sufficientCoverage,fullLoadEveryRenderedFrame:fullLoad,errors:t.errors,passed});
    await page.screenshot({path:`${out}/load-${viewport.width}x${viewport.height}.png`});await context.close();await browser.close();browser=null;writeJson(`${out}/result.json`,manifest);
  }
  manifest.passed=results.every(r=>r.kind!=='load'||r.passed);
  if(!manifest.passed)process.exitCode=1;
}catch(error){manifest.failure=String(error.stack??error);manifest.passed=false;process.exitCode=1;}
finally{
  async function clean(name,action){try{await action();}catch(error){manifest.cleanupErrors.push({name,error:String(error)});process.exitCode=1;manifest.passed=false;}}
  if(browser)await clean('browser',()=>browser.close());
  if(frontend)await clean('frontend',()=>frontend.close());
  if(server)await clean('server',()=>server.close());
  if(manager)for(const id of characters)manager.removeSession(id);
  if(prisma){await clean('own fixture accounts',()=>prisma.account.deleteMany({where:{id:{in:accounts}}}));await clean('database client',()=>prisma.$disconnect());}
  if(maps&&original)maps.map_thanh_khe_rung=original;
  writeJson(`${out}/result.json`,manifest);
  console.log(JSON.stringify({passed:manifest.passed,scope:manifest.scope,evidence:out,results:results.map(r=>({kind:r.kind,viewport:r.viewport,passed:r.passed,frames:r.frames})),failure:manifest.failure?.split('\n')[0],cleanupErrors:manifest.cleanupErrors}));
}
