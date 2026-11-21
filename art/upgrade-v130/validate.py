"""Validate +6..+10 appearance and six four-frame outcome strips."""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent


def main() -> None:
    records = json.loads((ROOT / 'manifest.json').read_text(encoding='utf-8'))
    assert len(records) == 106, len(records)
    assert len({entry['file'] for entry in records}) == 106
    assert {entry['file'] for entry in records} == {p.name for p in (ROOT / 'sheets').glob('*.png')}
    for family in ('armor', 'robe', 'boots', 'ring', 'sword', 'staff', 'fists', 'spear', 'bow', 'axe'):
        variants = []
        for tier in range(6, 11):
            key = f'equipment_{family}_{tier}' if family in ('armor', 'robe', 'boots', 'ring') else f'weapon_{family}_{tier}'
            pair = [entry for entry in records if entry['key'] == key]
            assert {entry['kind'] for entry in pair} == {'icon', 'avatar'}, key
            variants.append(Image.open(ROOT / 'sheets' / next(entry['file'] for entry in pair if entry['kind'] == 'icon')).tobytes())
        assert len(set(variants)) == 5, family
    for entry in records:
        assert (ROOT / 'source' / entry['source']).is_file(), entry
        image = Image.open(ROOT / 'sheets' / entry['file'])
        assert image.mode == 'RGBA' and list(image.size) == entry['size'], entry
        assert image.getpixel((0, 0))[3] == 0, entry
        if entry['kind'] == 'strip':
            frames = [image.crop((index * 96, 0, (index + 1) * 96, 96)) for index in range(4)]
            assert all(frame.getchannel('A').getbbox() for frame in frames), entry
            assert len({frame.tobytes() for frame in frames}) == 4, entry
    print('PASS: 50 distinct +6..+10 items with icon and avatar; six four-frame outcome strips')


if __name__ == '__main__':
    main()
