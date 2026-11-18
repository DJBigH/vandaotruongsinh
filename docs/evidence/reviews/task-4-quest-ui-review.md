# Completed quest claim UI review

Reviewed `0213c2ae1bac3a819738820324fe7dae4d00067e..e3dcd54f7ae07c176cf9272b79a335351a90d49f` against the integration task brief.

## Spec verdict — PASS

- The current tab includes `ACTIVE` and `COMPLETED` quests. The available and claimed-history tabs remain status-specific, and the history label reads **Đã Nhận Thưởng**. `client/src/components/game/QuestPanel.tsx:10–24`
- Current quests display objective counts and tracking. **Nhận Thưởng** requires all displayed objectives to be complete and sends the template ID to the existing turn-in endpoint. The server retains its turn-in checks and reward transaction. `client/src/components/game/QuestPanel.tsx:39–44,108–109,134–140,168–200`; `server/src/modules/quest/routes.ts:182–235`
- Acceptance uses the template ID and tracks the character-quest ID returned by the server, which matches the list and HUD. Successful turn-in refreshes the quest list and character data and clears the selected ID only if it still identifies the claimed record. `client/src/components/game/QuestPanel.tsx:26–46`; `server/src/modules/quest/routes.ts:95–103,158–175`; `client/src/components/game/HUD.tsx:65`
- The commit changes only the quest panel and its focused regression test.

## Quality verdict — PASS

No Critical or Important findings in the changed code. The regression renders the actual QuestPanel with the completed quest selected. It verifies the completed TALK and KILL counts, the tracked indicator, exactly one reward button, and exclusion of available and claimed quests from the current tab. `client/tests/questPanel.test.ts:9–59`

The task report records the real browser reproduction, a focused render test that failed before the fix and passed after it, and a production client build that exited successfully. The review did not rerun either command. The real reward click and persistence on the original test account remain for the controller to verify with the frozen build. `scratch/sdd-vnext-m1/task-4-quest-ui-report.md:15–23`
