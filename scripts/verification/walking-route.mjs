// Acceptance navigation only. Reads the same public map geometry as the client,
// then drives normal keyboard input. Never changes a character or sprite position.
import {isWorldPositionWalkable, isWorldPathWalkable} from '../../shared/src/world-collision.ts';
import {walkTo} from './browser-helpers.mjs';

export function routeThroughMap(map, start, target) {
  const size=map.tileSize, radius=15;
  if(!isWorldPositionWalkable(map,target,10))throw new Error(`Blocked destination ${JSON.stringify(target)}`);
  const points=[];
  for(let y=0;y<map.height;y++)for(let x=0;x<map.width;x++) {
    const p={x:(x+.5)*size,y:(y+.5)*size,gx:x,gy:y};
    if(isWorldPositionWalkable(map,p,radius))points.push(p);
  }
  function nearest(point) {
    return points.filter(p=>isWorldPathWalkable(map,point,p,10))
      .sort((a,b)=>Math.hypot(a.x-point.x,a.y-point.y)-Math.hypot(b.x-point.x,b.y-point.y))[0];
  }
  const first=nearest(start),last=nearest(target);
  if(!first||!last)throw new Error('No reachable navigation cell');
  const id=p=>`${p.gx},${p.gy}`;
  const cells=new Map(points.map(p=>[id(p),p]));
  const open=new Set([id(first)]),cost=new Map([[id(first),0]]),parents=new Map();
  const closed=new Set();
  const heuristic=p=>Math.hypot(p.gx-last.gx,p.gy-last.gy);
  while(open.size) {
    const current=[...open].reduce((a,b)=>cost.get(a)+heuristic(cells.get(a))<cost.get(b)+heuristic(cells.get(b))?a:b);
    const p=cells.get(current);
    if(current===id(last)) {
      const result=[target,p];let previous=current;
      while(parents.has(previous)){previous=parents.get(previous);result.push(cells.get(previous));}
      result.reverse();
      // Only collapse collinear grid steps: WASD follows 8 directions, not an
      // arbitrary line that might accidentally cut through a rounded corner.
      const compact=[];
      for(let i=0;i<result.length;i++) {
        const before=result[i-1],after=result[i+1],here=result[i];
        if(before&&after&&(here.x-before.x)*(after.y-here.y)===(here.y-before.y)*(after.x-here.x))continue;
        compact.push({x:here.x,y:here.y});
      }
      return compact;
    }
    open.delete(current);closed.add(current);
    for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++) {
      if(!dx&&!dy)continue;
      const key=`${p.gx+dx},${p.gy+dy}`,next=cells.get(key);
      if(!next||closed.has(key)||!isWorldPathWalkable(map,p,next,radius))continue;
      const nextCost=cost.get(current)+Math.hypot(dx,dy);
      if(nextCost<(cost.get(key)??Infinity)){cost.set(key,nextCost);parents.set(key,current);open.add(key);}
    }
  }
  throw new Error(`No route to ${JSON.stringify(target)} in ${map.id}`);
}

export async function walkRoute(page,transport,map,x,y,record=()=>{}) {
  const deadline=Date.now()+120000;
  const start=transport.latest?.playerState;
  if(!start)throw new Error('No authoritative position');
  const route=routeThroughMap(map,start,{x,y});
  record('walking-route',{map:map.id,from:{x:start.x,y:start.y},to:{x,y},waypoints:route});
  for(const point of route){
    const remaining=deadline-Date.now();if(remaining<=0)throw new Error('Walking route exceeded its 120-second budget');
    await walkTo(page,transport,point.x,point.y,{tolerance:7,timeout:Math.min(40000,remaining)});
  }
}
