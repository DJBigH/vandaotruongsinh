# Original M1 art sources and technical exports

These assets were generated specifically for Vạn Đạo Trường Sinh with the built-in image generation tool. They are not downloaded or recolored sprite packs. The source PNGs, original prompts and revision prompts are retained here. The selected walk and combat sheets are `kiem-tu-walk-v3.png` and `kiem-tu-combat-v3.png`; earlier iterations are retained for provenance, not loaded by the game.

## Reproduce the exports

From the repository root, with Python 3, Pillow, NumPy and SciPy installed:

```sh
python art/vnext/export_assets.py
```

The script writes the runtime PNGs and four synthesized WAV cues to `client/public/assets/vnext/`, a manifest to both locations, and a contact sheet to `art/vnext/qa/`. It measures connected alpha components, removes transparent RGB noise, normalizes scale and pivots, and packs frames. It does not redraw or recolor anatomy. `synthesize_sfx.py` generates the audio from deterministic oscillators and noise; no external sound recording is used.

## Runtime contract

The manifest is the detailed source of truth for filenames, source bounds, frame counts, scale, foot anchors, durations and SHA-256 checksums. Hero frames are 64×64, use the foot anchor (32,56), origin (0.5,0.875), and row order up, left, down, right. The two-pixel cell border must remain transparent.

| Sheet | Frames per direction | Total action duration |
| --- | ---: | ---: |
| Idle | 2 | 1000 ms |
| Walk | 4 | 500 ms |
| Slash | 3 | 428.57 ms |
| Cast | 3 | 583.33 ms |
| Dodge | 3 | 312.5 ms |
| Hurt | 2 | 500 ms |
| Death | 3 | 1000 ms |
| Respawn | 3 | 500 ms |

NPC sheets contain one row of four poses. Creature sheets contain one row of six poses: four locomotion poses followed by anticipation and attack release. Do not index them as the old multi-row sheets. A dark wolf using the same wolf sheet remains a visual variant, not a separately authored creature.

## Scope and review limits

This source set covers the Sword character, three Thanh Khê NPC roles, wolf/snake/fox/boss creatures, modular village props, four ground materials, and four sound cues. Other cultivation paths and later regions retain explicitly documented legacy art until their own art pass.

Static review checked alpha, frame margins, anatomy, directions and articulated action changes. The robe obscures near/far leg identity in the side-walk poses; the assembled loop must also be checked in the engine. Source generation, successful export, engine integration and runtime verification are separate milestones. Refer to the checkpoint and gameplay evidence for what has actually been run.
