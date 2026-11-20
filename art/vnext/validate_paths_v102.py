"""Check exported V1.0.2 character sheets against the runtime frame contract."""
from pathlib import Path
import hashlib
import json
from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = json.loads((ROOT / "art/vnext/manifest.json").read_text(encoding="utf-8"))
COUNTS = {"idle": 2, "walk": 4, "slash": 3, "cast": 3,
          "dodge": 3, "hurt": 2, "death": 3, "respawn": 3}
SHEETS = {f"player_{role}_{pose}": columns
          for role in ("magic", "body") for pose, columns in COUNTS.items()}
SHEETS.update({"disciple_lieu_muoi_idle": 2, "disciple_lieu_muoi_walk": 4,
               "disciple_lieu_muoi_attack": 3, "disciple_lieu_muoi_cast": 3})


def main():
    issues = []
    for key, columns in SHEETS.items():
        pose = key.rsplit('_', 1)[-1]
        entries = [a for a in MANIFEST["assets"] if a["key"] == key]
        if len(entries) != 1:
            issues.append(f"{key}: expected one manifest entry, got {len(entries)}")
            continue
        entry = entries[0]
        path = ROOT / "client/public" / entry["file"]
        image = Image.open(path).convert("RGBA")
        if image.size != (64 * columns, 256):
            issues.append(f"{key}: wrong image size {image.size}")
        if entry["framesPerDirection"] != columns or entry["directionCount"] != 4:
            issues.append(f"{key}: wrong frame metadata")
        if entry["sha256"] != hashlib.sha256(path.read_bytes()).hexdigest():
            issues.append(f"{key}: stale checksum")

        unique = set()
        for row in range(4):
            frames = []
            for col in range(columns):
                frame = image.crop((col * 64, row * 64, (col + 1) * 64, (row + 1) * 64))
                box = frame.getchannel("A").getbbox()
                if not box:
                    issues.append(f"{key}: empty cell {row},{col}")
                    continue
                if min(box[0], box[1], 64 - box[2], 64 - box[3]) < 2:
                    issues.append(f"{key}: border touched at {row},{col}: {box}")
                pixels = frame.load()
                if any(pixels[x, y][:3] != (0, 0, 0)
                       for y in range(64) for x in range(64) if pixels[x, y][3] == 0):
                    issues.append(f"{key}: RGB outside alpha at {row},{col}")
                frames.append(frame)
                unique.add(frame.tobytes())
            if pose != "idle" and len(frames) == columns:
                for col in range(columns - 1):
                    if ImageChops.difference(frames[col], frames[col + 1]).getbbox() is None:
                        issues.append(f"{key}: repeated adjacent pose at {row},{col}")
        print(f"{key}: {image.width}x{image.height}, {len(unique)} unique frame images")

    for issue in issues:
        print("ERROR:", issue)
    print(f"Validation: {len(issues)} issue(s)")
    return bool(issues)


if __name__ == "__main__":
    raise SystemExit(main())
