"""Copy validated upgrade art into the versioned client asset directory."""
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DEST = ROOT.parents[1] / 'client' / 'public' / 'assets' / 'v130'


def main() -> None:
    records = json.loads((ROOT / 'manifest.json').read_text(encoding='utf-8'))
    DEST.mkdir(parents=True, exist_ok=True)
    for entry in records:
        shutil.copyfile(ROOT / 'sheets' / entry['file'], DEST / entry['file'])
    print(f'Packaged {len(records)} upgrade assets')


if __name__ == '__main__':
    main()
