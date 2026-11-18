# Task 4 launcher reliability report

Task base `0213c2ae1bac3a819738820324fe7dae4d00067e`. Focused test logs are in `scratch/sdd-vnext-m1/task-4-logs/`.

## Reproduced failures

| Check | Baseline result |
| --- | --- |
| Backend config fixture matrix | Exit 1, 5/9. A server-only file was ignored, the template expansion failed, and unresolved or invalid URLs were accepted. |
| Auto-Setup with temporary source trees and local npm/npx fixtures | Exit 1, 3/12. Setup used its own server-only file check, used the independent DB settings port, and returned success after requested Prisma and seed commands failed. |
| Core diagnostics with competing configured and launcher DB endpoints | Exit 1, 41/42. The TCP probe used the closed settings port while the endpoint in the selected URL was listening. |
| Supervisor subprocesses with a custom backend port | Exit 1. Both npm fixtures started, but the server child had no `SERVER_PORT`, `SERVER_HOST`, or resolved `DATABASE_URL` values. |
| Vite live HTTP and WebSocket proxy | Exit 1, 1/2. Default port supported; configured non-default port returned HTTP 500 and WebSocket reset. |

The original core run logged 33/34 with exit 0 and a 100% summary. Encoding used the same explicit successful termination after its assertion failures. The original setup run logged 3/5 with exit 1 on its real-checkout assumptions. These original logs are controller-owned evidence under `docs/evidence/verification/`.

The existing built renderer also reproduced a false-ready state in headless Chromium. A real click on Auto-Setup returned a `WARNING` progress event with `isReadyToPlay: false`, yet the page exposed Play. Two further isolated preflight checks reproduced an incorrect dependency warning for the dependency-free `shared` package and a false pass for Prisma’s ungenerated `index.js` stub. Those two cases returned 12/14 against the first implementation before their corrections.

## Implemented interface

Commit `7e2e78f8a4ea1ebdbf1399334ced3fcf229731bb` (`Make desktop launcher setup and startup reliable`). The commit includes only launcher, backend configuration, Vite proxy and focused tests and examples. A cached and committed whitespace check passed. Scratch report and logs are outside the commit.

- `readBackendEnvironment(projectDir, parseEnv, explicit?)` in `desktop-launcher/src/shared/backend-environment.ts` returns the selected file and either a validated environment with its database hostname and port or an actionable error. Each package supplies its existing dotenv parser API. Explicit variables override one selected file, preferring repository `.env` and falling back to `server/.env` when the first is absent. A malformed selected root file yields its own error even if a valid fallback file exists. An explicit valid URL and JWT secret can be used without either file.
- `DATABASE_URL` supports the shipped `${DB_USER}`, `${DB_PASSWORD}`, `${DB_HOST}`, `${DB_PORT}` and `${DB_NAME}` template. Raw user, password and database-name substitutions are URI-encoded. The URL retains options and pre-existing encoding. Existing complete URLs go through byte for byte. Missing or unresolved values and invalid PostgreSQL URLs produce messages without values. The backend writes the resolved URL into its process environment before Prisma construction. Launcher server install, Prisma generation, schema push, and seed receive the same resolved `DATABASE_URL` as an environment value, separate from shell arguments.
- Setup preserves both existing files during forced reinstall. It creates `server/.env` exclusively when usable configuration and existing configuration files are absent. The tracked examples alone now use the same fresh local database password as the existing Compose fallback. The working database files and credentials were left untouched. Direct manual Prisma or database-only commands can be supplied a concrete `DATABASE_URL` explicitly when using a root-only project configuration.
- Setup inspection now reports the selected source, the resolved database endpoint, and Node/npm, project, dependency and generated Prisma prerequisites. A dependency-free `shared` directory needs its source, and the Prisma installation stub needs generated `index.js` and `schema.prisma` before inspection marks it usable. Setup returns a failed operation and false readiness after a requested Prisma generate, schema push, or seed failure. Intentional sync skips and an unavailable TCP port complete with a warning and no Play action. The real setup lock rejects a concurrent call while its child runs. A canceled run holds that lock until it unwinds.
- The supervisor launches Fastify using the configured `SERVER_PORT` and `SERVER_HOST=127.0.0.1`, and passes the same port to the client. Vite uses it for both HTTP and WebSocket proxy targets. Defaults remain backend `3001`, client `5173` and PostgreSQL `5432` without a URL port. Diagnostics, setup and supervisor probe the endpoint from the selected URL and label the result as TCP reachability. Existing unrelated listeners and preexisting game listeners survive launcher stop requests. WSL wake attempts remain available for the default local database during startup and setup. A setup inspection only probes.
- `CHAY_LAUNCHER.bat` retains the packaged executable branches and uses `call` for each npm command in its source fallback. The fallback stops on failed installation or build. The source fallback and root `launcher:dev` both build main and renderer before launching. The root `test:launcher` runs the three suites using the existing tsx import loader.

## Verification

All commands below ran with the installed Node 24.22.3 runtime. Paths and log names are relative to the repository and the task log directory, respectively.

| Working directory and command | Result | Log |
| --- | --- | --- |
| `server/` · `node --import tsx --test src/tests/config-test.ts` before the implementation | Exit 1, 5/9. Server-only, template expansion, unresolved values and malformed URLs reproduced. | `backend-config-red.log` |
| Root · `node --import ./server/node_modules/tsx/dist/loader.mjs desktop-launcher/src/tests/auto-setup-test.ts` before the implementation | Exit 1, 3/12. Verified the config, command and reporting failures listed above. | `auto-setup-red.log` |
| Root · `node --import ./server/node_modules/tsx/dist/loader.mjs scratch/sdd-vnext-m1/task-4-logs/core-red/launcher-core-test.ts` against original diagnostics | Exit 1, 41/42. URL endpoint was open while diagnostics chose the closed settings port. | `launcher-core-red.log` |
| Root · `node --import ./server/node_modules/tsx/dist/loader.mjs scratch/sdd-vnext-m1/task-4-logs/core-red/process-supervisor-test.ts` against original supervisor | Exit 1. Spawned server fixture received none of the expected port, host and resolved URL values. | `supervisor-red.log` |
| `client/` · `node --test --test-reporter tap ../scratch/sdd-vnext-m1/task-4-logs/vite-proxy-draft.mjs` against original proxy | Exit 1, 1/2. HTTP 500 and WebSocket reset at the configured port. | `vite-proxy-red.log` |
| Root · `node --import ./server/node_modules/tsx/dist/loader.mjs scratch/sdd-vnext-m1/task-4-logs/core-red/auto-setup-test.ts` before dependency and Prisma marker correction | Exit 1, 12/14. Both added preflight regressions reproduced. | `prisma-shared-red.log` |
| Root · `npm run test:launcher` | Exit 0. Core **44/44**, Vietnamese and icons **30/30**, Auto-Setup **14/14**. Exports verify Vietnamese, JSONL and credential redaction. Local fixtures verify open and closed TCP, root and fallback config, preserved files, command failure and ownership. | `launcher-suites-green.log` |
| Root · `node scratch/sdd-vnext-m1/task-4-logs/check-runner-failure.mjs` | Harness exit 0. In disposable copies, deliberate assertion failures produced exit **1** in all three suites, with core 43/44 (97%), encoding 29/30 (96%), and setup 13/14 (92%). | `runner-failures-green.log` |
| `server/` · `node --import tsx --test --test-reporter tap src/tests/config-test.ts` | Exit 0, **9/9**. Includes root/server/both files, explicit environment, punctuation/IPv6/options, missing JWT, unresolved values and invalid URLs. Fastify config and the Prisma process environment receive the same URL. | `backend-config-final.log` |
| `desktop-launcher/` · `node --import ../server/node_modules/tsx/dist/loader.mjs src/tests/process-supervisor-test.ts` | Exit 0. Both actual `npm run dev` fixture children received the configured backend port. The server received the local bind and resolved URL, and both were tracked as owned. | `supervisor-green.log` |
| `client/` · `node --test --test-reporter tap tests/vite-proxy-test.mjs` | Exit 0, **2/2**. Default port confirmed. Actual Vite HTTP request and WebSocket handshake/message reached the isolated custom-port fixture. | `vite-proxy-green.log` |
| Root · `node scratch/sdd-vnext-m1/task-4-logs/renderer-readiness.mjs` | Baseline exit 1 after showing Play for warning. After rebuild exit 0, **3/3**. Built renderer received fixture IPC and showed warning, error, and ready states correctly. | `renderer-red.log`, `renderer-green.log` |
| `desktop-launcher/` · `npm run build` | Exit 0. Vite emitted launcher HTML/CSS/JS and tsc emitted main/preload. | `launcher-build-green.log` |
| `server/` · `npm run build` | Exit 0. TypeScript compilation. | `server-build-green.log` |
| `desktop-launcher/` · `npm ls --omit=dev dotenv` | Exit 0. Packaged dependency resolves to existing locked `dotenv@16.6.1`. | `launcher-lock-green.log` |

The first combined post-change suite run reported its encoding assertions and stayed alive because the export path initializes the real supervisor watchdog. I stopped those test commands and made the fixtures close the supervisor, including the initial database timer, with all project and app-data configuration isolated. The final full suite and deliberate-failure runs exited as shown above. The build emits the existing npm environment warning and the launcher Vite future config-loader warning.

## Remaining acceptance

The database fixture is a loopback TCP listener. Prisma/seed tests verify actual child environment propagation through an isolated command fixture without running any schema or data writes. Authenticated PostgreSQL/gameplay acceptance belongs to the controller’s separate integration stack, which was untouched by these checks. The browser result covers the Linux-built renderer with a mock preload surface. Native Windows Electron and `CHAY_LAUNCHER.bat` clean-checkout execution remain outstanding. Compiled `server npm start` output paths/ESM aliases and legacy console launcher portability and foreign-process ownership are M4 work.

## Independent review corrections

Base `795be99a26138393e786b70ef790944d65c08710`. Follow-up commit `afa7fd25606db19b9b915cb915ba295cdecda00c` addresses the three Important findings in `task-4-launcher-review.md`. The focused commands remain standalone, as agreed for the Minor aggregate coverage suggestion.

- The server entry now loads the selected environment before Prisma and any other runtime dependencies. It also pins the selected `NODE_ENV` or its `development` default in the process environment. This keeps the authentication cookie mode consistent when a generated Prisma client loads a server-local fallback file after root configuration selection. The independent fixture uses an actual installed Prisma generator with `--no-engine` and a disposable schema and directory, then imports the actual server entry with the resulting generated client. It verifies root URL, JWT, JWT expiration and port, the launcher's explicit port/host/URL overrides, and the default runtime mode despite a fallback production marker. No API socket or database connection starts in this harness.
- Launcher redaction now parses PostgreSQL URLs to scrub passwords on bracketed IPv6 endpoints and redacts opaque Cookie and Set-Cookie headers, structured cookie fields and unquoted passwords. The same sanitizer covers action record details, assembled TXT and Markdown, and historical log files in the ZIP. The core suite writes synthetic secrets through the real logger and writes one separate historical fixture, then checks the bytes of TXT and every ZIP file. It checks that normal Vietnamese and JSONL output remain readable.
- Auto-Setup initializes database schema and seed only when effective `NODE_ENV=development` and the URL directly names `localhost`, `127.0.0.1`, or `::1`. A selected file marked `NODE_ENV=production` stays protected even with an explicit development mode override. URL `host` and `hostaddr` parameters disqualify automatic writes. Protected targets run Prisma client generation and complete with a warning and false `isReadyToPlay`. The setup fixture asserts that it dispatched no schema push or seed and preserved the selected file. It covers a production marker, a development override of a production file, a non-loopback synthetic endpoint, a URL host override, an absent mode, and the existing affirmative local development path. All Prisma/schema/seed decision commands use inert child fixtures.

| Working directory and command | Result | Log in `task-4-logs/` |
| --- | --- | --- |
| `server/` · `node --test --test-reporter tap ../scratch/sdd-vnext-m1/task-4-logs/generated-prisma-draft.mjs` | RED exit 1. The real entry picked the fallback URL, JWT and port for direct startup and the fallback JWT with launcher overrides. | `review-prisma-red.log` |
| Root · `node --test --test-reporter tap server/src/tests/generated-prisma-config-test.mjs` before pinning `NODE_ENV` | RED exit 1. The fallback production mode still reached ambient authentication settings. | `review-prisma-mode-red.log` |
| Root · `node --import ./server/node_modules/tsx/dist/loader.mjs scratch/sdd-vnext-m1/task-4-logs/core-red/launcher-review-core.ts` | RED exit 1, **49/56**. Five TXT markers survived, and ZIP leaked markers in JSONL and the server log. | `review-core-red.log` |
| Root · `node --import ./server/node_modules/tsx/dist/loader.mjs scratch/sdd-vnext-m1/task-4-logs/core-red/launcher-review-setup.ts` | RED exit 1, **14/18**. Four protected scenarios dispatched schema and seed commands to the inert test fixture. | `review-setup-red.log` |
| Root · `node --import ./server/node_modules/tsx/dist/loader.mjs desktop-launcher/src/tests/auto-setup-test.ts` before protecting the selected production file marker | RED exit 1, **18/19**. A development process override bypassed the production file marker. | `review-setup-override-red.log` |
| Root · `npm run test:launcher` | Exit 0. Core **56/56**, encoding **30/30**, Auto-Setup **19/19**. | `review-launcher-green.log` |
| Root · `node scratch/sdd-vnext-m1/task-4-logs/check-runner-failure.mjs` | Harness exit 0. Deliberate suite failures each exited 1, with totals **55/56**, **29/30**, and **18/19**. | `review-runner-failures-green.log` |
| `server/` · `node --test --test-reporter tap src/tests/generated-prisma-config-test.mjs` and `node --import tsx --test --test-reporter tap src/tests/config-test.ts` | Both exit 0, generated-client/startup fixture **1/1** and original config cases **9/9**. | `review-prisma-green.log`, `review-config-green.log` |
| `desktop-launcher/` · `node --import ../server/node_modules/tsx/dist/loader.mjs src/tests/process-supervisor-test.ts` | Exit 0, actual fixture npm children retained the configured port and backend bind. | `review-supervisor-green.log` |
| `client/` · `node --test --test-reporter tap tests/vite-proxy-test.mjs` | Exit 0, **2/2**, including live local HTTP and WebSocket proxy. | `review-vite-proxy-green.log` |
| Root · `node scratch/sdd-vnext-m1/task-4-logs/renderer-readiness.mjs` | Exit 0, **3/3**, warning, error and ready on the rebuilt renderer. | `review-renderer-green.log` |
| `desktop-launcher/` and `server/` · `npm run build` | Both exit 0. The same build warnings remain. | `review-launcher-build.log`, `review-server-build.log` |
| Root · `git diff --cached --check` and `git show --check --oneline HEAD` | Both exit 0. Commit lists only the 11 owned launcher, backend startup and test files. | Terminal output |

Native Windows acceptance and compiled production/console launcher work remain outstanding. These corrections were verified from local fixtures and builds while the controller's gameplay session used the shared runtime.

## PostgreSQL apostrophe redaction follow-up

Base `afa7fd25606db19b9b915cb915ba295cdecda00c`. Scoped commit `762c429be21cfef08187ebb7b86d1bf7c64e204e` resolves the remaining Important finding in `task-4-launcher-fix-1-review.md`.

The logger now accepts literal apostrophes inside PostgreSQL URL user information before handing the complete credential and authority to `URL` for redaction. A trailing apostrophe can still delimit the displayed URL. The core regression uses the existing configuration helper and actual logger and exporters to cover leading and embedded apostrophes in punctuation-heavy passwords, using both literal and percent-encoded apostrophes. Current fixtures enter through the logger and historical fixtures enter through a disposable server log. Assertions check decoded and encoded forms and partial sentinels in TXT and every ZIP file. They also confirm the emitted diagnostics retain the quoted IPv6 endpoint and schema option. The two committed files are `desktop-launcher/src/main/logger.ts` and `desktop-launcher/src/tests/launcher-core-test.ts`.

| Working directory and command | Result | Log in `task-4-logs/` |
| --- | --- | --- |
| `desktop-launcher/` · `node --import ../server/node_modules/tsx/dist/loader.mjs src/tests/launcher-core-test.ts` before the logger change | RED exit **1**, **54/63**. The synthetic secret tail survived TXT, ZIP `events.jsonl`, and ZIP `logs/server.log`. Current and historical quoted IPv6 URLs also lost their safe display. | `review-quote-red.log` |
| `desktop-launcher/` · `node --import ../server/node_modules/tsx/dist/loader.mjs src/tests/launcher-core-test.ts` after the logger change | Exit **0**, **63/63**. Both URL forms preserve display context while removing the credentials. | `review-quote-green.log` |
| `desktop-launcher/` · `npm run build:main` | Exit **0**. TypeScript compiled the launcher main process. npm emitted its existing `http-proxy` environment warning. | `review-quote-main-build.log` |
| Root · `git diff --cached --check` and `git show --check --oneline HEAD` | Both exit **0**. | Terminal output |

The fixture used synthetic credentials and temporary files. It did not read the working environment files, connect to a database, or use the shared integration stack.
