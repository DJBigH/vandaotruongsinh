# Review and verification records

These are preserved copies of task reports, independent reviews and the evidence-harness audit produced during the work. Historical paths under `scratch/sdd-vnext-m1` name the original working reports; this folder keeps their reviewable snapshots. Launcher RED/GREEN process output is retained in `launcher-logs/`. Synthetic fixture credentials appearing in reproduction source are deliberate test strings, not the private working environment.

The final launcher gate is `task-4-launcher-fix-2-review.md` at762c429. The boss gate is `task-4-boss-review.md` at795be99. The live consumable/sale gate is `task-4-live-combat-fix-2-review.md` at96470e7. The quest UI/cache gate is `task-4-quest-ui-fix-1-review.md` ata4e11b6. Earlier findings remain here rather than being replaced with later passing verdicts.

`handoff-evidence-audit.md` covers the three historical recorded sessions, their archived controller hashes, the later targeted equipment-controller check, and final performance evidence. Its scope is independent of product-code review. `runtime-art-integration-review.md` retains the limits of animation/pose verification; a code review cannot close those visual gaps.

Controller-owned final server command results and outputs live in `../final-verification`. Some legacy test programs print broad statements such as release readiness or absolute security; only their actual assertions and exit codes are evidence. M1 acceptance remains incomplete because the measured FPS target and several environment/visual checks have not passed.
