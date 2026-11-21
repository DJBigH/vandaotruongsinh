"""Pack each 4-column, 3-row boss motion atlas into native-size RGBA strips."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / 'source'
SHEETS = ROOT / 'sheets'
PREVIEWS = ROOT / 'previews'
SHEETS.mkdir(exist_ok=True)
PREVIEWS.mkdir(exist_ok=True)

SEQUENCES = (
    ('move', ('STEP 1', 'STEP 2', 'STEP 3', 'STEP 4'), (170, 170, 170, 170)),
    ('death', ('STAGGER', 'COLLAPSE', 'FALL', 'DOWN'), (220, 240, 300, 850)),
    ('phase', ('CHARGE', 'IGNITE', 'SURGE', 'AWAKEN'), (260, 220, 220, 650)),
)


def pack(path: Path) -> list[Path]:
    image = Image.open(path).convert('RGBA')
    assert image.width % 4 == 0 and image.height % 3 == 0, (path, image.size)
    cell = image.width // 4
    assert cell == image.height // 3, (path, image.size, 'cells must be square')
    crops = []
    for row in range(3):
        row_crops = []
        for column in range(4):
            source = image.crop((column * cell, row * cell, (column + 1) * cell, (row + 1) * cell))
            alpha = source.getchannel('A')
            bounds = alpha.point(lambda value: 255 if value > 64 else 0).getbbox()
            assert bounds, (path, row, column, 'empty frame')
            source = source.crop(bounds)
            source.putalpha(source.getchannel('A').point(lambda value: value if value > 64 else 0))
            row_crops.append(source)
        crops.append(row_crops)

    # One scale for all twelve frames prevents the fallen boss from inflating.
    max_width = max(frame.width for row in crops for frame in row)
    max_height = max(frame.height for row in crops for frame in row)
    scale = min(112 / max_width, 100 / max_height)
    boss = path.name.split('-motion-source')[0]
    outputs = []
    font = ImageFont.load_default()
    for row_index, (kind, labels, timings) in enumerate(SEQUENCES):
        frames = []
        for source in crops[row_index]:
            width = max(1, round(source.width * scale))
            height = max(1, round(source.height * scale))
            sprite = source.resize((width, height), Image.Resampling.NEAREST)
            frame = Image.new('RGBA', (128, 128))
            frame.alpha_composite(sprite, ((128 - width) // 2, 116 - height))
            frames.append(frame)
        assert len({frame.tobytes() for frame in frames}) == 4, (path, kind, 'duplicate frame')
        strip = Image.new('RGBA', (512, 128))
        for index, frame in enumerate(frames):
            strip.alpha_composite(frame, (index * 128, 0))
        sheet = SHEETS / f'{boss}_{kind}.png'
        strip.save(sheet)
        outputs.append(sheet)

        preview_frames = []
        for index, frame in enumerate(frames):
            preview = Image.new('RGB', (512, 540), '#1c2b23')
            enlarged = frame.resize((512, 512), Image.Resampling.NEAREST)
            preview.paste(enlarged, (0, 28), enlarged)
            ImageDraw.Draw(preview).text((12, 8), f'{boss.upper()} / {labels[index]}',
                                         fill='#e9d3a1', font=font)
            preview_frames.append(preview)
        preview_frames[0].save(PREVIEWS / f'{boss}_{kind}.gif', save_all=True,
                               append_images=preview_frames[1:], duration=timings,
                               loop=0, disposal=2)
    return outputs


if __name__ == '__main__':
    for source in sorted(SOURCE.glob('boss_*-motion-source.png')):
        print(source.name, '->', ', '.join(path.name for path in pack(source)))
