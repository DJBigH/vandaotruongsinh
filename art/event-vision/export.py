"""Pack review-only event art. This never writes to runtime asset folders."""
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / 'source'
SHEETS = ROOT / 'sheets'
PREVIEWS = ROOT / 'previews'
for directory in (SHEETS, PREVIEWS):
    directory.mkdir(exist_ok=True)

BOSS_ID = 'event_boss_001_covenant'
MARKERS = {
    'noon-meditation': ('event_noon_basin', 'event-noon-basin.png'),
    'world-boss': ('event_wolf_standard', 'event-wolf-standard.png'),
    'night-hunt': ('event_night_beacon', 'event-night-beacon-v2.png'),
}
CARD_SOURCES = {
    'noon-meditation': 'card-noon.png',
    'world-boss': 'card-wolf.png',
    'night-hunt': 'card-night.png',
}


def cells(filename: str, columns: int, rows: int) -> list[Image.Image]:
    image = Image.open(SOURCE / filename).convert('RGBA')
    output = []
    for row in range(rows):
        for column in range(columns):
            bounds = (round(column * image.width / columns), round(row * image.height / rows),
                      round((column + 1) * image.width / columns),
                      round((row + 1) * image.height / rows))
            cell = image.crop(bounds)
            alpha = cell.getchannel('A').point(lambda value: value if value > 64 else 0)
            bbox = alpha.getbbox()
            assert bbox, (filename, row, column, 'empty frame')
            cell.putalpha(alpha)
            output.append(cell.crop(bbox))
    return output


def fit(source: Image.Image, size: int, inset: int, baseline: int, scale: float) -> Image.Image:
    target = (max(1, round(source.width * scale)), max(1, round(source.height * scale)))
    assert target[0] <= size - inset * 2 and target[1] <= baseline - inset, (source.size, target)
    frame = Image.new('RGBA', (size, size))
    frame.alpha_composite(source.resize(target, Image.Resampling.NEAREST),
                          ((size - target[0]) // 2, baseline - target[1]))
    return frame


def strip(frames: list[Image.Image], key: str, state: str, filename: str,
          frame_size: int, inset: int, baseline: int, records: list[dict],
          scale: float | None = None) -> None:
    assert len(frames) == 4
    if scale is None:
        scale = min((frame_size - inset * 2) / max(frame.width for frame in frames),
                    (baseline - inset) / max(frame.height for frame in frames))
    fitted = [fit(frame, frame_size, inset, baseline, scale) for frame in frames]
    assert len({frame.tobytes() for frame in fitted}) == 4, (key, state, 'duplicate frames')
    sheet = Image.new('RGBA', (frame_size * 4, frame_size))
    for index, frame in enumerate(fitted):
        sheet.alpha_composite(frame, (index * frame_size, 0))
    out = f'{key}_{state}.png'
    sheet.save(SHEETS / out)
    records.append({'key': key, 'state': state, 'kind': 'strip', 'file': out,
                    'source': filename, 'frames': 4, 'frame_size': [frame_size, frame_size],
                    'size': list(sheet.size)})
    animation = [frame.resize((frame_size * 2, frame_size * 2), Image.Resampling.NEAREST)
                 for frame in fitted]
    animation[0].save(PREVIEWS / f'{key}_{state}.gif', save_all=True,
                      append_images=animation[1:], duration=[180, 180, 180, 420], loop=0,
                      disposal=2)


def still(source: Image.Image, key: str, kind: str, filename: str,
          size: int, records: list[dict]) -> None:
    scale = min((size - 12) / source.width, (size - 12) / source.height)
    image = fit(source, size, 6, size - 6, scale)
    out = f'{"avatar" if kind == "avatar" else "icon"}_{key}.png'
    image.save(SHEETS / out)
    records.append({'key': key, 'kind': kind, 'file': out, 'source': filename,
                    'size': [size, size]})


def gallery(keys: list[str], name: str, columns: int, tile: int) -> None:
    rows = (len(keys) + columns - 1) // columns
    output = Image.new('RGB', (columns * (tile + 16), rows * (tile + 32)), '#1d2924')
    draw = ImageDraw.Draw(output)
    for index, file in enumerate(keys):
        image = Image.open(SHEETS / file).convert('RGBA')
        if image.width == image.height * 4:
            image = image.crop((0, 0, image.height, image.height))
        image = image.resize((tile, tile), Image.Resampling.NEAREST)
        x = (index % columns) * (tile + 16) + 8
        y = (index // columns) * (tile + 32) + 20
        output.paste(image, (x, y), image)
        label = file.removeprefix(BOSS_ID + '_').removeprefix('avatar_').removeprefix('icon_').removesuffix('.png')
        label = label.replace('event_noon_basin', 'Noon').replace('event_wolf_standard', 'Wolf raid')
        label = label.replace('event_night_beacon', 'Night hunt')
        draw.text((x, y - 15), label, fill='#ecd5a2', font=ImageFont.load_default())
    output.save(PREVIEWS / f'gallery-{name}.png')


def card(event_id: str, filename: str, records: list[dict]) -> None:
    source = Image.open(SOURCE / filename).convert('RGBA')
    if event_id == 'night-hunt':
        # Source includes cinematic black bars; crop the painted scene itself.
        cropped = source.crop((137, 145, 1637, 745))
    else:
        crop_height = round(source.width / 2.5)
        assert crop_height <= source.height
        top = (source.height - crop_height) // 2
        cropped = source.crop((0, top, source.width, top + crop_height))
    output_name = f'card_{event_id}.png'
    cropped.resize((640, 256), Image.Resampling.NEAREST).save(SHEETS / output_name)
    records.append({'key': event_id, 'kind': 'card', 'file': output_name,
                    'source': filename, 'size': [640, 256]})


def card_gallery() -> None:
    output = Image.new('RGB', (656, len(CARD_SOURCES) * 286), '#1d2924')
    draw = ImageDraw.Draw(output)
    for index, event_id in enumerate(CARD_SOURCES):
        image = Image.open(SHEETS / f'card_{event_id}.png').convert('RGB')
        y = index * 286 + 22
        output.paste(image, (8, y))
        draw.text((8, y - 16), event_id, fill='#ecd5a2', font=ImageFont.load_default())
    output.save(PREVIEWS / 'gallery-event-cards.png')


def boss_sequence_gallery() -> None:
    states = ('actions', 'move', 'phase', 'death')
    output = Image.new('RGB', (4 * 144, 4 * 150), '#1d2924')
    draw = ImageDraw.Draw(output)
    for row, state in enumerate(states):
        sheet = Image.open(SHEETS / f'{BOSS_ID}_{state}.png').convert('RGBA')
        draw.text((8, row * 150 + 3), state, fill='#ecd5a2', font=ImageFont.load_default())
        for column in range(4):
            frame = sheet.crop((column * 128, 0, (column + 1) * 128, 128))
            output.paste(frame, (column * 144 + 8, row * 150 + 18), frame)
    output.save(PREVIEWS / 'gallery-boss-sequence.png')


def export() -> None:
    records: list[dict] = []
    boss_source = 'event-boss-actions-v2.png'
    action_cells = cells(boss_source, 4, 2)
    phase_source = 'event-boss-phase-death.png'
    phase_cells = cells(phase_source, 4, 2)
    boss_scale = min(112 / max(frame.width for frame in action_cells + phase_cells),
                     112 / max(frame.height for frame in action_cells + phase_cells))
    for state, frames, filename in (
        ('actions', action_cells[:4], boss_source),
        ('move', action_cells[4:], boss_source),
        ('phase', phase_cells[:4], phase_source),
        ('death', phase_cells[4:], phase_source),
    ):
        strip(frames, BOSS_ID, state, filename, 128, 8, 120, records, boss_scale)

    portrait = Image.open(SOURCE / 'event-boss-avatar.png').convert('RGBA')
    alpha = portrait.getchannel('A').point(lambda value: value if value > 64 else 0)
    portrait.putalpha(alpha)
    still(portrait.crop(alpha.getbbox()), BOSS_ID, 'avatar', 'event-boss-avatar.png', 192, records)

    for event_id, (key, filename) in MARKERS.items():
        frames = cells(filename, 4, 1)
        strip(frames, key, 'ambient', filename, 192, 8, 184, records)
        still(frames[0], key, 'avatar', filename, 192, records)
        still(frames[0], key, 'icon', filename, 64, records)

    for event_id, filename in CARD_SOURCES.items():
        card(event_id, filename, records)

    (ROOT / 'manifest.json').write_text(json.dumps(records, ensure_ascii=False, indent=2) + '\n',
                                        encoding='utf-8')
    gallery([f'{BOSS_ID}_{state}.png' for state in ('actions', 'move', 'phase', 'death')],
            'boss-motion', 4, 128)
    gallery([f'avatar_{BOSS_ID}.png'], 'boss-avatar', 1, 192)
    gallery([f'{key}_ambient.png' for key, _ in MARKERS.values()], 'event-markers', 3, 192)
    gallery([f'avatar_{key}.png' for key, _ in MARKERS.values()], 'event-avatars', 3, 128)
    gallery([f'icon_{key}.png' for key, _ in MARKERS.values()], 'event-icons', 3, 64)
    card_gallery()
    boss_sequence_gallery()
    print(f'Exported {len(records)} event art files')


if __name__ == '__main__':
    export()
