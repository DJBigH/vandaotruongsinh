# Task 4 launcher and backend configuration review

Reviewed commit `7e2e78f8a4ea1ebdbf1399334ced3fcf229731bb` against `96470e74a64f3e9b61a2b3a026782a4d35e4a4bc`, using the task brief, report, and supplied launcher-only diff.

**Spec Compliance — changes required.** The normal backend startup can override the preferred root configuration, the exports can retain credentials, and Auto-Setup can issue writes against a configured production database.

**Task Quality — changes required.** The failure reporting, local TCP fixtures, and renderer changes are sound. The largest verification gap is that the test named for backend/Prisma agreement imports the config module alone. A generated Prisma client changes the environment before that module executes in the application.

## Important findings

1. **A generated Prisma client can override root configuration before the backend reads it.** The ordinary server entry imports Prisma at `server/src/index.ts:10` and config at `server/src/index.ts:11`. When Prisma was generated with a server-local file present, its generated module loads that file during import. The selection helper subsequently treats those values as explicit overrides at `desktop-launcher/src/shared/backend-environment.ts:40`. The supervisor explicitly supplies the URL and bind settings at `desktop-launcher/src/main/process-supervisor.ts:299`, leaving file-based JWT and other settings exposed to the import ordering. A stale JWT secret can invalidate existing login sessions, including admin sessions. Direct source startup can also select the wrong database. The committed fixture imports only config at `server/src/tests/config-test.ts:36` and reads the environment back at line 38.

   I generated the installed Prisma client with both synthetic config files present in a temporary source tree, using a temporary output directory and `prisma generate --no-engine`. Its generated entry recorded the server-local file. In fresh node processes I imported that generated client and the actual copied backend config module in the same order as the real entry, then inspected booleans and a fixture port. The direct backend case selected the server-local URL, JWT and port (3102 instead of the root's 3101). The supervisor-style case supplied its explicit URL and port correctly but still selected the server-local JWT. There was no database connection or schema operation. Load the selected environment before any Prisma import with side effects and pin this scenario in a regression fixture that includes a generated client.

2. **TXT and ZIP retain credentials for supported inputs.** The new configuration code explicitly supports IPv6 hosts at `desktop-launcher/src/shared/backend-environment.ts:58`. The existing export redactor at `desktop-launcher/src/main/logger.ts:133` accepts hostname characters after the credential delimiter but misses bracketed IPv6. Its password pattern at line 142 requires surrounding quotes, and its cookie rule at line 146 handles only values named `token`. The new export fixture at `desktop-launcher/src/tests/launcher-core-test.ts:54` uses a conventional hostname, bearer and quoted password. The assertions at lines 94 and 112 miss the other forms.

   I wrote synthetic server log lines to temporary app data through the real logger and ran the actual TXT and ZIP exporters. The IPv6 connection-string password, an opaque `Cookie: session=…` value, and an unquoted `password=…` value all survived in **each** of the TXT report, ZIP `events.jsonl`, and ZIP `logs/server.log`. The application's `token=…` cookie was redacted. These values can therefore be disclosed when a user shares an export. Extend the shared sanitizer and check the resulting bytes for each fake secret in TXT and in all text-bearing ZIP members. The report's UTF-8/JSONL evidence remains valid.

3. **The default Auto-Setup path can write to a configured production database.** The GUI preselects schema sync at `desktop-launcher/src/renderer/components/TabSetup.tsx:28`, including on fresh launches. Main also defaults it on at `desktop-launcher/src/main/setup-manager.ts:149`. With a valid selected configuration, the only remaining endpoint condition before `prisma db push` and `npm run seed` is a successful TCP probe at lines 312, 324 and 326. An explicitly production-marked configuration with a reachable database follows exactly this route. Under the new root-first selection the write target can be the existing root DB rather than a separate server-local development DB. The checked-in seed updates existing content records at `server/prisma/seed.ts:44` and line 59. No production write was executed or observed in the task report or this review. The risk is in the product path. Prevent schema/seed writes for production targets and exercise that decision through the existing inert command fixture.

## Strengths and minor quality finding

- Core, encoding and setup use computed totals with a failing exit status in `desktop-launcher/src/tests/test-fixtures.ts:43`. The report records deliberate failures in all three runners, each with exit 1, and the regular suites at 44/44, 30/30 and 14/14. Fixture setup uses temporary app data at `desktop-launcher/src/tests/test-fixtures.ts:7`. Core exercises open and closed TCP endpoints and verifies real external listeners survive at `desktop-launcher/src/tests/launcher-core-test.ts:155`, line 169 and line 175.
- Both existing environment files survive forced dependency reinstalls. New files are created exclusively at `desktop-launcher/src/main/setup-manager.ts:204` and line 223. The helper encodes template components and retains concrete URL text at `desktop-launcher/src/shared/backend-environment.ts:50` and line 85. The setup tests hold a real child command open while making a competing setup call at `desktop-launcher/src/tests/auto-setup-test.ts:246` and line 251.
- A requested Prisma/seed failure or a skipped sync now produces false readiness at `desktop-launcher/src/main/setup-manager.ts:336` and line 377. The completion card honors the ready flag at `desktop-launcher/src/renderer/components/TabSetup.tsx:65`. The client receives the configured backend port at `desktop-launcher/src/main/process-supervisor.ts:416`. HTTP and WS share that port at `client/vite.config.ts:19` and line 23, with real proxy requests in `client/tests/vite-proxy-test.mjs:69` and line 73.
- The Windows source fallback uses `call` and stops on failed installation or build at `CHAY_LAUNCHER.bat:23` and line 27. The root launcher also builds both components before starting at `package.json:9`.
- **Minor — regression tests sit outside the ordinary aggregate commands.** The new process-supervisor port propagation, server config matrix and Vite proxy checks are runnable individually, as the report demonstrates. Neither `test:launcher` nor `test:all` at `package.json:19` and line 20 includes them. An aggregate command incorporating the focused tests would keep the reported contract under routine verification.

## Verification limits and scope

The two focused experiments above used synthetic inputs in disposable directories. I did not rerun the reported suites or builds, inspect the working environment files, or run database push, seed, or server startup. Inspection beyond the supplied diff was limited to the concrete contracts raised by it: the real backend import sequence and installed Prisma loader for environment precedence, logger/export assembly for retained credentials, and the seed's update behavior for the configured write target.

The review cannot establish native Windows Electron/GUI acceptance, Windows batch execution, authenticated PostgreSQL/gameplay, browser game/admin access or a complete start–stop–restart cycle with a real game. The report's renderer evidence uses Chromium with mocked IPC, and its DB evidence uses TCP and command fixtures. The compiled server entrypoint, console-launcher ownership and portability are already assigned to M4. The controller owns integrated gameplay and whole-branch acceptance.

## Reproduction commands and fixture paths

Run both commands from the repository root with the installed dependencies. The first fixture uses the OS temporary directory with prefix `task4-review-prisma-` and contains `.env`, `server/.env`, `server/src/{config,read}.ts`, `server/prisma/schema.prisma` and generated `server/gen/index.js`. Both configurations contain only fixture values. The custom output directs all generated code to the temporary project. The fixture deletes itself on exit.

```bash
python - <<'PY'
import tempfile, pathlib, os, subprocess
repo = pathlib.Path.cwd()
source = repo / 'server'
with tempfile.TemporaryDirectory(prefix='task4-review-prisma-') as name:
    root = pathlib.Path(name)
    srv = root / 'server'
    schema = srv / 'prisma'
    src = srv / 'src'
    schema.mkdir(parents=True)
    src.mkdir()
    (srv / 'node_modules').symlink_to(source / 'node_modules', target_is_directory=True)
    (root / 'desktop-launcher').symlink_to(repo / 'desktop-launcher', target_is_directory=True)
    (srv / 'package.json').write_text('{"type":"module"}')
    (src / 'config.ts').write_bytes((source / 'src/config.ts').read_bytes())
    (schema / 'schema.prisma').write_text('''generator client {
  provider = "prisma-client-js"
  output = "../gen"
}
datasource db {
  provider = "postgresql"
  url = env("DATABASE_URL")
}
model Fake {
  id Int @id
}
''')
    for dest, label, port in [(root, 'root', 3101), (srv, 'server', 3102)]:
        (dest / '.env').write_text(f'DATABASE_URL=postgresql://fixture@localhost:5444/{label}\nJWT_SECRET={label}_only_fake\nSERVER_PORT={port}\n')
    env = {k: v for k, v in os.environ.items() if k not in ('DATABASE_URL','JWT_SECRET','SERVER_PORT','NODE_ENV')}
    env.update(PRISMA_GENERATE_SKIP_AUTOINSTALL='1', CHECKPOINT_DISABLE='1', PRISMA_HIDE_UPDATE_MESSAGE='1', DO_NOT_TRACK='1')
    subprocess.run([source / 'node_modules/.bin/prisma', 'generate', '--no-engine'], cwd=srv, env=env, check=True, capture_output=True)
    lines = (srv / 'gen/index.js').read_text().splitlines()
    index = next(i for i, line in enumerate(lines) if '"relativeEnvPaths":' in line)
    print('\n'.join(lines[index:index + 4]))
    (src / 'read.ts').write_text("""import {PrismaClient} from '../gen/index.js'; import {config} from './config'; console.log(JSON.stringify({client:typeof PrismaClient,urlIsRoot:config.database.url.endsWith('/root'),jwtIsRoot:config.jwt.secret==='root_only_fake',port:config.server.port}));""")
    for mode in ('backend', 'supervisor'):
        view = env.copy()
        if mode == 'supervisor':
            view.update(DATABASE_URL='postgresql://fixture@localhost:5444/root', SERVER_PORT='3101', SERVER_HOST='127.0.0.1')
        result = subprocess.run(['node', '--import', str(source / 'node_modules/tsx/dist/loader.mjs'), 'src/read.ts'], cwd=srv, env=view, check=True, capture_output=True, text=True)
        print(mode, result.stdout.strip())
PY
```

Observed `rootEnvPath` and `schemaEnvPath` both equal to `../.env` relative to `server/gen`. Direct startup printed `urlIsRoot:false, jwtIsRoot:false, port:3102`. Supervisor-style startup printed `urlIsRoot:true, jwtIsRoot:false, port:3101`. The acceptance expectation is `true, true, 3101` in both cases.

The export fixture uses `withLauncherFixture`, which allocates a temporary `vandao-launcher-test-*` directory, isolates `APPDATA`, and removes the fixture after the check. The inspected files are `r.txt` and `r.zip`. The script prints the presence or absence of each fake sentinel.

```bash
(cd desktop-launcher && node --import ../server/node_modules/tsx/dist/loader.mjs --input-type=commonjs <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const { withLauncherFixture } = require('./src/tests/test-fixtures.ts');
const { LauncherLogger } = require('./src/main/logger.ts');
const { SettingsManager } = require('./src/main/settings-manager.ts');
const { ProcessSupervisor } = require('./src/main/process-supervisor.ts');
const { AiLogExporter } = require('./src/main/ai-log-exporter.ts');
const AdmZip = require('adm-zip');
withLauncherFixture(async (dir) => {
  SettingsManager.getInstance().updateSettings({ projectDir: dir });
  try {
    const samples = { ipv6: 'reviewSyntheticIpv6', cookie: 'reviewSyntheticSession', appCookie: 'reviewSyntheticToken', query: 'reviewSyntheticQuery' };
    const logger = LauncherLogger.getInstance();
    for (const message of [
      'postgresql://fixture:' + samples.ipv6 + '@[::1]:5432/world',
      'Cookie: session=' + samples.cookie + '; token=' + samples.appCookie,
      'connection password=' + samples.query,
    ]) logger.info('server', message);
    const txt = await AiLogExporter.exportTxt(path.join(dir, 'r.txt'));
    const zip = await AiLogExporter.exportZip(path.join(dir, 'r.zip'));
    if (!txt.success || !zip.success) throw Error('export failed');
    const z = new AdmZip(zip.filePath);
    const files = { txt: fs.readFileSync(txt.filePath, 'utf8'), events: z.readAsText('events.jsonl'), server_log: z.readAsText('logs/server.log') };
    for (const [id, body] of Object.entries(files)) {
      console.log(id, Object.fromEntries(Object.entries(samples).map(([type, s]) => [type, body.includes(s) ? 'exposed' : 'redacted'])));
    }
  } finally {
    ProcessSupervisor.getInstance().cleanup();
  }
}).catch(e => { console.error(e); process.exitCode = 1; });
NODE
)
```

All three outputs reported `ipv6: exposed, cookie: exposed, appCookie: redacted, query: exposed`. Both reproduction commands completed with exit 0; they report observations rather than enforcing acceptance assertions.
