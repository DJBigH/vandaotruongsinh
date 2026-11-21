# Dual World and Portal Design (1.7.0)

## Goal

Make the Tiên and Ma journeys visibly and structurally separate. A Ma character should travel through Ma-named regions with their own scene dress, NPC portraits/sprites, normal and elite enemies, and ritual gates. Keep quest target IDs, combat rules, and old saves playable.

## World

Keep the ten existing Tiên map IDs and the Ma starting village `map_huyen_u_khe`. Add Ma counterparts for the forest, sect, valley, sword ruins, underworld, mirror, mountain, covenant altar, and tower. Every portal on a Ma map targets another Ma map; the Tiên graph stays Tiên. New Ma maps have unique names, palettes, ground paintings, decorative landmarks and NPC names. They may retain safe collision footprints and objective IDs so all existing routes, boss fights and quests remain reachable. New Ma saves start in Huyền U Khê. Existing Ma saves on old map IDs continue to load and move into the Ma graph at the next portal.

## Characters and enemies

Rework all twelve Ma NPC sprites and native 192px portraits with new costumes, face/hair adornments and branch marks rather than a thin tint. Keep 64px frame size and the existing animation grid. Produce separate Tiên/Ma sprite sheets and native 192px avatars for all forty `mon_001`–`mon_040` enemies. Elite IDs receive additional armor/crown/crest details and a readable in-game marker. Preserve template IDs, stats and kill objectives.

## Gates and teleport

Replace the current angular arch with Tiên jade talisman stones and Ma black-stone blood seals. The gate must remain a clear interactable landmark, with an avatar and four-frame ritual effect. At realms below Nguyên Anh/Ma Anh (realm index 3), entering a gate requires a 2.5-second chant. The client shows a cast bar and ritual animation; movement or map changes cancel it. The server records preparation and rejects premature commits. From realm index 3, portal travel is immediate, but still plays a brief arrival effect. Reduced-motion settings show a static readable state.

## Titles and release

Scale overhead title banners down to avoid covering the player, monsters or map labels; keep the title legible and allow animations to be paused through reduced effects. Publish as compatible minor version 1.7.0 on `version-1`; keep `main` unchanged.
