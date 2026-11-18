# Terminal handover re-review

**Residual Important #1 — ADDRESSED.** The displaced window stops its gameplay connection on terminal close. If it misses that close and its character is now inactive, retrying with the captured character ID cannot take ownership of the newly active character. A transient network interruption still reconnects the window to its own active character. Both the specification and code-quality review pass for this change. No new defects were identified in the seven-file delta.

**Reviewed range** `25a7864a39cc94f7e0960661b0157980bfddeefc` to `3ac3fe5ed078347145b0199cd136c9a6c05939fa`. The other seven Important findings, the provenance fix and the previously accepted Minor dispositions retain their prior review results.

## Ownership and lifecycle

- The server retires an old slot with close code 4001. When a second window replaces the owner of the same active character, the server installs the new owner before closing the old one with 4002. Authentication checks the character requested by the connection against the account's active character before installing the callback. Late input or close from a displaced connection remains guarded by owner identity. See `shared/src/index.ts` and `server/src/modules/arpg/ws-handler.ts`.
- The scene captures the viewed character's ID at initialization and the connection includes it in each authentication request. Both terminal codes and the recognized legacy close reason set the connection's stopped flag before notifying the scene. The timer and focus paths check connection state. A background retry waits for focus before authenticating. See `client/src/game/exploration/connection.ts` and `client/src/game/scenes/ExplorationScene.ts`.
- On terminal close the scene invalidates pending map work, clears controls, prediction, sprites and timers, and retires its listeners. The page replaces gameplay controls and panels with the terminal message and a deliberate reload action. Reload fetches the active character before starting another scene. See `client/src/game/scenes/ExplorationScene.ts` and `client/src/pages/GamePage.tsx`.

## Evidence

The real-listener tests exercise a delivered slot-change close, a missed close followed by focus while the former character is inactive, and a genuine temporary disconnect while the original character remains active. In both handover cases the replacement receives a further TICK for its own character after the retry interval and old-window focus. In the transient case the original window receives a fresh INIT and TICK for its own character. The client unit test also checks that a legacy terminal close leaves no retry timer and that later explicit start and authentication calls do nothing.

The repair author's recorded results are 42/42 route tests, 28/28 client tests and successful server and client builds. The initial shared-listener fixture produced cross-test connection counts. The recorded passing run isolates each real listener. This review inspected the recorded outputs and source and did not repeat those executions.

## Checkpoint disposition and limits

All eight original Important findings are now addressed across the two repair reviews. The reviewed code is ready to integrate as a development checkpoint. Full M1 and release acceptance remain open.

I did not grade the controller's concurrent frozen browser smoke or two-page UI run, physical operating-system focus, native Windows behavior, animation fidelity, performance, or actual database behavior. Synthetic focus and loopback traffic provide evidence for the connection lifecycle. The controller owns separate browser and performance evidence with its own revision and run identities.
