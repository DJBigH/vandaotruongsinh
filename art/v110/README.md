# V1.1.0 game art

These images were generated for Vạn Đạo Trường Sinh with OpenAI ImageGen and packed by `build_assets.py`. The source contact sheets remain in `source/`; the 106 transparent runtime files are in `client/public/assets/v110/`.

Prompt family: top-down three-quarter ancient Vietnamese/Chinese xianxia pixel-art game sprites; clear silhouette, muted earth/jade palette, readable material texture and single light source; isolated characters or props with transparent backgrounds, no text or UI. The boss sets requested a distinct anatomy and silhouette for each of the 20 named encounters. NPC sets requested individual costumes and story identities. Environment sets requested bamboo, pavilion, stone bridge, ghost tree, lantern and jade crystal. Combat sets requested 12 separate sword, spell and body-technique motifs each. Weapon sets requested six visible enhancement stages for sword, staff, fists, spear, bow and axe.

`build_assets.py` extracts each source cell, removes the source sheet background with its alpha mask, fits it to the runtime canvas, and saves nearest-neighbour PNGs. The game uses those images directly: bosses have state-driven idle, windup, attack and hurt motion; named NPCs have idle motion; confirmed skills move and fade their individual VFX; weapon icons use the actual enhancement level. These boss/NPC/VFX images are single-cell sprites animated in Phaser, not multi-frame hand-drawn sprite sheets.

Run `python scripts/verification/v110-asset-audit.py` to verify counts, alpha and registration. QA images in this folder show boss, NPC and weapon galleries plus live browser screenshots.
