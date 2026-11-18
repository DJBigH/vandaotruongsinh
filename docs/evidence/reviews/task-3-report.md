# Task 3 — Original art, world presentation and audiovisual settings

## Status and handoff

The original export set and client integration are committed locally on `codex/vnext-m1`. TypeScript, the Vite production build, all 22 client tests and static export validation passed. Integrated browser capture, gesture/audio observation, real-time frame measurements and the long session are still separate controller acceptance work. This report makes no gameplay video, screenshot or FPS claim.

| Commit | Contents |
| --- | --- |
| `dc5a3f1f56777fba9d8008902d59188b23245db4` | 61 files under `art/vnext/` and `client/public/assets/vnext/`, including controller-produced source PNGs, prompts, exporter, synthesis source, manifests, QA contact sheet and 39 runtime files. |
| `fc74a0bc9527b1f50290485a9fa565c92745b65a` | Client integration, focused tests, revised M1 art contract and provenance. Based on the art commit and Task 2 base `ddf2ab062c22fae6ee56f188baadfc9d2e12dc9e`. |

The integration touches `client/src/game/assets/AssetManifest.ts`, `animations/AnimationManager.ts`, `scenes/BootScene.ts`, `scenes/ExplorationScene.ts`, new exploration modules `presentation.ts`, `combatFeedback.ts`, `settings.ts`, `worldLayout.ts`, `worldRenderer.ts`, `client/src/components/game/SettingsPanel.tsx`, `client/tests/presentation.test.ts`, `ART_DIRECTION.md` and `CREDITS.md`. No remote push. Controller verification scripts, screenshots, docs and .gitignore were excluded.

## Catalog and animation contract

The loader and animation registry consume the same runtime catalog. `ASSET_MANIFEST.assets` contains loadable spritesheets, images and audio with `key`, `file`, `type` and `provenance`. Each spritesheet also has `frameWidth`, `frameHeight` and animation entries with `key`, inclusive `frameStart`/`frameEnd`, `duration` in milliseconds and Phaser `repeat`. `getAllSpritesheets()` supplies the animation manager. The source manifest supplies original asset paths and frame metadata. The earlier catalog included unbuilt candidate files and had no consumers in this checkout. The new catalog describes the active loader. Procedural compatibility textures for the legacy CombatScene remain in BootScene.

Every hero row is up, left, down, right in order. Frame size is 64×64. The original Kiếm Tu sprite origin is (0.5, 0.875), corresponding to source pixel (32,56). World position remains the player's foot and the shared authoritative collision circle. The sprite has no separate Arcade collision body. Idle has no persistent aura.

| Pose | Texture | Animation prefix (append underscore and direction) | Frames per row | Duration | Repeat |
| --- | --- | --- | ---: | ---: | --- |
| idle | player_idle | player_idle | 2 | 1000 ms | loop |
| walk | player_walk | player_walk | 4 | 500 ms | loop |
| attack | player_slash | player_attack | 3 | 6000/14 ms | once |
| cast | player_cast | player_cast | 3 | 7000/12 ms | once |
| dodge | player_dodge | player_dodge | 3 | 5000/16 ms | once |
| hurt | player_hurt | player_hurt | 2 | 500 ms | once |
| death | player_death | player_death | 3 | 1000 ms | once, hold during DEAD |
| respawn | player_respawn | player_respawn | 3 | 500 ms | once |

`heroAnimation(path,pose,direction)` selects the actual cultivation path. SPELL and BODY use `player_magic_{pose}_{direction}` and `player_body_{pose}_{direction}` on their respective original-to-the-base legacy idle sheets (4 frames in their own directional row). These are explicitly limited fallback poses through walking, actions, reactions and revival. They use the prior 0.90 origin. Slot ownership and character selection are unchanged. The older non-directional death animation's sole active caller was migrated.

NPC textures `npc_elder`, `npc_healer` and `npc_guard` each loop frames 0–3 on `{texture}_idle` over 1000 ms. `creatureAppearance(entity)` maps the forest actors as follows. All four original sheets face toward the left in their source image. The scene mirrors them for rightward facing. During server WINDUP they hold frame 4. ATTACK holds release frame 5. IDLE holds frame 0. Otherwise locomotion uses frames 0–3 in 540 ms. Dead entities are hidden. Separate poses for the windup and release follow the server states directly.

| Template | Texture | Walk animation | Display |
| --- | --- | --- | --- |
| mon_001 | monster_wolf | wolf_walk | 1× |
| mon_002 | monster_wolf | wolf_walk | 1×, elite tint 0xa8aea9 |
| mon_003 | monster_snake | snake_walk | 1× |
| mon_004 | monster_fox | fox_walk | 1× |
| boss_001 | boss_lang_vuong | boss_wolf_walk | 1.55× |

Later regions continue to use the legacy ghost, available template-specific fallback textures, and a generic fallback when a template has no texture. The original visual set includes some available props (dummy, weapon rack, stone wall) that the current map data does not place.

## World interfaces

`WorldRenderer(scene,map)` constructs one ground canvas texture named `terrain:{map.id}`, one ground image, the zone-based barriers and matching decorative objects. `worldTrails(map)` gives polylines in **world pixels**, stroke width in world pixels and a paving flag. It validates centerline clearance using the shared swept path check and searches the grid around blockages. Paths connect to the actual quest NPCs, both village portals and seven buildings' front approaches. The forest trail links its entry, hunting areas, chests and the boss clearing. The village is 2048×1536 and the forest is 2048×2048 at current map dimensions. The former flattened images are not loaded. Other maps use grid ground and collision materials.

Buildings map Đại Điện to building_hall, Dược Phòng to building_herbalist, Doanh Trại to building_barracks and Nhà Dân to building_house. Buildings preserve the aspect ratio, use 104% of footprint width and anchor at the bottom center of the zone. Stream and lake fills exactly cover the water zones. Forest tree and rock barriers cover the matching collision zones. `updateOcclusion(player)` adjusts tall foreground objects to 40% of their usual opacity while they cover the player from behind. `track(sprite)` registers other static obstructions such as the shrine and villagers. Objects with explicit low ground depth stay at that depth. Duplicate keyed decorations and overlapping draws for portal/shrine/chest/herb/ore are skipped, preserving one authoritative interactive sprite.

`dispose()` removes the canvas texture during map teardown. Existing connection and MapLoad generation ownership, predictPosition, cameraFollowLerp(rawDelta), focus/panel input handling and server packet types remain. Read-only probe fields currentMapId, player, entitySprites, latestEntities and snapshotReceivedAt keep their existing names.

## Snapshot, settings and feedback interfaces

`healthReaction(before,after)` returns hurt on an HP loss or entry to HURT, death on first observation of DEAD, respawn on DEAD→alive, and null on duplicate or unrelated samples. Death and revival clear the previous action completion listener, safety timer, pending confirmation and transient actor effects. Revival immediately anchors the sprite at the server position. Ordinary locomotion and input use the existing controls; visual reactions impose no movement stun. `AnimationManager.playAction` still owns replacement-safe completion. Each one-shot uses its registered duration plus a 100 ms fallback timeout.

The scene receives the existing INIT/TICK/DEATH/combat messages. Confirmed cooldown edges drive slash, dodge or cast presentation. Snapshot projectile and telegraph data remain authoritative. Observed player or monster HP decreases produce a brief hit spark and sound. Monster hp changes are compared between rendered snapshots. No client hit or extra network event is emitted. A crit's existing floating text may shake the camera only with normal effects enabled.

`usePresentationSettings.getState()` exposes booleans `sfx`, `reducedEffects` and `change(partial)`. Saved preference key is `vandao.presentation.v1`, JSON shape `{"sfx":true,"reducedEffects":false}`. Default SFX is on; default reduced effects follows the device's prefers-reduced-motion setting. The settings panel subscribes to both values and ExplorationScene observes changes through a scene-lifetime subscription. Sound uses Phaser's native gesture unlock and four cached WAV keys, `sfx_sword`, `sfx_cast`, `sfx_dodge`, `sfx_hit`. Muting stops active cues. Reduced effects removes cast pulses, sword arcs, afterimages, hit sparks, extra projectile glow, shake and flashes. It pauses ambient portal rotations and NPC bubble bobbing. Projectile cores, server hazard circles and readable damage numbers remain visible.

## Verification

| Check | Command/evidence | Observed outcome |
| --- | --- | --- |
| Initial RED | From server, `node --import tsx --test ../client/tests/presentation.test.ts`; task-3-red.log | 0/4. Old catalog returned assets/player_walk.png instead of assets/vnext/player_walk.png. New health/class/world modules were absent. |
| Settings RED | Same command, task-3-settings-red.log | 4/5. Saved-settings module was absent. |
| Client GREEN | From server, `node --import tsx --test ../client/tests/*.test.ts`; task-3-green.log | Exit 0, 22 pass, 0 fail, 3140.83 ms. Includes actual PNG row bounds, class identity across all actions, nonrepeating snapshot transitions, reachable routes against actual authoritative map geometry and preference persistence. The prior connection, action replacement, recovery and camera tests also passed. |
| Static assets | Python/Pillow SHA-256/PNG/WAV validation; task-3-assets.log | 39/39 hashes matched, both manifests byte-identical. All 35 PNG dimensions matched. All 128 packed actor frames had alpha and transparent two-pixel borders. All four WAV files were mono PCM16 at 22050 Hz. |
| Client production | From client, `npm run build`; task-3-client-build.log | Exit 0. TypeScript and Vite 5.4.21 transformed 157 modules; 12.40 s. index.html 1.03 kB (gzip 0.52), CSS 5.79 kB (1.84), JS 1,909.12 kB (468.24). Existing npm http-proxy configuration and Vite >500 kB chunk warnings. |
| Existing suite entry point | Isolated stack, `npm run test:all`; task-3-existing.log | tsx CLI failed to start its IPC listener in /tmp, EPERM; exit 1. The same six suite entry files were subsequently run through the Node tsx loader. |
| Existing server suites | Isolated stack, server cwd, NODE_ENV=test, `node --import tsx --import ./src/config.ts src/tests/{arpg-test,security-test,phase3-test}.ts` (three individual invocations); task-3-existing-server.log | 27/27, 26/26, 20/20. |
| Existing launcher suites | Isolated stack, desktop-launcher cwd, `node --import ../server/node_modules/tsx/dist/loader.mjs src/tests/{launcher-core-test,vietnamese-encoding-test,auto-setup-test}.ts` (three individual invocations); task-3-existing-launcher.log | 33/34 core, 30/30 encoding, 3/5 auto-setup. Same known baseline failures: isolated PostgreSQL uses port 25432 while the launcher probes 5432; auto-setup cases 2 and 4 expect server/.env in a checkout using root .env. |
| Staged diff | `git diff --cached --check` before each commit | Both checks exited 0. |

## Self-review and limits

Source/export attribution is separate from engine verification. The selected walk-v3 and combat-v3 sources, pose normalization and synthesized audio were supplied by the controller. No source art was regenerated or edited in this integration. Some frames of dodge, hurt and revival deliberately reuse selected recovery, crouch or neutral source poses; exact cells and bounds are in the export manifest. Black wolf is a shared tinted variant. Paths are visual only and cannot grant movement through authority blockers. No server clock, hitbox, cooldown, damage, costs or ownership logic changed. Generated world textures and subscriptions have explicit teardown. The original art and integration live in separate reviewable commits.

The controller still needs to observe side-walk leg readability under the robe, neutral silhouette, foreground fading while moving, interrupted and replacement animation sequences, real death/respawn and sound settings in the browser. Real viewport screenshots, video, sustained frame-time measurements, observed audio playback and long-play acceptance are not established by this task's unit tests or build. No new world-map art is claimed for later regions, and the other two cultivation paths still await distinct action art.

## Review fix round 1 — northern exit and building foundations

Committed `0213c2ae1bac3a819738820324fe7dae4d00067e` on `fc74a0bc9527b1f50290485a9fa565c92745b65a`. The change owns four files: `client/src/game/exploration/{worldLayout,worldRenderer}.ts`, `client/src/game/scenes/ExplorationScene.ts` and `client/tests/presentation.test.ts`. No source art, authoritative blockers, server interactions, camera settings, pathfinding or unrelated suites changed.

Reproducing the old hall transform against the source alpha returned 255 at world (1024,64) and (1024,22), the portal and old sign centers. The old herbalist and barracks transforms also left transparent solid roof-corner tiles over regular plaza paving. These led to two targeted changes.

- The hall now fits its compound with sufficient northern clearance for the rotating portal. Its bottom center remains (1024,288), and its aspect ratio is preserved. The complete gate arch fits inside the top edge of the map. A sign beside the arch identifies the northern exit while the hall remains fully opaque. Other portal signs retain their placement.
- Each building rests on an enclosed, raised foundation matching its exact blocked rectangle. Weathered stone from the original wall module faces the perimeter. A darker deck shows through image corners. The front has a central break and shallow steps within the footprint. The walked route and ten-pixel foot approach stay outside the foundation.

| Check | Result |
| --- | --- |
| RED, server cwd, `node --import tsx --test ../client/tests/presentation.test.ts` | 5 pass, 2 fail on the missing building projection and foundation-painting interfaces. Log `task-3-fix1-red.log`. |
| GREEN, server cwd, `node --import tsx --test ../client/tests/*.test.ts` | Exit 0, 24 pass, 0 fail in 2230.227848 ms. New tests compare roof clearance against real file dimensions for the entire rotating ring and check foundation coverage on all five reported tiles plus clear door approaches. Log `task-3-fix1-client.log`. |
| Raster verification, server cwd, `node --import tsx ../scratch/sdd-vnext-m1/task-3-review-render.ts` | Exit 0. Node canvas rendered the actual WorldRenderer against map data and shipped PNGs using a minimal Phaser display adapter. Hall top y=112.000, gate bounds y=4.000…67.158, maximum ring y=109.255, north sign x=1066.454 y=45. Inspected the neutral, opaque north gate and barracks test crops in `task-3-fix1-layout-{north,barracks}.png`. These are static layout renders. |
| Production, client cwd, `npm run build` | Exit 0. TypeScript and Vite 5.4.21 transformed 157 modules in 8.77 s. HTML 1.03 kB (gzip 0.52), CSS 5.79 (1.84), JS 1910.43 (468.76). Existing npm http-proxy and Vite chunk warnings remain. Log `task-3-fix1-build.log`. |
| Staged diff | `git diff --cached --check` exited 0 before committing. |

**Performance remains CHƯA ĐẠT.** The separate controller run at frozen `fc74a0b` recorded 17.09 average FPS and p95 153.4 ms at 1366×768 on SwiftShader WebGL over 45.28 seconds. All 774 rendered samples had 10 active living monsters, one living boss and a living player. Seven casts were confirmed. This placement amendment did not change the performance target or claim to improve it. Profiling and post-amendment browser/gameplay acceptance are controller work.
