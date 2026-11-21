"""Validate every path-specific realm and protagonist asset before packaging."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
ART = Path(__file__).resolve().parent
GAME = ROOT / 'client' / 'public' / 'assets' / 'v150'
V104 = ROOT / 'client' / 'public' / 'assets' / 'v104'
POSES = ('idle', 'walk', 'slash', 'cast', 'dodge', 'hurt', 'death', 'respawn')
COLS = {'idle': 2, 'walk': 4, 'slash': 3, 'cast': 3, 'dodge': 3, 'hurt': 2, 'death': 3, 'respawn': 3}


def image_at(path: Path, size: tuple[int, int]) -> Image.Image:
    assert path.is_file(), f'missing {path}'
    image = Image.open(path).convert('RGBA')
    assert image.size == size, f'{path}: {image.size} != {size}'
    assert image.getbbox(), f'{path}: empty'
    assert image.getpixel((0, 0))[3] == 0, f'{path}: dirty corner'
    return image


def digest(image: Image.Image) -> str:
    return hashlib.sha256(image.tobytes()).hexdigest()


def validate() -> None:
    manifest = json.loads((ART / 'manifest.json').read_text(encoding='utf-8'))
    assert len(manifest['realms']) == 24
    assert len(manifest['avatars']) == 144
    assert len(manifest['heroSheets']) == 768
    assert {(entry['alignment'], entry['realmIndex']) for entry in manifest['realms']} == {
        (alignment, index) for alignment in ('immortal', 'demonic') for index in range(12)}
    for entry in manifest['realms']:
        crest = image_at(ROOT / entry['crest'], (64, 64))
        assert crest.getchannel('A').getbbox(), entry
        assert len(set(crest.get_flattened_data())) >= 6, entry['crest']
        strip = image_at(ROOT / entry['breakthrough'], (384, 96))
        frames = [strip.crop((index * 96, 0, (index + 1) * 96, 96)) for index in range(4)]
        assert all(frame.getchannel('A').getbbox() for frame in frames), entry['breakthrough']
        assert len({digest(frame) for frame in frames}) == 4, entry['breakthrough']
        for file in (entry['crest'], entry['breakthrough']):
            assert (GAME / Path(file).name).is_file(), f'not packaged: {file}'
    assert len({digest(image_at(ROOT / entry['crest'], (64, 64))) for entry in manifest['realms']}) == 24

    grouped: dict[str, set[str]] = {}
    for entry in manifest['avatars']:
        image = image_at(ROOT / entry['file'], (192, 192))
        grouped.setdefault(entry['identity'], set()).add(digest(image))
        assert (GAME / Path(entry['file']).name).is_file(), f'not packaged: {entry["file"]}'
    assert len(grouped) == 12
    assert all(len(hashes) == 12 for hashes in grouped.values()), 'avatars must change at every realm'

    for entry in manifest['heroSheets']:
        image = image_at(ROOT / entry['file'], (COLS[entry['pose']] * 64, 256))
        assert (GAME / Path(entry['file']).name).is_file(), f'not packaged: {entry["file"]}'
        for row in range(4):
            frame = image.crop((0, row * 64, 64, (row + 1) * 64))
            assert frame.getchannel('A').getbbox(), entry['file']
    assert len(list(GAME.glob('realm_*_crest.png'))) == 24
    print('v1.5.0 art: 24 crests, 24 animated strips, 144 avatars, 768 new hero sheets validated')


if __name__ == '__main__':
    validate()
