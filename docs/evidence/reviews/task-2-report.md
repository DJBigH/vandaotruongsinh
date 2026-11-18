# Task 2 implementation report

## Status

Client implementation, regression tests and production build are complete at `f3239016c6e6d95e97fd64d159f96d21dd1dd729`. The controller owns actual Chromium gameplay acceptance. Its first run reached the direct registration form and could not submit it. The auth startup fix is committed. The controller’s first post-fix rerun in `docs/evidence/client-smoke-after-entry-fix` passed eight actual-browser checks and stopped because its close helper used a stale selector for the map dialog. Full browser gameplay acceptance is pending in the controller’s verification.

## Behavior

- The game page waits for the saved character before starting Phaser. Boot passes the saved map for prefetch. The world draws after authoritative `INIT` with its world coordinates, or after an authoritative map-changing `TICK`. A failed map fetch retries on a later tick after one second. A superseded or stopped load cannot paint.
- Each ExplorationScene lifetime owns one connection and one reconnect timeout. Closing or disposing the owner detaches socket callbacks. Teleport uses the existing HTTP command and the next server map snapshot on the same connection. The old map's objects, tweens, timers, entities, projectiles and telegraphs clear before the replacement map draws.
- Foreground panels, loading worlds and dialogue send neutral `INPUT` on the regular cadence. Window blur/hidden/pagehide releases held keys and queued actions, sends one neutral input and stops periodic sends until focus returns. Reconnect authentication is deferred while backgrounded. On this server, five seconds of inactivity pauses the session, and the existing input/heartbeat handlers resume it.
- Window key events reject stale repeats after reset, and I/M toggle the inventory/map panels. Form fields, dialogue fetches, open dialogue, character slots, panels and pending world interactions gate world controls. Pointer attack and direct NPC interaction verify that the native press began on the game canvas. Listeners are detached on stop/destroy.
- Local movement uses server speed times the existing factor of 12, normalized diagonals and the shared swept geometry. Presentation reconciliation uses elapsed frame time and a bounded target extrapolation for agreeing movement. Rendering and interpolation continue on the frame loop while network state arrives at 20 Hz. Authoritative death and dash states still come from the server. Player/monster depth and all existing 64×64 animation keys remain compatible.
- An action intent creates a visual only when its server cooldown rises, within a 350 ms local confirmation window. A skill index must be present in the server's equipped cooldown vector before it can be requested. Cast animations use a generic path-colored pulse, and projectile feedback uses the actual snapshot. An action replacement removes the previous keyed completion callback and safety timer.
- The HUD uses both current and maximum HP/MP from the same server event. The map list has a viewport-height bound and scrolls. Expanded dock columns can shrink within the dock. Interaction/debug/loading text is React DOM and follows viewport layout. Terrain uses the prior image keys for correctly sized images and existing tiles for mismatched image dimensions. Data-driven decorative props are placed once, with matching interactive art deduplicated.
- `REWARDS` and committed object interactions refresh the character wallet, inventory and quests through one in-flight refresh batch with a trailing update when necessary. NPC dialogue continues refreshing TALK quest progress. The additional registration fix marks the fresh auth store idle until one of its existing async actions starts.

## Interfaces and events

| Interface | Change |
| --- | --- |
| `ExplorationScene.init(data?: { mapId?: string })` | Supplies the prefetch hint, falling back to the already loaded character's map. |
| `ExplorationConnection` | `start(): void`, `send(message: object): boolean`, `stop(): void`. Constructor takes `createSocket`, `scheduleRetry`, `onOpen`, `onClose`, and `onMessage(data: string)`. |
| `MapLoad<T>` | `prefetch(id: string)`, `show(id, render, onFailure?): Promise<void>`, and `clear()`. |
| `GameControls` | `keyDown(code, repeat): boolean`, `keyUp(code)`, `movement(): Position`, `takeAction(): GameAction \| null`, and `clear()`. |
| `ActionConfirmation` | `request(action, aim, now): boolean`, `update(nextCooldowns, now): { action: GameAction; aim: Aim }[]`, `discardPending()`, and `reset()`. `Aim` is `{ x: number; y: number; angle: number }`. `GameAction` is `ATTACK \| DODGE \| SKILL_1 \| SKILL_2 \| SKILL_3 \| SKILL_4`. |
| `AnimationManager.playAction` | `(scene, sprite, lock: ActionAnimationLock, key: string, timeout: number): void`. The lock exposes `active`, `start(register)`, and `clear()`. |
| `predictPosition` | `(map, position, velocity, sample, now, delta): Position`, where sample is null or authoritative position/velocity/state plus monotonic `receivedAt`. |
| Zustand | Added `dialogueLoading: boolean`, `characterSlotsOpen: boolean`, and `setCharacterSlotsOpen(open: boolean)`. The exploration scene writes the existing `currentMap: MapData \| null`. |
| `gameApi.interact` and `savePosition` | Interaction result uses the actual `{ type?: string; message?: string }`; position save takes no arguments and sends an empty POST. |
| Browser auth state | `useAuthStore` initially sets `isLoading: false`. Existing login, register and session lookup actions retain their loading transitions. |

New bridge events are `worldPromptUpdate(text: string)`, `worldDebugUpdate(text: string)`, `worldStatusUpdate(text: string)`, and `worldProgressCommitted()`. The existing `playerHpMpUpdate({ hp, maxHp, mp, maxMp })` and `cooldownsUpdate(cooldowns)` additionally accept null for scene teardown. Existing `openDialogue`, `notification`, and `combatEnded` remain compatible. The exploration scene no longer emits the unwired `toggleInventory` or `toggleMap` events or consumes `disableMovement`, `enableMovement`, or `teleportMap`. Gameplay WebSocket message types and checks are unchanged.

## RED and GREEN evidence

| Check | Command | Result |
| --- | --- | --- |
| Initial exploration RED | From `server/`: `node --import tsx --test ../client/tests/exploration.test.ts` | Exit 1 against the missing lifecycle interfaces. Log `task-2-red.log`. |
| Baseline behavior RED | From repo root: `node --test scratch/sdd-vnext-m1/task-2-baseline-regressions.mjs` | Exit 1, four assertion failures against the actual `c371be587` scene with controlled browser/Phaser adapters. Village painted instead of forest INIT. One restart left two teleport listeners and a stale close opened a third socket. A replaced action callback unlocked the current action. Panel gating emitted zero packets instead of a neutral input. Log `task-2-baseline-red.log`. |
| Registration RED | From `server/`: `node --import tsx --test ../client/tests/authStore.test.ts` | Exit 1, `true !== false` for fresh loading state. The controller's prior Chromium attempt independently timed out waiting for the enabled registration submit button and recorded no WebSocket frames. Log `task-2-register-red.log`. |
| Client GREEN | From `server/`: `node --import tsx --test ../client/tests/*.test.ts` | Exit 0, 12 pass, 0 fail. Log `task-2-green.log`. |
| Client production build | From `client/`: `npm run build` | Exit 0, TypeScript and Vite built 150 modules. Reported npm proxy/config and Vite bundle-size warnings. Log `task-2-client-build.log`. |
| Existing server checks | In the isolated stack, from `server/` with `NODE_ENV=test`, ran `node --import tsx --import ./src/config.ts` for `src/tests/arpg-test.ts`, `security-test.ts`, and `phase3-test.ts` | Exit 0, respectively 27/27, 26/26, and 20/20. Log `task-2-existing-server.log`. |
| Existing launcher checks | In the isolated stack, from `desktop-launcher/`, ran `node --import ../server/node_modules/tsx/dist/loader.mjs` for `src/tests/launcher-core-test.ts`, `vietnamese-encoding-test.ts`, and `auto-setup-test.ts` | Launcher core 33/34, default PostgreSQL port 5432 unreachable as the isolated stack uses 25432. Vietnamese encoding 30/30. Auto-setup 3/5, environment and expected-file cases require `server/.env` while this checkout uses the root `.env`. Launcher files were outside Task 2 ownership. Log `task-2-existing-launcher.log`. |
| Diff validation | `git diff --cached --check` before both commits | Exit 0. Both commits contain only Task 2 files. |

## Commits and files

- `d4fcff47117752dbe9ed1614f37889de3d087564` — `client/src/game/scenes/{BootScene,ExplorationScene}.ts`, `client/src/game/animations/AnimationManager.ts`, `client/src/game/exploration/{actions,connection,controls,mapLoad,prediction}.ts`, `client/src/pages/GamePage.tsx`, `client/src/components/game/{HUD,MapPanel}.tsx`, `client/src/stores/gameStore.ts`, `client/src/api/game.ts`, and `client/tests/exploration.test.ts`.
- `f3239016c6e6d95e97fd64d159f96d21dd1dd729` — `client/src/stores/authStore.ts`, `client/tests/authStore.test.ts`.

## Self-review and remaining verification

- Reviewed socket stop/close order, reconnect cancellation, stale async map results, input while the scene has no player, focus reset and panel opening, terminal replacement sockets, action callbacks, and parent-supplied files. The code uses Task 1 shared collision and leaves live combat parameters and protocol intact. Task 3 art, docs, scripts, and the controller's `.gitignore` edit were excluded from both commits.
- Skill slots use the server cooldown vector because this base provides no equipped skill names or mana-cost metadata. The HUD labels learned slots generically. Confirmation is presentation-only and uses the next cooldown rise inside its local deadline.
- The controller’s first post-fix run recorded one socket at character creation, server spawn (400, 300), canceling opposite key presses, blocking movement and attacks under a panel, 123 ticks while the inventory stayed open for 6.2 s, one learned starting slot, and no requests for locked skills. It recorded no page errors. Its close helper missed the new accessible label `Đóng bản đồ`, leaving that panel open and correctly blocking movement. The controller is correcting the harness and continuing both-resolution gameplay checks. Original registration failure evidence is under `docs/evidence/client-smoke`. This report records no browser FPS, latency, or visual acceptance claim.

## Review fix round 1

Base `f3239016c6e6d95e97fd64d159f96d21dd1dd729`. Review amendments are committed at `ec5f5e9be5cff503a2402c30137a9c1a7368dbfd` in `client/src/game/exploration/{actions,prediction}.ts`, `client/src/game/scenes/ExplorationScene.ts`, and `client/tests/exploration.test.ts`. The behavior and action interface below supersede the original 350 ms presentation deadline described above.

- Swept geometry still handles movement and ordinary correction. If neither actor nor fresh server sample is moving, the error exceeds 2 px, and the swept correction advances less than one percent of its intended distance, the client re-anchors to the server point after validating its footprint. The regression supplies ten fresh stationary samples with the local point at x=115 and the server at x=173 on opposite sides of the one-tile wall. Moving correction still stops at the wall.
- `ActionConfirmation.request(action, angle, now): boolean` holds a 350 ms retry window. `update(next, now, facingAngle): { action: GameAction; angle: number }[]` consumes a same-slot 0-to-positive cooldown transition once, even after the window. A timely result uses the stored input angle. An expired input angle falls back to the latest server facing. Flat cooldowns create no visuals. Removing the slot, changing maps, reconnecting, or stopping the scene discards its confirmation. Focus and panels still clear unsent controls and preserve already-sent confirmations. Death suppresses confirmed action visuals.
- `cameraFollowLerp(delta: number): number` preserves the prior nominal 60 Hz easing using the game loop's raw elapsed frame time. The scene supplies the factor to Phaser each frame and keeps fractional camera scroll at the existing noninteger zoom. A test uses the installed Phaser Camera and verifies the same position after 100 ms at both 30 Hz and 120 Hz.

| Verification | Exact command | Result |
| --- | --- | --- |
| Review RED | From `server/`, `node --import tsx --test ../client/tests/exploration.test.ts` | 11 pass, 4 fail. Delayed cooldown returned `[]` instead of one `SKILL_1` confirmation at server angle −1.2. A removed slot retained its old request. Ten fresh stationary samples left the rendered point at x=115 instead of x=173. The Phaser camera ended at x=294.2 at 30 Hz and x=383.5140927038 at 120 Hz. `task-2-review-red.log`. |
| Review GREEN | From `server/`, `node --import tsx --test ../client/tests/exploration.test.ts` | 15 pass, 0 fail. The existing walk, swept collision, late-map, connection and action-lock checks passed alongside the new cases. `task-2-review-green.log`. |
| Review production build | From `client/`, `npm run build` | Exit 0. TypeScript and Vite built 150 modules. Existing npm proxy and Vite chunk-size warnings remain. `task-2-review-client-build.log`. |
| Review diff validation | `git diff --cached --check` | Exit 0 before commit. |

The controller reported 14 browser gameplay checks passed during its smoke work. This review round ran the focused test and production build. CDP socket counting after navigation remains under controller measurement diagnosis. The debug estimate labeled Ping remains deferred. The review amendments do not modify transport, server behavior, protocol, art, or launcher files.

## Review fix round 2

Committed `ddf2ab062c22fae6ee56f188baadfc9d2e12dc9e` on `ec5f5e9be5cff503a2402c30137a9c1a7368dbfd`. This amendment changes only `client/src/game/exploration/actions.ts` and `client/tests/exploration.test.ts`. Action interfaces are unchanged. Retrying an unresolved request for the same action advances the 350 ms retry gate and discards its stored angle. The cooldown snapshot cannot identify which attempt succeeded, so a subsequent rise uses the current server facing and confirms the action once. A flat cooldown produces no presentation, including after a retry.

| Verification | Exact command | Result |
| --- | --- | --- |
| Review 2 RED | From `server/`, `node --import tsx --test ../client/tests/exploration.test.ts` | Exit 1, 15 pass, 1 fail. Initial request at 5 ms pointed at 0.6, retry at 400 ms pointed at 1.1, and the cooldown at 500 ms incorrectly confirmed with 1.1 instead of the authoritative −1.2. `task-2-review2-red.log`. |
| Review 2 GREEN | From `server/`, `node --import tsx --test ../client/tests/exploration.test.ts` | Exit 0, 16 pass, 0 fail. The overlapping confirmation uses −1.2 once and the flat-cooldown path remains silent after retry. `task-2-review2-green.log`. |
| Review 2 production build | From `client/`, `npm run build` | Exit 0, TypeScript and Vite built 150 modules. Existing npm proxy and Vite chunk-size warnings remain. `task-2-review2-client-build.log`. |
| Review 2 diff validation | `git diff --cached --check` | Exit 0 before commit. |

The controller resolved its earlier CDP navigation measurement and confirmed isolated server ownership after reload at the round 1 commit. There was one OPEN socket, zero CLOSING sockets and one total. See `docs/evidence/server-socket-probe/result.json`. Round 2 made no transport edits and ran only the focused client suite and production build.
