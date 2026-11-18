# Task 3 review, fix round 1

Reviewed the placement changes from `fc74a0bc9527b1f50290485a9fa565c92745b65a` to `0213c2ae1bac3a819738820324fe7dae4d00067e` against the two Important findings in the original review.

## Important 1 — ADDRESSED

The northern portal and sign are visible with the hall fully opaque. The north crop shows the arch and rotating portal below the top of the map and the sign beside the arch. I checked the current renderer in memory with the shipped textures and map. The gate starts at y=4, the rotating portal extends down to at most y=109.255, and the hall roof begins at y=112. The sign starts at x=1066.454 and is centered at y=45. The hall therefore clears the disk through a full rotation and clears the sign without relying on the player's presence in the hall's fade bounds. The portal still uses the mapped center (1024, 64), and the hall collider is unchanged.

Evidence is in `client/src/game/exploration/worldLayout.ts:15`, `client/src/game/exploration/worldRenderer.ts:66`, `client/src/game/exploration/worldRenderer.ts:79`, `client/src/game/scenes/ExplorationScene.ts:525` and `task-3-fix1-layout-north.png`.

## Important 2 — ADDRESSED

The raised foundations fill the exact blocker rectangles. The barracks crop shows masonry faces along the perimeter and a darker deck through the transparent roof corners. I sampled the rendered ground and confirmed that all five reported tiles have the opaque foundation edge at the blocker boundary, including herbalist (6,20) and barracks (48,20), (49,20), (57,20) and (48,27). The foundation and steps stop at the collision rectangle. Both original findings' buildings retain their trail endpoint at the front door and a clear ten-pixel-radius foot approach.

Evidence is in `client/src/game/exploration/worldRenderer.ts:12`, `client/src/game/exploration/worldRenderer.ts:230`, `client/src/game/exploration/worldRenderer.ts:251` and `task-3-fix1-layout-barracks.png`.

## New findings and verification scope

No new Critical or Important issues identified in this fix diff. `git diff --check` passed for the reviewed commits. I inspected both static crops and ran a read-only raster and geometry check against the current code. The reported test suites, live browser play and performance are outside this scoped review.
