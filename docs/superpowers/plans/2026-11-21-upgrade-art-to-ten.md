# Upgrade Art and Outcomes to +10 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## Scope and decisions

Release as 1.3.0. Equipment and weapons advance from +0 to +10. +1 through +5 stay guaranteed; +6 through +10 have disclosed success chances and a failed attempt never lowers or destroys the item. Taming a mount can fail, with guaranteed success on the third eligible attempt. Cultivation breakthrough keeps its existing server rules. All three actions receive distinct four-frame success/failure art. No schema migration.

## Files and tasks

- [x] Add failing tests for +10 cost/stat/chance boundaries, taming odds and pity, new equipment/weapon art paths, and the presence and dimensions of every new export.
- [x] Build `art/upgrade-v130/` with reviewed source atlases, deterministic crop/export script, manifest, validator, and preview galleries. Package final PNGs into `client/public/assets/v130/`.
- [x] Update inventory enhancement rules and route to use cryptographic server rolls. Return success or failure as a valid attempt result; consume the stated materials; retain item and level on failure. Update GM range and stats clamp.
- [x] Update mount taming route and UI/world interaction for real failure and a two-failure pity limit. Track failure count in existing story flags, clear it on success, and show chances before attempting.
- [x] Wire +6..+10 item and weapon visuals and the three outcome animations into inventory, mount, and cultivation UI. Respect reduced motion and preserve text feedback.
- [x] Bump version metadata to 1.3.0 and update art direction, guide, release note, and source README. Validate assets, builds, gameplay tests and HTTP asset serving, then commit and push.
