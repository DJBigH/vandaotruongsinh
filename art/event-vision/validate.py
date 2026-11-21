"""Check event art coverage, alpha, dimensions and readable motion frames."""
import json
from collections import Counter
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent
PROJECT = ROOT.parents[1]
SHEETS = ROOT / 'sheets'
RECORDS = ROOT / 'manifest.json'
EVENTS = ('noon-meditation', 'world-boss', 'night-hunt')
MARKER_KEYS = ('event_noon_basin', 'event_wolf_standard', 'event_night_beacon')
BOSS = 'event_boss_001_covenant'


def validate() -> None:
    records = json.loads(RECORDS.read_text(encoding='utf-8'))
    assert len(records) == 17, len(records)
    assert len({record['file'] for record in records}) == 17, 'duplicate output'
    assert {path.name for path in SHEETS.glob('*.png')} == {record['file'] for record in records}
    assert Counter(record['kind'] for record in records) == {
        'strip': 7, 'avatar': 4, 'icon': 3, 'card': 3}

    schedule = (PROJECT / 'server/src/modules/events/schedule.ts').read_text(encoding='utf-8')
    for event_id in EVENTS:
        assert f"id: '{event_id}'" in schedule, ('unmapped event', event_id)
        assert any(record['file'] == f'card_{event_id}.png' for record in records)
    for key in (BOSS, *MARKER_KEYS):
        assert any(record['file'] == f'avatar_{key}.png' for record in records), key
    for key in MARKER_KEYS:
        assert any(record['file'] == f'icon_{key}.png' for record in records), key

    for record in records:
        assert (ROOT / 'source' / record['source']).is_file(), record
        image = Image.open(SHEETS / record['file'])
        assert image.mode == 'RGBA' and list(image.size) == record['size'], record
        if record['kind'] == 'strip':
            width, height = record['frame_size']
            assert image.size == (4 * width, height), record
            frames = [image.crop((index * width, 0, (index + 1) * width, height))
                      for index in range(4)]
            assert all(frame.getchannel('A').getbbox() for frame in frames), record
            assert all(frame.getpixel((0, 0))[3] == 0 for frame in frames), record
            assert len({frame.tobytes() for frame in frames}) == 4, ('duplicate frame', record)
            assert (ROOT / 'previews' / record['file'].replace('.png', '.gif')).is_file(), record
        elif record['kind'] in ('avatar', 'icon'):
            assert image.getchannel('A').getbbox(), record
            assert image.getpixel((0, 0))[3] == 0, record
        else:
            assert image.getchannel('A').getextrema() == (255, 255), record

    death = Image.open(SHEETS / f'{BOSS}_death.png').convert('RGBA')
    first = death.crop((0, 0, 128, 128)).getchannel('A').getbbox()
    last = death.crop((384, 0, 512, 128)).getchannel('A').getbbox()
    assert last[3] - last[1] < first[3] - first[1], 'death has no visible fall'
    print('PASS: 17 files; 7 four-frame strips, 4 avatars, 3 icons, 3 cards; '
          'event IDs match schedule; death pose lowers')


if __name__ == '__main__':
    validate()
