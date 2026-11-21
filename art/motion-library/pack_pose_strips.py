"""Pack reference-backed four-pose art into aligned game-size sheets and previews.

This is an art production utility. It does not modify the running game's manifest or code.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / 'source'
SHEETS = ROOT / 'sheets'
PREVIEWS = ROOT / 'previews'
SHEETS.mkdir(exist_ok=True)
PREVIEWS.mkdir(exist_ok=True)


def pack(path: Path, cell_size: int, max_width: int, max_height: int,
         baseline: int | None, suffix: str, labels: tuple[str, str, str, str]) -> tuple[Path, Path]:
    image = Image.open(path).convert('RGBA')
    assert image.width % 4 == 0, (path, image.size)
    stem = path.name.split('-pose-source')[0]
    source_width = image.width // 4
    frames: list[Image.Image] = []
    for index in range(4):
        source = image.crop((index * source_width, 0, (index + 1) * source_width, image.height))
        mask = source.getchannel('A').point(lambda alpha: 255 if alpha > 64 else 0)
        bounds = mask.getbbox()
        assert bounds, (path, index, 'empty pose')
        source = source.crop(bounds)
        alpha = source.getchannel('A').point(lambda value: value if value > 64 else 0)
        source.putalpha(alpha)
        scale = min(max_width / source.width, max_height / source.height)
        width = max(1, round(source.width * scale))
        height = max(1, round(source.height * scale))
        source = source.resize((width, height), Image.Resampling.NEAREST)
        frame = Image.new('RGBA', (cell_size, cell_size))
        y = baseline - height if baseline is not None else (cell_size - height) // 2
        frame.alpha_composite(source, ((cell_size - width) // 2, y))
        # Detached source flecks on the sword venerable are outside the pose silhouette.
        if stem == 'boss_007' and index in (0, 3):
            clean = ImageDraw.Draw(frame)
            clean.rectangle((104, 100, 112, 110) if index == 0 else (15, 15, 22, 25),
                            fill=(0, 0, 0, 0))
        frames.append(frame)
    assert len({frame.tobytes() for frame in frames}) == 4, (path, 'duplicate pose')

    sheet = Image.new('RGBA', (cell_size * 4, cell_size))
    for index, frame in enumerate(frames):
        sheet.alpha_composite(frame, (index * cell_size, 0))
    sheet_path = SHEETS / f'{stem}_{suffix}.png'
    sheet.save(sheet_path)

    preview_frames = []
    font = ImageFont.load_default()
    for index, frame in enumerate(frames):
        preview = Image.new('RGB', (cell_size * 4, cell_size * 4 + 28), '#1c2b23')
        enlarged = frame.resize((cell_size * 4, cell_size * 4), Image.Resampling.NEAREST)
        preview.paste(enlarged, (0, 28), enlarged)
        ImageDraw.Draw(preview).text((12, 8), f'{stem.upper()}  /  {labels[index]}', fill='#e9d3a1', font=font)
        preview_frames.append(preview)
    preview_path = PREVIEWS / f'{stem}.gif'
    preview_frames[0].save(preview_path, save_all=True, append_images=preview_frames[1:],
                           duration=[700, 480, 350, 500], loop=0, disposal=2)
    return sheet_path, preview_path


def selected(prefix: str) -> list[Path]:
    paths: dict[str, Path] = {}
    for path in sorted(SOURCE.glob(f'{prefix}*-pose-source*.png')):
        stem = path.name.split('-pose-source')[0]
        if stem not in paths or '-v2' in path.name:
            paths[stem] = path
    return [paths[key] for key in sorted(paths)]


if __name__ == '__main__':
    for path in selected('boss_'):
        sheet, _ = pack(path, 128, 112, 100, 116,
                        'idle_windup_attack_hurt', ('IDLE', 'WINDUP', 'ATTACK', 'HURT'))
        print(sheet.name)
    for path in selected('npc_'):
        sheet, _ = pack(path, 64, 48, 46, 56,
                        'idle_greet_speak_react', ('IDLE', 'GREET', 'SPEAK', 'REACT'))
        print(sheet.name)
    for path in selected('prop_'):
        sheet, _ = pack(path, 128, 112, 104, 116,
                        'loop', ('LOOP 1', 'LOOP 2', 'LOOP 3', 'LOOP 4'))
        print(sheet.name)
    for path in selected('vfx_'):
        sheet, _ = pack(path, 96, 84, 84, None,
                        'build_peak_release_fade', ('BUILD', 'GROW', 'PEAK', 'FADE'))
        print(sheet.name)
