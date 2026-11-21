"""Draw crisp realm sigils and extend hero clothing on the established 64px grid.

The original anatomy and portraits remain in art/vnext and art/future-library.
Only realm ornaments, costumes and four-frame effects are painted here.
"""
from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
ART = Path(__file__).resolve().parent
SHEETS = ART / 'sheets'
PREVIEWS = ART / 'previews'
SOURCE = ART / 'source'
GAME = ROOT / 'client' / 'public' / 'assets' / 'v150'
VNEXT = ROOT / 'client' / 'public' / 'assets' / 'vnext'
V120 = ROOT / 'client' / 'public' / 'assets' / 'v120'
sys.path.insert(0, str(ROOT / 'art' / 'vnext'))
from generate_v104_variants import BASES, POSES, recolor  # noqa: E402
from organic_crest import organic_crest  # noqa: E402

NAMES = {
    'immortal': ('Luyện Khí', 'Trúc Cơ', 'Kim Đan', 'Nguyên Anh', 'Hóa Thần', 'Luyện Hư',
                 'Hợp Thể', 'Đại Thừa', 'Độ Kiếp', 'Tán Tiên', 'Chân Tiên', 'Tiên Nhân'),
    'demonic': ('Luyện Ma', 'Tụ Ma', 'Ma Đan', 'Ma Anh', 'Hóa Ma', 'Phá Hư',
                'Ma Thể', 'Đại Ma', 'Ma Kiếp', 'Ma Quân', 'Thiên Ma', 'Ma Tôn'),
}
PALETTES = {
    'immortal': ('#b7c6b0', '#6dbaad', '#d8bd72', '#8bc6d8', '#d7a47e', '#a7a0cc',
                 '#74c4a8', '#d9ad72', '#86a9d5', '#c9d3ae', '#e1c381', '#f2d6a4'),
    'demonic': ('#ad655e', '#b57254', '#bf675d', '#aa76a0', '#d16f61', '#9071aa',
                '#6aa89d', '#c08b66', '#bb6f81', '#ad706a', '#ae82a8', '#cb8b67'),
}
COLS = {'idle': 2, 'walk': 4, 'slash': 3, 'cast': 3, 'dodge': 3, 'hurt': 2, 'death': 3, 'respawn': 3}


def rgb(hex_value: str) -> tuple[int, int, int, int]:
    return tuple(bytes.fromhex(hex_value.removeprefix('#'))) + (255,)


def lighter(color: tuple[int, int, int, int], amount: float) -> tuple[int, int, int, int]:
    return tuple(min(255, round(channel + (255 - channel) * amount)) for channel in color[:3]) + (255,)


def darker(color: tuple[int, int, int, int], amount: float) -> tuple[int, int, int, int]:
    return tuple(round(channel * (1 - amount)) for channel in color[:3]) + (255,)


def breakthrough_strip(rank: int, alignment: str, sigil: Image.Image) -> Image.Image:
    color = rgb(PALETTES[alignment][rank])
    bright = lighter(color, .45)
    strip = Image.new('RGBA', (384, 96))
    for frame in range(4):
        cell = Image.new('RGBA', (96, 96))
        draw = ImageDraw.Draw(cell)
        size = (31, 48, 62, 42)[frame]
        resized = sigil.resize((size, size), Image.Resampling.NEAREST)
        cell.alpha_composite(resized, (48-size//2, 46-size//2))
        # Ink scrolls and drifting petals give motion without a mechanical radial burst.
        for ribbon in range(2 + frame):
            side = -1 if ribbon % 2 else 1
            x = 48 + side * (24 + ribbon * 4)
            y = 28 + ribbon * 10 - frame * 2
            draw.arc((x-13, y-8, x+9, y+12), 15 if side > 0 else 165,
                     208 if side > 0 else 350, fill=bright if ribbon % 2 else color, width=2)
            draw.polygon(((x, y-4), (x+side*4, y), (x, y+3)), fill=bright)
        draw.arc((14, 65, 82, 84), 20+frame*12, 160+frame*12, fill=color, width=2)
        draw.arc((19, 68, 77, 81), 198-frame*10, 340-frame*10, fill=bright, width=2)
        if frame == 2:
            draw.line((18, 46, 25, 46), fill=bright, width=2)
            draw.line((71, 46, 78, 46), fill=bright, width=2)
        strip.alpha_composite(cell, (frame*96, 0))
    return strip


def hero_sheet(source: Image.Image, gender: str, alignment: str, rank: int) -> Image.Image:
    image = recolor(source, gender, alignment, 3)
    color = rgb(PALETTES[alignment][rank])
    bright = lighter(color, .45)
    shadow = darker(color, .45)
    draw = ImageDraw.Draw(image)
    columns = image.width // 64
    for row in range(4):
        for col in range(columns):
            ox, oy = col * 64, row * 64
            frame = image.crop((ox, oy, ox+64, oy+64))
            box = frame.getchannel('A').getbbox()
            if not box:
                continue
            # A real garment panel: recolor opaque robe pixels, leave exposed face and feet.
            for y in range(23, 45):
                for x in range(23, 42):
                    r, g, b, a = image.getpixel((ox+x, oy+y))
                    if a < 160 or max(r, g, b) > 190 or min(r, g, b) > 125:
                        continue
                    if (x + y + rank) % 4 == 0:
                        draw.point((ox+x, oy+y), fill=shadow)
            top = max(5, box[1]+2)
            draw.line((ox+28, oy+top, ox+36, oy+top), fill=shadow, width=2)
            draw.line((ox+30, oy+top-1, ox+34, oy+top-1), fill=bright)
            # Jewel and collar geometry vary with the realm, not only color.
            for side in (-1, 1):
                for step in range(2 + rank % 4):
                    x, y = 32 + side*(4+step), 27 + step*2
                    if image.getpixel((ox+x, oy+y))[3] > 90:
                        draw.point((ox+x, oy+y), fill=color)
                if rank >= 8:
                    for step in range(3):
                        x, y = 32 + side*(7+step), 24+step
                        if image.getpixel((ox+x, oy+y))[3] > 90:
                            draw.point((ox+x, oy+y), fill=bright)
            for dy in range(2 + rank % 5):
                x, y = 32 + (dy % 2), 32 + dy*2
                if image.getpixel((ox+x, oy+y))[3] > 90:
                    draw.point((ox+x, oy+y), fill=bright)
    return image


def avatar(source: Image.Image, sigil: Image.Image, rank: int, alignment: str) -> Image.Image:
    portrait = source.convert('RGBA').copy()
    color = rgb(PALETTES[alignment][rank])
    bright = lighter(color, .38)
    draw = ImageDraw.Draw(portrait)
    # Dye the lower robe while keeping its painted folds, face and weapon intact.
    for y in range(113, 192):
        for x in range(12, 151):
            old = portrait.getpixel((x, y))
            if old[3] < 96 or (x > 129 and y < 151):
                continue
            weight = .24 if rank < 4 else .34 if rank < 8 else .42
            portrait.putpixel((x, y), tuple(round(old[i] * (1-weight) + color[i] * weight)
                                               for i in range(3)) + (old[3],))
    draw = ImageDraw.Draw(portrait)
    # Broad asymmetric mantle seam, shoulder pins and crown marks are legible at UI size.
    draw.line((21, 134, 48, 116, 71, 121, 83, 139), fill=darker(color, .45), width=6)
    draw.line((21, 132, 47, 113, 70, 118, 82, 136), fill=bright, width=3)
    draw.line((83, 132, 105, 145, 115, 176), fill=color, width=4)
    draw.line((86, 136, 104, 149, 113, 176), fill=bright, width=2)
    for offset in range(2 + rank // 3):
        x = 18 + offset * 12
        draw.polygon(((x, 159), (x+4, 153), (x+8, 159), (x+4, 165)), fill=color)
        draw.line((x+4, 154, x+4, 161), fill=bright, width=2)
    crown_width = 9 + rank // 2
    crown_y = 14 if alignment == 'immortal' else 11
    draw.line((92-crown_width, crown_y+5, 93, crown_y, 92+crown_width, crown_y+5),
              fill=darker(color, .4), width=5)
    draw.line((92-crown_width, crown_y+3, 93, crown_y-2, 92+crown_width, crown_y+3),
              fill=bright, width=2)
    if rank >= 8:
        for side in (-1, 1):
            draw.polygon(((93+side*11, crown_y+2), (93+side*(14+rank), crown_y-9),
                          (93+side*16, crown_y+8)), fill=color)
    badge = sigil.resize((40, 40), Image.Resampling.NEAREST)
    portrait.alpha_composite(badge, (146, 11))
    return portrait


def save_art(image: Image.Image, filename: str) -> str:
    source = SHEETS / filename
    image.save(source, optimize=True)
    shutil.copy2(source, GAME / filename)
    return source.relative_to(ROOT).as_posix()


def gallery(realms: list[dict], avatars: list[dict]) -> None:
    board = Image.new('RGBA', (12*76, 2*104), (17, 22, 28, 255))
    draw = ImageDraw.Draw(board)
    for entry in realms:
        x, y = entry['realmIndex']*76, (0 if entry['alignment'] == 'immortal' else 1)*104
        icon = Image.open(ROOT / entry['crest']).convert('RGBA')
        board.alpha_composite(icon, (x+6, y+5))
        draw.text((x+7, y+72), f"{entry['realmIndex']:02} {entry['alignment'][0].upper()}", fill=(225, 217, 191))
    board.save(PREVIEWS / 'all-realms.png')
    sample = Image.new('RGBA', (12*128, 2*128), (17, 22, 28, 255))
    for entry in avatars:
        if entry['identity'] != f"sword_male_{entry['alignment']}":
            continue
        x = entry['realmIndex']*128
        y = (0 if entry['alignment'] == 'immortal' else 1)*128
        picture = Image.open(ROOT / entry['file']).convert('RGBA').resize((128, 128), Image.Resampling.NEAREST)
        sample.alpha_composite(picture, (x, y))
    sample.save(PREVIEWS / 'hero-avatars.png')


def main() -> None:
    for folder in (SHEETS, PREVIEWS, SOURCE, GAME):
        folder.mkdir(parents=True, exist_ok=True)
    (SOURCE / 'palettes-and-motifs.json').write_text(json.dumps({
        'names': NAMES, 'palettes': PALETTES,
        'sourceHero': 'client/public/assets/vnext',
        'sourcePortraits': 'client/public/assets/v120/avatar_hero_*.png',
        'artDirection': 'ART_DIRECTION.md',
    }, ensure_ascii=False, indent=2), encoding='utf-8')
    realms, avatars, sheets = [], [], []
    crests = {}
    for alignment in NAMES:
        for rank, name in enumerate(NAMES[alignment]):
            stem = f'realm_{alignment}_{rank:02}'
            sigil = organic_crest(rank, alignment, PALETTES[alignment][rank])
            crests[(alignment, rank)] = sigil
            crest_path = save_art(sigil, f'{stem}_crest.png')
            fx_path = save_art(breakthrough_strip(rank, alignment, sigil), f'{stem}_breakthrough.png')
            realms.append({'alignment': alignment, 'realmIndex': rank, 'name': name,
                           'crest': crest_path, 'breakthrough': fx_path, 'frames': 4,
                           'source': 'art/realm-v150/export.py'})
    for path, prefix in BASES.items():
        for gender in ('male', 'female'):
            for alignment in NAMES:
                identity = f'{path}_{gender}_{alignment}'
                base_avatar = V120 / f'avatar_hero_{identity}.png'
                source_portrait = Image.open(base_avatar).convert('RGBA')
                for rank in range(12):
                    file = save_art(avatar(source_portrait, crests[(alignment, rank)], rank, alignment),
                                    f'avatar_hero_{identity}_{rank:02}.png')
                    avatars.append({'identity': identity, 'alignment': alignment, 'realmIndex': rank,
                                    'file': file, 'source': base_avatar.relative_to(ROOT).as_posix()})
                for rank in range(4, 12):
                    for pose in POSES:
                        source = VNEXT / f'{prefix}_{pose}.png'
                        image = hero_sheet(Image.open(source), gender, alignment, rank)
                        filename = f'hero_{identity}_{rank}_{pose}.png'
                        dest = GAME / filename
                        image.save(dest, optimize=True)
                        sheets.append({'identity': identity, 'alignment': alignment, 'realmIndex': rank,
                                       'pose': pose, 'file': dest.relative_to(ROOT).as_posix(),
                                       'source': source.relative_to(ROOT).as_posix(),
                                       'frameSize': [64, 64], 'footAnchor': [32, 56], 'directions': 4})
    manifest = {'version': '1.5.0', 'realms': realms, 'avatars': avatars, 'heroSheets': sheets}
    (ART / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
    gallery(realms, avatars)
    print(f'Exported {len(realms)} realm sets, {len(avatars)} avatars and {len(sheets)} hero sheets')


if __name__ == '__main__':
    main()
