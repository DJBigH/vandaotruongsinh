# Dual Realm Ascension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship 12 visible, playable and distinctly illustrated realms for each Tiên/Ma path, ending in Tiên Nhân and Ma Tôn.

**Architecture:** Keep one numeric realm index in saves; centralize path-specific display names. Extend progression to 48 levels and 47 transitions. Export deterministic pixel art to `art/realm-v150` and package selected assets in `client/public/assets/v150`. Load selected hero rank at boot and on rank change. Use path-specific art and name for the character panel and outcome.

**Tech Stack:** TypeScript, Fastify, Prisma, React, Phaser, Python Pillow.

**Spec:** `docs/superpowers/specs/2026-11-21-dual-realm-ascension-design.md`

## Review Focus

- Existing Tiên save names and requirements remain stable; Ma saves gain Ma names with unchanged indices.
- 47 transitions and terminal rejection are authoritative on the server; no phantom 13th realm.
- Level 48 is reachable from EXP and new costs remain server enforced.
- Every Tiên/Ma realm has readable, nonempty, distinct art; every hero variant has a matching portrait.
- Boot loads only one rank's hero sheets; changing rank in a live scene loads the new art safely.

## Task 1: Names, gates and server compatibility

**Files:** `shared/src/index.ts`, `server/src/data/game-content.ts`, `server/src/engine/{character-level,realm-engine}.ts`, `server/src/modules/character/routes.ts`, relevant admin/read routes and tests.

- [x] Write tests for 12 names per path, 47 transitions, 48-level cap, Ma preview/summary/outcome, old saves and final rejection; run red.
- [x] Implement shared `realmName(index, alignment)` and `realmTitle(index, tier, alignment)`, append three indices and transition requirements, extend multipliers/cap, use path-specific names in player-facing reads.
- [x] Run focused and legacy realm tests.

## Task 2: Pixel art production

**Files:** `art/realm-v150/{export.py,validate.py,manifest.json,README.md,source/,sheets/,previews/}`, `art/vnext/generate_v104_variants.py`, `client/public/assets/v150/`.

- [x] Extend hero export to ranks 4–11 with visibly distinct clothing/headpiece motifs while preserving 64×64 frame and foot anchor; generate all 768 new sheets.
- [x] Export 24 path/rank crests, 24 four-frame 96×96 breakthrough strips and 144 matching 192×192 hero avatars; keep source and manifest.
- [x] Validate dimensions, alpha, frame difference, avatar mapping and preview gallery; inspect the gallery and correct weak art.

## Task 3: Client integration and loading

**Files:** `client/src/game/assets/{hero-variants,AssetManifest,loadPlan}.ts`, `client/src/game/scenes/{BootScene,ExplorationScene}.ts`, `client/src/components/game/{CharacterPanel,CharacterIdentityPicker,CharacterSlotsModal,UpgradeOutcome,HUD}.tsx`, styles and tests.

- [x] Test per-realm hero keys and bounded boot loading; run red.
- [x] Load the current hero rank at boot and new rank on demand; register animations after load, with a visible retry path if art fails.
- [x] Show the correct 12-rank ladder, crest, portrait and result animation for Tiên/Ma; respect reduced effects and native image sizing.
- [x] Build and run client/asset/loading tests.

## Task 4: Release and branch

**Files:** package versions, `README.md`, `ART_DIRECTION.md`, `docs/VERSIONING.md`, `docs/checkpoints/1.5.0-release.md`.

- [x] Update versions to 1.5.0 and document the names, art, progression and save behavior.
- [x] Run server, client, launcher builds plus progression, content, art and route regressions; inspect diff.
- [ ] Commit and push only `version-1`; fast-forward local `version-1` and verify `main` remains unchanged.
