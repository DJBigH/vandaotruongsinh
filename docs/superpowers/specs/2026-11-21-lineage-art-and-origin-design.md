# Lineage Art and Origin Design

## Intent

Make the immortal and demonic lineages immediately recognizable in the opening, map, characters, equipment and earned titles. Replace the geometric medallions from 1.5.0 with hand-drawn xianxia symbols. Keep existing saves, quests, combat geometry and realm costs playable.

## Art direction

Immortal marks use cloud-scroll outlines, jade plaques, pine, crane feathers, calligraphic sword strokes and brushed gold. Demonic marks use torn silk, basalt, iron, plum blossom, claw and oath-scroll forms. Neither path uses concentric circuitry, octagonal chips or mechanical rings. Every one of the 24 realms retains a different readable central motif and its four-frame breakthrough strip. Render at exact pixel sizes with transparent edges and nearest sampling.

Add a deterministic `art/lineage-v160` source and manifest. Provide separate Tiên/Ma assets for all 12 named NPC sprites and 192px avatars, six mount ride/wild sheets and 192px avatars, six weapon families in +0…+10 stages with 64px icons and 192px portraits, eleven region ground patterns and key terrain props. Keep identity, pose dimensions, foot anchors and collision footprints. New interactable art always has a matching avatar.

## World and origin

The new Tiên child begins in Thanh Khê. The new Ma child begins in a separate settlement map, Huyền U Khê, with the same safe collision layout and chapter-one objective IDs so the main quest remains reachable. The two settlements link to the shared forest and world through portals. Every map renderer selects the path's region texture and decoration set; existing save map IDs stay valid. NPC and mount art is selected by the active character's alignment without changing authoritative combat data.

The birth prologue appears once after creating a new character, including creation in another character slot. It uses two original painted scenes per alignment with camera movement, timed Vietnamese story captions and a distinct audio score. The character is the child of a Tiên Nhân or Ma Tôn, hidden in the mortal world after an ancient covenant breaks. Both children receive one heirloom clue and converge on the existing Thiên Khế main story. Start or allow audio after a user gesture; show a clear sound control and Skip button. Reduced motion holds still images while captions advance. Skipping and finishing both enter gameplay, clear the pending prologue, and never delete the character. Existing saves do not replay automatically.

## Titles

Provide six unlockable titles for each alignment. The server determines eligibility from alignment, level and realm, stores the equipped title in existing story flags and validates equip requests. Art includes a crest and a four-frame banner for every title. The character can browse and equip titles in a panel; the selected title animates above the character and appears in the profile. A player can remove a title. Empty or invalid flags resolve safely to no title. No Prisma schema change.

## Release

This is version 1.6.0 on `version-1`. Update art rules, manifest, release notes and package versions. Verify asset coverage, intro skip and audio states, title authorization, initial map, old save compatibility, map reachability, and builds. Leave `main` unchanged.
