# Browser acceptance harness

Use a **disposable local database and services**, with dependencies installed in `server/` and `client/`. These scripts drive the actual React/Phaser application with keyboard and mouse. They observe public map data, HTTP results, WebSocket snapshots and the live Phaser scene; they do not write sprite coordinates or inject simulation INPUT packets.

The source-run scripts import shared TypeScript geometry. Run them from `server/` with `node --import tsx ../scripts/verification/<script>.mjs`. Playwright is an acceptance dependency, not a shipped client dependency. Install it in a testing environment, or provide these optional environment variables:

| Variable | Purpose |
| --- | --- |
| `VANDAO_PLAYWRIGHT_MODULE` | Absolute path to a locally installed Playwright entry file. |
| `VANDAO_CHROMIUM_PATH` | Local Chromium executable. |
| `VANDAO_CHROMIUM_MODULE` | Optional module exporting a headless Chromium executable and its arguments. |
| `VANDAO_TEST_URL` | Local frontend URL; defaults to `http://127.0.0.1:5173`. |
| `VANDAO_EVIDENCE_DIR` | Output folder for the particular run. Use a fresh folder to preserve prior failed evidence. |
| `VANDAO_BROWSER_COMMANDS` | Local command queue for the recorded manual acceptance session. |
| `VANDAO_RECORD_VIDEO` | Set to `1` for a recorded play-session. Playwright needs its video encoder installed. |
| `VANDAO_STORAGE_STATE` | Optional private test-account storage state for continuing a recorded session. Never commit or distribute it. |

## Scripts and scope

- `browser-smoke.mjs`: real UI registration and character creation, panels and neutral traffic, learned-skill gating, elder dialogue and quest credit, wall collision, village/forest transition, autosave/reload, reconnect, resizing and return to the village.
- `terminal-handover-browser.mjs`: two actual pages of one disposable test account. The displaced page must show its terminal message, send no further controls or reconnect after the retry interval and a synthetic focus event, while its replacement continues. Clicking the explicit reload button starts a fresh intentional session. The synthetic event is not proof of physical focus loss.
- `focus-probe.mjs`: activates a second real tab and records whether the environment exposes focus/visibility loss. It explicitly reports a limitation if a headless shell keeps every page focused; that result is not a focus-loss pass.
- `serve-and-play.mjs`: runs a fresh production build, verifies source identity before/after, and copies `client/dist` into an isolated frozen preview on port5174, preserving its file hash and source stamp, then runs the session. API/WebSocket traffic still reaches the real local backend; source edits cannot trigger HMR during the recording.
- `play-session.mjs`: keeps one actual game session running while commands arrive through the local file queue. It records a one-second timeline and optional real video. `send-command.mjs` submits commands such as `walk`, `fight`, `dialogue`, `quest`, `inspect-item`, `equip`, `menu`, `key`, `screenshot`, `reload`, `reconnect`, and `finish`. `inspect-item` selects actual visible bag cards and compares the displayed quantity with the committed API inventory. Equipment clicks are scoped to the selected item's detail section because the category filter has the same label.
- `performance-fixture.mjs`: starts its own server and Vite proxy against a local database whose name ends in `_test`. It creates and later deletes only its own test accounts. A realm-1 fixture checks all four Sword slots against exact MP cost, cooldown and observed action animation, plus projectile creation and dash distance. Separate high-defense fixtures retain ten living normal enemies plus one boss in the forest arena. The benchmark preserves monster templates, AI and combat formulas. Every post-render sample joins snapshot IDs to actual visible, living, combat-active, in-camera actors and requires a fresh snapshot and living player. It measures 45 seconds after warmup without recording, includes wall-duration and start/end gaps, and exits nonzero if any workload, coverage or frame target is missed. It also checks actual server WebSocket OPEN/CLOSING/total after a fresh replacement TICK. `VANDAO_FIXTURE_SCOPE=network` runs only the socket check and labels the result accordingly.

Example commands for a running recorded session, from the repository root:

```sh
node scripts/verification/send-command.mjs '{"type":"state"}'
node scripts/verification/send-command.mjs '{"type":"walk","x":1024,"y":352}'
node scripts/verification/send-command.mjs '{"type":"dialogue"}'
node scripts/verification/send-command.mjs '{"type":"screenshot","name":"elder"}'
node scripts/verification/send-command.mjs '{"type":"finish"}'
```

Navigation plans routes from the same public map geometry, then presses normal WASD keys. Combat automation aims and clicks through the game canvas and dodges confirmed telegraphs. A deliberate reconnect closes the current transport to test recovery; it does not modify gameplay state.

Discrete gameplay keys are held for 80 ms so the Phaser input loop can observe them in the measured low-frame-rate environment. Combat waits for a committed warning to resolve before approaching again. These are controller timing changes, not changes to game cooldowns, costs or damage. Historical session archives retain the exact controller used, including failed commands. In the boss session, the initial equipment command matched both the filter and detail button; the observed detail button was then clicked through normal mouse input and its result was checked before and after reload. That failed command remains recorded.

The React Fiber lookup is a read-only testing seam and may need maintenance after React or GamePage refactoring. Browser network counts are scoped to the current document because navigation can discard old-document close observations. The fixture checks the server's real OPEN sockets separately. Authentication frames, passwords, cookies and storage state are excluded from public evidence. Final claims should use the result files, including failures and environmental limitations, not merely the existence of these scripts.

The frozen frontend explicitly builds with `NODE_ENV=production` and `VITE_API_URL=/api`, recorded in its manifest, because its isolated preview supplies the matching API/WebSocket proxy. This prevents backend environment variables loaded into the fixture process from changing the frontend endpoint or build mode. Identical inventory rows have no visible row ID: selection verifies the visible equipped badge, and equipment assertions require exactly one previously eligible row to change state. Consumable assertions compare the total template quantity and require a debit of exactly one.

## Evidence integrity and queue completion

All source-run entry points check the runner configuration for a loopback database with a name ending in `_test`. For smoke, focus and recorded play, separately ensure the actual already-running backend was launched with that same disposable configuration; the helper cannot interrogate an arbitrary remote service. This recorded execution used the controller-created PG16 localhost25432/vandao_vnext_test stack, whose launcher wrote the root configuration before starting the actual server. The performance fixture starts its own server in-process with the checked configuration. Source stamps record the commit, game-source dirty status and harness hash. The frozen preview additionally hashes every built file. Tests never copy the environment file, auth frames or cookies into evidence.

The command sender requires the live session ID in `ready.json`, atomically publishes each request, and waits for an atomically published result. A route has a 120-second total budget; the sender waits 180 seconds. On a timeout, resume the existing command with `node scripts/verification/send-command.mjs --resume <command-id>` rather than submitting the action twice. Old-session commands and submissions after intake closes are rejected. The sender also detects a raced command left behind when the session closes. `finish` immediately stops command intake, closes the context to finalize its video, checks the recording with `ffprobe`, writes `session-result.json`, and only then acknowledges completion. A completed session may still contain failed individual commands; those remain in the result and cannot be counted as passed checks.

The frame average uses actual rendered-frame count divided by the monotonic wall measurement window. A separate interval average is reported for inspection. The p50/p95 use the nearest-rank convention, with first/end gaps separately recorded; a sample must have at least30 finite intervals and98% window coverage. Full-load acceptance requires the joined workload on every observed rendered frame, at least five confirmed skill activations, average55FPS and p95≤25ms. These are measured-environment results, not promises for different hardware.
