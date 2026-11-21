# Level and Breakthrough Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let EXP raise character level and require level plus spirit stones for every valid breakthrough.

**Architecture:** A pure level calculator reads cumulative EXP. Existing reward transactions synchronize the saved level cache. One eligibility function drives both preview and server enforcement, and the Tu Vi panel presents its fields.

**Tech Stack:** TypeScript, Prisma, Fastify, React, Node test runner.

**Spec:** `docs/superpowers/specs/2026-11-21-level-breakthrough-design.md`

## Global Constraints

- Nine realms, four tiers, 35 valid transitions; cap at Độ Kiếp Đại Viên Mãn.
- EXP threshold increment `50 × L²`, level cap 36.
- Required level `2 + realmIndex × 4 + realmTier`; stone cost `30 × requiredLevel²` per valid attempt.
- Keep save compatibility, failure chance, cooldown and request replay; release 1.4.0 on `version-1` only.

## Review Focus

- Old saves with EXP but level 1 must see their derived level and be eligible.
- Failed, rejected and replayed attempts must debit stones exactly once or zero times as appropriate.
- Every reward source must keep the stored level synchronized.
- The maximum tier must not produce an undefined realm.
- A player must see both level and stone gaps before attempting.

## Tasks

### Task 1: EXP-derived levels and all reward paths

**Files:** New `server/src/engine/character-level.ts`; reward writers in `server/src/engine/realtime-arpg-engine.ts`, `server/src/modules/{quest,offline,tower,admin}/routes.ts`, `server/src/modules/admin/gm-routes.ts`; character read and shared summary types; new progression tests.

- [x] Test thresholds, cap, old EXP saves, and reward level synchronization.
- [x] Implement the calculator and update all EXP writers to synchronize `level` in the same transaction.
- [x] Run targeted and legacy reward tests.

### Task 2: Breakthrough eligibility and atomic cost

**Files:** `server/src/engine/realm-engine.ts`, `server/src/modules/character/routes.ts`, existing breakthrough fixtures, new route tests.

- [x] Test missing level, missing stones, rejection without debit, failed attempt debit, replay safety, and maximum realm.
- [x] Enforce all requirements under the existing row lock and debit stones on a valid attempt.
- [x] Run breakthrough and world session tests.

### Task 3: UI and release

**Files:** `client/src/components/game/{CharacterPanel,HUD}.tsx`, `client/src/api/game.ts`, version files, docs.

- [x] Show level EXP progress and stone cost with native progress semantics, then verify client build.
- [x] Bump versions to 1.4.0, document the rule and run regression builds/tests.
- [x] Commit and push `version-1` only; fast-forward local `version-1`.
