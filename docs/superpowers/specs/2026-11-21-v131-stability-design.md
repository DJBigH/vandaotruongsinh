# 1.3.1 Loading and Interaction Design

## Intent

Make entry into the game explainable and resilient, and make the mount panel's primary action match the server's proximity rule. This is a patch to 1.3.0 on `version-1`; no save migration, gameplay odds change, or new art.

## Approach

Boot loads shared textures, the selected hero's poses, combat cues, and core audio. Map-specific boss motion, NPC gestures, mounts, structures and region art load after the map response and before rendering it. A pure asset selector maps the authoritative map and current server entities to the manifest. A single scene-local loader serializes map loads, reports progress, and retries failed map loads without leaving missing textures on screen.

The game page distinguishes an account with no character from an API failure. It shows loading progress and a retry action instead of routing to character creation on a network/server error. The server health route checks the database so the launcher cannot call a disconnected backend ready.

The mount panel never sends a tame request. It opens the world map if the den is in another region, or closes to the current world with exact den coordinates. The player still tames with E near the wild mount. The existing two-failure guarantee and no-loss hunt progress stay intact; changing the taming economy belongs to a feature release.

## Alternatives considered

- Keep preloading all art and add a spinner: simple but preserves the 442-request entry delay.
- Pack every image into new atlases: fewer requests but a large art pipeline change and stale cache risk.
- Load shared art first and map art on demand: chosen for a focused patch with measurable reduction and no re-export of artwork.

## Acceptance

- Initial Phaser queue excludes assets belonging only to other maps and stays below 250 files for the default hero.
- Current map renders with its own boss phases/deaths, NPC gestures, mount sheets and region props before controls enable; a later portal loads the destination art.
- Asset failure is visible and retryable; loading progress is announced in text.
- Character, inventory, or quest fetch failure does not send the player to character creation. A genuine `data: null` character still does.
- Health is ready only when PostgreSQL answers. The mount panel action follows the stated location workflow.
