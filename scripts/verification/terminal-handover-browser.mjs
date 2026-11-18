// Real two-page verification. The explicit focus event below is synthetic;
// it does not establish physical OS focus behavior in a headless browser.
import assert from 'node:assert/strict';
import {mkdirSync,appendFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {launchBrowser,installReadOnlySceneObserver,observeTransport,waitFor,releaseKeys} from './browser-helpers.mjs';
import {assertLocalTestConfiguration,sourceStamp,writeJson} from './evidence-utils.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const base=process.env.VANDAO_TEST_URL??'http://127.0.0.1:5173';
await assertLocalTestConfiguration(base);
const out=resolve(process.env.VANDAO_TERMINAL_EVIDENCE_DIR??`${root}/docs/evidence/terminal-handover-browser`);
mkdirSync(out,{recursive:true});
const source=sourceStamp(root),started=Date.now(),checks=[];
const record=(event,data={})=>appendFileSync(`${out}/events.jsonl`,JSON.stringify({elapsedMs:Date.now()-started,event,...data})+'\n');
const check=(name,passed,details={})=>{checks.push({name,passed:Boolean(passed),...details});assert(passed,name);record('check',{name,...details});};
const browser=await launchBrowser();
const context=await browser.newContext({viewport:{width:1366,height:768}});
const first=await context.newPage();
await installReadOnlySceneObserver(first);
const firstTransport=await observeTransport(first,(event,data)=>record(event,{window:'first',...data}));
let second,secondTransport,failure=null;
const cleanupErrors=[];
try{
  const suffix=Date.now().toString().slice(-8),password=randomBytes(16).toString('hex');
  await first.goto(`${base}/register`);
  await first.getByPlaceholder('Nhập tên đăng nhập...').fill(`m1_handover_${suffix}`);
  await first.getByPlaceholder('Nhập email...').fill(`m1_handover_${suffix}@example.invalid`);
  await first.getByPlaceholder('Nhập mật khẩu...',{exact:true}).fill(password);
  await first.getByPlaceholder('Nhập lại mật khẩu...').fill(password);
  await first.getByRole('button',{name:/Đăng Ký/}).click();
  await first.getByPlaceholder('Nhập tên đạo hiệu...').fill(`Tĩnh${suffix}`);
  await first.getByRole('button',{name:/Bước Vào Tu Tiên Giới/i}).click();
  await waitFor(()=>firstTransport.latest?.type==='TICK','first page receives live TICK',30000);
  const characterId=firstTransport.latest.playerState.id;
  check('first page owns one live character socket',firstTransport.open.size===1);

  second=await context.newPage();
  await installReadOnlySceneObserver(second);
  secondTransport=await observeTransport(second,(event,data)=>record(event,{window:'second',...data}));
  await second.goto(`${base}/game`);
  await waitFor(()=>secondTransport.latest?.type==='TICK'&&secondTransport.latest.playerState.id===characterId,'second page receives same character TICK',30000);
  const alert=first.getByRole('alert',{name:'Phiên chơi đã kết thúc'});
  await alert.waitFor({state:'visible',timeout:10000});
  await waitFor(()=>firstTransport.open.size===0,'displaced first transport closes');
  check('displaced page shows terminal ownership message',(await alert.innerText()).includes('cửa sổ khác'));
  await first.screenshot({path:`${out}/displaced-window.png`});
  await delay(250);
  const displaced={sockets:firstTransport.sockets,inputs:firstTransport.inputs,ticks:secondTransport.ticks};
  const visibility=await first.evaluate(()=>({hidden:document.hidden,hasFocus:document.hasFocus()}));
  await first.keyboard.down('d');await delay(180);await releaseKeys(first);
  await first.evaluate(()=>window.dispatchEvent(new Event('focus')));
  record('synthetic-focus-event',{window:'first',visibility,limitation:'Dispatch only; no physical focus-loss claim.'});
  await delay(3600);
  check('displaced page stays closed beyond the 3000ms retry interval',firstTransport.sockets===displaced.sockets&&firstTransport.open.size===0,{waitMs:3600});
  check('displaced controls send no further input',firstTransport.inputs===displaced.inputs);
  check('replacement page keeps receiving ticks after old-page focus handler',secondTransport.open.size===1&&secondTransport.ticks>displaced.ticks,{newTicks:secondTransport.ticks-displaced.ticks});

  const beforeReload=firstTransport.latestSocket;
  await first.getByRole('button',{name:'Tải lại nhân vật đang chọn',exact:true}).click();
  await waitFor(()=>firstTransport.latestSocket>beforeReload&&firstTransport.latest?.type==='TICK'&&firstTransport.latest.playerState.id===characterId,'explicit reload creates a fresh owned session',30000);
  await second.getByRole('alert',{name:'Phiên chơi đã kết thúc'}).waitFor({state:'visible',timeout:10000});
  await waitFor(()=>secondTransport.open.size===0,'second page yields to explicit reload');
  check('explicit reload is an intentional new session',firstTransport.open.size===1&&secondTransport.open.size===0);
  check('fresh page restores game UI',await first.getByRole('alert',{name:'Phiên chơi đã kết thúc'}).count()===0&&await first.locator('canvas').count()===1);
  await second.screenshot({path:`${out}/replacement-after-explicit-reload.png`});
  check('both pages have no uncaught JavaScript errors',firstTransport.errors.length===0&&secondTransport.errors.length===0);
}catch(error){
  failure=String(error.stack??error);process.exitCode=1;record('failure',{error:String(error)});
  await first.screenshot({path:`${out}/failure.png`}).catch(()=>{});
}finally{
  await releaseKeys(first).catch(()=>{});
  try{await browser.close();}catch(error){cleanupErrors.push(String(error));process.exitCode=1;}
  writeJson(`${out}/result.json`,{source,startedAt:new Date(started).toISOString(),durationMs:Date.now()-started,browser:browser.version(),passed:!failure&&cleanupErrors.length===0,checks,failure,cleanupErrors,
    first:{sockets:firstTransport.sockets,ticks:firstTransport.ticks,errors:firstTransport.errors},
    second:secondTransport&&{sockets:secondTransport.sockets,ticks:secondTransport.ticks,errors:secondTransport.errors},
    limitation:'Actual two browser pages and production client/server. Focus event was synthetic; physical OS focus remains unverified. Active-slot and missed-close races are covered by the separate server/client transport regression.'});
  console.log(JSON.stringify({passed:!failure&&cleanupErrors.length===0,checks:checks.length,evidence:out,failure:failure?.split('\n')[0],cleanupErrors}));
}
