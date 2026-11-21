"""Pack the approved transparent contact sheets into fixed-size game images.

This converts layout, resolution and alpha for Phaser; the generated artwork
itself remains available without alteration in source/.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent
OUT = ROOT.parents[1] / 'client' / 'public' / 'assets' / 'v110'
OUT.mkdir(parents=True, exist_ok=True)

def cell(sheet: Image.Image, columns: int, rows: int, index: int) -> Image.Image:
    col, row = index % columns, index // columns
    width, height = sheet.width / columns, sheet.height / rows
    return sheet.crop((round(col * width), round(row * height),
                       round((col + 1) * width), round((row + 1) * height)))

def pack(source: Image.Image, file: str, canvas: tuple[int, int],
         content: tuple[int, int], foot: int | None = None, colors: int = 80):
    art = source.convert('RGBA')
    alpha = art.getchannel('A')
    bounds = alpha.point(lambda value: 255 if value >= 105 else 0).getbbox()
    if not bounds:
        raise ValueError(f'No visible image for {file}')
    art = art.crop(bounds)
    ratio = min(content[0] / art.width, content[1] / art.height)
    width, height = max(1, round(art.width * ratio)), max(1, round(art.height * ratio))
    art = art.resize((width, height), Image.Resampling.BOX)
    mask = art.getchannel('A').point(lambda value: 255 if value >= 112 else 0)
    indexed = art.convert('RGB').quantize(colors=colors, method=Image.Quantize.MEDIANCUT).convert('RGBA')
    indexed.putalpha(mask)
    result = Image.new('RGBA', canvas, (0, 0, 0, 0))
    x = (canvas[0] - width) // 2
    y = (canvas[1] - height) // 2 if foot is None else foot - height
    result.alpha_composite(indexed, (x, max(0, y)))
    result.save(OUT / file, optimize=True)

boss_sheets = [
    ('bosses_01.png', [f'boss_{i:03}' for i in range(1, 7)]),
    ('bosses_02.png', [f'boss_{i:03}' for i in range(7, 13)]),
    ('bosses_03.png', [f'boss_{i:03}' for i in range(13, 19)]),
    ('bosses_04_and_npcs.png', ['boss_019', 'boss_020', 'npc_sect_master',
                                'npc_sword_spirit', 'npc_rebel_cultivator', 'npc_mountain_god']),
]
for filename, names in boss_sheets:
    sheet = Image.open(ROOT / 'source' / filename)
    for index, name in enumerate(names):
        npc = name.startswith('npc_')
        pack(cell(sheet, 3, 2, index), f'{name}.png', (64, 64) if npc else (128, 128),
             (56, 55) if npc else (120, 108), foot=57 if npc else 112,
             colors=48 if npc else 96)

npc_sheet = Image.open(ROOT / 'source' / 'npcs_02.png')
for index, name in enumerate(('dan_ton', 'inner_voice', 'covenant_arbiter', 'tower_keeper')):
    pack(cell(npc_sheet, 2, 2, index), f'npc_{name}.png', (64, 64), (56, 55), foot=57, colors=48)

prop_sheet = Image.open(ROOT / 'source' / 'environment.png')
for index, name in enumerate(('bamboo', 'pavilion', 'bridge', 'ghost_tree', 'spirit_lantern', 'jade_crystal')):
    pack(cell(prop_sheet, 3, 2, index), f'prop_{name}.png', (128, 128), (122, 118), foot=120)

for path in ('sword', 'spell', 'body'):
    sheet = Image.open(ROOT / 'source' / f'vfx_{path}.png')
    for index in range(12):
        pack(cell(sheet, 3, 4, index), f'vfx_skill_{path}_{index + 1:02}.png',
             (96, 96), (90, 90), colors=72)

for filename, kinds in (
    ('weapon_tiers_a.png', ('sword', 'staff', 'fists')),
    ('weapon_tiers_b.png', ('spear', 'bow', 'axe')),
):
    sheet = Image.open(ROOT / 'source' / filename)
    for level in range(6):
        for column, kind in enumerate(kinds):
            pack(cell(sheet, 3, 6, level * 3 + column), f'weapon_{kind}_{level}.png',
                 (64, 64), (60, 60), colors=56)

print(f'Packed {len(list(OUT.glob("*.png")))} images into {OUT}')
