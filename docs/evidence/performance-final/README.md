# Final measured run

Source and exact build identity are in `result.json`. The fixture started its own backend on the dedicated local test database and freshly built the production frontend with `NODE_ENV=production`, `VITE_API_URL=/api`. Its frontend SHA-256 equals the frozen boss-session build. No game source was dirty at capture.

The four-skill cost/cooldown/action checks and server socket replacement check passed. Both 45-second rendered-frame measurements had a living player, ten active normal monsters and one active boss in camera on every observed frame, seven confirmed casts, sufficient snapshot freshness/window coverage, and no page errors. Both **failed** the requested average 55 FPS and p95 <=25 ms:

| Resolution | Average FPS | p95 ms | Frame interval coverage |
| --- | ---: | ---: | ---: |
| 1366×768 | 20.95296 | 110.5 | 99.92795% |
| 1920×1080 | 11.71584 | 229.0 | 99.73950% |

The process therefore exited 1 as designed. Cleanup succeeded. These are software ANGLE/SwiftShader Chromium 153 measurements on the recorded Linux host. They are not hardware-GPU performance results. The prepared high-realm/four-skill saves are disclosed test fixtures, not ordinary quest progression.

The preceding controller build-environment failure is retained in `../performance-final-initial`; it produced no gameplay measurement. No failed frame target was hidden or converted into a pass.
