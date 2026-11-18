// Read-only instrumentation and real keyboard/mouse helpers for local acceptance.
// Install Playwright normally, or point VANDAO_PLAYWRIGHT_MODULE to its entry file.
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

export async function launchBrowser() {
  const modulePath = process.env.VANDAO_PLAYWRIGHT_MODULE;
  const module = await import(modulePath ? pathToFileURL(modulePath).href : 'playwright');
  const playwright = module.default ?? module;
  const options = {headless: true};
  if (process.env.VANDAO_CHROMIUM_MODULE) {
    const loaded = await import(pathToFileURL(process.env.VANDAO_CHROMIUM_MODULE).href);
    const chromium = loaded.default ?? loaded;
    options.executablePath = await chromium.executablePath();
    options.args = chromium.args;
  } else if (process.env.VANDAO_CHROMIUM_PATH) options.executablePath = process.env.VANDAO_CHROMIUM_PATH;
  return playwright.chromium.launch(options);
}

export async function installReadOnlySceneObserver(page) {
  await page.addInitScript(() => {
    window.__acceptanceScene = function () {
      const host = document.getElementById('phaser-game-container');
      const canvas = host?.querySelector('canvas');
      if (!canvas) return null;
      const key = Object.keys(host).find(name => name.startsWith('__reactFiber$'));
      for (let fiber = key && host[key]; fiber; fiber = fiber.return) {
        for (let hook = fiber.memoizedState; hook; hook = hook.next) {
          const game = hook.memoizedState?.current;
          if (game?.canvas === canvas && game.scene?.isActive('ExplorationScene')) {
            return game.scene.getScene('ExplorationScene');
          }
        }
      }
      return null;
    };
  });
}

export async function observeTransport(page, record = () => {}) {
  const state = {latest:null,latestSocket:0,latestGeneration:0,generation:0,receivedAt:0,sockets:0,open:new Set(),ticks:0,inputs:0,errors:[],actions:{},starts:{},history:[],rewards:[],deaths:0};
  // Scope browser observations to a document. Both Playwright and this headless
  // Chromium can discard old-document network observations on navigation before
  // emitting a close. This is a count of current-document sockets, not a claim
  // about the server's TCP descriptors; the isolated-server probe checks those.
  const network=await page.context().newCDPSession(page);
  await network.send('Network.enable');
  await network.send('Page.enable');
  let loaderId=null;
  network.on('Page.frameNavigated',({frame})=>{
    if(frame.parentId)return;
    if(loaderId&&loaderId!==frame.loaderId){
      record('document-socket-scope-ended',{observations:state.open.size});state.open.clear();
      state.generation++;state.latest=null;state.latestSocket=0;
    }
    loaderId=frame.loaderId;
  });
  network.on('Network.webSocketCreated',event=>{
    if(event.url.includes('/ws/game')){state.open.add(event.requestId);record('network-socket-open',{requestId:event.requestId});}
  });
  network.on('Network.webSocketClosed',event=>{
    if(state.open.delete(event.requestId))record('network-socket-close',{requestId:event.requestId});
  });
  page.on('pageerror', error => state.errors.push(String(error)));
  page.on('websocket', socket => {
    if (!socket.url().includes('/ws/game')) return;
    const id = ++state.sockets;
    const generation=state.generation;
    let previousCooldowns=null;
    record('socket-open', {id});
    socket.on('close', () => {record('socket-close', {id});});
    socket.on('socketerror', error => record('socket-error', {id, error:String(error)}));
    socket.on('framesent', frame => {
      try {
        const msg = JSON.parse(frame.payload.toString());
        if(msg.type==='INPUT')state.inputs++;
        // Never record AUTH or cookies. Only control actions are relevant evidence.
        if (msg.type === 'INPUT' && msg.input?.action && msg.input.action !== 'NONE') {
          state.actions[msg.input.action] = (state.actions[msg.input.action] ?? 0)+1;
          record('action-input', {id, action:msg.input.action, seq:msg.input.seq});
        }
      } catch {}
    });
    socket.on('framereceived', frame => {
      let msg;try {msg=JSON.parse(frame.payload.toString());} catch{return;}
      if(generation!==state.generation||id<state.latestSocket)return;
      if (msg.type==='INIT' || msg.type==='TICK') {
        state.latest=msg;state.latestSocket=id;state.latestGeneration=generation;state.receivedAt=Date.now();
        if (msg.type==='TICK') state.ticks++;
        if(msg.type==='TICK'&&msg.cooldowns){
          const names=['DODGE','ATTACK',...msg.cooldowns.skillsRemainingSec.map((_,i)=>`SKILL_${i+1}`)];
          const current=[msg.cooldowns.dodgeRemainingSec,msg.cooldowns.attackRemainingSec,...msg.cooldowns.skillsRemainingSec];
          const previous=previousCooldowns&&[previousCooldowns.dodgeRemainingSec,previousCooldowns.attackRemainingSec,...previousCooldowns.skillsRemainingSec];
          names.forEach((name,i)=>{if(previous?.[i]===0&&current[i]>0){state.starts[name]=(state.starts[name]??0)+1;record('server-action-start',{id,action:name,tick:msg.tick,remaining:current[i]});}});
          previousCooldowns=msg.cooldowns;
          state.history.push({id,generation,receivedAt:state.receivedAt,tick:msg.tick,map:msg.currentMapId,player:msg.playerState,cooldowns:msg.cooldowns,projectiles:msg.projectiles,events:msg.events});
          if(state.history.length>240)state.history.shift();
        }
        if (msg.type==='INIT') record('server-init', {id,map:msg.currentMapId,position:msg.playerState && {x:msg.playerState.x,y:msg.playerState.y}});
      }
      if (msg.type==='REWARDS') {state.rewards.push(msg.rewards);record('server-reward',msg.rewards);}
      if (msg.type==='DEATH') {state.deaths++;record('server-respawn',{id});}
    });
  });
  return state;
}

export async function waitFor(predicate, message, timeout=12000) {
  const started=Date.now();
  while(Date.now()-started<timeout) {if(await predicate())return;await delay(50);}
  throw new Error(`Timed out: ${message}`);
}

export async function sceneState(page) {
  return page.evaluate(() => {
    const s=window.__acceptanceScene?.();if(!s?.player)return null;
    const camera=s.cameras.main;
    const entities=Array.from(s.entitySprites?.values?.() ?? []);
    return {map:s.currentMapId,player:{x:s.player.x,y:s.player.y,visible:s.player.visible,
      texture:s.player.texture.key,animation:s.player.anims.currentAnim?.key,frame:s.player.anims.currentFrame?.index},
      camera:{x:camera.scrollX,y:camera.scrollY,zoom:camera.zoom,width:camera.width,height:camera.height},
      render:{entities:entities.length,inView:entities.filter(e=>e.visible&&camera.worldView.contains(e.x,e.y)).length},
      canvas:{width:s.game.canvas.width,height:s.game.canvas.height},
      inputBlocked:s.isControlBlocked?.()??s.isMovementDisabled,rendererType:s.game.renderer.type};
  });
}

export async function forceTransportReconnect(page) {
  // One deliberate transport failure. No INPUT injection or simulation changes.
  await page.evaluate(()=>{
    const scene=window.__acceptanceScene?.();
    const socket=scene?.connection?.socket??scene?.ws;
    if(!socket||socket.readyState!==1)throw new Error('No open game transport');
    socket.close(4000,'acceptance reconnect');
  });
}

export async function releaseKeys(page) {
  for(const key of ['w','a','s','d','ArrowUp','ArrowLeft','ArrowDown','ArrowRight','Space','1','2','3','4'])await page.keyboard.up(key);
}

export async function walkTo(page, transport, x, y, {tolerance=13, timeout=30000}={}) {
  const started=Date.now();let held=[];let old=null;let stalledAt=Date.now();
  try {
    while(Date.now()-started<timeout) {
      const p=transport.latest?.playerState;
      if(!p){await delay(50);continue;}
      if(p.state==='DEAD')throw new Error('Player died while walking');
      const dx=x-p.x,dy=y-p.y;
      if(Math.hypot(dx,dy)<=tolerance)break;
      const next=[];
      if(Math.abs(dx)>tolerance*.65)next.push(dx>0?'d':'a');
      if(Math.abs(dy)>tolerance*.65)next.push(dy>0?'s':'w');
      for(const key of held.filter(key=>!next.includes(key)))await page.keyboard.up(key);
      for(const key of next.filter(key=>!held.includes(key)))await page.keyboard.down(key);
      held=next;
      if(old && Math.hypot(p.x-old.x,p.y-old.y)>2)stalledAt=Date.now();
      if(Date.now()-stalledAt>1800)throw new Error(`Movement stalled at (${p.x.toFixed(1)},${p.y.toFixed(1)}) toward (${x},${y})`);
      old={x:p.x,y:p.y};await delay(75);
    }
  } finally {for(const key of held)await page.keyboard.up(key);}
  await delay(150);
  const p=transport.latest?.playerState;
  if(!p || Math.hypot(p.x-x,p.y-y)>tolerance+20)throw new Error(`Did not reach (${x},${y}): ${JSON.stringify(p&&{x:p.x,y:p.y,state:p.state})}`);
}

export async function aimAt(page,x,y) {
  const point=await page.evaluate(({x,y})=>{
    const s=window.__acceptanceScene?.();if(!s)return null;
    const camera=s.cameras.main;
    const p=camera.matrix.transformPoint(x-camera.scrollX,y-camera.scrollY);
    const r=s.game.canvas.getBoundingClientRect();
    return {x:r.left+p.x*r.width/s.game.scale.width,y:r.top+p.y*r.height/s.game.scale.height};
  },{x,y});
  if(!point)throw new Error('No live scene for aim');
  await page.mouse.move(point.x,point.y);return point;
}

export async function startFrameMeasure(page,{observeLoad=false}={}) {
  await page.evaluate(({observeLoad})=>{
    const scene=window.__acceptanceScene?.();if(!scene)throw new Error('No scene');
    if(window.__acceptanceFrames)throw new Error('A frame probe is already active');
    const times=[],started=performance.now();
    const load={observedFrames:0,fullFrames:0,minNormals:Infinity,minBosses:Infinity,maxSnapshotAgeMs:0,badSamples:[]};
    const callback=()=>{
      const now=performance.now();times.push(now);
      if(!observeLoad)return;
      let normals=0,bosses=0;
      const snapshotAge=Math.max(0,now-scene.snapshotReceivedAt);
      for(const entity of scene.latestEntities??[]){
        const actor=scene.entitySprites?.get(entity.id),sprite=actor?.getData?.('monsterSprite');
        if(!actor?.visible||actor.alpha<=0||(sprite&&(!sprite.visible||sprite.alpha<=0))||!scene.cameras.main.worldView.contains(actor.x,actor.y))continue;
        if(entity.hp<=0||!['CHASE','WINDUP','ATTACK','ENRAGED'].includes(entity.state))continue;
        if(entity.type==='MONSTER')normals++;else if(entity.type==='BOSS')bosses++;
      }
      const alive=scene.latestServerPlayer?.hp>0&&scene.latestServerPlayer.state!=='DEAD';
      const full=normals===10&&bosses===1&&snapshotAge<=250&&alive;
      load.observedFrames++;if(full)load.fullFrames++;
      load.minNormals=Math.min(load.minNormals,normals);load.minBosses=Math.min(load.minBosses,bosses);
      load.maxSnapshotAgeMs=Math.max(load.maxSnapshotAgeMs,snapshotAge);
      if(!full&&load.badSamples.length<20)load.badSamples.push({elapsedMs:now-started,normals,bosses,snapshotAgeMs:snapshotAge,playerAlive:alive});
    };
    window.__acceptanceFrames={times,callback,game:scene.game,started,load:observeLoad?load:null};
    scene.game.events.on('postrender',callback);
  },{observeLoad});
}

export async function stopFrameMeasure(page) {
  return page.evaluate(()=>{
    const m=window.__acceptanceFrames;if(!m)throw new Error('No active frame probe');
    m.game.events.off('postrender',m.callback);
    delete window.__acceptanceFrames;
    const stopped=performance.now(),wallDurationMs=stopped-m.started;
    const samples=m.times.slice(1).map((value,index)=>value-m.times[index]);
    const sorted=[...samples].sort((a,b)=>a-b);
    const sum=samples.reduce((a,b)=>a+b,0);
    const firstGapMs=m.times.length?m.times[0]-m.started:wallDurationMs;
    const endGapMs=m.times.length?stopped-m.times.at(-1):wallDurationMs;
    const valid=samples.length>=30&&sum>0&&wallDurationMs>0&&sorted.every(Number.isFinite);
    const percentile=p=>sorted.length?sorted[Math.max(0,Math.ceil(sorted.length*p)-1)]:null;
    let renderer='Canvas';const gl=m.game.renderer.gl;
    if(gl){const ext=gl.getExtension('WEBGL_debug_renderer_info');renderer=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);}
    return {valid,frames:m.times.length,intervals:samples.length,durationMs:sum,wallDurationMs,
      averageFps:valid?m.times.length*1000/wallDurationMs:null,intervalAverageFps:valid?samples.length*1000/sum:null,
      coverage:valid?sum/wallDurationMs:0,firstGapMs,endGapMs,p50Ms:percentile(.5),p95Ms:percentile(.95),percentileConvention:'nearest rank',
      maxMs:Math.max(firstGapMs,endGapMs,...samples),load:m.load,
      renderer,devicePixelRatio:window.devicePixelRatio,visibility:document.visibilityState};
  });
}
