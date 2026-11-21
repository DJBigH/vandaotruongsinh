"""Export review-ready avatars and wild/taming motion without changing game assets."""
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / 'source'
SHEETS = ROOT / 'sheets'
PREVIEWS = ROOT / 'previews'
for directory in (SHEETS, PREVIEWS):
    directory.mkdir(exist_ok=True)

NPC_ATLASES = {
    'npc-portraits-a.png': ['npc_sect_master', 'npc_sword_spirit',
                            'npc_rebel_cultivator', 'npc_mountain_god'],
    'npc-portraits-b.png': ['npc_dan_ton', 'npc_inner_voice',
                            'npc_covenant_arbiter', 'npc_tower_keeper'],
    'npc-portraits-c.png': ['npc_elder', 'npc_healer',
                            'npc_guard', 'disciple_lieu_muoi'],
}
HERO_ATLASES = {
    f'hero-portraits-{school}.png': [
        f'hero_{school}_{gender}_{path}'
        for gender, path in [('male', 'immortal'), ('female', 'immortal'),
                             ('male', 'demonic'), ('female', 'demonic')]
    ]
    for school in ('sword', 'spell', 'body')
}
BOSS_ATLASES = {
    f'boss-portraits-{group:02d}.png': [f'boss_{number:03d}' for number in range(group * 4 - 3, group * 4 + 1)]
    for group in range(1, 6)
}
BOSS_PHASE_ATLASES = {
    f'boss-phase-portraits-{group:02d}.png': [
        f'boss_{number:03d}_phase' for number in range(group * 4 - 3, group * 4 + 1)
    ]
    for group in range(1, 6)
}
LEGACY_ATLASES = {
    'legacy-portraits-a.png': ['npc_mentor', 'boss_lang_vuong', 'boss_turtle', 'monster_puppet'],
    'legacy-portraits-b.png': ['monster_wolf', 'monster_snake', 'monster_fox', 'monster_treant'],
}
MOUNTS = ('crane', 'fox', 'shadow_wolf', 'stag', 'turtle', 'underworld_horse')
NPC_WALKS = {
    'npc-walk-01.png': ('npc_sect_master', 'npc_sword_spirit'),
    'npc-walk-02.png': ('npc_rebel_cultivator', 'npc_mountain_god'),
    'npc-walk-03.png': ('npc_dan_ton', 'npc_inner_voice'),
    'npc-walk-04.png': ('npc_covenant_arbiter', 'npc_tower_keeper'),
}
LANDMARKS = {
    'landmarks-01-v2.png': ('landmark_realm_gate', 'landmark_spirit_spring'),
    'landmarks-02.png': ('landmark_forge', 'landmark_cave_entrance'),
}
ICON_ATLASES = {
    'menu-icons-a.png': ('quest', 'map', 'story', 'events', 'tower', 'character',
                         'skills', 'crafting', 'offline'),
    'menu-icons-b.png': ('disciple', 'pets', 'mount', 'sect', 'cave', 'inventory',
                         'settings', 'guide', 'admin'),
}


def atlas_cells(path: Path, columns: int, rows: int) -> list[Image.Image]:
    image = Image.open(path).convert('RGBA')
    assert image.width > columns * 100 and image.height > rows * 100, (path, image.size)
    cells = []
    for row in range(rows):
        for column in range(columns):
            left = round(column * image.width / columns)
            upper = round(row * image.height / rows)
            right = round((column + 1) * image.width / columns)
            lower = round((row + 1) * image.height / rows)
            cell = image.crop((left, upper, right, lower))
            alpha = cell.getchannel('A').point(lambda value: value if value > 64 else 0)
            bounds = alpha.getbbox()
            assert bounds, (path, row, column, 'empty cell')
            cell.putalpha(alpha)
            cells.append(cell.crop(bounds))
    return cells


def fit(source: Image.Image, size: tuple[int, int], inset: int, baseline: int,
        scale: float | None = None) -> Image.Image:
    width, height = size
    if scale is None:
        scale = min((width - inset * 2) / source.width,
                    (baseline - inset) / source.height)
    target_width = max(1, round(source.width * scale))
    target_height = max(1, round(source.height * scale))
    assert target_width <= width - inset * 2 and target_height <= baseline - inset, (source.size, size)
    output = Image.new('RGBA', size)
    output.alpha_composite(source.resize((target_width, target_height), Image.Resampling.NEAREST),
                           ((width - target_width) // 2, baseline - target_height))
    return output


def save_avatar(source: Image.Image, key: str, source_name: str, records: list[dict]) -> None:
    filename = f'avatar_{key}.png'
    avatar = fit(source, (192, 192), 8, 184)
    avatar.save(SHEETS / filename)
    records.append({'key': key, 'file': filename, 'source': source_name,
                    'size': [192, 192], 'kind': 'avatar'})


def save_strip(frames: list[Image.Image], key: str, kind: str, source_name: str,
               records: list[dict]) -> None:
    max_width = max(frame.width for frame in frames)
    max_height = max(frame.height for frame in frames)
    scale = min(112 / max_width, 82 / max_height)
    strip = Image.new('RGBA', (512, 96))
    fitted = [fit(frame, (128, 96), 8, 90, scale) for frame in frames]
    assert len({frame.tobytes() for frame in fitted}) == 4, (key, kind, 'duplicate frames')
    for index, frame in enumerate(fitted):
        strip.alpha_composite(frame, (index * 128, 0))
    filename = f'{key}_{kind}.png'
    strip.save(SHEETS / filename)
    records.append({'key': key, 'file': filename, 'source': source_name,
                    'size': [512, 96], 'frames': 4, 'frame_size': [128, 96], 'kind': kind})
    preview_frames = [frame.resize((512, 384), Image.Resampling.NEAREST) for frame in fitted]
    preview_frames[0].save(PREVIEWS / f'{key}_{kind}.gif', save_all=True,
                           append_images=preview_frames[1:], duration=[170, 170, 170, 420],
                           loop=0, disposal=2)


def save_scene_strip(frames: list[Image.Image], key: str, kind: str, source_name: str,
                     frame_size: int, inset: int, baseline: int, records: list[dict]) -> None:
    max_width = max(frame.width for frame in frames)
    max_height = max(frame.height for frame in frames)
    scale = min((frame_size - inset * 2) / max_width,
                (baseline - inset) / max_height)
    fitted = [fit(frame, (frame_size, frame_size), inset, baseline, scale) for frame in frames]
    assert len({frame.tobytes() for frame in fitted}) == 4, (key, kind, 'duplicate frames')
    filename = f'{key}_{kind}.png'
    strip = Image.new('RGBA', (frame_size * 4, frame_size))
    for index, frame in enumerate(fitted):
        strip.alpha_composite(frame, (index * frame_size, 0))
    strip.save(SHEETS / filename)
    records.append({'key': key, 'file': filename, 'source': source_name,
                    'size': list(strip.size), 'frames': 4,
                    'frame_size': [frame_size, frame_size], 'kind': kind})
    preview_frames = [frame.resize((384, 384), Image.Resampling.NEAREST) for frame in fitted]
    preview_frames[0].save(PREVIEWS / f'{key}_{kind}.gif', save_all=True,
                           append_images=preview_frames[1:], duration=[220, 220, 220, 460],
                           loop=0, disposal=2)


def gallery(name: str, keys: list[str], cell_size: tuple[int, int], columns: int) -> None:
    tile_width, tile_height = cell_size
    rows = (len(keys) + columns - 1) // columns
    output = Image.new('RGB', (columns * (tile_width + 18), rows * (tile_height + 32)), '#1c2b23')
    draw = ImageDraw.Draw(output)
    font = ImageFont.load_default()
    for index, key in enumerate(keys):
        x = (index % columns) * (tile_width + 18) + 9
        y = (index // columns) * (tile_height + 32) + 19
        source = Image.open(SHEETS / key).convert('RGBA')
        if source.size == (512, 96) or source.width == source.height * 4:
            frame_width = source.width // 4
            first = source.crop((0, 0, frame_width, source.height))
            third = source.crop((2 * frame_width, 0, 3 * frame_width, source.height))
            tile = Image.new('RGBA', (2 * frame_width, source.height))
            tile.alpha_composite(first)
            tile.alpha_composite(third, (frame_width, 0))
        else:
            tile = source.resize((tile_width, tile_height), Image.Resampling.NEAREST)
        output.paste(tile, (x, y), tile)
        label = key.removeprefix('avatar_').removeprefix('icon_menu_').replace('.png', '')
        draw.text((x, y - 14), label, fill='#e9d3a1', font=font)
    output.save(PREVIEWS / f'gallery-{name}.png')


def export() -> None:
    records: list[dict] = []
    categories = (('npc', NPC_ATLASES), ('hero', HERO_ATLASES),
                  ('boss', BOSS_ATLASES), ('boss-phase', BOSS_PHASE_ATLASES),
                  ('legacy', LEGACY_ATLASES))
    for _, atlases in categories:
        for filename, keys in atlases.items():
            for key, source in zip(keys, atlas_cells(SOURCE / filename, 2, 2), strict=True):
                save_avatar(source, key, filename, records)

    for mount in MOUNTS:
        filename = f'mount-{mount}-wild-tame-avatar'
        if mount == 'underworld_horse':
            filename += '-v2'
        filename += '.png'
        cells = atlas_cells(SOURCE / filename, 4, 3)
        save_strip(cells[0:4], f'mount_{mount}', 'wild', filename, records)
        save_strip(cells[4:8], f'mount_{mount}', 'tame', filename, records)
        save_avatar(cells[8], f'mount_{mount}_wild', filename, records)
        save_avatar(cells[11], f'mount_{mount}_bonded', filename, records)

    for filename, keys in NPC_WALKS.items():
        cells = atlas_cells(SOURCE / filename, 4, 2)
        for row, key in enumerate(keys):
            row_cells = cells[row * 4:(row + 1) * 4]
            row_source = filename
            if key == 'npc_sword_spirit':
                row_source = 'npc-sword-spirit-walk-v2.png'
                row_cells = atlas_cells(SOURCE / row_source, 4, 1)
            save_scene_strip(row_cells, key, 'walk', row_source, 64, 4, 56, records)

    for filename, keys in LANDMARKS.items():
        cells = atlas_cells(SOURCE / filename, 4, 2)
        for row, key in enumerate(keys):
            row_cells = cells[row * 4:(row + 1) * 4]
            save_scene_strip(row_cells, key, 'ambient', filename, 192, 8, 184, records)
            save_avatar(row_cells[0], key, filename, records)

    for filename, keys in ICON_ATLASES.items():
        for key, source in zip(keys, atlas_cells(SOURCE / filename, 3, 3), strict=True):
            output_name = f'icon_menu_{key}.png'
            fit(source, (64, 64), 4, 60).save(SHEETS / output_name)
            records.append({'key': f'menu_{key}', 'file': output_name, 'source': filename,
                            'size': [64, 64], 'kind': 'icon'})

    (ROOT / 'manifest.json').write_text(json.dumps(records, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    for category, atlases in categories:
        keys = [f'avatar_{key}.png' for key_list in atlases.values() for key in key_list]
        gallery(f'avatars-{category}', keys, (128, 128), 4 if category != 'boss' else 5)
    gallery('avatars-mounts', [f'avatar_mount_{mount}_{state}.png'
                               for mount in MOUNTS for state in ('wild', 'bonded')], (128, 128), 4)
    for kind in ('wild', 'tame'):
        gallery(f'mount-{kind}', [f'mount_{mount}_{kind}.png' for mount in MOUNTS], (256, 96), 2)
    gallery('npc-walk', [f'{key}_walk.png' for keys in NPC_WALKS.values() for key in keys], (128, 64), 4)
    gallery('landmarks', [f'{key}_ambient.png' for keys in LANDMARKS.values() for key in keys], (384, 192), 2)
    gallery('menu-icons', [f'icon_menu_{key}.png' for keys in ICON_ATLASES.values() for key in keys],
            (64, 64), 9)
    print(f'Exported {sum(item["kind"] == "avatar" for item in records)} avatars and '
          f'{sum(item["kind"] in ("wild", "tame", "walk", "ambient") for item in records)} '
          f'animation strips and {sum(item["kind"] == "icon" for item in records)} menu icons')


if __name__ == '__main__':
    export()
