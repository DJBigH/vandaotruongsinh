# Task 4 launcher fix 1 — scoped re-review

Reviewed `afa7fd25606db19b9b915cb915ba295cdecda00c` against `795be99a26138393e786b70ef790944d65c08710` for the three original Important findings.

**Spec Compliance — changes required. Task Quality — changes required.** Two findings close. One remains Important: a password beginning with an apostrophe survives launcher exports, including historical server log records. The committed configuration helper produces and accepts the affected URL when expanding a normal password component.

| Original finding | Disposition | Evidence |
| --- | --- | --- |
| Generated Prisma client overrides selected backend configuration | **Closed** | The source entry imports config first at `server/src/index.ts:6`, before Prisma at line 12. `server/src/config.ts:13` assigns the selected mode or its development default to the process before Prisma can load the fallback file. The new regression uses the actual copied source entry, a locally generated Prisma client, and two synthetic files. It proves the generated client alone selects the fallback at `server/src/tests/generated-prisma-config-test.mjs:69`, then checks direct and supervisor-style entry startup for root JWT, TTL, database URL, port, host, and both mode values at lines 75 and 86. The report records 1/1 passing after the default-mode correction. The supplied diff file omitted this newly added test; I confirmed it is in the commit and inspected the tracked file directly. |
| Credentials survive TXT and ZIP export | **Partially fixed — Important, still open** | The prior conventional IPv6 URL, cookie headers, and unquoted password forms now have real exporter regression coverage at `desktop-launcher/src/tests/launcher-core-test.ts:63` and line 127. The archive scan includes every file and a historical record. However, the credential tokenizer at `desktop-launcher/src/main/logger.ts:143` stops at a literal apostrophe before the URL parser can see the password or host. `desktop-launcher/src/shared/backend-environment.ts:66` calls `encodeURIComponent`, which preserves apostrophes. The full password from such a valid template survives in TXT, ZIP JSONL, and the ZIP server log. See the independent reproduction below. |
| Default Auto-Setup can push schema or seed production | **Closed for the specified gate** | `desktop-launcher/src/shared/backend-environment.ts:86` retains the selected file's original mode separately. `desktop-launcher/src/main/setup-manager.ts:313` requires effective development mode and an allowed loopback host, rejects a production file even with a development override, and rejects decoded, case-insensitive URL keys `host` and `hostaddr`. The warning branch returns at line 328, before schema/seed dispatch at lines 332 and 334, and final readiness becomes false at line 344. The tracked inert fixture covers protected and allowed cases and checks command dispatch, readiness and file preservation at `desktop-launcher/src/tests/auto-setup-test.ts:173` and line 227. The setup report records 19/19 passing. |

## Remaining Important finding — password delimiter in valid PostgreSQL user information

A password consisting of an initial apostrophe plus a synthetic marker produced a database URL containing that exact password. The sanitizer matched only the portion ending immediately before the apostrophe. Removing that prefix left the entire password in the message. Sanitizing the assembled TXT and the historical ZIP log a second time could not remove it. In addition to the ordinary IPv6 marker, the existing core fixture should include this password form for current and historical records. The sanitizer needs to consume the complete credential field, including legal apostrophes, before trying to preserve the surrounding URL.

I ran the following isolated probe from the repository root. It uses a temporary project with no environment files, temporary app data, explicit synthetic variables, and the real configuration helper, logger, and exporters. The supervisor watchdog is closed during cleanup. No actual database, server, or shared stack is involved.

```bash
(cd desktop-launcher && node --import ../server/node_modules/tsx/dist/loader.mjs --input-type=commonjs <<'NODE'
const fs = require('node:fs'), path = require('node:path'), Zip = require('adm-zip');
const { withLauncherFixture } = require('./src/tests/test-fixtures.ts');
const { SettingsManager } = require('./src/main/settings-manager.ts');
const { LauncherLogger } = require('./src/main/logger.ts');
const { ProcessSupervisor } = require('./src/main/process-supervisor.ts');
const { AiLogExporter } = require('./src/main/ai-log-exporter.ts');
const { readBackendEnvironment } = require('./src/shared/backend-environment.ts');
withLauncherFixture(async dir => {
  const settings = SettingsManager.getInstance();
  settings.updateSettings({ projectDir: dir });
  try {
    const markers = { original: 'OriginalFixCheck', live: 'LiveQuotePasswordCheck', history: 'OldQuotePasswordCheck' };
    const config = suffix => readBackendEnvironment(dir, require('dotenv').parse, {
      DATABASE_URL: 'postgresql://user:${DB_PASSWORD}@[::1]:5432/world',
      DB_PASSWORD: "'" + suffix, JWT_SECRET: 'fake',
    });
    const old = config(markers.history), live = config(markers.live);
    if (!live.env || !old.env) throw Error('fixture failed config');
    console.log('template preserves apostrophe:', live.env.DATABASE_URL.includes("'" + markers.live));
    LauncherLogger.getInstance().info('server', 'postgresql://user:' + markers.original + '@[::1]:5432/world');
    LauncherLogger.getInstance().info('server', live.env.DATABASE_URL);
    fs.appendFileSync(path.join(settings.getLogDir(), 'server.log'), 'historical: ' + old.env.DATABASE_URL + '\n');
    const t = await AiLogExporter.exportTxt(path.join(dir, 'a.txt'));
    const z = await AiLogExporter.exportZip(path.join(dir, 'a.zip'));
    if (!t.success || !z.success) throw Error('export failed');
    const archive = new Zip(z.filePath);
    const files = { txt: fs.readFileSync(t.filePath, 'utf8'), ...Object.fromEntries(
      archive.getEntries().filter(e => !e.isDirectory).map(e => [e.entryName, archive.readAsText(e)])) };
    for (const [f, body] of Object.entries(files)) {
      console.log(f, Object.keys(markers).filter(k => body.includes(markers[k])));
    }
  } finally {
    ProcessSupervisor.getInstance().cleanup();
  }
}).catch(e => { console.error(e); process.exitCode = 1; });
NODE
)
```

The probe completed with exit 0 and confirmed the apostrophe was present in the resolved URL. The ordinary IPv6 password was absent from every output. The following entries exposed the synthetic markers.

| Output | Current password marker | Historical password marker |
| --- | --- | --- |
| TXT | Present | Absent |
| ZIP `events.jsonl` | Present | Absent |
| ZIP `logs/server.log` | Present | Present |
| ZIP `logs/client.log`, `logs/launcher.log`, `manifest.json`, `summary.md` | Absent | Absent |

## Residuals and declined judgments

The gate observes the user-supplied mode and URL endpoint; it cannot determine where a local proxy forwards traffic. The reviewed contract sets the boundary at an explicitly development-marked loopback target. No claim is made about the identity of a live database. The previously reported standalone-test aggregation suggestion remains outside this follow-up. I did not rerun the reported suites, builds, or Prisma generation; the independent execution above addresses the one unresolved behavioral question. I did not inspect project environment files, exercise a real database, test native Windows Electron/batch behavior, judge compiled production or console packaging, or perform integrated gameplay, admin, or whole-branch acceptance.
