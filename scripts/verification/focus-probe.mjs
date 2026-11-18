// Chromium focus/visibility check with real tab activation, not synthetic events.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {randomBytes} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {launchBrowser,installReadOnlySceneObserver,observeTransport,waitFor,sceneState} from './browser-helpers.mjs';
import {assertLocalTestConfiguration,writeJson,sourceStamp} from './evidence-utils.mjs';
const base=process.env.VANDAO_TEST_URL??'http://127.0.0.1:5173';
await assertLocalTestConfiguration(base);
const out=resolve(process.env.VANDAO_EVIDENCE_DIR??'../docs/evidence/focus-probe');mkdirSync(out,{recursive:true});
const browser=await launchBrowser(),context=await browser.newContext({viewport:{width:1366,height:768}}),page=await context.newPage();
await installReadOnlySceneObserver(page);const t=await observeTransport(page);const result={source:sourceStamp(resolve('..')),browser:browser.version()};
const suffix=Date.now().toString().slice(-9);
try {
  let r=await context.request.post(`${base}/api/auth/register`,{data:{username:`m1_focus_${suffix}`,email:`m1_focus_${suffix}@example.invalid`,password:randomBytes(18).toString('hex')}});assert(r.ok());
  r=await context.request.post(`${base}/api/game/character`,{data:{name:`Tĩnh${suffix}`,cultivationPath:'SWORD',appearance:0}});assert(r.ok());
  await page.goto(`${base}/game`);await waitFor(async()=>Boolean(await sceneState(page)),'scene',30000);
  await page.keyboard.down('d');await delay(200);
  const other=await context.newPage();await other.goto('about:blank');await other.bringToFront();await delay(300);
  result.background=await page.evaluate(()=>({hidden:document.hidden,focus:document.hasFocus(),blocked:window.__acceptanceScene()?.isControlBlocked()}));
  const atBlur={...t.latest.playerState},ticks=t.ticks,inputs=t.inputs;
  await delay(6200);result.afterBackground={x:t.latest.playerState.x,y:t.latest.playerState.y,ticksDuringGrace:t.ticks-ticks,inputs:t.inputs-inputs};
  // Keep the original physical key down through recovery; a keyup here could
  // hide stale-key behavior instead of testing focus handling.
  const beforeReturn=t.ticks,atReturn={...t.latest.playerState};await page.bringToFront();await other.close();
  result.foreground=await page.evaluate(()=>({hidden:document.hidden,focus:document.hasFocus(),blocked:window.__acceptanceScene()?.isControlBlocked()}));
  await waitFor(()=>t.ticks>beforeReturn,'fresh foreground TICK',5000);
  await delay(350);
  result.staleMovementDistance=Math.hypot(t.latest.playerState.x-atReturn.x,t.latest.playerState.y-atReturn.y);
  await page.keyboard.up('d');await delay(100);await page.keyboard.down('d');await delay(300);await page.keyboard.up('d');await delay(180);
  result.freshMovementDistance=Math.hypot(t.latest.playerState.x-atReturn.x,t.latest.playerState.y-atReturn.y);
  result.actualFocusLoss=result.background.hidden||!result.background.focus;
  if(result.actualFocusLoss){assert(result.background.blocked);assert(result.foreground.focus&&!result.foreground.hidden);assert.equal(result.afterBackground.inputs,0,'No periodic INPUT while backgrounded');assert(Math.hypot(result.afterBackground.x-atBlur.x,result.afterBackground.y-atBlur.y)<10);assert(result.staleMovementDistance<5);assert(result.freshMovementDistance>20);result.passed=true;}
  else result.limitation='This headless shell did not expose focus loss for real tab activation; no focus-loss pass is claimed.';
  result.errors=t.errors;await page.screenshot({path:`${out}/foreground.png`});
}catch(error){result.failure=String(error.stack??error);process.exitCode=1;}
finally{writeJson(`${out}/result.json`,result);await browser.close();console.log(JSON.stringify(result));}
