# Actual two-page terminal handover

This check used the same fresh frozen frontend and source backend as [client-handoff](../client-handoff/README.md), at clean product commit `3ac3fe5ed078347145b0199cd136c9a6c05939fa`. The exact controller is in that directory's `harness-source.zip`; its combined hash matches this result.

All **8/8 assertions passed** in **15.262 seconds**. A test account and character were created through the real UI. A second page opened the same character, and the first page showed its terminal ownership message. After attempted movement, a **synthetic** focus event and a3600ms wait beyond the3000ms retry interval, the first page created no additional socket and sent no additional input; the replacement received76 more TICKs. The explicit reload button then started a fresh session, displaced the other page and restored the gameplay canvas.

`displaced-window.png` and `replacement-after-explicit-reload.png` capture the actual terminal screens. Both page-error arrays and the recorded cleanup-error array are empty. Current-document transport observations are not a separate server descriptor census. Active-slot/missed-terminal-close races and server ownership are covered by the42-case route/session suite, including three production-connection/real-listener scenarios.

The focus event was deliberately dispatched to the real handler. No physical OS focus-loss acceptance is inferred from this headless run. The shared command log contains a proxy `ECONNRESET` message near teardown; it remains preserved alongside exit0.
