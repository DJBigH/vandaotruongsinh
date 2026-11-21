"""Audit the art-only export and avatar coverage of the current roster."""
import json
from collections import Counter
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent
PROJECT = ROOT.parents[1]
SHEETS = ROOT / 'sheets'
MANIFEST = ROOT / 'manifest.json'


def required_avatar_keys() -> set[str]:
    assets = PROJECT / 'client' / 'public' / 'assets'
    keys = {path.stem.removesuffix('_preview') for path in (assets / 'v104').glob('hero_*_0_preview.png')}
    keys = {key.removesuffix('_0') for key in keys}
    keys.update(path.stem for path in (assets / 'vnext').glob('npc_*.png'))
    keys.update(path.stem for path in (assets / 'vnext').glob('boss_*.png'))
    keys.update(path.stem for path in (assets / 'vnext').glob('monster_*.png'))
    keys.update(path.stem for path in (assets / 'v110').glob('npc_*.png'))
    keys.update(path.stem for path in (assets / 'v110').glob('boss_*.png'))
    keys.add('disciple_lieu_muoi')
    keys.update(path.stem.removesuffix('_card') + '_wild'
                for path in (assets / 'v105').glob('mount_*_card.png'))
    return keys


def validate() -> None:
    records = json.loads(MANIFEST.read_text(encoding='utf-8'))
    assert len(records) == 130, len(records)
    assert len({(record['key'], record['kind']) for record in records}) == len(records), 'duplicate key/state'
    assert len({record['file'] for record in records}) == len(records), 'duplicate files'
    assert {path.name for path in SHEETS.glob('*.png')} == {record['file'] for record in records}
    counts = Counter(record['kind'] for record in records)
    assert counts == {'avatar': 88, 'wild': 6, 'tame': 6, 'walk': 8, 'ambient': 4, 'icon': 18}, counts
    avatar_keys = {record['key'] for record in records if record['kind'] == 'avatar'}
    missing = required_avatar_keys() - avatar_keys
    assert not missing, ('missing avatars', sorted(missing))
    assert len([key for key in avatar_keys if key.startswith('boss_') and key.endswith('_phase')]) == 20
    for record in records:
        source = ROOT / 'source' / record['source']
        assert source.is_file(), source
        image = Image.open(SHEETS / record['file'])
        assert image.mode == 'RGBA' and list(image.size) == record['size'], record
        if record['kind'] in ('avatar', 'icon'):
            assert image.getchannel('A').getbbox(), record
            assert image.getpixel((0, 0))[3] == 0, record
            continue
        frame_width, frame_height = record['frame_size']
        assert image.size == (frame_width * 4, frame_height), record
        signatures = set()
        for index in range(4):
            frame = image.crop((index * frame_width, 0, (index + 1) * frame_width, frame_height))
            assert frame.getchannel('A').getbbox(), (record, index, 'empty')
            assert frame.getpixel((0, 0))[3] == 0, (record, index, 'dirty corner')
            signatures.add(frame.tobytes())
        assert len(signatures) == 4, (record, 'repeated frame')
        assert (ROOT / 'previews' / f'{record["key"]}_{record["kind"]}.gif').is_file()
    print('PASS:', ', '.join(f'{kind}={count}' for kind, count in sorted(counts.items())),
          f'| {len(required_avatar_keys())} current roster identities covered')


if __name__ == '__main__':
    validate()
