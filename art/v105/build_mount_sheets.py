"""Pack generated four-pose mount source art into crisp 128x96 game sheets.

Each source image has four equally spaced transparent cells. The crop is only
layout conversion for Phaser; source images remain unchanged in source/.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent
OUT = ROOT.parents[1] / 'client' / 'public' / 'assets' / 'v105'
OUT.mkdir(parents=True, exist_ok=True)
FRAME_W, FRAME_H = 128, 96

for source in sorted((ROOT / 'source').glob('mount_*.png')):
    original = Image.open(source).convert('RGBA')
    cell_width = original.width // 4
    sheet = Image.new('RGBA', (FRAME_W * 4, FRAME_H), (0, 0, 0, 0))
    for index in range(4):
        # The generated fourth pose is clipped by the source canvas edge;
        # looping back to pose one keeps a complete silhouette at every tick.
        source_index = 0 if index == 3 else index
        cell = original.crop((source_index * cell_width, 0, (source_index + 1) * cell_width, original.height))
        alpha = cell.getchannel('A')
        bbox = alpha.point(lambda value: 255 if value > 100 else 0).getbbox()
        if bbox is None:
            raise ValueError(f'Missing pose {index} in {source}')
        crop = cell.crop(bbox)
        ratio = min(120 / crop.width, 90 / crop.height)
        size = (max(1, round(crop.width * ratio)), max(1, round(crop.height * ratio)))
        art = crop.resize(size, Image.Resampling.LANCZOS)
        mask = art.getchannel('A').point(lambda value: 255 if value >= 125 else 0)
        colors = art.convert('RGB').quantize(colors=48, method=Image.Quantize.MEDIANCUT).convert('RGB').convert('RGBA')
        colors.putalpha(mask)
        x = index * FRAME_W + (FRAME_W - size[0]) // 2
        y = FRAME_H - size[1] - 2
        sheet.alpha_composite(colors, (x, y))
    sheet.save(OUT / f'{source.stem}_ride.png', optimize=True)
    sheet.crop((0, 0, FRAME_W, FRAME_H)).resize((256, 192), Image.Resampling.NEAREST).save(
        OUT / f'{source.stem}_card.png', optimize=True)
    print(f'{source.stem}: {sheet.size}')
