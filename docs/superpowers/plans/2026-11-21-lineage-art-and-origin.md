# Lineage Art and Origin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Ship distinct Tiên/Ma art across the world, a skippable musical origin prologue and animated earned titles.

**Architecture:** Export all lineage variants from versioned source art and validate the manifest. Choose display textures from the character's alignment while preserving server collision and objective IDs. Store title selection in existing story flags. Stage the prologue between character creation and the game scene.

**Tech Stack:** Python Pillow and wave, TypeScript, React, Phaser, Fastify, Prisma.

**Spec:** `docs/superpowers/specs/2026-11-21-lineage-art-and-origin-design.md`

## Global Constraints

- Keep 64px four-direction character sheets and foot anchor (32, 56), 192px transparent avatars and nearest sampling.
- Preserve old map IDs, quests, save format and 1.5.0 realm progression.
- New release is 1.6.0; publish only `version-1`.

## Review Focus

- A Ma character created today starts in Huyền U Khê and can reach chapter-one elder, forest wolves and world portals.
- An existing Ma save in Thanh Khê still loads and sees Ma art.
- Every newly drawn NPC, mount and weapon variant has a matching avatar; no missing texture blocks a map.
- A blocked autoplay leaves a visible sound button; skip and finish both launch the world exactly once.
- A player cannot equip another alignment's title or a locked title by sending a crafted request.

## Task 1: Organic realm crests and lineage export

- [x] Write failing coverage checks for 24 organic crests, two-path NPC/mount/weapon/map variants and matching avatars.
- [x] Redraw the v150 realm crests and breakthrough strips, regenerate and inspect a gallery.
- [x] Build deterministic v160 source/export and validate sprite dimensions, distinct frames, alpha and all paired avatars.

## Task 2: Separate origin map and visual routing

- [x] Write tests for Ma creation spawn, quest targets and portal reachability; run red.
- [x] Add Huyền U Khê and route world, NPC, mount, weapon and map rendering to lineage assets.
- [x] Run map, art-load and old-save tests.

## Task 3: Earned animated titles

- [x] Write failing title catalog/equip/auth tests and client asset tests.
- [x] Add server title rules/routes, client panel, profile badge and overhead Phaser animation.
- [x] Test unlock/equip/remove, saved flags and reduced motion.

## Task 4: Origin prologue with music

- [x] Write tests for prologue script, pending/skip flow and media assets.
- [x] Package four painted scenes and two original audio tracks, then build a timed, skippable React cinematic.
- [x] Integrate both creation flows, sound controls and reduced-motion behavior.

## Task 5: Release

- [x] Update versions and docs, run builds plus focused and regression tests.
- [x] Inspect visuals and final diff; commit and push to `version-1`, sync local checkout, verify `main` unchanged.
