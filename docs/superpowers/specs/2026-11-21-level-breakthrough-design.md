# Level and Breakthrough Design (1.4.0)

The game has nine named realms, four tiers in each, and 35 valid transitions from Luyện Khí Sơ Kỳ to Độ Kiếp Đại Viên Mãn. The last tier is a cap: no transition to realm index 9.

Character EXP is already a cumulative `BigInt` in the save, but level remains at its initial value. Make EXP authoritative: level 1 starts at 0 EXP; reaching level `L+1` requires an additional `50 × L²` EXP; cap level at 36. Derive a legacy save's effective level from its stored EXP immediately, and keep the existing `level` column synchronized when EXP is awarded or adjusted.

The next breakthrough requires level `2 + realmIndex × 4 + realmTier`, its existing cultivation EXP and item prerequisites, and `30 × requiredLevel²` spirit stones. The server checks all four under the existing character transaction lock. A valid attempt consumes the spirit stones whether it succeeds or fails; an ineligible or cooldown-blocked attempt consumes nothing. Existing random success, 15% cultivation loss on failure, cooldown, and request-ID replay behavior remain. No schema migration is required.

The Tu Vi panel displays current level and EXP progress, required level, and current/required stones, plus the existing cultivation, items, probability and cooldown. The button is disabled until all requirements are met. The character HUD shows the level. This is a compatible minor release, `1.4.0`, pushed only to `version-1`.
