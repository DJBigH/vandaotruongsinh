# M0 — observed baseline

Source: branch `version-1`, commit `e36a57bf83bded68d22a19818c5ca89cc2014cb1`.

The two PNGs are screenshots of the actual React/Phaser client connected through Vite to the Fastify WebSocket server and a new isolated PostgreSQL 16 database. A fresh ordinary account and Kiếm Tu were created through the real HTTP routes. They are not mockups or concept images. Capture details and the first WebSocket messages are in `runtime.json`; no authentication token is included.

- Client production build and server TypeScript build passed before changes.
- Real connection produced `connected`, `INIT`, and `TICK` messages.
- No uncaught browser JavaScript errors occurred during this short initial visit. This does not establish long-session stability.
- The 1366×768 view visibly shows an unpainted black strip below the old background, the player/portal on a drawn river without matching collision, and menu content clipped at the right edge.
- The old background is 1920×1440, whereas village data describes 2048×1536 and forest data 2048×2048. The image layout also disagrees with the data; stretching the image cannot correct that mismatch.
- Independent behavioral RED tests reproduced wall penetration, unchecked dash/projectile movement, invalid input producing non-finite position, saved-position loss, stale socket detachment, forged position writes, stale-position interactions, non-atomic chest progress, missing quest collection progress and stale equipped stats. The task reports record precise cases and subsequent results.

Environment: Linux, Node 24.22.3, PostgreSQL 16.15, Chromium headless shell with software rendering. Full system Chromium could not start because this sandbox does not permit its Unix process-singleton socket. The normal headless-shell package ran without changing sandbox permissions. Services and test jobs share one process sandbox because separate command sandboxes have isolated loopback networks.

No FPS target, animation acceptance, ten-minute gameplay test or Windows launcher UI pass is claimed by this baseline.
