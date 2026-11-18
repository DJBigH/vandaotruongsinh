# Integrated acceptance backend repair review

**Spec compliance: issues. Task quality: Needs fixes.** Reviewed `e3dcd54f7ae07c176cf9272b79a335351a90d49f` through `b5c8f963288af1cdf7c3ed9be6f66709fe342adb`. The socket and HTTP restoration paths and the radial AOE change meet their individual behavioral requirements. One other operation against the same inventory stack still breaks the inventory race requirement.

## Important

**Consumption and sale of the same stack can both succeed at an impossible combined quantity.** Consumption locks the character first, rereads its inventory, then conditionally decrements one unit (`server/src/engine/realtime-arpg-engine.ts:1131`, `server/src/modules/inventory/routes.ts:47`). The sell route reads the quantity before starting its transaction at `server/src/modules/inventory/routes.ts:227`. A sale priced for the whole stack then deletes by item ID alone at line 248. If consumption commits between the sale's read and delete, the sale can pay for the original quantity even though the player has already used one unit. The sale also locks the item before updating the character at line 256, the reverse of consumption's lock order. Concurrent requests can consequently deadlock and return a server error.

Use the same character-first database locking order for this competing debit. Check ownership, sale eligibility and available quantity after obtaining the lock, then pay only for the quantity actually debited. Add a focused real-route sale/use overlap test that checks inventory, gold, live HP and response status together. The current one-item test covers two consumption requests (`server/src/tests/world-session-routes-test.ts:408`).

## Strengths

- **Commit ordering and live vitals.** The manager applies the effect only after the transaction resolves successfully and only to the session captured for that character (`server/src/engine/realtime-arpg-engine.ts:1147`). The live effect uses the current resource and current maximum and rechecks the actor's death state (`server/src/engine/realtime-arpg-engine.ts:270`). The route's integration tests assert the reported 61-to-111 HP change, the quantity decrease, the socket snapshot, MP restoration, both maximum clamps and rollback after a debit (`server/src/tests/world-session-routes-test.ts:369`, `:423`).
- **Common HTTP and WebSocket behavior.** Both entry points use the same item-template effect and debit a single positive stack. Socket/session ownership and the character's active slot are checked before debit (`server/src/modules/arpg/ws-handler.ts:229`, `server/src/modules/inventory/routes.ts:22`). Offline healing updates persisted resources, and cultivation experience is incremented in the debit transaction (`server/src/modules/inventory/routes.ts:55`). The diff contains no schema or game-value edits.
- **Radial targeting.** The simulation projects an out-of-range cast center from the authoritative actor. It retains in-range coordinates, existing facing defaults and the skill's effect radius. Scaling before normalizing handles very large finite targets (`server/src/engine/realtime-arpg-engine.ts:496`). The tests assert the center, affected target, MP cost, cooldown and extreme input (`server/src/tests/world-movement-test.ts:189`).

## Critical and minor findings

No Critical findings. One observable, nonblocking edge case is that death between the live eligibility check and committed restoration suppresses the heal but can leave a successful debit and the usual success message. Already-dead actors retain their item. The requested no-revival rule holds (`server/src/modules/inventory/routes.ts:43`, `server/src/engine/realtime-arpg-engine.ts:275`).

## Evidence and limits

The implementation report records 18/18 movement tests, 26/26 real route/session tests and a successful server build. I reviewed the assertions and did not rerun those suites. The named outside-diff checks were the competing sale debit's read/lock order, the active-character helper's legacy fallback, and the session creation/removal call sites. The sale finding follows from the permitted database ordering on inspection. I did not run a sale race or verify the post-repair browser HUD. The controller owns the browser acceptance run.
