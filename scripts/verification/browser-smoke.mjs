// Run from server/ with: node --import tsx ../scripts/verification/browser-smoke.mjs
// Requires a disposable local stack, Playwright, and Chromium. No mocked gameplay.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,appendFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {launchBrowser,installReadOnlySceneObserver,observeTransport,waitFor,sceneState,releaseKeys,aimAt,forceTransportReconnect} from './browser-helpers.mjs';
import {walkRoute} from './walking-route.mjs';
import {writeJson,sourceStamp,assertLocalTestConfiguration} from './evidence-utils.mjs';

const base=process.env.VANDAO_TEST_URL??'http://127.0.0.1:5173';
await assertLocalTestConfiguration(base);
const source=sourceStamp(resolve(dirname(fileURLToPath(import.meta.url)),'../..'));
const out=resolve(process.env.VANDAO_EVIDENCE_DIR??'../docs/evidence/client-smoke');
mkdirSync(out,{recursive:true});
const start=Date.now(),events=[],checks=[];
function record(event,data={}) {
  const entry={elapsedMs:Date.now()-start,event,...data};events.push(entry);
  appendFileSync(`${out}/events.jsonl`,JSON.stringify(entry)+'\n');
  writeFileSync(`${out}/progress.json`,JSON.stringify(entry,null,2));
}
function check(name,condition,details={}){checks.push({name,passed:Boolean(condition),...details});assert(condition,name);record('check',{name,...details});}
const browser=await launchBrowser();
const context=await browser.newContext({viewport:{width:1366,height:768}});
const page=await context.newPage();
await installReadOnlySceneObserver(page);
const transport=await observeTransport(page,record);
async function readApi(path){const r=await context.request.get(`${base}/api/game/${path}`);assert(r.ok(),`${path}: ${r.status()}`);return (await r.json()).data;}
async function waitScene(map,previousSocket=0){await waitFor(async()=>transport.latestSocket>previousSocket&&transport.latest?.type==='TICK'&&transport.latest.currentMapId===map&&(await sceneState(page))?.map===map,`rendered map ${map}`,20000);}
async function closePanel(){const close=page.getByRole('button',{name:/^(✕|Đóng bản đồ)$/});assert(await close.count(),'No visible panel close control');await close.last().click();await delay(180);}
async function finishDialogue(){
  for(let n=0;n<8;n++){
    const next=page.getByRole('button',{name:/Tiếp Tục/});
    const done=page.getByRole('button',{name:'Kết Thúc',exact:true});
    if(await done.count()){await done.click();return;}
    if(await next.count())await next.click();else break;
    await delay(120);
  }
  throw new Error('Dialogue did not expose its expected ending');
}
let failure=null;
try {
  record('begin',{browser:browser.version()});
  const suffix=Date.now().toString().slice(-8),password=randomBytes(16).toString('hex');
  await page.goto(`${base}/register`);
  await page.getByPlaceholder('Nhập tên đăng nhập...').fill(`m1_smoke_${suffix}`);
  await page.getByPlaceholder('Nhập email...').fill(`m1_smoke_${suffix}@example.invalid`);
  await page.getByPlaceholder('Nhập mật khẩu...', {exact:true}).fill(password);
  await page.getByPlaceholder('Nhập lại mật khẩu...').fill(password);
  await page.getByRole('button',{name:/Đăng Ký/}).click();
  await page.getByPlaceholder('Nhập tên đạo hiệu...').fill(`Mộc${suffix}`);
  await page.getByRole('button',{name:/Bước Vào Tu Tiên Giới/i}).click();
  await page.locator('canvas').waitFor({timeout:30000});
  await waitScene('map_thanh_khe');await delay(500);
  check('one live socket after character creation',transport.open.size===1,{open:transport.open.size});
  const initial=transport.latest.playerState;
  check('server spawn applied',Math.hypot(initial.x-400,initial.y-300)<3,{x:initial.x,y:initial.y});
  const village=await readApi('maps/map_thanh_khe');
  // A* route respects the stream and buildings, including the legacy (400,300) spawn.
  await walkRoute(page,transport,village,1024,448,record);
  const p0={...transport.latest.playerState};
  await page.keyboard.down('w');await page.keyboard.down('s');await delay(650);await releaseKeys(page);
  const p1=transport.latest.playerState;
  check('opposed keys cancel',Math.hypot(p1.x-p0.x,p1.y-p0.y)<12);
  await page.keyboard.press('i',{delay:80});
  await page.getByRole('heading',{name:/TÚI TRỮ VẬT/}).waitFor();await delay(150);
  const blockedStart={...transport.latest.playerState},ticksBefore=transport.ticks;
  const actionsBefore={...transport.actions};
  await page.getByRole('heading',{name:/TÚI TRỮ VẬT/}).click();
  await page.keyboard.down('w');await page.keyboard.press('Space',{delay:80});await page.keyboard.press('1',{delay:80});await delay(6200);await releaseKeys(page);
  check('panel blocks movement',Math.hypot(transport.latest.playerState.x-blockedStart.x,transport.latest.playerState.y-blockedStart.y)<5);
  check('panel does not suspend session',transport.ticks-ticksBefore>80,{ticks:transport.ticks-ticksBefore});
  check('panel blocks pointer attack, dodge and skill inputs',['ATTACK','DODGE','SKILL_1'].every(key=>(transport.actions[key]??0)===(actionsBefore[key]??0)));
  await page.screenshot({path:`${out}/inventory-1366x768.png`});await closePanel();
  await page.keyboard.press('m',{delay:80});await page.getByRole('heading',{name:/THẦN CHÂU ĐỊA ĐỒ|BẢN ĐỒ/i}).waitFor();
  await page.screenshot({path:`${out}/map-panel-1366x768.png`});await closePanel();
  // The initial Sword character has one learned skill; locked slots cannot cast.
  const skillCount=transport.latest.cooldowns.skillsRemainingSec.length;
  check('new character has one available skill',skillCount===1,{skillCount});
  for(const key of ['2','3','4'])await page.keyboard.press(key,{delay:80});
  await delay(450);
  check('locked skill keys send no cast',['SKILL_2','SKILL_3','SKILL_4'].every(k=>!transport.actions[k]));
  await walkRoute(page,transport,village,1024,352,record);
  const talking=page.waitForResponse(r=>r.url().includes('/dialogue/dlg_elder_01')&&r.request().method()==='GET');
  await page.keyboard.press('e',{delay:80});check('elder dialogue request succeeds',(await talking).ok());
  await page.getByRole('button',{name:/Tiếp Tục|Kết Thúc/}).waitFor();
  await page.screenshot({path:`${out}/elder-dialogue.png`});await finishDialogue();
  const quests=await readApi('quests');
  check('nearby elder talk advances real quest',quests.find(q=>q.templateId==='quest_main_01').objectives.find(o=>o.id==='obj_talk_elder').current===1);
  await walkRoute(page,transport,village,1024,310,record);
  await page.keyboard.down('w');await delay(1200);await page.keyboard.up('w');await delay(150);
  check('hall wall blocks normal movement',transport.latest.playerState.y>=297,{y:transport.latest.playerState.y});
  const dodgeStarts=transport.starts.DODGE??0;
  await aimAt(page,1024,150);await page.keyboard.press('Space',{delay:80});
  await waitFor(()=>(transport.starts.DODGE??0)>dodgeStarts,'server confirms wall-directed dodge',3000);await delay(450);
  check('hall wall blocks dodge',transport.latest.playerState.y>=297,{y:transport.latest.playerState.y});
  await walkRoute(page,transport,village,1024,1280,record);
  await page.screenshot({path:`${out}/village-1366x768.png`});
  await page.keyboard.press('e',{delay:80});await waitScene('map_thanh_khe_rung');
  check('portal replaces map and entities',transport.latest.entities.some(e=>e.type==='MONSTER'));
  const forest=await readApi('maps/map_thanh_khe_rung');
  await walkRoute(page,transport,forest,1024,224,record);
  await delay(11000);const saved={x:transport.latest.playerState.x,y:transport.latest.playerState.y};
  const reloadSocket=transport.latestSocket;
  await page.reload();await waitScene('map_thanh_khe_rung',reloadSocket);await delay(400);
  check('reload retains forest and saved position',Math.hypot(transport.latest.playerState.x-saved.x,transport.latest.playerState.y-saved.y)<20,{saved,loaded:{x:transport.latest.playerState.x,y:transport.latest.playerState.y}});
  check('one socket in the current document after reload',transport.open.size===1,{open:transport.open.size});
  const socketsBefore=transport.latestSocket;
  // This is a deliberate transport fault, not a write to simulation state.
  await forceTransportReconnect(page);
  await waitFor(()=>transport.latestSocket>socketsBefore&&transport.latest?.type==='TICK'&&transport.open.size===1,'TICK from one replacement socket',18000);await delay(700);
  await walkRoute(page,transport,forest,1088,224,record);
  check('movement resumes after reconnect',transport.latest.playerState.x>1060);
  await page.screenshot({path:`${out}/forest-1366x768.png`});
  await page.setViewportSize({width:1920,height:1080});await delay(600);
  await page.screenshot({path:`${out}/forest-1920x1080.png`});
  check('one canvas after reload and resize',await page.locator('canvas').count()===1);
  await walkRoute(page,transport,forest,1024,128,record);await page.keyboard.press('e',{delay:80});await waitScene('map_thanh_khe');
  check('return to village clears forest entities',!(transport.latest.entities??[]).some(e=>e.type==='MONSTER'||e.type==='BOSS'));
  check('no uncaught browser errors',transport.errors.length===0,{errors:transport.errors});
  record('complete');
}catch(error){failure=String(error.stack??error);record('failed',{error:String(error)});await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});process.exitCode=1;}
finally {
  await releaseKeys(page).catch(()=>{});
  writeJson(`${out}/result.json`,{source,startedAt:new Date(start).toISOString(),durationMs:Date.now()-start,browser:browser.version(),checks,failure,errors:transport.errors,sockets:transport.sockets,ticks:transport.ticks,actions:transport.actions,confirmedActions:transport.starts,finalScene:await sceneState(page).catch(()=>null)});
  console.log(JSON.stringify({passed:!failure,checks:checks.length,durationMs:Date.now()-start,evidence:out,failure:failure?.split('\n')[0]}));
  await browser.close();
}
