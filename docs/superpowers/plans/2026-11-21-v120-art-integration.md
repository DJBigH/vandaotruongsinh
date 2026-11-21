# Vạn Đạo Trường Sinh 1.2.0: art integration

The user chose 1.2.0 for this substantial art update. The source artwork already lives in `art/future-library`, `art/event-vision`, and `art/motion-library`. Keep source and exports reproducible; copy only runtime files into `client/public/assets/v120`.

1. Add coverage for the new portrait and equipment mappings, event boss appearance, runtime asset declarations, and source-to-public file presence. Run the new test and confirm it fails before implementation.
2. Package crisp NPC portraits, equipment tiers, mount wild strips, region landmarks, event cards/icons and the empowered wolf animation. Register Phaser assets with dimensions from their manifests.
3. Connect portraits, equipment visuals, wild mount motion, map landmarks, timed event cards, and event boss motion to the current UI and exploration scene. Keep landmarks decorative so movement and portals are unaffected.
4. Set package and launcher versions to 1.2.0, update release notes and art documentation. Preserve existing saves and server rules.
5. Validate art, run the new test, client/server builds and relevant gameplay tests. Inspect UI in browser, then commit and push the branch.
