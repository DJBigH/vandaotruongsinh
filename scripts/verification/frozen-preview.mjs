import assert from 'node:assert/strict';
import {existsSync,mkdirSync,mkdtempSync,cpSync,readdirSync,readFileSync} from 'node:fs';
import {resolve,relative} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {sourceStamp,writeJson} from './evidence-utils.mjs';

export function freezeClientBuild(root) {
  // Build in this operation, with source identity on both sides. A copy-time
  // commit cannot establish which source produced a pre-existing dist folder.
  const before=sourceStamp(root);
  // This preview has its own same-origin API/WS proxy. Backend configuration
  // loaded by the fixture must not leak its VITE_API_URL or test mode into it.
  const buildEnvironment={NODE_ENV:'production',VITE_API_URL:'/api'};
  const buildLog=execFileSync('npm',['run','build'],{cwd:resolve(root,'client'),env:{...process.env,...buildEnvironment},encoding:'utf8',maxBuffer:5*1024*1024,stdio:['ignore','pipe','pipe']});
  const after=sourceStamp(root);
  assert(before.commit===after.commit&&before.gameSourceDirty===after.gameSourceDirty&&before.gameSourceDiffSha256===after.gameSourceDiffSha256,'Source changed during the acceptance build; rebuild after edits settle');
  const source=resolve(root,'client/dist');assert(existsSync(resolve(source,'index.html')),'Build client before acceptance');
  mkdirSync(resolve(root,'scratch'),{recursive:true});
  const directory=mkdtempSync(resolve(root,'scratch/acceptance-build-'));
  cpSync(source,directory,{recursive:true});
  const hash=createHash('sha256');let files=0;
  function visit(path){for(const entry of readdirSync(path,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const child=resolve(path,entry.name);if(entry.isDirectory())visit(child);else{hash.update(relative(directory,child));hash.update(readFileSync(child));files++;}}}
  visit(directory);
  const stamp={...before,buildSha256:hash.digest('hex'),buildFiles:files,builtDuringFreeze:true,buildEnvironment,buildLog,createdAt:new Date().toISOString()};
  const manifest=resolve(directory,'acceptance-build.json');writeJson(manifest,stamp);
  return {directory,manifest,stamp};
}

export async function serveFrozenClient(root,frozen,{backendUrl,port}) {
  assert(['localhost','127.0.0.1'].includes(new URL(backendUrl).hostname),'Local backend only');
  const {preview}=await import('../../client/node_modules/vite/dist/node/index.js');
  return preview({root:resolve(root,'client'),configFile:false,logLevel:'error',build:{outDir:frozen.directory},preview:{host:'127.0.0.1',port,strictPort:true,
    proxy:{'/api':{target:backendUrl,changeOrigin:true},'/ws':{target:backendUrl.replace(/^http/,'ws'),ws:true}}}});
}
