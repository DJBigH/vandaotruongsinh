"""Check that every named 1.1.0 character and technique has its own game image."""
from pathlib import Path
import hashlib
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / 'client' / 'public' / 'assets' / 'v110'
NPCS = ('sect_master', 'sword_spirit', 'rebel_cultivator', 'mountain_god',
        'dan_ton', 'inner_voice', 'covenant_arbiter', 'tower_keeper')
PROPS = ('bamboo', 'pavilion', 'bridge', 'ghost_tree', 'spirit_lantern', 'jade_crystal')
WEAPONS = ('sword', 'staff', 'fists', 'spear', 'bow', 'axe')
coverage = []

def check(name: str, size: tuple[int, int]):
    art = Image.open(ASSETS / name).convert('RGBA')
    assert art.size == size, (name, art.size)
    alpha = art.getchannel('A')
    assert alpha.getbbox() and alpha.getextrema() == (0, 255), name
    pixels = art.tobytes()
    coverage.append({'file': name, 'width': size[0], 'height': size[1],
                     'sha256': hashlib.sha256(pixels).hexdigest()})
    return pixels

for index in range(1, 21):
    check(f'boss_{index:03}.png', (128, 128))
for npc in NPCS:
    check(f'npc_{npc}.png', (64, 64))
for prop in PROPS:
    check(f'prop_{prop}.png', (128, 128))
for path in ('sword', 'spell', 'body'):
    for index in range(1, 13):
        check(f'vfx_skill_{path}_{index:02}.png', (96, 96))
for weapon in WEAPONS:
    stages = [check(f'weapon_{weapon}_{level}.png', (64, 64)) for level in range(6)]
    assert len(set(stages)) == 6, (weapon, 'identical enhancement stages')

report = {'version': '1.1.0', 'counts': {'bosses': 20, 'npcs': 8, 'props': 6,
          'skillVfx': 36, 'weaponStages': 36}, 'assets': coverage}
(ROOT / 'art' / 'v110' / 'asset-coverage.json').write_text(
    json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print('PASS: 20 bosses, 8 NPCs, 6 props, 36 skill VFX and 36 weapon stages')
