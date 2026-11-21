# Dual Realm Ascension Design

## Intent

Give both Tiên and Ma characters a complete, equally long realm journey. A player must see the path's names and art in the game, recognize each breakthrough, and reach an explicit final realm: Tiên Nhân or Ma Tôn. Preserve all 1.4.0 characters, realm indices, saves, and the 35 existing transition costs.

## Approaches

- **Shared names with different colors:** least work, but Ma still appears to follow the Tiên ladder. Rejected.
- **Separate Tiên/Ma databases and progression:** maximal divergence, but duplicates balance and breaks save continuity. Rejected.
- **One indexed 12-realm progression with path-specific names and art:** chosen by the user. Both paths have 48 tiers and 47 transitions, identical numeric gates, but distinct names, portraits, crests, character clothing motifs and breakthrough effects.

## Realm ladders

Index 0–8 preserves the existing Tiên names. Tiên gains 9 Tán Tiên, 10 Chân Tiên, 11 Tiên Nhân. Ma has 0 Luyện Ma, 1 Tụ Ma, 2 Ma Đan, 3 Ma Anh, 4 Hóa Ma, 5 Phá Hư, 6 Ma Thể, 7 Đại Ma, 8 Ma Kiếp, 9 Ma Quân, 10 Thiên Ma, 11 Ma Tôn. Both keep Sơ, Trung, Hậu, Đại Viên Mãn. Index 11 tier 3 is terminal.

All existing Tiên realm indices retain their meaning. Existing Ma saves retain their realm index but now display the Ma name at that rank. The level cap becomes 48, with the established cumulative EXP formula and level gate `2 + 4 × realmIndex + tier`. The spirit-stone formula remains `30 × requiredLevel²`. The old 35 breakthrough requirements remain unchanged; append 12 reachable transitions for indices 8 tier 3 through 11 tier 2. Continue existing chance, cooldown, attempt replay, and item validation. New transitions use available endgame drops and no new unavailable material.

## Art and presentation

Keep the project's crisp 64-pixel four-direction hero frame and 192-pixel RGBA avatar rules. Produce one identifiable crest (64×64) and four-frame breakthrough animation (96×96 each) for each of 12 ranks on each path. Each frame changes shape, not just opacity or hue. Produce realm-specific protagonist avatars for all path, gender and combat-class combinations by adding distinct headpiece, collar and crest details to the source portraits; save the source and deterministic export recipe. The 12 path-specific hero ranks reuse the existing anatomy and timing but gain rank-specific robe and crown motifs. Load only the selected hero rank at boot; load the next rank on demand after breakthrough to avoid increasing startup load. No permanent glow when idle.

The character panel shows the path's 12-rank ladder and current crest, and the breakthrough outcome uses the path-and-destination animation and avatar. Character creation explains each path's final destination. Respect reduced motion by showing a complete static frame. All art files have exact alpha bounds, fixed frame dimensions, nearest-neighbor scaling and validation. The art manifest maps every realm/path/rank to its sprite, avatar, crest, animation and source.

## Verification

Test all 24 path names and 47 transitions, old save compatibility, level 48 cap, terminal rejection, endgame item source, server preview and outcome names, 24 crests and animations, 144 portraits, 1,152 hero pose sheets, exact dimensions, alpha and non-empty distinct frames, boot asset count and lazy rank loading, builds and route regressions. Release as 1.5.0 on `version-1`; leave `main` unchanged.
