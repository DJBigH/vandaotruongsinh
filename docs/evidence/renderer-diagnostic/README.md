# Vạn Đạo renderer performance diagnosis

**The strongest measured bottleneck is frame delivery through the browser’s software rendering path.** At 1920×1080 the same frozen client produced 9.90 FPS using SwiftShader WebGL and 25.86 FPS using Canvas. Phaser’s measured update and synchronous render work each took at most 5.5 ms at p95 across the four main cases. Frame intervals ranged from 42.9 to 330.5 ms at p95. The test isolates a substantial renderer-path cost and leaves browser rasterization, compositing, and scheduling costs unpartitioned.

Keep the current renderer selection for the milestone and rerun the unchanged performance gate on a Chromium host that reports hardware WebGL. The available software-rendered run still fails the 55 FPS average and 25 ms p95 requirements. Canvas alone falls short at both sizes and changes authored colors. If software-only hardware is a product target, assess a dedicated rendering path against those same thresholds and verify visual parity before shipping a change.

## Controlled comparison

The client was built from `fc74a0bc9527b1f50290485a9fa565c92745b65a`. The driver recalculated SHA-256 `ab6c016ea938d1577c27a555cd3d0e630a70f888c245696e746fda6570ab5024` across the 92 files in `scratch/acceptance-build-WR0VUa`, excluding its provenance manifest. Each case used a fresh Chromium 153.0.8010.0 headless shell, DPR 1, a visible page, and a canvas at the viewport’s native dimensions. The launch package explicitly selected ANGLE SwiftShader. The host reported an Intel Xeon Platinum 8573C and nine logical CPUs.

The Canvas variant added a document-start capability shim that returned null for WebGL context requests and forwarded the others. Phaser’s existing `AUTO` selection then chose its Canvas renderer. The WebGL control used the same files and launch arguments without the shim. Both used identical event observers, inputs, backend configuration, and disposable character preparation. These are **diagnostic experiments**. Shipped-client performance remains the result in [performance-art-baseline/result.json](../performance-art-baseline/result.json).

The fixture used Thanh Khê forest, ten combat-active ordinary monsters and one combat-active boss, a living realm 8 tier 3 player, and four equipped Sword skills. It held W/D/S/A for 160 ms with 100 ms between keystrokes and cast slot 3 at empty ground in range, using the existing input and server action path. Each observed frame matched live snapshot entities to active in-camera sprites with snapshot age at most 250 ms. Actual simulation and damage rules were used. No recording ran during timing.

| Renderer | Viewport | Wall seconds | Full frames | Casts | Avg FPS | p95 frame ms | p95 update ms | p95 render ms |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| SwiftShader WebGL | 1366×768 | 45.10 | 942/942 | 7 | 20.89 | 94.8 | 1.1 | 1.5 |
| Canvas capability shim | 1366×768 | 45.24 | 1849/1849 | 7 | 40.88 | 42.9 | 0.7 | 1.7 |
| SwiftShader WebGL | 1920×1080 | 45.14 | 447/447 | 7 | 9.90 | 330.5 | 2.1 | 5.5 |
| Canvas capability shim | 1920×1080 | 45.09 | 1166/1166 | 7 | 25.86 | 65.0 | 1.0 | 2.0 |

Frame intervals were measured between Phaser `postrender` events. Every 45-second interval had at least 99.6% wall-time coverage. The diagnostic update and synchronous render intervals span `prestep` to `poststep` and `poststep` to `postrender`, respectively. These events measure the time inside the game callback. The difference from the time between frames includes asynchronous browser work and scheduling. The original unshimmed baseline recorded 17.09 FPS / 153.4 ms at 1366×768 and 10.85 FPS / 245.3 ms at 1920×1080, indicating run-to-run variation and consistent threshold failure.

## Targeted follow-ups

- Removing Chromium’s `--single-process` and `--in-process-gpu` switches let the shell launch successfully. With the other flags and viewport fixed, the 18-second 1920×1080 checks yielded 9.13 FPS / 254.9 ms p95 on SwiftShader WebGL and 22.51 FPS / 99.4 ms on Canvas. WebGL carried the full load on 166/166 frames and Canvas on 406/406. Both registered three confirmed casts. The shorter windows support a process-layout check and do not establish long-run acceptance statistics.
- Chromium still granted SwiftShader contexts when requested with `failIfMajorPerformanceCaveat: true` for `webgl`, `experimental-webgl`, and `webgl2`. The probe identifies SwiftShader via the unmasked renderer extension. The caveat option alone cannot discriminate this environment.
- Phaser Canvas draws the original sprite image without Phaser’s WebGL tint, as confirmed in `CanvasRenderer.batchSprite` and the 1920×1080 screenshots. The forest’s red-tinted lanterns became difficult to distinguish and the two tinted crystal cluster props changed to bright cyan. The scene still displayed the player, combat actors, terrain, HUD, and props.
- Browser page errors and cleanup errors were empty. Vite logged three proxy `ECONNRESET` events across the two load jobs. All six owned fixture accounts were deleted. Product files, the index and the shared verification scripts were read only throughout the diagnostic.

## Evidence

- [Comparison results](comparison.json)
- [1080p SwiftShader screenshot](comparison-4-webgl-1920x1080.png) and [1080p Canvas screenshot](comparison-2-canvas-1920x1080.png)
- [Process-layout results](multiprocess.json)
- [WebGL capability results](context-probe.json)
