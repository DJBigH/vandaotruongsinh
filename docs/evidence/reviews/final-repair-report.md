# Final checkpoint repair report

The three local commits below address findings 1–8 of the independent whole-branch review. The repair base was `5756da6a9d1f5ae54735602237a1f143f1b87205` on `codex/vnext-m1`. The repaired product head is `25a7864a39cc94f7e0960661b0157980bfddeefc`.

| Commit | Scope |
| --- | --- |
| `c4b8e9c8beeb157a2ae2d900d072efb3aac8fdc0` | Disposable database checks for write-bearing verification and the two reviewed source-stamp inputs |
| `b5009d8094d8e0c9aa6b324bac53bd00156d9a7b` | Identified launcher readiness, open controls, diagnostics, process ownership, seed output and localized redaction |
| `25a7864a39cc94f7e0960661b0157980bfddeefc` | Account slot handover, live resources, boss lifecycle and character/stage-bound breakthroughs with client and server coverage |

## Findings and observed results

The initial focused runs executed the new assertions against the reviewed product code. RED route tests passed 1/9, RED boss passed 0/1, RED guard passed 3/6 and RED launcher core passed 62/68. Later GREEN suites include additional positive, rollback, ordering and ownership cases. Each filename below is relative to `scratch/sdd-vnext-m1/final-repair-logs/`.

| Finding | Behavior observed before repair | Verified repair |
| --- | --- | --- |
| 1. Slot handover | Creation and switching left the previous socket session running. An authentication already opening a session could also outlive the handover. See `red-routes.txt`. | Account-scoped coordination orders complete authenticated binds and active-slot changes. After activation, the server detaches the former socket, clears its snapshot callback, pauses the actor and awaits its position save. A late close can only affect the socket that still owns that exact character. Both activation paths, in-flight authentication, same-character replacement, saved position, and a replacement receiving its own tick passed. A real wolf reward transaction held before settlement completed after activation and credited only the former character. See `green-routes.txt`. |
| 2. Shrines | The live actor remained injured and an offline interaction used the earlier persisted JSON. Both assertions failed in `red-routes.txt`. | The shrine revalidates the location and active character under the character write queue and row lock. A living session receives full HP and MP using its current maxima. With no session, the server changes the two fields on the latest locked stats. A dead actor cannot revive through this route. Live equipment, both resources, a subsequent TICK, death, and an intervening offline stat change passed in `green-routes.txt`. |
| 3. Potion/death ordering | Death after the debit and during commit acknowledgement produced a successful use with no accepted healing. The existing rollback case was already green. See `red-routes.txt`. | A life change before the final reservation aborts the database transaction and preserves the item. A commit that wins applies the effect to the captured actor/life, then releases pending combat in arrival order. A failed commit releases the same combat without restoration. Deterministic lethal-hit, subsequent dodge, original frame duration, iframe expiry, rollback, and death followed by a new life passed, together with competing sale/use, one-stack use, offline persistence and the real WebSocket path. See `green-routes.txt`. |
| 4. Settled boss | Player revival reset a separately defeated boss before its respawn deadline. See `red-boss.txt`. | Revival resets bosses from failed attempts while an already rewarded boss retains its own timer. A later normal respawn clears the reward flag. The focused encounter dispatched one settlement, survived unrelated player death without early respawn, and dispatched a second settlement only for the next defeat. The test uses a settlement-count spy. The route suite separately covers actual PostgreSQL reward credit. Mutual death, live-attempt reset, authored boss phases and timings also passed. See `green-boss-movement.txt`, `security.txt` and `green-routes.txt`. |
| 5. Game identity | A foreign backend with a protected route and a generic successful HTML page were both accepted. See `red-launcher.txt`. | The launcher requires HTTP 200, the matching media type and the game's health fields or frontend document marker. Startup, watchdog and diagnostics use this probe. Open Game and Open Admin recheck the current frontend before navigation. Foreign listeners survived refusal and forced-stop requests. Changing a running fixture's identity withdrew external status. Identified external games stayed external, and repeatedly starting an owned child retained ownership. The fixture serves the actual client index and the Fastify fixture checks the real health contract. See `green-launcher-core.txt`, `green-supervisor.txt` and `green-routes.txt`. |
| 6. Test database | The existing runner accepted host, encoded mixed-case hostaddr and database query overrides on a synthetically local test URL. See `red-guard.txt`. | The same resolved application configuration now guards write-bearing test entry points, including all database-writing suites in the ordinary aggregate. A directly addressed loopback PostgreSQL URL with the designated test suffix is required. A narrow allowlist of connection options excludes endpoint and database overrides. Production mode is refused. The synthetic rejection probes only loaded configuration and the guard. They never opened a database connection. See `green-guard.txt`, `config.txt`, `prisma-config.txt` and the passing guarded database suites. |
| 7. Localized seed output | A synthetic localized password survived the setup stdout sanitation path, TXT and ZIP members. See `red-launcher.txt`. | The application seed emits only the created owner username. The shared sanitizer recognizes the Vietnamese password label. A real synthetic child stdout line reached the setup GUI sanitation boundary, and current plus historical fixture logs were checked through the real exporters. See `green-launcher-core.txt`. The GUI check observed the payload text prepared for IPC with no native Electron window. The source inspection does not assert historical publication of a real secret. |
| 8. Breakthrough retry | Replaying the same intent spent the second tier cost when enough cultivation remained. See `red-routes.txt`. | The client submits the viewed character and starting realm/tier. Under the character row lock, the immediate-successor replay returns the success envelope without a second charge or live refresh. Further stale stages and another active slot return conflict. A new intention starting at the new stage pays the authored cost. The route verified 950 → 850 → 850 → 550 cultivation, unchanged replacement slot, and all three path unlocks. The actual client adapter confirmed identical retry payloads and the deliberate next-stage payload. See `green-routes.txt` and `client-behavior.txt`. |

The provenance whitelist now includes `art/vnext/manifest.json` and `desktop-launcher/src/shared/backend-environment.ts`. The historical evidence remains at its recorded source identities.

## Runtime and API contracts

- The account mutex is in-process, matching the single-server deployment. An old authentication already holding the account lock may finish before the switch. Once the switch succeeds it has retired that owner, including a socket from another window. The former session remains paused in memory and an earned settlement continues to target its original character ID.
- Consumable lookup, database lock waits and the debit proceed with ordinary simulation. A short resource reservation starts only after the transaction callback has completed its work and verified actor identity/life. Ticks, inputs, heartbeats and pause events arriving during commit acknowledgement keep their arrival order. Ticks retain their original time and dt. Inputs retain their original server receipt time and aim. Cooldown, iframe, monster respawn and player revival deadlines use those times. Each outcome drains the queue, including rollback. This is an in-process ordering guarantee for a running server. Crash recovery across a PostgreSQL commit and a process exit remains outside this verification.
- `POST /api/game/character/breakthrough` now requires `{ characterId, realmIndex, realmTier }` from the displayed character. Missing or invalid fields return 400. A different active character or nonadjacent stage returns 409. An immediate-successor replay produces the usual success response for the same transition. An intentional next transition uses a newly viewed starting stage. This intentionally tightens the formerly empty POST.
- Launcher identity is a local readiness convention. The health response supplies `status=ok` and the game name. The frontend root carries `data-vandao-game="van-dao-truong-sinh"`. The probe bounds response time and body size.
- All database-bearing runs used the controller's disposable stack and isolated fixture accounts. The new guard verifies the effective application URL. For browser drivers pointed at a separately running server, the operator still supplies a backend launched with that same disposable configuration.

## Gates

| Gate | Result | Output log |
| --- | --- | --- |
| Real world/session routes | 39/39 | `green-routes.txt` |
| Movement/AOE and boss lifecycle | 18/18 and 9/9 | `green-boss-movement.txt` |
| ARPG, security/death, M1 content, phase 3 | 27/27, 26/26, 17/17, 20/20 | `arpg.txt`, `security.txt`, `m1-content.txt`, `phase3.txt` |
| Client behavior | 27/27 | `client-behavior.txt` |
| Launcher core, encoding, setup | 71/71, 30/30, 19/19 | `green-launcher-core.txt`, `vietnamese-encoding.txt`, `auto-setup.txt` |
| Server target guard, config, generated Prisma | 6/6, 9/9, 1/1 | `green-guard.txt`, `config.txt`, `prisma-config.txt` |
| Managed supervisor, Vite proxy, built renderer | Managed child fixture passed, 2/2 proxy, 3/3 renderer | `green-supervisor.txt`, `vite-proxy.txt`, `renderer.txt` |
| Server, client and desktop launcher builds | All exited 0 | `server-build.txt`, `client-build.txt`, `launcher-build.txt` |

The checks used Node 24.22.3 and npm 11.9.0. Logs retain assertion names, summaries and exit codes while excluding application request bodies, environment contents and authentication data. The exact executed command and working directory are the first two lines of each log, and are listed below.

## Execution commands

- `arpg.txt` from `/workspace/scratch/c5685e889d73/vandaotruongsinh/server`

  ```sh
  node /workspace/scratch/c5685e889d73/runtime_tools/run-in-stack.mjs /workspace/scratch/c5685e889d73/vandaotruongsinh/server env NODE_ENV=test node --env-file=../.env --import tsx src/tests/arpg-test.ts
  ```

- `auto-setup.txt` from `/workspace/scratch/c5685e889d73/vandaotruongsinh/desktop-launcher`

  ```sh
  node /workspace/scratch/c5685e889d73/runtime_tools/run-in-stack.mjs /workspace/scratch/c5685e889d73/vandaotruongsinh/desktop-launcher node --import ../server/node_modules/tsx/dist/loader.mjs src/tests/auto-setup-test.ts
  ```

- `client-behavior.txt` from `/workspace/scratch/c5685e889d73/vandaotruongsinh/client`

  ```sh
  node /workspace/scratch/c5685e889d73/runtime_tools/run-in-stack.mjs /workspace/scratch/c5685e889d73/vandaotruongsinh/client node --import ../server/node_modules/tsx/dist/loader.mjs --test tests/authStore.test.ts tests/exploration.test.ts tests/presentation.test.ts tests/questPanel.test.ts tests/breakthrough.test.ts
  ```

- `client-build.txt` from `/workspace/scratch/c5685e889d73/vandaotruongsinh/client`

  ```sh
  npm run build
  ```

- `config.txt` from `/workspace/scratch/c5685e889d73/vandaotruongsinh/server`

  ```sh
  node --import tsx --test src/tests/config-test.ts
  ```

- `green-boss-movement.txt` from `/workspace/scratch/c5685e889d73/vandaotruongsinh/server`

  ```sh
  node --import tsx --test src/tests/boss-lifecycle-test.ts src/tests/world-movement-test.ts
  ```

- `green-guard.txt` from `/workspace/scratch/c5685e889d73/vandaotruongsinh/server`

  ```sh
  node --import tsx --test src/tests/disposable-database-test.ts
  ```

- `green-launcher-core.txt` from `/workspace/scratch/c5685e889d73/vandaotruongsinh/desktop-launcher`

  ```sh
  node /workspace/scratch/c5685e889d73/runtime_tools/run-in-stack.mjs /workspace/scratch/c5685e889d73/vandaotruongsinh/desktop-launcher node --import ../server/node_modules/tsx/dist/loader.mjs src/tests/launcher-core-test.ts
  ```

- `green-routes.txt` from `/workspace/scratch/c5685e889d73/vandaotruongsinh/server`

  ```sh
  node /workspace/scratch/c5685e889d73/runtime_tools/run-in-stack.mjs /workspace/scratch/c5685e889d73/vandaotruongsinh/server env NODE_ENV=test node --env-file=../.env --import tsx --test src/tests/world-session-routes-test.ts
  ```

- `green-supervisor.txt` from `/workspace/scratch/c5685e889d73/vandaotruongsinh/desktop-launcher`

  ```sh
  node /workspace/scratch/c5685e889d73/runtime_tools/run-in-stack.mjs /workspace/scratch/c5685e889d73/vandaotruongsinh/desktop-launcher node --import ../server/node_modules/tsx/dist/loader.mjs src/tests/process-supervisor-test.ts
  ```

- `launcher-build.txt` from `/workspace/scratch/c5685e889d73/vandaotruongsinh/desktop-launcher`

  ```sh
  npm run build
  ```

- `m1-content.txt` from `/workspace/scratch/c5685e889d73/vandaotruongsinh/server`

  ```sh
  node /workspace/scratch/c5685e889d73/runtime_tools/run-in-stack.mjs /workspace/scratch/c5685e889d73/vandaotruongsinh/server env NODE_ENV=test node --env-file=../.env --import tsx src/tests/m1-content-test.ts
  ```

- `phase3.txt` from `/workspace/scratch/c5685e889d73/vandaotruongsinh/server`

  ```sh
  node /workspace/scratch/c5685e889d73/runtime_tools/run-in-stack.mjs /workspace/scratch/c5685e889d73/vandaotruongsinh/server env NODE_ENV=test node --env-file=../.env --import tsx src/tests/phase3-test.ts
  ```

- `prisma-config.txt` from `/workspace/scratch/c5685e889d73/vandaotruongsinh/server`

  ```sh
  node --test src/tests/generated-prisma-config-test.mjs
  ```

- `red-boss.txt` from `/workspace/scratch/c5685e889d73/vandaotruongsinh/server`

  ```sh
  node --import tsx --test '--test-name-pattern=a rewarded boss' src/tests/boss-lifecycle-test.ts
  ```

- `red-guard.txt` from `/workspace/scratch/c5685e889d73/vandaotruongsinh/server`

  ```sh
  node --import tsx --test src/tests/disposable-database-test.ts
  ```

- `red-launcher.txt` from `/workspace/scratch/c5685e889d73/vandaotruongsinh/desktop-launcher`

  ```sh
  node /workspace/scratch/c5685e889d73/runtime_tools/run-in-stack.mjs /workspace/scratch/c5685e889d73/vandaotruongsinh/desktop-launcher node --import ../server/node_modules/tsx/dist/loader.mjs src/tests/launcher-core-test.ts
  ```

- `red-routes.txt` from `/workspace/scratch/c5685e889d73/vandaotruongsinh/server`

  ```sh
  node /workspace/scratch/c5685e889d73/runtime_tools/run-in-stack.mjs /workspace/scratch/c5685e889d73/vandaotruongsinh/server env NODE_ENV=test node --env-file=../.env --import tsx --test '--test-name-pattern=slot (create|switch)|shrine|breakthrough retry|potion orders' src/tests/world-session-routes-test.ts
  ```

- `renderer.txt` from `/workspace/scratch/c5685e889d73/vandaotruongsinh`

  ```sh
  node /workspace/scratch/c5685e889d73/runtime_tools/run-in-stack.mjs /workspace/scratch/c5685e889d73/vandaotruongsinh node scratch/sdd-vnext-m1/task-4-logs/renderer-readiness.mjs
  ```

- `security.txt` from `/workspace/scratch/c5685e889d73/vandaotruongsinh/server`

  ```sh
  node /workspace/scratch/c5685e889d73/runtime_tools/run-in-stack.mjs /workspace/scratch/c5685e889d73/vandaotruongsinh/server env NODE_ENV=test node --env-file=../.env --import tsx src/tests/security-test.ts
  ```

- `server-build.txt` from `/workspace/scratch/c5685e889d73/vandaotruongsinh/server`

  ```sh
  npm run build
  ```

- `vietnamese-encoding.txt` from `/workspace/scratch/c5685e889d73/vandaotruongsinh/desktop-launcher`

  ```sh
  node /workspace/scratch/c5685e889d73/runtime_tools/run-in-stack.mjs /workspace/scratch/c5685e889d73/vandaotruongsinh/desktop-launcher node --import ../server/node_modules/tsx/dist/loader.mjs src/tests/vietnamese-encoding-test.ts
  ```

- `vite-proxy.txt` from `/workspace/scratch/c5685e889d73/vandaotruongsinh/client`

  ```sh
  node /workspace/scratch/c5685e889d73/runtime_tools/run-in-stack.mjs /workspace/scratch/c5685e889d73/vandaotruongsinh/client node --test tests/vite-proxy-test.mjs
  ```

## Self-review and limits

I traced all changed action entry points, reapplied the per-character and per-account ordering to success, rollback, stale close and repeated use, inspected the final commit range, and ran `git diff --check 5756da6a9d1f5ae54735602237a1f143f1b87205..25a7864a39cc94f7e0960661b0157980bfddeefc` successfully. The post-commit source stamp reported `gameSourceDirty=false` and harness SHA-256 `8736614e75c1874b95f54a893a7bbd3a253d9b048049af3d553ab99768b0ec9f`. The remaining working-tree paths belonged to controller documentation and packaging work.

The repair verifies normal running-process and acknowledged database outcomes. The last authoritative position save during slot handover is a separate awaited write after slot activation. A process or database failure between those writes falls back to previous durable position data. Native Windows process management, physical focus, final browser play and hardware/performance acceptance belong to separate verification. These regressions and builds make no new FPS or visual quality claim.


## Follow-up to Important 1 — terminal displaced scenes

The scoped review of `25a7864a39cc94f7e0960661b0157980bfddeefc` identified a client-side gap in the earlier handover checks. The server had revoked the old socket, but the old window could create another socket and authenticate against the account's new active character. The original server-only handover tests used explicit character IDs and did not exercise the Phaser scene's reconnect path.

The follow-up commit is `3ac3fe5ed078347145b0199cd136c9a6c05939fa`. The scene captures its character ID at initialization and passes it to the connection for the entire scene lifetime. Both socket-open and foreground authentication send that captured ID. Slot change, a requested slot that is no longer active, and same-character displacement have explicit application close codes. Receiving a terminal close prevents further retries and focus reauthentication. For the earlier backend version, its exact code-1000 slot-change reason also terminates the scene. Ordinary transport loss still retries after 3,000 ms. A reconnect that missed the slot-change close can only ask for its original slot.

The displaced scene clears prediction, held input, queued actions, world objects and pending map display. It detaches its window and gameplay controls. The game page replaces the HUD and panels with the terminal reason and an explicit reload button. Reloading starts a fresh viewed session using the character currently selected by the account.

### Follow-up RED and GREEN

- The original tracked connection scheduled one retry on the former slot-retirement close. The regression required zero and failed as expected in `terminal-red-client.txt`.
- The complete client suite passed **28/28** in `terminal-client.txt`.
- The complete route/session suite passed **42/42** in `terminal-server-final.txt`. Three scenarios used the actual production client connection, a real loopback Fastify WebSocket listener, real authentication and disposable fixture accounts. In the first, creating a new slot delivered the terminal close. The former scene made exactly one total connection attempt. In the second, an abrupt transport drop preceded the slot switch. The backgrounded client established one retry transport after 3 seconds and authenticated its pinned character only when the synthetic focus event arrived. The server declined that inactive slot. In both cases the replacement retained its original socket and received a fresh TICK naming its own character after the old scene's focus handler ran. The final case dropped the transport with the same slot still active. The original scene reauthenticated its character after the actual retry interval and received further TICKs.
- The first integration run checked the shared suite listener, whose count also included older in-process injected sockets. Two count assertions failed in `terminal-server.txt`. The final fixture gives each scenario its own actual TCP listener and closes only its own connections. No product change was required to correct that fixture.
- Both server and client builds exited zero. Scope review and `git diff --check` passed before the commit. The scoped commit contains seven product/test files. The controller's pending browser-harness and documentation changes remained outside it.

The tests dispatched synthetic blur/focus events through the same visibility listeners used by Phaser. These results cover focus-handler behavior and the real network retry interval. Physical OS focus and the separately planned controller browser/terminal-screen check are outside this result.

### Follow-up execution commands

- `final-repair-logs/terminal-red-client.txt` from `/workspace/scratch/c5685e889d73/vandaotruongsinh/client`

  ```sh
  node --import ../server/node_modules/tsx/dist/loader.mjs --test '--test-name-pattern=a slot retirement' tests/exploration.test.ts
  ```

- `final-repair-logs/terminal-server.txt` from `/workspace/scratch/c5685e889d73/vandaotruongsinh/server`

  ```sh
  node /workspace/scratch/c5685e889d73/runtime_tools/run-in-stack.mjs /workspace/scratch/c5685e889d73/vandaotruongsinh/server env NODE_ENV=test node --env-file=../.env --import tsx --test src/tests/world-session-routes-test.ts
  ```

- `final-repair-logs/terminal-server-final.txt` from `/workspace/scratch/c5685e889d73/vandaotruongsinh/server`

  ```sh
  node /workspace/scratch/c5685e889d73/runtime_tools/run-in-stack.mjs /workspace/scratch/c5685e889d73/vandaotruongsinh/server env NODE_ENV=test node --env-file=../.env --import tsx --test src/tests/world-session-routes-test.ts
  ```

- `final-repair-logs/terminal-client.txt` from `/workspace/scratch/c5685e889d73/vandaotruongsinh/client`

  ```sh
  node /workspace/scratch/c5685e889d73/runtime_tools/run-in-stack.mjs /workspace/scratch/c5685e889d73/vandaotruongsinh/client node --import ../server/node_modules/tsx/dist/loader.mjs --test tests/authStore.test.ts tests/exploration.test.ts tests/presentation.test.ts tests/questPanel.test.ts tests/breakthrough.test.ts
  ```

- `final-repair-logs/terminal-server-build.txt` from `/workspace/scratch/c5685e889d73/vandaotruongsinh/server`

  ```sh
  npm run build
  ```

- `final-repair-logs/terminal-client-build.txt` from `/workspace/scratch/c5685e889d73/vandaotruongsinh/client`

  ```sh
  npm run build
  ```

