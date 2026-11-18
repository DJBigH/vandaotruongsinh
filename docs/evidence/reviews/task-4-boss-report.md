# M1 boss encounter lifecycle repair

**DONE** · `795be99a26138393e786b70ef790944d65c08710` on `codex/vnext-m1`, based on `7e2e78f8a4ea1ebdbf1399334ced3fcf229731bb`.

## Observed behavior and causes

The pre-fix browser continuation in `docs/evidence/playthrough-quests/session-result.json` recorded a 33 HP boss warning at player DEF 13, then a 45 HP warning at the start of the next attempt at DEF 14. Those values match the existing damage math for boss attack 25 and an inherited enrage attack of 34, respectively. The simulation reproduced the state drift directly. Player revival reset phase to 1 and left attack 34 and speed 15 in place. The boss's own timed respawn left phase 2 and the same modified stats in place. Both paths now restore base attack 25 and speed 12, and a later enrage computes the same single 1.35 and 1.25 multipliers from the template. The browser deaths remain recorded as pre-fix attempts.

The AI also used its current state and melee range to decide whether to advance attack time. Breaking the 75 px boundary replaced `WINDUP` with `CHASE`, while a phase crossing replaced `WINDUP` with `ENRAGED`. The warning persisted in either case, leaving the boss free to create a second warning before the first one resolved. A pending warning could also survive until post-revival simulation resumed if no tick ran during the revival delay.

## Implemented timing and reset rules

- A boss commits a warning with its announced location, one 800 ms windup and the damage calculated at commitment. Its velocity remains zero during this preparation. A player leaving or reentering melee range and a boss entering phase 2 both leave the commitment in place. Enrage still updates attack, speed and the existing announcement immediately. Subsequent warnings use the new attack.
- A matching warning resolves once at its announced radius 80. The 2000 ms cooldown starts at the authoritative resolution tick whether the player is hit, dodges it or is invulnerable. The 1.5 warning damage multiplier, 40% M1 enrage trigger and phase multipliers are unchanged.
- Player death cancels the attempt's pending warnings. Revival keeps the existing two-second safe spawn, HP/MP restoration and map-generation guard. Bosses in that same generation reset to authored stats, full HP, phase 1, clean velocity and target, and clear attack/respawn timing. Their position and existing reward eligibility are retained. A boss's own existing 25-second respawn uses its spawn position and the usual reward-flag reset. A stale warning cannot fire on that reset tick.
- A legitimately due warning can still resolve on the tick that defeats its boss. The existing simultaneous-death branch withholds rewards when both die in that tick. Ordinary melee retains 400 ms windup and 1600 ms cooldown.

Files committed are `server/src/engine/realtime-arpg-engine.ts` and `server/src/tests/boss-lifecycle-test.ts`. The engine adds a private `resetBossEncounter(boss: ArpgMonsterEntity)` helper. Public session interfaces, WebSocket payloads and data templates are unchanged.

## RED and GREEN evidence

Commands are from `server/`. The ARPG and security jobs used `node /workspace/scratch/c5685e889d73/runtime_tools/run-in-stack.mjs /workspace/scratch/c5685e889d73/vandaotruongsinh/server ...` with the isolated PostgreSQL test stack. Logs are in `scratch/sdd-vnext-m1/`.

| Run | Command | Observed result |
| --- | --- | --- |
| Deterministic simulation RED | `NODE_ENV=test node --import tsx --test src/tests/boss-lifecycle-test.ts` | 1 pass, 5 fail. Player revival left phase-1 attack 34 and speed 15. A stale warning reduced revived HP from 100 to 65. Own respawn left phase 2 with attack 34 and speed 15. Range reentry and phase crossing each produced two warning IDs. The map-generation guard passed before the fix. `task-4-boss-red.log` |
| Deterministic simulation GREEN | `NODE_ENV=test node --import tsx --test src/tests/boss-lifecycle-test.ts` | 8 pass, 0 fail, 0 skipped. Regression coverage includes fresh phase 1 after both reset paths, a second exact enrage, expired warning cancellation, range/cooldown timing, enrage during preparation, map generation, the due-warning simultaneous-death path and ordinary melee timing. `task-4-boss-green.log` |
| Existing ARPG | `NODE_ENV=test node --import tsx --import ./src/config.ts src/tests/arpg-test.ts` | 27/27 assertions, exit 0, including warning dodge, enrage and no gold/EXP on simultaneous death. `task-4-boss-existing.log` |
| Existing security/death | `NODE_ENV=test node --import tsx --import ./src/config.ts src/tests/security-test.ts` | 26/26 assertions, exit 0, including durable DB gold/EXP on simultaneous death. `task-4-boss-existing.log` |
| Server compilation | `npm run build` | Exit 0. Existing npm `http-proxy` deprecation warning. `task-4-boss-server-build.log` |

Self-review confirmed that boss hit resolution remains before simultaneous-death settlement, the normal monster branch retains its damage and timing checks, boss reset restores the template's exact numbers, and the commit only includes the engine and focused test. `git diff --check` passed. The controller owns the main backend restart and real browser revalidation of the boss, quest turn-in and armor sequence.
