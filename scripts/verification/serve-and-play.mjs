import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {freezeClientBuild,serveFrozenClient} from './frozen-preview.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const frozen=freezeClientBuild(root);
const frontend=await serveFrozenClient(root,frozen,{backendUrl:process.env.VANDAO_BACKEND_URL??'http://127.0.0.1:3001',port:5174});
process.env.VANDAO_TEST_URL='http://127.0.0.1:5174';
process.env.VANDAO_BUILD_MANIFEST=frozen.manifest;
try{await import('./play-session.mjs');}finally{await frontend.close();}
