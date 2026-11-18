# Incremental handoff audit — post-repair measurement and smoke input timing

Read-only audit while the terminal-client fix was still being implemented. Product HEAD at inspection was `25a7864a39cc94f7e0960661b0157980bfddeefc`; the working tree contained pending product, documentation and controller changes. This report does not certify those pending product edits. No shared database/test queue, game execution or subagent was used. Only this report was written.

## Assessment

No blocking discrepancy was found in the completed `performance-handoff` evidence or its archived controller identity. The measurement remains attached to `25a7864`; it must not be presented as performance evidence for the later terminal-client fix. The smoke-controller timing changes are narrowly scoped and preserve the test assertions. Their actual subsequent execution belongs to the controller's pending browser-verification record.

## Measured result and identity

`docs/evidence/performance-handoff/result.json` records clean game source `25a7864`, a fresh 92-file production build with `NODE_ENV=production` and `VITE_API_URL=/api`, and build SHA-256 `d0d973df6bef01487b411fb2ade8744ad2503117cab0b26d22121de722829469`.

Recomputing the digest from the archive's sorted controller basenames and bytes yields `8736614e75c1874b95f54a893a7bbd3a253d9b048049af3d553ab99768b0ec9f`. It matches both `source.harnessSha256` and `clientBuild.harnessSha256`. The archive contains exactly ten controller modules. Its `browser-smoke.mjs` equals the version at `25a7864`, before the pending key-hold changes.

| Viewport | Full joined frames | Wall window | Average FPS | p95 | Coverage | Confirmed casts | Result |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 1366×768 | 849/849 | 45.1712 s | 18.79516 | 141.6 ms | 99.73302% | 7 | Fail |
| 1920×1080 | 502/502 | 45.0598 s | 11.14075 | 229.0 ms | 99.30381% | 7 | Fail |

Both records are valid measured windows with every observed frame joining ten active normal monsters, one boss and a living player, all visible in camera. Maximum snapshot ages are about 100.3 ms and 107.9 ms. Both have sufficient coverage, no bad workload samples, no page errors and no cleanup errors. The overall result is `passed: false`, correctly reflecting the unmet 55 FPS / 25 ms p95 targets. The four-skill fixture and actual server socket replacement result (OPEN=1, CLOSING=0, total=1) are retained separately in the same result.

The archived fixture sets exit code 1 when the overall target fails. The parent reports observing exit 1. `final-verification/performance-handoff-command.txt` saves the stdout summary but does not separately save an `exitCode` field; this audit therefore corroborates expected exit behavior from source and the parent report rather than claiming an independent rerun. No performance improvement or regression conclusion is inferred from a single software-renderer rerun.

## Pending smoke-controller changes

The initial diff in `scripts/verification/browser-smoke.mjs` contained exactly eight additions of `{delay:80}` to discrete key presses: opening inventory, blocked dodge and skill, opening the map, elder interaction, wall-directed dodge and the two portal interactions. The parent then added the same hold at the locked-slot key-loop call site. I inspected that update: the current diff now has **nine changed press sites**, and removing those nine arguments makes the current bytes equal to the prior source. No assertions, thresholds, routes or gameplay data were changed.

These holds are consistent with the previously audited play/performance controller's input timing and give the low-frame-rate client more opportunity to sample the press. They do not change game movement, damage, costs or cooldowns. Existing authoritative action and route assertions remain necessary; an 80 ms hold alone cannot prove acceptance under arbitrary frame stalls. This source inspection does not label a future smoke run as passed.

## New public files, links and exposure boundaries

- All **30 direct relative links** in the current checkpoint draft resolve to existing files. Some new evidence is still untracked at inspection; committing/packaging it remains the controller's responsibility.
- The performance folder and its source archive contain no working environment file, private JSON state, dependency tree, runtime cache or raw recording by filename inspection.
- A bounded scan of **18 new public text/archive members** across the currently untracked evidence found zero candidates for JWT-shaped values, long bearer tokens, credentialed PostgreSQL URLs, populated JSON secret fields, cookie values, private-key headers, GitHub tokens or storage-state cookie arrays. No candidate values were printed and no private state was read.
- The measurement README has no Markdown links to missing targets. Its table and historical identity statements agree with the result.

One sentence remains conditional during implementation: the measurement README says the later terminal-handover fix “has its own connection/browser verification.” At this inspection there was no terminal-named evidence file yet. The parent was notified to treat this as pending until the actual run/report is written, or to phrase it in future tense. It is not evidence that the terminal fix has already passed.

The parent confirmed that terminal verification remains pending and that the runner's saved exit-1 result will be copied into a public command-result record. Neither planned action is treated as completed in this report.

## Deferred to the final narrow follow-up

The terminal fix's verification, final committed documentation identity and final source ZIP/Git bundle did not exist in final form for this audit. No final archive certification is given. A later packaging check should use the final artifact paths and head supplied by the controller, while retaining this benchmark's original `25a7864` identity.


## Scoped completion follow-up — terminal handover and final browser run

This section resolves the pending browser/exit-record items above. The parent first reported the active run, then explicitly reported completion. I read the completed artifacts after that message; I did not operate the browser or use the shared database/test queue.

### Controller assertions and scope

The new `scripts/verification/terminal-handover-browser.mjs` registers a disposable account through the real UI and opens two actual pages sharing that account's browser context. It waits for the same character's authoritative TICK in the second page, observes a terminal ownership alert and closed transport in the displaced first page, then verifies no new transport or input beyond the 3000 ms retry interval. It explicitly dispatches a **synthetic** focus event and checks that the replacement continues receiving TICK messages. Finally, clicking the visible reload action deliberately establishes a new first-page session, displaces the second page and restores one game canvas without the terminal alert.

The checks observe transport/control behavior and normal UI interaction; they do not inject gameplay INPUT or alter simulation state. Passwords are generated in memory and are not copied into the public evidence. Focus injection is plainly labelled and cannot establish physical OS focus behavior. This browser case exercises same-character ownership replacement. Active-slot changes and missed-close races remain separate regression-test evidence, as the result's limitation says.

### Exact provenance and retained wrapper failure

Both browser results identify clean product source `3ac3fe5ed078347145b0199cd136c9a6c05939fa` and harness digest `aa402c03e5fe0a763002031dc355c865731185b12648a230acf9b462f2f7d09d`. The newly built production frontend uses explicit `/api` and has digest `09fdb6bee76796db3cc7dfd58280ed115490eb2e756cb97822f4693743efdfaf` across 92 files. The backend record explicitly distinguishes the controller's restart/source record and health response from an endpoint that attests its own commit.

I verified every SHA-256 and size in `client-handoff/controller-archive.json`: all **13 source/wrapper/recorder files** match the ZIP bytes, and the ZIP's own SHA-256 matches. The combined eleven verification-module digest matches the recorded harness digest. The current terminal controller is byte-identical to its archived member. The manifest correctly states that controller changes were uncommitted at capture while product paths were clean.

The initial `client-handoff-initial` failure is retained. Its eleven verification modules are byte-identical to the corrected attempt. The only scratch-entrypoint changes are Node Fetch `Response.ok()` → boolean `.ok`, plus assertions for the expected health status/game. The initial record correctly reports a health-preflight failure, zero game checks and no FPS measurement. It is not presented as a product or browser acceptance failure.

The saved initial command record contains actual exit 1, and its output byte count and hash match the public stdout file. The previously pending performance-handoff command-result now also contains actual exit 1 with matching output bytes/hash, closing that provenance gap. The completed browser command-result contains actual exit **0**, again with matching bytes and SHA-256.

### Completed results

| Completed artifact | Result | Duration | Scope |
| --- | --- | ---: | --- |
| `client-handoff/result.json` | 19/19 checks; no page errors or failure | 72.713 s | Real registration/character, panel input blocking, skill gating, NPC/quest, walls/dodge, portal, reload/reconnect, resize and return |
| `terminal-handover-browser/result.json` | 8/8 checks; `passed: true`; no page or cleanup errors | 15.262 s | Two-page ownership replacement, stopped retry/input, synthetic focus and deliberate reload |

The terminal event log records the 3600 ms wait, no further displaced-window input and **76 new replacement-page TICK messages** during that check. It then records successful deliberate ownership transfer and restored UI. First/second socket totals of 2 and 1 are cumulative openings in this test, not a claim that three sockets remain concurrently open.

The preserved stdout includes one Vite WebSocket proxy `ECONNRESET` message near teardown. It does not appear in the browser page-error arrays, no assertion fails, the terminal cleanup error list is empty and the combined process exits 0. Therefore “no page errors” is supported; “no error messages were emitted anywhere” would be too broad. I do not infer an unobserved cause or erase that log line.

### Private boundaries and disposition

After completion, a bounded scan of **43 public text/archive members** across the two browser attempts, terminal result/events and command records found zero candidate credentials under the same JWT/bearer/database/secret-field/cookie/private-key/storage-array patterns. The controller archives contain no working environment file, private JSON state, dependency tree, raw recording or runtime cache. No private values were printed or read.

**Disposition: the pending browser verification and saved exit-code provenance items are now resolved within their stated scopes.** This does not turn the synthetic focus event into physical-focus evidence, does not measure FPS at `3ac3fe5`, and does not certify final source ZIP/Git bundle artifacts. The last measured performance remains `25a7864`; its identity is retained. Final archive checks still await the controller's paths and committed head.
