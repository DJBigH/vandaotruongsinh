# Integrated acceptance repair for live consumables and area targeting

**DONE** · `b5c8f963288af1cdf7c3ed9be6f66709fe342adb` on `codex/vnext-m1`, based on `e3dcd54f7ae07c176cf9272b79a335351a90d49f`.

## Cause and behavior

The browser acceptance run consumed one Hồi Nguyên Đan at 61/115 HP and left the HUD and authoritative snapshots at 61 HP. The HTTP route read its inventory stack and character before the transaction, then wrote only saved `character.stats`. The simulation reads HP and MP from its live actor. Simultaneous HTTP attempts against the final item also captured the same stack, and the losing delete threw Prisma P2025 and surfaced as HTTP 500. The legacy WebSocket `USE_ITEM` path independently decremented every matching stack and used hard-coded item IDs for live HP/MP.

HTTP and WebSocket item use now share `consumeInventoryItem`. The existing per-character operation queue and PostgreSQL character row lock serialize the read and mutation. The transaction reads the slot and inventory under the lock, decrements one positive stack, and removes that stack if its count reaches zero. It applies offline saved-resource restoration or cultivation changes in the same transaction. A successful live restoration applies only after the transaction commits, using the current live resource and equipment/realm maximum. It leaves the actor's other resource, cooldowns and encounter intact. Already-dead live actors receive HTTP 409 for restoration and retain the item. The post-commit health guard also keeps a death during the request from becoming an item-based revival. Missing or exhausted stacks receive HTTP 404. The WebSocket handler retains its template-ID command and existing response shape, rechecking socket and slot ownership before consumption.

`AOE_TARGET` now projects an out-of-range center onto the skill's current radial cast limit from the authoritative actor. It uses the supplied center exactly when already in range and the existing facing behavior for absent or non-finite coordinates. Normalization retains direction even when the raw length of a finite input overflows. Radius, damage, MP cost and cooldown are unchanged.

## Interface contracts

```ts
// ArpgGameSession
canRestoreResources(): boolean
restoreResource(resource: 'hp' | 'mp', amount: number): void

// ArpgSessionManager
updateCharacterCombat<T extends { success: boolean }>(
  characterId: string,
  update: (
    tx: Prisma.TransactionClient,
    current: Character & { inventory: InventoryItem[] },
    session: ArpgGameSession | undefined,
  ) => Promise<T>,
  applyCommittedEffect?: (session: ArpgGameSession, result: T) => void,
): Promise<T>

// server/src/modules/inventory/routes.ts
consumeInventoryItem(
  characterId: string,
  selection: { inventoryItemId: string } | { templateId: string },
  isSocketCurrent?: () => boolean,
)
```

The third transaction callback argument supplies the matching live session for eligibility reads. The optional effect callback runs synchronously after successful commit, only for the same active session, inside the character queue. Equipment and breakthrough calls that omit it continue to refresh combat configuration from committed records. Live vitals remain authoritative in the session, while persistence of offline consumable effects continues through saved stats.

## RED and GREEN evidence

Commands run from `server/`. PostgreSQL jobs ran in the released shared stack wrapper against the isolated test schema. Log filenames below are relative to `scratch/sdd-vnext-m1/`.

| Run | Command | Result |
| --- | --- | --- |
| AOE RED | `NODE_ENV=test node --import tsx --test --test-name-pattern='Vạn Kiếm' src/tests/world-movement-test.ts` | 0 pass, 2 fail. The skill accepted the nominated (1400,1600) instead of the capped (920,960), and the extreme finite input stayed outside the limit. `task-4-aoe-red.log` |
| Consumable RED | `NODE_ENV=test node --import tsx --test --test-name-pattern='potions\|one-item stack\|consumable transaction\|restoration potion\|offline consumables\|WebSocket item use' src/tests/world-session-routes-test.ts` | 1 pass, 5 fail in the initial run. Four behavior failures showed 61 HP retained instead of 111, a 500 instead of a clean exhausted-stack 404, dead-actor usage accepted, and no authoritative HP gain from the real WebSocket template. Offline semantics passed. The remaining failure was Node's method-mock setup on Prisma's proxy. `task-4-consumables-red.log` |
| Rollback fixture baseline | `NODE_ENV=test node --import tsx --test --test-name-pattern='consumable transaction rollback' src/tests/world-session-routes-test.ts` | 1 pass. A fault injected within the real PostgreSQL transaction observed the temporary stack decrement and then confirmed the database rollback and unchanged live HP. `task-4-rollback-baseline.log` |
| Movement/AOE GREEN | `NODE_ENV=test node --import tsx --test src/tests/world-movement-test.ts` | 18 pass, 0 fail, 0 skipped. Verifies in-range and facing centers, finite distant and extreme centers, damage around the resolved point, existing MP cost and cooldown. `task-4-aoe-green.log` |
| Fastify/PostgreSQL GREEN | `NODE_ENV=test node --import tsx --test src/tests/world-session-routes-test.ts` | 26 pass, 0 fail, 0 skipped. Verified authoritative HP 61→111/115 with quantity 5→4, MP +40, live maximum clamps for both resources, one winner on concurrent requests, post-write rollback, dead-actor refusal, offline persistence and a single WebSocket debit across two matching stacks. Expected rollback errors are logged. `task-4-consumables-green.log` |
| Server build | `npm run build` | Exit 0. Existing npm proxy-configuration warning. `task-4-server-build.log` |

Self-review checked the effect callback's commit ordering, active-session identity, conditional decrement, exhausted-stack cleanup, resource clamps and behavior of the same-connection equipment and breakthrough tests. `git diff --check` passed. The five-file commit contains the engine, HTTP inventory routes, the authorized legacy WebSocket item block and the two focused suites. The recorded browser failure predates this commit. Browser revalidation and shared backend restart remain with the controller.

## Sale and consumption review amendment

**DONE** · `287dd8c1cf5c94a0483abc5ddf92ba3ed5a61d48`, based on `a4e11b65af124eae7fa2f23b3b0a9b9a63488788`.

The ordinary sell route previously read stack quantity before its transaction and deleted a full stack by ID. The real overlap confirmed that sale could retain the original price after use committed against the same item. Sale now acquires the PostgreSQL character row lock first, consistent with consumables and equipment. It checks the current active slot and the owned stack's quantity, lock and equipped flags inside that transaction. A guarded decrement must succeed before it deletes a zero stack and increments gold. These changes preserve sale pricing, response shape and live resources. No new public interfaces or schema changes.

The regression uses actual Fastify HTTP requests and inventory state in isolated PostgreSQL. It holds the potion row, starts use and observes its PostgreSQL lock wait, then starts a full-stack sale and observes a second waiting backend before releasing the row. This forces the overlapping operation without scheduling sleeps as a correctness assumption.

| Run | Command from `server/` | Observed result |
| --- | --- | --- |
| Sale overlap RED | `NODE_ENV=test node --import tsx --test --test-name-pattern='overlapping full-stack sale' src/tests/world-session-routes-test.ts` | 0 pass, 1 fail. Use and sale both returned HTTP 200, the stack disappeared, gold rose from 50 to 60 and HP rose from 31 to 81. `task-4-sale-red.log` |
| Session routes GREEN | `NODE_ENV=test node --import tsx --test src/tests/world-session-routes-test.ts` | 27 pass, 0 fail, 0 skipped. In the same ordering, use returned HTTP 200, the sale returned HTTP 400, one unit remained, gold stayed 50 and HP was 81. A follow-up sale of the remaining unit returned HTTP 200, paid five gold and left HP unchanged. `task-4-sale-green.log` |
| Server build | `npm run build` | Exit 0. Existing npm `http-proxy` warning. `task-4-sale-server-build.log` |

The database commands ran through the shared-stack runner on the isolated test database. `git diff --check` passed. The commit includes only the sale route and its integration test. The running browser backend remains under the controller's restart schedule.

## Sale response compatibility amendment

**DONE** · `96470e74a64f3e9b61a2b3a026782a4d35e4a4bc`, based on `287dd8c1cf5c94a0483abc5ddf92ba3ed5a61d48`.

The sale/use repair had moved the success message into `data`. Restored the established exact response `{ success: true, data: { gold }, message }`. The overlapping-sale regression now asserts the complete successful follow-up response, including the top-level Vietnamese message and `data` containing only `gold`. Character-first locking, eligibility, inventory debit and gold credit follow the previously verified transaction.

| Run | Command from `server/` | Observed result |
| --- | --- | --- |
| Response compatibility RED | `NODE_ENV=test node --import tsx --test --test-name-pattern='overlapping full-stack sale' src/tests/world-session-routes-test.ts` | 0 pass, 1 fail. The deep-equality assertion found `data.message` in place of the top-level `message`. `task-4-sale-response-red.log` |
| Response compatibility GREEN | `NODE_ENV=test node --import tsx --test --test-name-pattern='overlapping full-stack sale' src/tests/world-session-routes-test.ts` | 1 pass, 0 fail, 0 skipped. The real overlap and exact response assertions both pass. `task-4-sale-response-green.log` |
| Server build | `npm run build` | Exit 0. Existing npm `http-proxy` warning. `task-4-sale-response-build.log` |

The targeted route tests ran through the shared-stack runner on isolated PostgreSQL. `git diff --check` passed. No main backend restart was performed.
