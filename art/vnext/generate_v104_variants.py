"""Deterministic pixel-preserving variants of the original four-direction hero sheets.

The source sheets remain unchanged. All paint operations happen on the 64-pixel
grid so animation frame count and the foot anchor remain identical.
"""

from __future__ import annotations

import colorsys
import json
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'client' / 'public' / 'assets' / 'vnext'
OUTPUT = ROOT / 'client' / 'public' / 'assets' / 'v104'
POSES = ('idle', 'walk', 'slash', 'cast', 'dodge', 'hurt', 'death', 'respawn')
BASES = {'sword': 'player', 'spell': 'player_magic', 'body': 'player_body'}


def recolor(image: Image.Image, gender: str, alignment: str, rank: int) -> Image.Image:
    image = image.convert('RGBA')
    pixels = image.load()
    for y in range(image.height):
        local_y = y % 64
        for x in range(image.width):
            r, g, b, a = pixels[x, y]
            if a < 24:
                continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if alignment == 'demonic':
                # Dark iron robe and oxblood trim; keep readable skin highlights.
                if local_y > 16 and s > 0.16:
                    h = 0.965 if h > 0.48 else 0.018
                    s = min(0.64, s * 0.9 + 0.16)
                    v *= 0.78
                else:
                    v *= 0.89
            elif gender == 'female' and local_y > 15:
                h = (h * 0.73 + 0.47 * 0.27) % 1
                s *= 0.82
                v = min(1, v * 1.09)
            if rank and 18 <= local_y <= 44 and s > 0.12:
                h = (h * (1 - rank * 0.08) + (0.12 if alignment == 'immortal' else 0.97) * rank * 0.08) % 1
                v = min(1, v * (1 + rank * 0.035))
            nr, ng, nb = colorsys.hsv_to_rgb(h, s, v)
            pixels[x, y] = (round(nr * 255), round(ng * 255), round(nb * 255), a)

    if gender == 'female':
        draw = ImageDraw.Draw(image)
        columns = image.width // 64
        for row in range(4):
            for column in range(columns):
                frame = image.crop((column * 64, row * 64, (column + 1) * 64, (row + 1) * 64))
                box = frame.getbbox()
                if not box:
                    continue
                top = max(3, box[1])
                # Keep locks behind the shoulders and well above the foot anchor.
                cx = 32 + column * 64
                fy = row * 64
                shade = (27, 24, 30, 255) if alignment == 'demonic' else (46, 34, 30, 255)
                trim = (117, 63, 56, 255) if alignment == 'demonic' else (155, 127, 71, 255)
                draw.line((cx - 7, fy + top + 7, cx - 8, fy + min(top + 20, 42)), fill=shade, width=2)
                draw.line((cx + 7, fy + top + 7, cx + 8, fy + min(top + 20, 42)), fill=shade, width=2)
                draw.point((cx - 8, fy + min(top + 20, 42)), fill=trim)
                draw.point((cx + 8, fy + min(top + 20, 42)), fill=trim)
    if rank:
        draw = ImageDraw.Draw(image)
        columns = image.width // 64
        accent = [(184, 156, 91, 255), (204, 189, 139, 255), (232, 213, 150, 255)][rank - 1]
        if alignment == 'demonic':
            accent = [(140, 67, 54, 255), (178, 80, 62, 255), (215, 109, 78, 255)][rank - 1]
        for row in range(4):
            for column in range(columns):
                x = column * 64 + 32
                y = row * 64 + 26
                for dx, dy in ((-4, 0), (4, 0), (0, 10), (-5, 11), (5, 11))[:rank + 2]:
                    px, py = x + dx, y + dy
                    if image.getpixel((px, py))[3] > 100:
                        draw.point((px, py), fill=accent)
    return image


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    records = []
    for path, prefix in BASES.items():
        for gender in ('male', 'female'):
            for alignment in ('immortal', 'demonic'):
                for rank in range(4):
                    key = f'hero_{path}_{gender}_{alignment}_{rank}'
                    for pose in POSES:
                        source = SOURCE / f'{prefix}_{pose}.png'
                        out = OUTPUT / f'{key}_{pose}.png'
                        image = recolor(Image.open(source), gender, alignment, rank)
                        image.save(out, optimize=True)
                        if rank == 0 and pose == 'idle':
                            image.crop((0, 128, 64, 192)).save(OUTPUT / f'{key}_preview.png', optimize=True)
                        records.append({'file': str(out.relative_to(ROOT)).replace('\\', '/'),
                                        'source': str(source.relative_to(ROOT)).replace('\\', '/'),
                                        'frameSize': [64, 64], 'directionCount': 4,
                                        'columns': image.width // 64, 'footAnchor': [32, 56]})
    (ROOT / 'art' / 'vnext' / 'v104-variant-manifest.json').write_text(
        json.dumps(records, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'Generated {len(records)} exact-grid hero sheets in {OUTPUT}')


if __name__ == '__main__':
    main()
