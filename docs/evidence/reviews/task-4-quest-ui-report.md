# Completed quest claim UI repair

Implemented in `e3dcd54f7ae07c176cf9272b79a335351a90d49f` on base `0213c2ae1bac3a819738820324fe7dae4d00067e`. The commit owns `client/src/components/game/QuestPanel.tsx` and `client/tests/questPanel.test.ts` only.

## Cause and repair

The real browser sequence recorded the elder TALK objective at 1/1 and gray wolf KILL at 3/3. The server transitioned `quest_main_01` to `COMPLETED`. The QuestPanel current tab selected only rows whose status equaled `ACTIVE`. Its claim and track controls were also nested in an `ACTIVE`-only condition. The server-completed quest therefore disappeared while its reward was still unclaimed.

- **Đang Thực Hiện** now includes `ACTIVE` and `COMPLETED` rows, with objectives and tracking. **Nhận Thưởng** keeps the existing all-objectives-complete guard and calls the server turn-in route.
- **Có Thể Nhận** displays only `AVAILABLE`. The history tab **Đã Nhận Thưởng** displays only `TURNED_IN`. Its previous title **Đã Hoàn Thành** could describe unclaimed quests too.
- The server accept and turn-in routes use template IDs. The quest tracker and HUD match the character-quest record ID. Successful acceptance now tracks the returned record ID. Successful turn-in clears tracking if that specific record is still selected. The existing quest and character reloads remain in place.

## Validation

| Check | Command or evidence | Result |
| --- | --- | --- |
| Actual browser RED | The play-session quest command at `scripts/verification/play-session.mjs:155` attempted the UI claim for `quest_main_01`. Screenshot `docs/evidence/playthrough-m1/completed-quest-hidden-red.png`. Command result `scratch/browser-session/1794984782087-2a224a.result.json`. | `ok: false`, `AssertionError [ERR_ASSERTION]: No visible Nhận Thưởng for Khởi Đầu Tu Đạo: Dị Biến Thanh Khê`. The screenshot shows the current quest tab empty. |
| Focused render RED | From `server/`, `node --import tsx --test ../client/tests/questPanel.test.ts`. Log `task-4-quest-ui-red.log`. | Exit 1. One test failed because the real QuestPanel HTML omitted `Dị Biến Thanh Khê`. |
| Focused render GREEN | Same command. Log `task-4-quest-ui-green.log`. | Exit 0, one pass and zero failures. Rendered the completed TALK and KILL counts, one claim control, the tracked indicator, and an incomplete active quest. The available and already-claimed fixtures stayed outside the current list. |
| Production client | From `client/`, `npm run build`. Log `task-4-quest-ui-build.log`. | Exit 0. TypeScript and Vite built 157 modules. Produced `dist/assets/index-JDuIC9p4.js` with the existing npm proxy and Vite chunk-size warnings. |
| Scoped diff | `git diff --cached --check`. | Exit 0 before the two-file commit. |

The focused regression verifies rendered controls with the actual panel and its Zustand store. The controller is continuing the real claim and persistence verification on the original test account using the new frozen client.

## Quest reward inventory refresh

Committed `a4e11b65af124eae7fa2f23b3b0a9b9a63488788` on `b5c8f963288af1cdf7c3ed9be6f66709fe342adb`. The commit changes only `QuestPanel.tsx` and the existing `client/tests/questPanel.test.ts`.

Quest turn-in commits inventory rewards before returning success. The previous panel refreshed quests and character only. Opening InventoryPanel reads the cached Zustand inventory and neither mounting the bag nor toggling the panel requests a refresh. The main03 reward `item_006` (Linh Giáp Vệ) could therefore remain absent until a different inventory refresh. After a successful turn-in, QuestPanel now awaits the existing `loadInventory()` alongside the quests and character reloads. Rejected claims still take the existing error path.

| Verification | Command | Result |
| --- | --- | --- |
| Inventory RED | From `server/`, `node --import tsx --test ../client/tests/questPanel.test.ts`. Log `task-4-quest-inventory-red.log`. | Exit 1, one pass and one failure. The actual rendered claim callback succeeded against the controlled HTTP adapter, yet the real Zustand bag remained `[]` instead of containing server item `item_006`. The rejected attempt read no inventory. |
| Inventory GREEN | Same command. Log `task-4-quest-inventory-green.log`. | Exit 0, two passes and zero failures. A rejected attempt leaves inventory untouched. A committed attempt makes one inventory request and places the returned armor row in the bag store. |
| Production build | From `client/`, `npm run build`. Log `task-4-quest-inventory-build.log`. | Exit 0. TypeScript and Vite built 157 modules, producing `dist/assets/index-Ic7zauge.js`. Existing npm proxy and Vite chunk-size warnings remain. |
| Scoped diff | `git diff --cached --check`. | Exit 0 before the two-file commit. |

The new regression exercises the real rendered claim control and Zustand loaders with a controlled HTTP response. Live main03 claim and equip remain with the controller's frozen client verification.
