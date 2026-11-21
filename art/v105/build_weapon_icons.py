"""Convert the six generated weapon drawings into transparent 64x64 inventory icons."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent
OUT = ROOT.parents[1] / 'client' / 'public' / 'assets' / 'v105'
OUT.mkdir(parents=True, exist_ok=True)

for source in sorted((ROOT / 'source').glob('weapon_*.png')):
    art = Image.open(source).convert('RGBA')
    bbox = art.getchannel('A').point(lambda a: 255 if a > 100 else 0).getbbox()
    if not bbox:
        raise ValueError(f'No weapon pixels in {source}')
    art = art.crop(bbox)
    scale = min(60 / art.width, 60 / art.height)
    dimensions = (round(art.width * scale), round(art.height * scale))
    art = art.resize(dimensions, Image.Resampling.LANCZOS)
    mask = art.getchannel('A').point(lambda a: 255 if a >= 125 else 0)
    indexed = art.convert('RGB').quantize(colors=40, method=Image.Quantize.MEDIANCUT).convert('RGB').convert('RGBA')
    indexed.putalpha(mask)
    icon = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
    icon.alpha_composite(indexed, ((64 - dimensions[0]) // 2, (64 - dimensions[1]) // 2))
    icon.save(OUT / f'{source.stem}.png', optimize=True)
    print(source.stem)
