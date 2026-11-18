# Handoff evidence and acceptance-harness audit

Reviewed public evidence and controller source at product HEAD `afa7fd25606db19b9b915cb915ba295cdecda00c` on 2026-11-18. This is an evidence/harness audit, not a second launcher or product-code review. The checkpoint was still a draft; its explicitly pending sections were not treated as false claims.

## Assessment

The historical boss, quest, potion, equipment and reload/reconnect claims below are supported by the recorded UI commands, authoritative responses and screenshots. The records preserve failures. M1 is not fully accepted: performance remains below the target in the retained measured environment, physical focus loss remains unobserved, and the visual/Windows limits are explicit.

One reproducible controller-design issue was found in the current equipment helper: same-name inventory rows do not identify the selected server row. It does **not** invalidate the manually recovered equipment action in the recorded boss session. The controller acknowledged it and is changing selection/postconditions and planning a targeted live check; that follow-up was pending when this report was written.

## Verified provenance and counts

| Session | Duration | TICK messages | Commands, including finish | Failed commands | Death messages | Uncaught page errors |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `playthrough-m1` | 918.278 s | 17,623 | 54 | 3 | 1 | 0 |
| `playthrough-quests` | 750.163 s | 14,660 | 47 | 3 | 4 | 0 |
| `playthrough-boss` | 315.885 s | 5,995 | 49 | 1 | 0 | 0 |

Each `session-result.json` has `completed: true`, no fatal or cleanup error. This means recording/cleanup completed, **not** that every command passed. Timeline command counts and failures agree with `commands.json` and the session results. The sessions contain inspection pauses; these durations are not continuous active movement.

I recomputed the SHA-256 from sorted `.mjs` names and bytes inside each `harness-source.zip`. All three equal the corresponding `source.harnessSha256` exactly:

- M1: `2f2cfda03604ff351e55ee2327cd91e1e97be6b87ea4c44fd338ae34fdd7c611`.
- Quest continuation: `0a50643160628d6f4f0888c2b73e61f14023e452fff8b33fe1b14ecfb26a876c`.
- Boss: `ee6bae6f0733b3da7c3d1ecd79feb3343e6244e9412c7b65790ecf595370147a`.

The archives contain controller source, with the latter two including their entrypoint. They are provenance archives, not standalone replay packages: local frozen-preview paths and private test-account state are intentionally absent.

The frozen client commits are `0213c2a`, `287dd8c` and `795be99`, respectively. The latter two builds share hash `1460fa931c50224c62e54db301d112c1344a36a3b911a39ac9870009b24b25c4`. The quest continuation records the backend separately at `96470e7`; its source stamp is explicitly dirty, and its backend-start record describes the held-edit/restart procedure and observed TICK. That record is controller provenance, not a runtime endpoint exposing its own compiled commit. The boss backend-start record has a clean `795be99` stamp and successful health response. Do not imply the original 85-second video was captured after the later backend fixes.

## Recorded post-fix gameplay

The boss timeline has one `fight-kill` for `boss_001` at elapsed 51.999 s; the actual fight lasted 12.801 s. The helper only records this after observing the target's authoritative `DEAD` state. The subsequent state has 90/135 HP and 5 MP. The fight uses real direction keys, aim and mouse clicks; it does not inject INPUT packets or write actor positions/stats.

The two consumable commands are `use item_009` with a +50 HP expectation and `use item_010` with a +40 MP expectation. Each uses the actual bag and checks a committed quantity decrease and the live resource threshold. The next screenshot result reports 135/135 HP and 51/72 MP. The MP figure includes intervening regeneration, so report a +40 potion effect with that qualification rather than claim an isolated 46-point potion gain.

The quest read immediately before claim shows main01 and main02 `TURNED_IN`, and main03 `COMPLETED` with boss 1/1 and elder TALK 1/1. The actual claim command returns all three `TURNED_IN`. The next command, before equip or reload, opens the bag and reports `displayedQuantity: 2`, `serverQuantity: 2` for Linh Giáp Vệ. `quest-reward-in-bag.png` visibly shows the two armor cards and the completed-quest notification.

The initial `equip` command fails because both the category and action buttons are named Trang Bị. That failure is retained in the session result and timeline. A later, purpose-labelled normal mouse click at the observed action-button position succeeds. No game state is injected. Immediately afterward, inventory records show the older item_005 unequipped and one item_006 equipped, with the other item_006 still in the bag. The already-owned armor row, present before the quest claim, is the row that was equipped; do not describe the particular equipped row as the quest reward.

Character API reads before and after reload agree on 160 max HP, 72 max MP, ATK 26, DEF 22, resist 10, and 605 gold. Compared with the prior armor, max HP increased 135→160 and DEF 14→22. All three quests remain `TURNED_IN` after reload. The reconnect command waits for a newer socket's TICK and the subsequent state has one socket observation in the current document. These observations support the stated postconditions; the auxiliary `quest-gear-result.json` alone is not the sole evidence.

The final diagonal/hall sequence is also recorded: movement from (799,328) to (911,300), then northward dodge ending at the same (911,300) with MP spent. The screenshot supports the observed stopped-at-foundation location. This one sequence does not establish every wall/corner case; the focused geometry and route tests cover those separately.

## Controller finding

### Important for reusing the harness — same-name rows are not a stable item identity

At `scripts/verification/play-session.mjs:122–128`, `selectInventoryItem` selects the first card whose detail name matches `item.name`. The equip branch at lines 194–201 chooses a particular API row and later asserts that exact row's state changed. With the two recorded Linh Giáp Vệ rows, the first same-name UI card can be unequipped while `remove: true` expects the equipped row. The helper then searches that wrong detail for Tháo Ra, or later checks a different hidden ID. Similarly, the use branch at lines 205–209 assumes the first same-name UI card corresponds to its chosen API stack.

The new detail-scoped button locator correctly addresses the filter/action label collision according to the inspected InventoryPanel markup. It does not solve the separate hidden-row identity assumption. Select by visible equipped/unequipped state and verify a permitted template row's transition or total quantity change when duplicate cards are indistinguishable. A targeted remove/equip/reload UI check is the appropriate verification; no product change is required for this controller issue.

The parent acknowledged this and plans to use the visible equipped badge plus any previously eligible identical template row transitioning. The revised command had not yet been exercised in the evidence reviewed here.

The 80 ms key holds are reasonable controller timing changes for this low-frame-rate environment. They do not alter server costs or cooldowns. They improve input observability but do not guarantee every 80 ms press lands in an arbitrarily long frame; the existing server-action assertions are still necessary.

## FPS, video and socket claims

`ffprobe` independently reports `runtime-demo.mp4` as 85.000 seconds, H.264, 1366×768, 25 fps, with no audio stream. The five edit intervals sum to 85 seconds and are labelled speed 1. The 25 fps is the file's encoding rate, not measured game FPS. I did not inspect every frame of the raw source videos.

The retained `performance-art-baseline/result.json` has valid 45-second windows, more than 99% frame-interval coverage, seven confirmed casts per resolution, and every observed frame joined to 10 active normal monsters plus one boss and a living player. It reports 17.092 FPS / 153.4 ms p95 at 1366×768 and 10.850 FPS / 245.3 ms at 1920×1080; both explicitly fail. The fixture openly prepares high-realm defense and all four skills. This is not evidence that the ordinary quest character naturally unlocked four skills; its post-boss HUD shows two.

Browser socket totals of 5, 1 and 3 are cumulative opened transports across the respective sessions, not concurrent leaks. `transport.open` is explicitly scoped to the current document; a separate server fixture has actual OPEN=1, CLOSING=0, total=1 after reload. Keep those forms of evidence distinct. The focus probe explicitly records `actualFocusLoss: false`; it cannot support a real foreground/background focus pass.

The parent reported a new final-performance attempt failed before gameplay because the now-pinned backend environment contaminated the frozen client's build environment. It is being retained as a controller/build-environment failure, with an explicit production and same-origin `/api` build rerun planned. That pending rerun was outside this audit's completed observations and must not replace or erase the historical failed measurement.

## Public evidence exposure check

I scanned 104 public text files/archive members under `docs/evidence` and `scripts/verification`, including the three harness ZIPs. Checks covered JWT-shaped values, long bearer values, credential-bearing PostgreSQL URLs, JSON secret fields, cookie headers, storage-state cookie arrays and private-key headers. No matches were found. No `.env`, `*.private.json` or standard private storage-state file was present among those public members. The observer explicitly excludes AUTH/cookie frames. I did not read the private environment or account-state files.

This is a bounded pattern scan, not proof that every possible secret format is absent. New logs copied into the final handoff and the final ZIP/bundle manifest still require the controller's packaging check.

## Declined to judge / explicit limits

- Whole-product and launcher correctness: assigned to separate reviewers; not duplicated here.
- Fresh final performance values and revised equipment-helper execution: parent was still producing them.
- Physical focus loss, native Windows GUI, audible output, every animation cycle/foot anchor: the reviewed artifacts do not establish them; the checkpoint already carries these limits.
- Backend in-memory source identity beyond the restart/source records: the health endpoint does not attest a commit hash.
- Full raw-video content and arbitrary secret encodings: not exhaustively reviewed; the pattern scan and sampled screenshots are the stated scope.
- M2–M4 completion or natural four-skill unlock progression: not claimed or established by this evidence.


## Scoped follow-up — equipment controller and final performance

**Disposition: the original same-name inventory-selection finding is closed.** I reviewed the revised helper and the new `docs/evidence/equipment-controller-check` records without running new game actions or reviewing product/launcher code.

The controller now checks the selected card's visible Đang Mặc badge against the requested equipped state, scopes Trang Bị/Tháo Ra to the selected detail, and accepts exactly one state transition among the previously eligible template rows. It no longer assumes an item name determines an invisible row ID. The consumable postcondition likewise checks an exact one-unit decrease across all matching template stacks. That consumable change was inspected in source; this targeted session did not itself consume an item.

The targeted session at source `762c429` completes 11 commands in 18.237 seconds, with 251 TICK messages, zero failed commands, zero page errors and no cleanup errors. Two distinct item_006 rows are present. The actual remove command leaves both unequipped and changes the character from 160 max HP / 22 DEF to 120 / 10. The actual equip command equips the other previously eligible row and restores 160 / 22. Inventory and character reads after reload retain that row and those stats. This directly exercises the duplicate-row case that raised the finding.

The new controller archive uses flat filenames instead of the earlier `scripts/verification/` prefix. Hashing the same sorted controller basenames and bytes yields `7ae52a2198c2cbd8f93189f54d4887f0bb4505f975179ec54faf46ad2fc3ab72`, matching both the targeted equipment record and final performance record. The retained initial failed-attempt ZIP separately matches `5b3aafe139cdbb86fc83843c7ab6dc621018012a203bdd625b0bdf2c7e74bffa`.

The final performance record at clean source `afa7fd2` confirms a fresh build with explicit `NODE_ENV=production` and `VITE_API_URL=/api`. Its build digest is the same `1460fa…b25c4` used by the post-fix boss session. This freezes the intended preview build inputs instead of inheriting the backend test mode/API address.

| Final measured viewport | Frames with full joined load | Wall window | Average FPS | p95 frametime | Confirmed casts | Outcome |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| 1366×768 | 948 / 948 | 45.2442 s | 20.95296 | 110.5 ms | 7 | Fail |
| 1920×1080 | 528 / 528 | 45.0672 s | 11.71584 | 229.0 ms | 7 | Fail |

Coverage is 99.928% and 99.740%, respectively. Both measurements have a living player, ten active normal monsters, one active boss, acceptable snapshot freshness and no page errors; cleanup succeeds. They still fail the requested 55 FPS / 25 ms p95 thresholds, and the fixture correctly returns a failing overall result. The report records exit 1; I did not rerun the process. The four-slot costs/cooldowns, 160 px dash and actual server one-OPEN-socket replacement check are also present in this final fixture.

`performance-final-initial` is correctly preserved as a controller build-environment failure before gameplay: it has no load measurements, an entry timeout and `passed: false`. It must not be counted as a game FPS result or silently omitted from provenance. The final measurements retain the previously stated software-renderer and prepared-save limitations. No new evidence supports full M1 performance acceptance.
