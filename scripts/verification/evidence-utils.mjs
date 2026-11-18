import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,renameSync,readdirSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

export function writeJson(path,value) {
  const temporary=`${path}.${process.pid}.tmp`;
  writeFileSync(temporary,JSON.stringify(value,null,2));renameSync(temporary,path);
}

export function sourceStamp(root) {
  const directory=resolve(root,'scripts/verification'),hash=createHash('sha256');
  for(const name of readdirSync(directory).sort())if(name.endsWith('.mjs'))hash.update(name).update(readFileSync(resolve(directory,name)));
  const gamePaths=['art/vnext/manifest.json','desktop-launcher/src/shared/backend-environment.ts','client/src','client/public','client/index.html','client/package.json','client/package-lock.json','client/tsconfig.json','client/vite.config.ts','server/src','shared/src','shared/package.json','shared/tsconfig.json'];
  const diff=execFileSync('git',['diff','HEAD','--',...gamePaths],{cwd:root});
  const untracked=execFileSync('git',['ls-files','--others','--exclude-standard','--',...gamePaths],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(Boolean);
  const sourceHash=createHash('sha256').update(diff);
  const changed=execFileSync('git',['diff','--name-only','HEAD','--',...gamePaths],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(Boolean);
  for(const path of changed)sourceHash.update(path).update(existsSync(resolve(root,path))?readFileSync(resolve(root,path)):'<deleted>');
  for(const path of untracked)sourceHash.update(path).update(readFileSync(resolve(root,path)));
  return {commit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),harnessSha256:hash.digest('hex'),
    gameSourceDirty:diff.length>0||untracked.length>0,gameSourceDiffSha256:diff.length||untracked.length?sourceHash.digest('hex'):null};
}

export async function assertLocalTestConfiguration(base) {
  assert(['127.0.0.1','localhost','[::1]'].includes(new URL(base).hostname),'Local frontend required');
  const {config}=await import('../../server/src/config.ts');
  await import('../../server/src/tests/require-disposable-database.ts');
  return config;
}
