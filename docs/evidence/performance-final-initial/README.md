# Retained controller failure before final measurement

This attempt timed out before the four-skill fixture could enter the game. The newly corrected backend configuration intentionally populated its process environment; the controller's child build inherited `NODE_ENV=test` and the backend's `VITE_API_URL`, producing the wrong frontend build mode/API endpoint for the isolated preview.

`freezeClientBuild` was corrected to pass explicit production mode and the preview's same-origin `/api` endpoint, and to record these inputs. The next attempt in `../performance-final` reached gameplay and measured both resolutions. This initial result contains **no FPS measurement**. Its controller source is archived here for provenance.
