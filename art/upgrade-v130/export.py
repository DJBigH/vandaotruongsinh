"""Cut reviewed source atlases into crisp game art; preserve the original PNGs."""
import json
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / 'source'
SHEETS = ROOT / 'sheets'
PREVIEWS = ROOT / 'previews'
for folder in (SHEETS, PREVIEWS):
    folder.mkdir(exist_ok=True)

EQUIPMENT = ('armor', 'robe', 'boots', 'ring')
WEAPONS = ('sword', 'staff', 'fists', 'spear', 'bow', 'axe')
VFX = ('equipment', 'mount', 'realm')


def remove_specks(alpha: Image.Image) -> Image.Image:
    """Drop isolated generation noise while retaining all major item components."""
    pixels = alpha.load()
    width, height = alpha.size
    visited = set()
    components = []
    for y in range(height):
        for x in range(width):
            if not pixels[x, y] or (x, y) in visited:
                continue
            pending = [(x, y)]
            visited.add((x, y))
            component = []
            while pending:
                px, py = pending.pop()
                component.append((px, py))
                for ny in range(max(0, py - 1), min(height, py + 2)):
                    for nx in range(max(0, px - 1), min(width, px + 2)):
                        if pixels[nx, ny] and (nx, ny) not in visited:
                            visited.add((nx, ny))
                            pending.append((nx, ny))
            components.append(component)
    if not components:
        return alpha
    minimum = max(12, round(max(map(len, components)) * .06))
    for component in components:
        if len(component) < minimum:
            for point in component:
                pixels[point] = 0
    return alpha


def cells(filename: str, columns: int, rows: int, trim_bottom_row: int | None = None,
          clean_specks: bool = False) -> list[list[Image.Image]]:
    image = Image.open(SOURCE / filename).convert('RGBA')
    assert image.getpixel((0, 0))[3] == 0, filename
    result: list[list[Image.Image]] = []
    for row in range(rows):
        group = []
        for column in range(columns):
            box = (round(column * image.width / columns), round(row * image.height / rows),
                   round((column + 1) * image.width / columns), round((row + 1) * image.height / rows))
            part = image.crop(box)
            if row == trim_bottom_row:
                # The source bow row has a few detached generation specks below the bow tips.
                part = part.crop((0, 0, part.width, part.height - 25))
            alpha = part.getchannel('A').point(lambda value: value if value > 64 else 0)
            if clean_specks:
                alpha = remove_specks(alpha)
            part.putalpha(alpha)
            bounds = alpha.getbbox()
            assert bounds, (filename, row, column)
            group.append(part.crop(bounds))
        result.append(group)
    return result


def fit(source: Image.Image, size: int, scale: float) -> Image.Image:
    width = max(1, round(source.width * scale))
    height = max(1, round(source.height * scale))
    assert width <= size - 6 and height <= size - 6, (source.size, size, scale)
    result = Image.new('RGBA', (size, size))
    result.alpha_composite(source.resize((width, height), Image.Resampling.NEAREST),
                           ((size - width) // 2, size - 3 - height))
    return result


def row_scale(parts: list[Image.Image], size: int) -> float:
    return min((size - 8) / max(part.width for part in parts),
               (size - 8) / max(part.height for part in parts))


def main() -> None:
    records = []
    equipment = cells('equipment-tiers-6-10.png', 5, 4)
    weapon_a = cells('weapon-sword-staff-fists-6-10.png', 5, 3)
    weapon_b = cells('weapon-spear-bow-axe-6-10-v2.png', 5, 3, trim_bottom_row=1,
                     clean_specks=True)
    for families, rows, source in ((EQUIPMENT, equipment, 'equipment-tiers-6-10.png'),
                                   (WEAPONS[:3], weapon_a, 'weapon-sword-staff-fists-6-10.png'),
                                   (WEAPONS[3:], weapon_b, 'weapon-spear-bow-axe-6-10-v2.png')):
        for family, parts in zip(families, rows, strict=True):
            for index, part in enumerate(parts):
                tier = index + 6
                stem = f'equipment_{family}_{tier}' if families is EQUIPMENT else f'weapon_{family}_{tier}'
                for kind, size in (('avatar', 192), ('icon', 64)):
                    filename = f'{kind}_{stem}.png' if families is EQUIPMENT or kind == 'avatar' else f'{stem}.png'
                    fit(part, size, row_scale(parts, size)).save(SHEETS / filename)
                    records.append({'key': stem, 'file': filename, 'kind': kind, 'source': source,
                                    'size': [size, size], 'tier': tier})

    for subject in VFX:
        rows = cells(f'vfx-{subject}-outcomes.png', 4, 2)
        all_parts = rows[0] + rows[1]
        scale = row_scale(all_parts, 96)
        for outcome, parts in zip(('success', 'failure'), rows, strict=True):
            frames = [fit(part, 96, scale) for part in parts]
            assert len({frame.tobytes() for frame in frames}) == 4, (subject, outcome)
            strip = Image.new('RGBA', (384, 96))
            for index, frame in enumerate(frames):
                strip.alpha_composite(frame, (index * 96, 0))
            filename = f'vfx_upgrade_{subject}_{outcome}.png'
            strip.save(SHEETS / filename)
            records.append({'key': f'upgrade_{subject}_{outcome}', 'file': filename,
                            'kind': 'strip', 'source': f'vfx-{subject}-outcomes.png',
                            'size': [384, 96], 'frames': 4, 'frame_size': [96, 96]})

    (ROOT / 'manifest.json').write_text(json.dumps(records, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    for category, names in (('equipment', [f'icon_equipment_{family}_{tier}.png' for family in EQUIPMENT for tier in range(6, 11)]),
                            ('weapons', [f'weapon_{family}_{tier}.png' for family in WEAPONS for tier in range(6, 11)])):
        rows = 4 if category == 'equipment' else 6
        gallery = Image.new('RGB', (5 * 104, rows * 120), '#1b2925')
        draw = ImageDraw.Draw(gallery)
        for index, name in enumerate(names):
            x, y = (index % 5) * 104, (index // 5) * 120
            icon = Image.open(SHEETS / name).convert('RGBA').resize((88, 88), Image.Resampling.NEAREST)
            gallery.paste(icon, (x + 8, y + 5), icon)
            draw.text((x + 8, y + 96), name.replace('.png', '').replace('icon_', ''), fill='#e8d69f')
        gallery.save(PREVIEWS / f'gallery-{category}.png')
    effects = Image.new('RGB', (384, 6 * 112), '#1b2925')
    draw = ImageDraw.Draw(effects)
    for row, subject in enumerate(VFX):
        for offset, outcome in enumerate(('success', 'failure')):
            index = row * 2 + offset
            strip = Image.open(SHEETS / f'vfx_upgrade_{subject}_{outcome}.png').convert('RGBA')
            effects.paste(strip, (0, index * 112), strip)
            draw.text((6, index * 112 + 97), f'{subject} {outcome}', fill='#e8d69f')
    effects.save(PREVIEWS / 'gallery-outcomes.png')
    print(f'Exported {len(records)} assets from six source atlases')


if __name__ == '__main__':
    main()
