# Measurement after the broad repair wave

This run measures product commit `25a7864a39cc94f7e0960661b0157980bfddeefc`, after the account/resource/boss/launcher/database-target/breakthrough repairs. Its exact controller was archived before the later smoke-only key-hold change. Source, fresh production build hash, environment and frame samples are in `result.json`.

| Resolution | Rendered frames | Wall window | Average FPS | p95 frametime | Interval coverage |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1366×768 | 849 | 45.1712 s | 18.79516 | 141.6 ms | 99.73302% |
| 1920×1080 | 502 | 45.0598 s | 11.14075 | 229.0 ms | 99.30381% |

Both windows met the measurement coverage and workload conditions: every observed rendered frame joined ten active normal monsters, one boss and a living player to visible in-camera sprites, with seven confirmed casts each. Four-slot cost/cooldown/action and one-server-socket replacement checks passed. No page or cleanup errors were recorded.

Both frame targets **failed**, and the process exited1 as designed. The renderer is the same software ANGLE/SwiftShader Chromium153 environment. These values do not measure a hardware-GPU desktop. The later narrowly scoped terminal-handover fix has its own connection/browser verification; this measurement remains attached to25a7864 and is not relabelled as a measurement of a later commit.
