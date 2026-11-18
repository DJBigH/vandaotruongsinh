# Task 3 review — original art and world integration

Reviewed the Task 3 brief and its global constraints against the local change from `ddf2ab062c22fae6ee56f188baadfc9d2e12dc9e` to `fc74a0bc9527b1f50290485a9fa565c92745b65a`. The implementer's report identifies its test and build results. This review did not repeat those suites or perform browser acceptance.

**Spec compliance — changes required.** The two M1 maps have correctly sized ground, modular props, routed trails and original actor integration. Two concrete placement issues still break the requirement that landmarks be readable and visible ground match collision.

**Task quality — changes required.** The catalog, snapshot reactions, scene cleanup and settings have clear ownership. The route tests establish centerline clearance, but an endpoint can be reachable while its sign is hidden, and unwalkable ground can look like the plaza. The two Important findings are separate from pending gameplay acceptance.

## Findings

**Critical** — None identified.

**Important 1 — The hall hides the northern village portal and its label.** `client/src/game/exploration/worldRenderer.ts:64`, `client/src/game/scenes/ExplorationScene.ts:525` and `client/src/game/scenes/ExplorationScene.ts:537`. The north portal and sect gate are centered at tile (32,2). The hall's foot is at y=288, so it draws after the portal at depth 64 and its label at depth 74. The hall export is 384×321 and draws at 1.04×, extending from approximately y=−46 to 288. At the portal center (1024,64) and label center (1024,22), its source alpha is 255. The hall only fades once the player's feet enter its occlusion bounds. From outside those bounds the landmark's center and sign are covered even though the trail leads there. Adjust the landmark's sign and composition so the northern exit is identifiable before the player walks under the roof. Keep its actual interaction position and the hall blocker intact.

**Important 2 — Several solid building tiles show ordinary plaza paving.** `client/src/game/exploration/worldRenderer.ts:66` and `client/src/game/exploration/worldRenderer.ts:193`. The renderer paints the entire building collision rectangle with the same stone pattern used for walkable paving, then scales a transparent building to 104% of the zone's width. Applying this transform to the exported alpha shows no visible building pixels in the full 32×32 tiles at herbalist (6,20) and barracks (48,20), (49,20), (57,20) and (48,27). Those tiles are inside the authoritative rectangles. In particular, two adjacent northern barracks tiles present 64 pixels of apparent paving where movement stops. Give exposed solid edges a visible foundation, low wall or another unambiguously solid treatment matched to the existing footprint. Verify the door approach remains clear.

**Minor — Pathfinding repeats synchronously on every village entry.** `client/src/game/exploration/worldRenderer.ts:155` and `client/src/game/exploration/worldLayout.ts:37`. Route construction is on the same thread as scene creation. One isolated Node invocation against the two current map templates took 66 ms for the village's 13 trails and 4 ms for the forest's eight. This measures route construction only. Browser frame time is still unmeasured. Caching the resulting paths for a map geometry revision would spare repeat visits the village search.

## Strengths

- The loader and animation registry read the same catalog. The selected original sheets supply the frame dimensions, row lengths and one-shot durations. The exporter preserves aspect ratio and asserts transparent cell margins. See `art/vnext/export_assets.py:85`, `client/src/game/assets/AssetManifest.ts:38`, `client/src/game/scenes/BootScene.ts:15` and `client/src/game/animations/AnimationManager.ts:17`.
- SPELL and BODY register their own directional legacy sheets for every pose. The original forest creature sheets reserve separate frames for server WINDUP and ATTACK, and both the elite wolf tint and boss display scale are explicit. The legacy CombatScene still uses its procedural actor textures. See `client/src/game/assets/AssetManifest.ts:56`, `client/src/game/exploration/presentation.ts:17` and `client/src/game/scenes/ExplorationScene.ts:721`.
- Map pixels come from width, height and tile size. Shared collision geometry checks each accepted trail segment. Water overpaints paths at the authoritative bounds, while map data supplies the interactive and decorative positions. The renderer owns its texture and occluders. See `client/src/game/exploration/worldLayout.ts:20` and `client/src/game/exploration/worldRenderer.ts:21`, `:54`, `:87` and `:182`.
- Confirmed cooldown edges supply the action angle. Repeated DEAD samples produce no new reaction. Revival clears action callbacks, pending confirmations and transient feedback, then anchors the player at the server position. Reduced effects preserves projectile cores and danger circles. The persisted SFX setting stops active cues and is checked before new playback. See `client/src/game/scenes/ExplorationScene.ts:290`, `:308`, `:627`, `:784` and `:850`, and `client/src/game/exploration/combatFeedback.ts:13`.
- Source selection, export method, elite visual reuse, inherited class sheets and later-region limits are explicitly attributed. The reviewed change contains no server action, collision, damage, cooldown or save changes. See `art/vnext/README.md:15` and `CREDITS.md:4`.

## Cannot verify from diff

- Neutral, no-aura character appearance, foot stability and side-walk leg readability at game scale. Check all four directions, including silhouette and scale across action interruptions.
- Actual Phaser playback of a confirmed swing, cast and dodge, confirmed hurt, one death held through repeated DEAD snapshots, one respawn, and ordinary movement afterward. Verify both other classes keep their own silhouettes through movement and action.
- Both full-map presentations at 1366×768 and 1920×1080, including approach to each portal, visible building edges and doors, moving behind roofs and trees, water and rock boundaries, forest boss clearing, and return travel without missing textures or stale objects.
- Audible cues after a real user gesture, mid-play muting, persisted settings after reload, shake and feedback suppression, and readable projectiles and hazards with reduced effects.
- Sustained frame timing, long-session lifecycle behaviour, screenshots and video. Static source and export evidence does not establish gameplay acceptance or M1 completion.
