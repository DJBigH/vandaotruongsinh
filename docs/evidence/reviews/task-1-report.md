# Task 1 authoritative world, sessions and first-area rewards

**DONE** · `2ac0b1cebc293abd0f8c9e806e22639ce5d57611` on `codex/vnext-m1`, based on `e36a57bf83bded68d22a19818c5ca89cc2014cb1`.

## Changes

| File | Behavior |
| --- | --- |
| `shared/src/world-collision.ts`, `shared/src/index.ts` | Finite world coordinates, circular 10 px actor footprint, collision layers and tile-unit zones, swept player steps with axis sliding, map bounds, and straight swept projectile collision. |
| `server/src/engine/realtime-arpg-engine.ts` | Walkable saved positions or safe spawn, map-specific entity and transient state reset, ratio-preserving stat refresh, serialized position operations, a ten-second save while connected, and transactional kill and drop progress. |
| `server/src/modules/arpg/ws-handler.ts` | Only the current socket sends input, changes heartbeat state, receives ticks, or performs disconnect cleanup. Current close stops input and saves the authoritative position. |
| `server/src/modules/world/routes.ts` | `/position` rejects client-supplied map or coordinates. Teleport persists a server-selected spawn and updates the session. Interaction checks live coordinates when a session exists. Chest claim, currency, item and quest progress share a transaction. Herb and ore progress commits with inventory. |
| `server/src/modules/inventory/routes.ts` | Equip and unequip serialize same-character updates and refresh active combat stats upon commit while retaining HP and MP percentages up to integer rounding. |
| `server/src/modules/quest/routes.ts`, `server/src/modules/quest/quest-engine.ts` | Quest visibility and acceptance honor both prerequisite fields. PostgreSQL row locks protect quest event updates from concurrent JSON progress writes. |
| `server/src/data/maps.ts` | Two black wolf spawns in Thanh Khê forest. Relocated blocked village NPCs, the sect portal, village resources, the common forest chest and the forest ore to adjacent walkable tiles. |
| `server/src/data/skills.ts` | The third Sword, Spell and Body skill unlocks at Luyện Khí Đại Viên Mãn (tier 3), the last attainable tier of its original realm. The previous tier 4 could never be reached because breakthrough advances from tier 3 to the next realm. |
| `server/src/tests/world-movement-test.ts`, `server/src/tests/world-session-routes-test.ts` | Geometry and map reachability tests plus real Fastify HTTP, WebSocket and PostgreSQL regressions. |

## Interfaces

```ts
// @shared
isWorldPositionWalkable(map: MapData, position: { x: number; y: number }, radius?: number): boolean
resolveWorldMovement(map: MapData, start: { x: number; y: number }, delta: { x: number; y: number }, radius?: number): { x: number; y: number }

// ArpgGameSession
transitionToMap(map: MapData, position?: { x: number; y: number }): void
refreshCharacter(character: SessionCharacter): void
refreshStats(stats: CharacterStats): void
receiveHeartbeat(): void
pause(): void

// ArpgSessionManager
openSession(characterId: string, accountId: string): Promise<ArpgGameSession | undefined>
persistPosition(characterId: string): Promise<boolean>
teleportCharacter(characterId: string, map: MapData, position?: { x: number; y: number }): Promise<{ x: number; y: number }>
```

`SessionCharacter` requires `id`, `name`, `cultivationPath`, `realmIndex` and `realmTier`. It accepts optional `currentMapId`, `positionX`, `positionY`, `inventory` entries with `templateId` and `isEquipped`, and `skills` entries with `skillId` and `isEquipped`. The movement helpers default to radius 10 in world pixels. Projectile-specific straight segment checks use `isWorldPathWalkable(map, start, end, radius)` directly from `@shared/world-collision`.

`POST /api/game/position` accepts an empty request for a server-side save, returns HTTP 400 if the request supplies `mapId`, `x` or `y`, and returns HTTP 409 if the active character has no valid session position to save. Teleport retains the existing `{ targetMapId }` request and `{ mapId, position }` result. The `INIT` and `TICK` message shapes stay compatible with the client.

## RED and GREEN evidence

Run Node and TypeScript commands from `server/` unless stated otherwise. PostgreSQL commands ran through the shared-stack runner with `NODE_ENV=test` against the isolated schema. The first attempt with the `tsx` CLI hit the environment's Unix-socket restriction, so the commands use `node --import tsx`.

| Run | Command | Observed result |
| --- | --- | --- |
| RED movement | `NODE_ENV=test node --import tsx --test src/tests/world-movement-test.ts` | 1 pass, 11 fail. Walking reached x=216, diagonal movement reached x≈206.46, and a full dodge reached x=292 where the wall footprint permits x≤182. The projectile survived the crossing, invalid input produced `NaN`, saved coordinates were ignored and the forest lacked `mon_002`. The shared geometry API was absent. The valid-save fixture was later moved off a river boundary from x=640 to x=704. |
| RED safe spawn | `NODE_ENV=test node --import tsx --test --test-name-pattern='blocked configured spawn' src/tests/world-movement-test.ts` | 0 pass, 1 fail. Looking only at tile-grid intersections failed to find a sole legal tile center. |
| RED routes | `NODE_ENV=test node --import tsx --test --test-force-exit src/tests/world-session-routes-test.ts` | 0 pass, 9 fail. Coordinates were accepted, replacement ticks timed out, live map state stayed stale, chest used a stale position and retained its reward after a progress failure, main prerequisites could be bypassed, monster drops left COLLECT unchanged, failed settlement still emitted `REWARDS`, and equip left active stats unchanged. |
| RED third skill | `NODE_ENV=test node --import tsx --test --test-name-pattern='learns its third skill' src/tests/world-session-routes-test.ts` | 0 pass, 3 fail. Each class advanced to tier 3 with an empty skill list. |
| GREEN movement and data | `NODE_ENV=test node --import tsx --test src/tests/world-movement-test.ts` | 13 pass, 0 fail, 0 skipped. Reachability checks cover the M1 maps from spawn, portal landings and the existing (400,300) start location. |
| GREEN live routes | `NODE_ENV=test node --import tsx --test src/tests/world-session-routes-test.ts` | 12 pass, 0 fail, 0 skipped. Genuine simultaneous chest requests returned one success and one duplicate response. Expected failure logs confirm rollback on malformed quest progress and the absence of `REWARDS` on Prisma P2025. |
| Existing ARPG | `NODE_ENV=test node --import tsx --import ./src/config.ts src/tests/arpg-test.ts` | 27/27, exit 0. |
| Existing security | `NODE_ENV=test node --import tsx --import ./src/config.ts src/tests/security-test.ts` | 26/26, exit 0. |
| Existing M1 | `NODE_ENV=test node --import tsx --import ./src/config.ts src/tests/m1-content-test.ts` | 17/17, exit 0. The standalone script initially lacked `DATABASE_URL`; explicitly loading `src/config.ts` supplied the isolated connection. |
| Server compilation | `npm run build` from `server/` | Exit 0. npm warned about the environment's deprecated `http-proxy` config. |
| Shared compilation | `../server/node_modules/.bin/tsc -p tsconfig.json` from `shared/` | Exit 0. |
| Client compilation and bundling | `npm run build` from `client/` | Exit 0. The npm proxy warning and Vite's existing >500 kB chunk warning were reported. |

## Review and limits

Reviewed position write ordering against socket replacement, authentication and same-character teleport. The per-character queue covers both loading and writing the persisted location. The close handler checks exact socket ownership before pausing or persisting. Reviewed reward transaction order and quest row locks for competing requests. The new integration suite registers the actual production Fastify routes and uses database fixtures with account-level cleanup. The task commit contains only the twelve listed server and shared files and passes `git diff --check`.

Monster pursuit and combat timing use the existing behavior. Tier 3 unlocks were verified through the real breakthrough route for each path. Characters already past tier 3 can still be missing the third skill because this change has no save migration. Task 1 verification covers the server and shared build and behavior. Desktop browser acceptance is tracked by the parent controller.

## First review amendments

**DONE** · `c371be587e629e51e3297d6bbade1d251af438f2`, based on `2ac0b1cebc293abd0f8c9e806e22639ce5d57611`.

| Finding | Amendment and check |
| --- | --- |
| Class dash bypass | `DASH_ATTACK` resolves the skill's original movement vector with shared world collision. Damage radius and floating feedback use the resolved landing. The real Bạt Kiếm skill stops before a wall, hits only the near test monster, keeps its 35 MP cost and still travels 160 px in open ground. It also stops at the map edge. |
| Rounded corners | Direct and sliding substeps sweep their segments against blocker geometry. The regression puts the actor's start and end outside a circular corner while the nominal connecting segment overlaps it. |
| Duplicate teleport | A same-destination request inside the character queue returns the current live position or the valid persisted one if disconnected. Retrying after movement preserved the encounter, defeated monster and projectile. |
| Breakthrough live state | The route uses the active slot and runs eligibility, unlock and stats updates inside the same character operation. Existing sessions refresh from committed character state, preserving HP/MP ratios. Sword, Spell and Body each cast the newly unlocked skill over their original socket and incur their existing MP cost and cooldown. |
| Equipment and realm race | Equip and unequip read the realm and inventory after taking the same character row lock used for breakthrough. Live refresh follows commit in the per-character queue. The tests wait for PostgreSQL to report that the equipment query is waiting on the writer, then commit a realm advancement and assert database and live stats. |
| Dialogue TALK authority | NPC credits require authored NPC and dialogue ID agreement within three tiles of the authoritative living character on the same map. Nearby live dialogue advances the first quest even when the saved position is distant. Remote, wrong-map, and mismatched requests can still read dialogue without progress. |
| Active second slot | A real two-slot fixture verified that the eligible active Body character advances to tier 3 and gets `skill_body_03` while the inactive slot's progression stays at 0. |

The shared public signatures are unchanged. `ArpgSessionManager` now centralizes serialized combat writes through `updateCharacterCombat<T extends { success: boolean }>(characterId: string, update: (tx: Prisma.TransactionClient, current: Character & { inventory: InventoryItem[] }) => Promise<T>): Promise<T>`. Active combat configuration is refreshed after successful commits only.

| Run | Command from `server/` | Observed result |
| --- | --- | --- |
| Review movement RED | `NODE_ENV=test node --import tsx --test src/tests/world-movement-test.ts` | 13 pass, 3 fail. Nominal skill shifted into the building at x=320 or beyond the map at x=-96. Endpoint-only substeps accepted the rounded-corner overlap. |
| Review routes RED | `NODE_ENV=test node --import tsx --test src/tests/world-session-routes-test.ts` | 10 pass, 9 fail. Retry reset the position, all three unauthoritative dialogues credited TALK, equip and unequip used stale realm stats, and the three live sessions remained at tier 2 after DB breakthrough. |
| Second-slot RED | `NODE_ENV=test node --import tsx --test --test-name-pattern='active second slot' src/tests/world-session-routes-test.ts` | 0 pass, 1 fail. Breakthrough returned HTTP 400 because it selected the inactive first character. |
| Review movement GREEN | `NODE_ENV=test node --import tsx --test src/tests/world-movement-test.ts` | 16 pass, 0 fail, 0 skipped. |
| Review routes GREEN | `NODE_ENV=test node --import tsx --test src/tests/world-session-routes-test.ts` | 20 pass, 0 fail, 0 skipped. Existing rollback and Prisma P2025 logs are expected. DB commands ran in the isolated shared stack. |
| Review build | `npm run build` | Exit 0. Existing npm `http-proxy` deprecation warning. |

Reviewed the seven-file commit for map and combat state ordering, shared resolver coverage for regular movement, dodges and attack dashes, and atomic post-commit character refresh. `git diff --check` passed. The full legacy suites were run in the initial Task 1 pass. The controller requested the focused suites and server build for this amendment.
