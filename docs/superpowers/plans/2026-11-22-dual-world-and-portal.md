# Dual World and Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship fully separated Tiên/Ma world routes, individual normal/elite enemy art, and readable cast-based portal travel.

**Architecture:** Add an explicit map lineage table, server-side graph checks and legacy-save mapping. Export new 1.7.0 art with a validated manifest, then load only the active branch. Add a server-issued portal cast token and client feedback. Keep objective and collision coordinates stable.

**Tech Stack:** TypeScript, Fastify, Phaser, React, Python Pillow, PostgreSQL/Prisma.

**Spec:** `docs/superpowers/specs/2026-11-22-dual-world-and-portal-design.md`

## Constraints and review focus

- Keep save compatibility, quest target IDs, 64px sprite frames and 192px native avatars.
- A new Ma character may never enter a Tiên map, and an existing Ma save on an old ID must still progress.
- Every Ma map portal must have a walkable arrival and a return route; a failed cast must leave movement usable.
- Every normal/elite template needs both branch assets and an avatar; boot loading stays bounded.
- A low-realm forged teleport before 2.5 seconds must fail; Nguyên Anh/Ma Anh is instant.

## Task 1: Separate world graph

- [x] Write failing tests for the two map graphs, old Ma save, graph locks and portal arrivals.
- [x] Add Ma map IDs/names, NPCs and props; route engine, maps, tower, events and mounts by lineage.
- [x] Run world, quest and portal regression tests.

## Task 2: Art library

- [x] Write validator for 40 normal/elite variants, 12 reworked Ma NPCs, region textures and ritual gates.
- [x] Generate native sprites, portraits, backgrounds and gate effects; inspect a contact sheet.
- [x] Register branch assets and validate that maps load all referenced textures.

## Task 3: Portal ritual and title size

- [x] Write cast-state and route tests for timing, cancellation, distance and high-realm instant travel.
- [x] Add server preparation/commit checks and client cast bar, sound/visual effect and cancellation.
- [x] Shrink overhead title and inspect its dimensions; runtime visual check remains outstanding.

## Task 4: Release

- [x] Update version/docs, run builds and focused/regression tests. Runtime browser inspection was blocked by the environment's automatic approval policy.
- [x] Commit, push `version-1`, sync local checkout and confirm `main` unchanged.
