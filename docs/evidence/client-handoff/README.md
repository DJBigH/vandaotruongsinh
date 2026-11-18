# Frozen browser smoke at the final product commit

Product source: `3ac3fe5ed078347145b0199cd136c9a6c05939fa`, game paths clean. The main source backend was restarted from that commit, with the operation and health observation recorded in `backend-start.json`. The endpoint does not attest its own Git commit.

A fresh production frontend was built during freeze with API `/api`, then served without HMR. Build SHA-256: `09fdb6bee76796db3cc7dfd58280ed115490eb2e756cb97822f4693743efdfaf`. The script records **19/19 passing checks**, **72.713 seconds**, **1238 TICKs**, no uncaught page errors and no failed assertion. It covers real UI registration/creation, input blocking, dialogue/quest credit, collision, portals, autosave/reload, transient reconnect and both requested viewport sizes. It is a focused functional run, not a performance measurement or the long gameplay recording.

`harness-source.zip` preserves all11 verification modules plus the exact scratch wrapper and command recorder. `controller-archive.json` records each file hash; the combined module hash matches source/build/result. The controller changes were uncommitted at capture and are retained byte-for-byte in the archive; product paths were clean.

The same frozen frontend was then used by [the actual two-page terminal check](../terminal-handover-browser/README.md). The saved [command result](../final-verification/client-handoff-command-result.json) records exit0 and the hash of unmodified stdout. Stdout includes a Vite WebSocket proxy `ECONNRESET` message around connection teardown. The page-error arrays are empty; this is not a claim that the command printed no error messages.

The [first preflight attempt](../client-handoff-initial/README.md) stopped because the wrapper used Node Fetch's `Response.ok` boolean as a method. That attempt did not build/open the game, is preserved with exit1 and its exact controller, and is not counted as a game check. Only the wrapper was corrected before this run.
