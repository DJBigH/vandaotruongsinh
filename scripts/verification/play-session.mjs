// A local, recorded acceptance session controlled through JSON files.
// All gameplay mutations use the normal UI, mouse and keyboard. Inspection is
// read-only; the sole transport mutation is an explicit reconnect fault.
import assert from 'node:assert/strict';
import {mkdirSync,appendFileSync,readdirSync,readFileSync,renameSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {launchBrowser,installReadOnlySceneObserver,observeTransport,waitFor,sceneState,releaseKeys,aimAt,startFrameMeasure,stopFrameMeasure,forceTransportReconnect} from './browser-helpers.mjs';
import {walkRoute} from './walking-route.mjs';
import {writeJson,sourceStamp,assertLocalTestConfiguration} from './evidence-utils.mjs';

const base=process.env.VANDAO_TEST_URL??'http://127.0.0.1:5173';
await assertLocalTestConfiguration(base);
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const out=resolve(process.env.VANDAO_EVIDENCE_DIR??'../docs/evidence/playthrough');
const queue=resolve(process.env.VANDAO_BROWSER_COMMANDS??'../scratch/browser-session');
mkdirSync(out,{recursive:true});mkdirSync(queue,{recursive:true});
const started=Date.now(),sessionId=`${started}-${randomBytes(6).toString('hex')}`,source=sourceStamp(root);
const clientBuild=process.env.VANDAO_BUILD_MANIFEST?JSON.parse(readFileSync(process.env.VANDAO_BUILD_MANIFEST,'utf8')):null;
const commandFailures=[];
function record(event,data={}) {
  const row={elapsedMs:Date.now()-started,event,...data};
  appendFileSync(`${out}/timeline.jsonl`,JSON.stringify(row)+'\n');
  writeJson(`${out}/progress.json`,row);
}
const browser=await launchBrowser();
const contextOptions={viewport:{width:1366,height:768}};
if(process.env.VANDAO_STORAGE_STATE)contextOptions.storageState=process.env.VANDAO_STORAGE_STATE;
if(process.env.VANDAO_RECORD_VIDEO==='1')contextOptions.recordVideo={dir:`${out}/video`,size:{width:1366,height:768}};
const context=await browser.newContext(contextOptions),page=await context.newPage();
await installReadOnlySceneObserver(page);
const transport=await observeTransport(page,record),maps=new Map();
async function readApi(path){const r=await context.request.get(`${base}/api/game/${path}`);assert(r.ok(),`${path}: ${r.status()}`);return (await r.json()).data;}
async function currentMap(){const id=transport.latest.currentMapId;if(!maps.has(id))maps.set(id,await readApi(`maps/${id}`));return maps.get(id);}
async function walk(x,y){await walkRoute(page,transport,await currentMap(),x,y,record);}
async function closePanel(){const cross=page.getByRole('button',{name:/^(✕|Đóng bản đồ|Đóng thiết lập)$/});assert(await cross.count(),'No panel close control');await cross.last().click();await delay(150);}
async function clickMenu(name){
  const button=page.getByRole('button',{name:new RegExp(name,'i')});
  if(!await button.count())await page.getByRole('button',{name:/Mở Menu Hệ Thống/}).click();
  await button.click();await delay(220);
}
async function clickCard(title,buttonText){
  let point;
  await waitFor(async()=>{point=await page.evaluate(({title,buttonText})=>{
    const leaf=[...document.querySelectorAll('span,h3,h4,strong')].find(e=>e.textContent.includes(title)&&e.getBoundingClientRect().height>0);
    for(let p=leaf;p&&p!==document.body;p=p.parentElement){
      const b=[...p.querySelectorAll('button')].find(e=>e.textContent.replace(/\s+/g,' ').trim().includes(buttonText));
      if(b){b.scrollIntoView({block:'center'});const r=b.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};}
    }return null;
  },{title,buttonText});return Boolean(point);},`visible ${buttonText} for ${title}`,7000);
  assert(point,`No visible ${buttonText} for ${title}`);await page.mouse.click(point.x,point.y);await delay(300);
}
async function dialogue(){
  await page.keyboard.press('e',{delay:80});await page.getByRole('button',{name:/Tiếp Tục|Kết Thúc/}).waitFor();
  await delay(600);
  for(let i=0;i<10;i++){
    const done=page.getByRole('button',{name:'Kết Thúc',exact:true});
    if(await done.count()){await done.click();return;}
    const next=page.getByRole('button',{name:/Tiếp Tục/});
    if(!await next.count())throw new Error('Unexpected dialogue choices; use an explicit click command');
    await next.click();await delay(500);
  }
  throw new Error('Dialogue did not finish within ten observed steps');
}
async function fight(templateId,timeout=45000){
  const alive=()=>transport.latest.entities.filter(e=>e.templateId===templateId&&e.state!=='DEAD');
  const initial=alive().sort((a,b)=>Math.hypot(a.x-transport.latest.playerState.x,a.y-transport.latest.playerState.y)-Math.hypot(b.x-transport.latest.playerState.x,b.y-transport.latest.playerState.y))[0];
  assert(initial,`No living ${templateId}`);
  if(Math.hypot(initial.x-transport.latest.playerState.x,initial.y-transport.latest.playerState.y)>220)await walk(initial.x,initial.y);
  const id=initial.id,map=transport.latest.currentMapId,began=Date.now();let held=[],lastAttack=0,lastSkill=0,lastDodge=0,retreatUntil=0,lastProgress=0;
  record('fight-start',{templateId,id,playerHp:transport.latest.playerState.hp,targetHp:initial.hp});
  try {
    while(Date.now()-began<timeout){
      const tick=transport.latest,p=tick.playerState,e=tick.entities.find(e=>e.id===id);
      assert.equal(tick.currentMapId,map,'Map changed before the target death was confirmed');
      assert(e,'Target disappeared before an authoritative death was confirmed');
      if(e.state==='DEAD'){record('fight-kill',{id,templateId,durationMs:Date.now()-began,playerHp:p.hp,tick:tick.tick});return;}
      if(p.state==='DEAD')throw new Error(`Defeated while fighting ${templateId}`);
      const dx=e.x-p.x,dy=e.y-p.y,dist=Math.hypot(dx,dy),now=Date.now();
      if(now-lastProgress>=500){record('fight-progress',{id,templateId,playerHp:p.hp,playerMp:p.mp,targetHp:e.hp,targetState:e.state,distance:dist,telegraphs:(tick.telegraphs??[]).map(t=>({id:t.id,remainingSec:t.remainingSec}))});lastProgress=now;}
      let wanted=[];
      if(dist>65&&now>=retreatUntil){if(Math.abs(dx)>18)wanted.push(dx>0?'d':'a');if(Math.abs(dy)>18)wanted.push(dy>0?'s':'w');}
      const danger=(tick.telegraphs??[]).find(t=>Math.hypot(p.x-t.x,p.y-t.y)<(t.radius??80)+14);
      if(danger&&danger.remainingSec<.55&&tick.cooldowns.dodgeRemainingSec<=0&&p.mp>=5&&now-lastDodge>1200){
        // Dodge away from the confirmed danger circle using actual direction keys.
        wanted=[p.x>=e.x?'d':'a'];
        for(const key of held.filter(k=>!wanted.includes(k)))await page.keyboard.up(key);
        for(const key of wanted.filter(k=>!held.includes(k)))await page.keyboard.down(key);
        held=wanted;await page.keyboard.press('Space',{delay:80});lastDodge=now;
        // Do not immediately walk back into the same unresolved warning.
        retreatUntil=now+Math.max(650,danger.remainingSec*1000+150);
      }else{
        for(const key of held.filter(k=>!wanted.includes(k)))await page.keyboard.up(key);
        for(const key of wanted.filter(k=>!held.includes(k)))await page.keyboard.down(key);
        held=wanted;
      }
      await aimAt(page,e.x,e.y);
      if(now>=retreatUntil&&dist<260&&p.mp>=20&&(tick.cooldowns.skillsRemainingSec[0]??1)<=0&&tick.cooldowns.attackRemainingSec<=0&&now-lastSkill>1700){
        await page.keyboard.press('1',{delay:80});lastSkill=now;
      }else if(now>=retreatUntil&&dist<84&&now-lastAttack>360&&now-lastSkill>650){
        const target=await aimAt(page,e.x,e.y);await page.mouse.click(target.x,target.y);lastAttack=now;
      }
      await delay(80);
    }
    throw new Error(`Combat timeout ${templateId}`);
  }finally{for(const key of held)await page.keyboard.up(key);}
}
async function state(){return{sessionId,elapsedMs:Date.now()-started,server:transport.latest,scene:await sceneState(page),openSockets:transport.open.size,pageErrors:transport.errors,bodyText:(await page.locator('body').innerText()).slice(0,7500)};}
async function inventoryTilePositions(){
  const tiles=page.locator('div').filter({has:page.locator(':scope > span')});
  // The shipped bag exposes icon tiles rather than item-name buttons. Locate
  // visible tile geometry, click normally, and verify the resulting detail.
  const positions=await tiles.evaluateAll(nodes=>nodes.filter(e=>e.style.width==='64px'&&e.style.height==='64px'&&e.style.cursor==='pointer').map(e=>{
    const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};
  }));
  assert(positions.length,'No visible inventory tiles');
  return positions;
}
async function selectInventoryItem(item){
  const positions=await inventoryTilePositions();
  for(const point of positions){
    await page.mouse.click(point.x,point.y);await delay(80);
    if(await page.getByText(item.name,{exact:true}).count()){
      const equipped=await page.evaluate(({x,y})=>{
        let tile=document.elementFromPoint(x,y);while(tile&&!(tile.style?.width==='64px'&&tile.style?.height==='64px'))tile=tile.parentElement;
        if(!tile)throw new Error('Selected inventory tile not found');
        return tile.textContent.includes('Đang Mặc');
      },point);
      if(equipped===Boolean(item.isEquipped))return point;
    }
  }
  throw new Error(`Could not select inventory detail for ${item.name}`);
}
async function run(command){
  switch(command.type){
    case 'walk': await walk(command.x,command.y);break;
    case 'key': for(const key of command.keys??[command.key])await page.keyboard.press(key,{delay:80});await delay(command.waitMs??300);break;
    case 'hold': for(const key of command.keys)await page.keyboard.down(key);await delay(Math.min(command.ms,15000));for(const key of command.keys)await page.keyboard.up(key);await delay(150);break;
    case 'aim': await aimAt(page,command.x,command.y);break;
    case 'attack': {const point=await aimAt(page,command.x,command.y);await page.mouse.click(point.x,point.y);await delay(command.waitMs??250);break;}
    case 'click': await page.getByRole('button',{name:new RegExp(command.text,'i')}).click();await delay(250);break;
    case 'menu': await clickMenu(command.name);break;
    case 'settings': {
      await clickMenu('Cài Đặt');await page.getByRole('heading',{name:/THIẾT LẬP & HƯỚNG DẪN/}).waitFor();
      if(typeof command.sfx==='boolean')await page.getByLabel('Hiệu Ứng Âm Thanh',{exact:true}).setChecked(command.sfx);
      if(typeof command.reducedEffects==='boolean')await page.getByLabel('Giảm hiệu ứng và tắt rung màn hình',{exact:true}).setChecked(command.reducedEffects);
      const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('vandao.presentation.v1')??'null'));
      if(typeof command.sfx==='boolean')assert.equal(saved?.sfx,command.sfx);
      if(typeof command.reducedEffects==='boolean')assert.equal(saved?.reducedEffects,command.reducedEffects);
      await closePanel();return {saved};
    }
    case 'audio-state': return page.evaluate(()=>{const sound=window.__acceptanceScene?.().sound;return {locked:sound?.locked,contextState:sound?.context?.state,playing:sound?.sounds?.filter(s=>s.isPlaying).map(s=>s.key),preference:JSON.parse(localStorage.getItem('vandao.presentation.v1')??'null')};});
    case 'slot-create': {
      const previous=transport.latestSocket,oldId=transport.latest.playerState.id;
      await page.getByRole('button',{name:/3 Đạo Thân/}).click();await page.getByRole('button',{name:'+ Tạo Mới',exact:true}).first().click();
      await page.getByPlaceholder('Nhập tên đạo hiệu...').fill(command.name);await page.locator('select').selectOption(command.path);
      await page.getByRole('button',{name:'Xác Nhận Khởi Tạo',exact:true}).click();
      await waitFor(()=>transport.latestSocket>previous&&transport.latest?.type==='TICK'&&transport.latest.playerState.id!==oldId,'new active slot TICK',30000);
      assert.equal(transport.latest.playerState.cultivationPath,command.path);break;
    }
    case 'slot-switch': {
      const previous=transport.latestSocket,oldId=transport.latest.playerState.id;
      await page.getByRole('button',{name:/3 Đạo Thân/}).click();await clickCard(command.name,'Xuất Hồn');
      await waitFor(()=>transport.latestSocket>previous&&transport.latest?.type==='TICK'&&transport.latest.playerState.id!==oldId,'selected slot TICK',30000);
      if(command.path)assert.equal(transport.latest.playerState.cultivationPath,command.path);break;
    }
    case 'close': await closePanel();break;
    case 'dialogue': await dialogue();break;
    case 'fight': await fight(command.templateId,command.timeout);break;
    case 'quest': {
      const quest=(await readApi('quests')).find(q=>q.templateId===command.id);assert(quest,'Unknown quest');
      await clickMenu('N.Vụ|Nhiệm Vụ');
      await page.getByRole('button',{name:command.action==='accept'?'Có Thể Nhận':'Đang Thực Hiện',exact:true}).click();
      await clickCard(quest.name,command.action==='accept'?'Tiếp Nhận':'Nhận Thưởng');await closePanel();
      const expected=command.action==='accept'?'ACTIVE':'TURNED_IN';
      await waitFor(async()=>(await readApi('quests')).find(q=>q.templateId===command.id)?.status===expected,`quest ${command.id} becomes ${expected}`,5000);
      return readApi('quests');
    }
    case 'inspect-item': {
      const items=(await readApi('inventory')).filter(i=>i.templateId===command.templateId);assert(items.length,'No matching server inventory item');
      const item=items[0],expected=items.reduce((sum,i)=>sum+i.quantity,0);let displayed=0;
      await page.keyboard.press('i',{delay:80});await page.getByRole('heading',{name:/TÚI TRỮ VẬT/}).waitFor();
      for(const point of await inventoryTilePositions()){
        await page.mouse.click(point.x,point.y);await delay(80);
        if(await page.getByText(item.name,{exact:true}).count())displayed+=await page.evaluate(({x,y})=>{
          let tile=document.elementFromPoint(x,y);while(tile&&!(tile.style?.width==='64px'&&tile.style?.height==='64px'))tile=tile.parentElement;
          if(!tile)throw new Error('Selected inventory tile not found');
          const quantity=[...tile.querySelectorAll(':scope > span')].map(e=>e.textContent.trim()).find(s=>/^\d+$/.test(s));
          return quantity?Number(quantity):1;
        },point);
      }
      assert.equal(displayed,expected,'Visible bag quantity must match the committed reward before another refresh');
      await selectInventoryItem(item);
      if(command.screenshot)await page.screenshot({path:`${out}/${command.screenshot.replace(/[^a-zA-Z0-9_-]/g,'_')}.png`});
      await closePanel();return {templateId:item.templateId,name:item.name,displayedQuantity:displayed,serverQuantity:expected};
    }
    case 'equip': {
      const items=await readApi('inventory'),eligible=items.filter(i=>i.templateId===command.templateId&&i.isEquipped===Boolean(command.remove)),item=eligible[0];assert(item,'No matching item in the requested equipment state');
      const eligibleIds=new Set(eligible.map(i=>i.id));
      await page.keyboard.press('i',{delay:80});await page.getByRole('heading',{name:/TÚI TRỮ VẬT/}).waitFor();
      await selectInventoryItem(item);
      // The category filter is also named Trang Bị. Scope to the selected
      // item's detail section, whose name is rendered in its own header.
      const detail=page.getByText(item.name,{exact:true}).locator('..').locator('..');
      await detail.getByRole('button',{name:command.remove?'Tháo Ra':'Trang Bị',exact:true}).click();await delay(300);await closePanel();
      // Identical rows expose no UI identity; exactly one previously eligible
      // row must change state, whichever matching visible card was selected.
      await waitFor(async()=>(await readApi('inventory')).filter(i=>eligibleIds.has(i.id)&&i.isEquipped===!command.remove).length===1,'equipment API postcondition',5000);
      return readApi('inventory');
    }
    case 'use': {
      const items=await readApi('inventory'),item=items.find(i=>i.templateId===command.templateId);assert(item,'No matching consumable');
      const quantity=items.filter(i=>i.templateId===command.templateId).reduce((sum,i)=>sum+i.quantity,0);
      const before={...transport.latest.playerState};
      await page.keyboard.press('i',{delay:80});await page.getByRole('heading',{name:/TÚI TRỮ VẬT/}).waitFor();await selectInventoryItem(item);
      await page.getByRole('button',{name:'Sử Dụng',exact:true}).click();await delay(300);await closePanel();
      await waitFor(async()=>(await readApi('inventory')).filter(i=>i.templateId===command.templateId).reduce((sum,i)=>sum+i.quantity,0)===quantity-1,'consumable quantity decreases by one',5000);
      if(command.expect){
        const {resource,amount}=command.expect;assert(['hp','mp'].includes(resource));
        const maximum=before[resource==='hp'?'maxHp':'maxMp'],expected=Math.min(maximum,before[resource]+amount);
        await waitFor(()=>transport.latest.playerState[resource]>=expected,`live ${resource} reaches ${expected}`,5000);
      }
      return readApi('inventory');
    }
    case 'wait': await delay(Math.min(command.ms,45000));break;
    case 'screenshot': await page.screenshot({path:`${out}/${command.name.replace(/[^a-zA-Z0-9_-]/g,'_')}.png`});break;
    case 'viewport': await page.setViewportSize({width:command.width,height:command.height});await delay(500);break;
    case 'reload': {const previous=transport.latestSocket;await page.reload();await page.locator('canvas').waitFor();await waitFor(()=>transport.latestSocket>previous&&transport.latest?.type==='TICK'&&transport.open.size===1,'fresh replacement TICK after reload',30000);await delay(400);break;}
    case 'reconnect': {const previous=transport.latestSocket;await forceTransportReconnect(page);await waitFor(()=>transport.latestSocket>previous&&transport.latest?.type==='TICK'&&transport.open.size===1,'fresh replacement TICK after reconnect',20000);await delay(400);break;}
    case 'measure-start': await startFrameMeasure(page);break;
    case 'measure-stop': return stopFrameMeasure(page);
    case 'read': return readApi(command.path);
    case 'state': return state();
    default: throw new Error(`Unknown command ${command.type}`);
  }
  return {player:transport.latest?.playerState,map:transport.latest?.currentMapId,scene:await sceneState(page)};
}

let timer,finishing=false,finishResultPath=null,fatal=null,finalState=null;
try {
  if(process.env.VANDAO_STORAGE_STATE){await page.goto(`${base}/game`);}
  else{
    const suffix=Date.now().toString().slice(-8),password=randomBytes(16).toString('hex');
    await page.goto(`${base}/register`);
    await page.getByPlaceholder('Nhập tên đăng nhập...').fill(`m1_journey_${suffix}`);
    await page.getByPlaceholder('Nhập email...').fill(`m1_journey_${suffix}@example.invalid`);
    await page.getByPlaceholder('Nhập mật khẩu...',{exact:true}).fill(password);
    await page.getByPlaceholder('Nhập lại mật khẩu...').fill(password);
    await page.getByRole('button',{name:/Đăng Ký/}).click();
    await page.getByPlaceholder('Nhập tên đạo hiệu...').fill(`Thanh${suffix}`);
    await page.getByRole('button',{name:/Bước Vào Tu Tiên Giới/i}).click();
  }
  await page.locator('canvas').waitFor({timeout:30000});await waitFor(()=>transport.latest?.playerState,'initial tick');
  await delay(500);await waitFor(async()=>Boolean(await sceneState(page)),'live Phaser scene');
  await context.storageState({path:`${queue}/session.private.json`});
  record('ready',{source,clientBuild,browser:browser.version(),video:Boolean(contextOptions.recordVideo)});
  writeJson(`${queue}/ready.json`,{...await state(),closed:false});
  timer=setInterval(()=>{
    const p=transport.latest?.playerState;
    record('sample',{map:transport.latest?.currentMapId,player:p&&{x:p.x,y:p.y,hp:p.hp,mp:p.mp,state:p.state},liveMonsters:(transport.latest?.entities??[]).filter(e=>e.state!=='DEAD'&&e.type==='MONSTER').length,liveBosses:(transport.latest?.entities??[]).filter(e=>e.state!=='DEAD'&&e.type==='BOSS').length,ticks:transport.ticks});
  },1000);
  while(!finishing){
    for(const file of readdirSync(queue).filter(n=>n.endsWith('.request.json')).sort()){
      const path=`${queue}/${file}`,envelope=JSON.parse(readFileSync(path,'utf8'));renameSync(path,path.replace('.request.json','.running.json'));
      const command=envelope.command;
      if(envelope.sessionId!==sessionId){writeJson(path.replace('.request.json','.result.json'),{ok:false,error:'Command belongs to a different session'});continue;}
      if(command.type==='finish'){
        // Stop intake immediately. Both a failed final snapshot and a failed
        // cleanup are reported once, only after finalization has been attempted.
        finishing=true;finishResultPath=path.replace('.request.json','.result.json');
        writeJson(`${queue}/ready.json`,{sessionId,closing:true,closed:false,evidence:out});
        record('command',{command});
        try{finalState=await state();}catch(error){fatal=String(error.stack??error);}
        break;
      }
      let result;
      try {
        record('command',{command});
        result=await run(command);
        record('command-complete',{type:command.type});result={ok:true,result};
      }catch(error){result={ok:false,error:String(error.stack??error)};commandFailures.push({command,error:String(error)});record('command-failed',{type:command.type,error:String(error)});await releaseKeys(page).catch(()=>{});await page.screenshot({path:`${out}/latest-command-failure.png`}).catch(()=>{});}
      writeJson(path.replace('.request.json','.result.json'),result);
    }
    if(!finishing)await delay(100);
  }
}catch(error){fatal=String(error.stack??error);process.exitCode=1;}
finally{
  if(timer)clearInterval(timer);await releaseKeys(page).catch(()=>{});
  const video=page.video(),cleanupErrors=[];let videoPath=null,videoMetadata=null;
  try{await context.close();}catch(error){cleanupErrors.push(String(error));}
  if(video)try{
    videoPath=await video.path();assert(existsSync(videoPath),'Recording was not finalized');
    videoMetadata=JSON.parse(execFileSync('ffprobe',['-v','error','-show_entries','format=duration,size:stream=codec_name,width,height','-of','json',videoPath],{encoding:'utf8'}));
    assert(Number(videoMetadata.format?.duration)>0,'Recording has no positive readable duration');
  }catch(error){cleanupErrors.push(`video: ${error}`);}
  const browserVersion=browser.version();try{await browser.close();}catch(error){cleanupErrors.push(String(error));}
  const completed=finishing&&finalState!==null&&!fatal&&cleanupErrors.length===0;
  const manifest={sessionId,source,clientBuild,startedAt:new Date(started).toISOString(),durationMs:Date.now()-started,browser:browserVersion,videoPath,videoMetadata,errors:transport.errors,sockets:transport.sockets,ticks:transport.ticks,actions:transport.actions,confirmedActions:transport.starts,rewards:transport.rewards,deaths:transport.deaths,commandFailures,completed,fatal,cleanupErrors};
  writeJson(`${out}/session-result.json`,manifest);
  if(finishResultPath)writeJson(finishResultPath,{ok:completed,result:{...finalState,manifest:`${out}/session-result.json`,videoPath,videoMetadata},error:completed?undefined:fatal??cleanupErrors.join('; ')});
  writeJson(`${queue}/ready.json`,{sessionId,closed:true,completed,evidence:out});
  if(!completed)process.exitCode=1;
  console.log(JSON.stringify({completed,durationMs:Date.now()-started,evidence:out,fatal,cleanupErrors}));
}
