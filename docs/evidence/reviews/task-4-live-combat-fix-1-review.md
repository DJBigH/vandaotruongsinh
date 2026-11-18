# Sale and consumption amendment review

**Original finding: ADDRESSED. Spec compliance: one compatibility issue. Task quality: Needs fixes.** Reviewed `a4e11b65af124eae7fa2f23b3b0a9b9a63488788` through `287dd8c1cf5c94a0483abc5ddf92ba3ed5a61d48`.

**Sale/use race.** Sale now obtains the character row lock before reading the owned inventory stack (`server/src/modules/inventory/routes.ts:227`). Its guarded decrement checks ownership, quantity and sale eligibility. Zero-stack cleanup and gold credit follow that debit in the same transaction (`server/src/modules/inventory/routes.ts:243`). This matches consumption's character-first lock order. The new real-route test observes both database lock waits and checks response statuses, remaining quantity, gold and live HP. It also verifies selling the remaining unit (`server/src/tests/world-session-routes-test.ts:423`).

**Important compatibility regression.** The successful sale at `server/src/modules/inventory/routes.ts:257` moves the established top-level `message` into `data.message`. A caller reading `response.message` now receives no confirmation text. The current inventory panel reads `data.gold`, so its own notification still works (`client/src/components/game/InventoryPanel.tsx:73`). Restore the existing successful response shape `{ success: true, data: { gold }, message }` and assert it on the successful follow-up sale. The current regression asserts the gold field only. No Critical findings.

**Verification limits.** The supplied amendment reports an observed RED overlap, a 27/27 GREEN route suite and a successful server build. Its test assertions match the reported stock, gold, HP and status outcomes. Those assertions do not verify the report’s claim of unchanged response shape. I did not rerun the suite or build.
