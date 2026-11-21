"""Check native-size motion sheets without touching the game runtime."""
from collections import Counter
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent
SHEETS = ROOT / 'sheets'
EXPECTED = {'boss_': (20, 128), 'npc_': (8, 64), 'prop_': (4, 128), 'vfx_': (38, 96)}


def validate() -> None:
    totals = Counter()
    for path in sorted(SHEETS.glob('*.png')):
        category = next((key for key in EXPECTED if path.name.startswith(key)), None)
        assert category is not None, path
        totals[category] += 1
        size = EXPECTED[category][1]
        sheet = Image.open(path)
        assert sheet.mode == 'RGBA' and sheet.size == (size * 4, size), (path, sheet.mode, sheet.size)
        signatures = set()
        for index in range(4):
            frame = sheet.crop((index * size, 0, (index + 1) * size, size))
            alpha = frame.getchannel('A')
            assert alpha.getbbox() is not None, (path, index, 'empty')
            assert alpha.getpixel((0, 0)) == 0, (path, index, 'dirty transparency')
            signatures.add(frame.tobytes())
        assert len(signatures) == 4, (path, 'duplicate poses')
    for category, (expected, _) in EXPECTED.items():
        assert totals[category] == expected, (category, totals[category], expected)
    for school in ('sword', 'spell', 'body'):
        assert len(list(SHEETS.glob(f'vfx_skill_{school}_*.png'))) == 12, school
    print('PASS:', ', '.join(f'{category}{totals[category]}' for category in EXPECTED),
          f'= {sum(totals.values())} sheets / {sum(totals.values()) * 4} frames')


if __name__ == '__main__':
    validate()
