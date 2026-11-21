# V1.0.5 Mounts, Skills and Weapons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make mounts collectible through world play, give riding visible motion, expose learnable skills, and make the existing weapon catalogue obtainable and legible.

**Architecture:** Keep combat and rewards server authoritative. Record tame progress from confirmed monster deaths and persist mount ownership separately from the active mount. Build skill learning and equip endpoints around the existing 36 templates, then show actual equipped skills in the HUD. Use the art direction's crisp pixel assets and visual QA for new mount, rider, and weapon art.

**Tech Stack:** Fastify, Prisma/PostgreSQL, TypeScript, React, Phaser, Vite.

**Spec:** User request of 2026-11-21 and `ART_DIRECTION.md`.

## Global Constraints

- Release is version 1.0.5 after 1.0.4, preserving existing accounts and saves.
- Only confirmed server kills advance taming; clients cannot claim kills or unowned mounts.
- Existing equipment, learned skills and character progress survive migration.
- Pixel sprites remain clear at native size, with the foot anchor and directional rules from `ART_DIRECTION.md`.

## Review Focus

- Repeated tame requests cannot create duplicate mounts or consume duplicate progress.
- A player cannot tame in another map or equip a mount they have not caught.
- Existing auto-learned skills still load and can be reassigned.
- Learning rejects wrong path, locked realm and insufficient currency.
- Four skills in the HUD match the actual server combat order after reequipping.

## Tasks

### 1. Mount collection and taming

- [x] Add six world mount definitions with hunt monster, map, required kills and realm; persist ownership in per-character story flags.
- [x] Write server tests for kill progress, tame and equip authorization; implement transactional server endpoints and progress updates.
- [x] Build collection UI with location, progress, capture action, active mount and failure feedback.

### 2. Skills and combat slots

- [x] Add skill list, learn and equip endpoints with server-side cost, path, realm and four-slot validation.
- [x] Make newly unlocked skills eligible to learn, keeping previously learned ones; test save compatibility and abuse cases.
- [x] Build a skill manual panel and connect the HUD to the actual equipped skill list.

### 3. Weapon progression

- [x] Add recipes for attainable weapons across all three paths and realm stages, using existing world drops.
- [x] Make recipe cards show their weapon art, stats, material sources and requirements.
- [x] Add or refine distinct weapon assets and check them at native game scale.

### 4. Animation and release

- [x] Replace static in-world mount pictures with moving sprite animation and a seated rider pose; verify movement, action and unmount transitions.
- [x] Add distinct mount art and composite the selected character as rider, update asset manifest and provenance.
- [x] Run server tests, client build, asset audit and in-browser play check; release 1.0.5 with migration and backup.
