"""Copy reviewed art exports into the versioned client runtime directory."""
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'client' / 'public' / 'assets' / 'v120'

def main() -> None:
    DEST.mkdir(parents=True, exist_ok=True)
    copied: set[str] = set()
    for library in ('future-library', 'event-vision'):
        base = ROOT / 'art' / library
        for entry in json.loads((base / 'manifest.json').read_text(encoding='utf-8')):
            name = entry['file']
            source = base / 'sheets' / name
            if not source.is_file() or name in copied:
                raise ValueError(f'missing or duplicate art export: {source}')
            shutil.copyfile(source, DEST / name)
            copied.add(name)
    for source in sorted((ROOT / 'art' / 'motion-library' / 'sheets').glob('*.png')):
        if source.name in copied:
            raise ValueError(f'duplicate motion export: {source.name}')
        shutil.copyfile(source, DEST / source.name)
        copied.add(source.name)
    print(f'Packaged {len(copied)} reviewed art exports in {DEST}')

if __name__ == '__main__':
    main()
