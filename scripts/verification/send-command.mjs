import {existsSync,readFileSync,writeFileSync,renameSync} from 'node:fs';
import {resolve} from 'node:path';
import {randomBytes} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
const queue=resolve(process.env.VANDAO_BROWSER_COMMANDS??'scratch/browser-session');
const value=process.argv[2];
if(!value)throw new Error('Provide a JSON command, @path-to-json, or --resume command-id');
const resume=value==='--resume';
const id=resume?process.argv[3]:`${Date.now()}-${randomBytes(3).toString('hex')}`;
if(!id||!/^[0-9]+-[a-f0-9]+$/.test(id))throw new Error('Invalid command ID');
const path=`${queue}/${id}`;
if(!resume){
  const ready=JSON.parse(readFileSync(`${queue}/ready.json`,'utf8'));
  if(ready.closed||ready.closing||!ready.sessionId)throw new Error('There is no open acceptance session accepting commands');
  const command=JSON.parse(value.startsWith('@')?readFileSync(value.slice(1),'utf8'):value);
  writeFileSync(`${path}.tmp`,JSON.stringify({sessionId:ready.sessionId,command}));renameSync(`${path}.tmp`,`${path}.request.json`);
}else if(!['request','running','result'].some(s=>existsSync(`${path}.${s}.json`)))throw new Error('Unknown queued command');
console.log(JSON.stringify({commandId:id,resumed:resume}));
const started=Date.now();
while(!existsSync(`${path}.result.json`)){
  const ready=JSON.parse(readFileSync(`${queue}/ready.json`,'utf8'));
  if(ready.closed){
    // A submission can race the final intake boundary. Never wait for a
    // result that the closed driver cannot publish, and never resubmit it.
    if(existsSync(`${path}.result.json`))break;
    throw new Error(`Session closed before command ${id} was processed`);
  }
  if(Date.now()-started>180000)throw new Error(`Command still unresolved. Resume this command with --resume ${id}; do not submit it twice.`);
  await delay(150);
}
const result=JSON.parse(readFileSync(`${path}.result.json`,'utf8'));
console.log(JSON.stringify({file:`${path}.result.json`,...result},null,2));
if(!result.ok)process.exitCode=1;
