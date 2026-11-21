# V1.1.0 Visual and GM Completion Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Make the game menus usable, give the owner a safe full GM test bench, and replace reused/missing boss, NPC, environment, weapon-tier and skill visuals with runtime assets.

**Architecture:** Keep GM changes server-authoritative, typed, locked per character and audited. Use generated transparent source art packed into deterministic sheets and wire every generated asset into the runtime manifest/data; use server-confirmed actions for skill VFX. Replace the HUD button grid with a focused, grouped menu and keyboard shortcuts that never fire while typing.

**Tech Stack:** React, Phaser, Fastify, Prisma, TypeScript, Pillow for atlas packaging.

**Spec:** User request of 21 November 2026 and `ART_DIRECTION.md`.

## Global Constraints

- Preserve existing characters, inventory, skills and save compatibility.
- Owner-only GM writes; reject malformed IDs/amounts and audit every operation.
- Player movement/combat keys remain unchanged when any panel or text field has focus.
- Show actual unique boss/NPC sprites, not a tint of a different entity.
- Version policy: patch for fixes, minor for feature sets, major for compatibility breaks; release 1.1.0.

## Review Focus

- The 17 menu destinations remain reachable by mouse and keyboard at 1366×768 and 1920×1080.
- Text inputs do not open game menus, and Escape closes the current panel.
- Non-owner requests cannot invoke the GM routes; invalid catalogue IDs cannot create arbitrary records.
- Every boss template and named NPC resolves to a registered, nonempty texture.
- Skill feedback is tied to a confirmed skill ID/slot, with reduced-motion fallback.

## Tasks

### 1. Version policy and visual inventory

- [x] Replace the forced 1.0.9 → 2.0.0 rule with semantic increment selection and tests.
- [x] Audit boss/NPC/prop/skill asset references and save a machine-readable coverage report.

### 2. Game navigation

- [x] Build a grouped game menu with primary shortcuts, secondary categories, readable labels and responsive layout.
- [x] Bind shortcuts in the game page, ignore editable targets, and verify Escape and focus behavior.

### 3. GM test bench

- [x] Add owner-only typed commands for realm/tier, currency/exp, heal, items/enhancement, skill unlock, mounts and teleport.
- [x] Add catalogue and character state endpoints, a dedicated GM interface and authorization/abuse tests.

### 4. Art and motion

- [x] Pack unique generated boss and NPC art into transparent sprites and register all 20 bosses and named NPCs.
- [x] Pack environment props and place them on distinct maps without changing collision or portal reachability.
- [x] Make six visual stages for each weapon archetype and render by enhance level in inventory/equipment.
- [x] Make confirmed skill actions show distinct VFX families and boss states show visible windup/attack/hurt motion.

### 5. Release

- [x] Run builds, server tests, asset coverage audit, browser playthrough and visual screenshots.
- [ ] Back up the live DB, integrate locally, migrate safely, verify live game and tag 1.1.0.
