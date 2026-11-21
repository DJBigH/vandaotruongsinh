"""Make dark-background contact sheets for art review at native pixel sizes."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
SHEETS = ROOT / 'sheets'
OUT = ROOT / 'previews'
FONT = ImageFont.load_default()


def gallery(name: str, pattern: str, cell: int, columns: int) -> None:
    files = sorted(SHEETS.glob(pattern))
    width = columns * (cell * 2 + 20)
    rows = (len(files) + columns - 1) // columns
    result = Image.new('RGB', (width, rows * (cell + 40)), '#1c2b23')
    draw = ImageDraw.Draw(result)
    for index, path in enumerate(files):
        x = (index % columns) * (cell * 2 + 20) + 10
        y = (index // columns) * (cell + 40) + 24
        sheet = Image.open(path).convert('RGBA')
        assert sheet.size == (cell * 4, cell), (path, sheet.size)
        for offset, frame_index in enumerate((0, 2)):
            frame = sheet.crop((frame_index * cell, 0, (frame_index + 1) * cell, cell))
            result.paste(frame, (x + offset * cell, y), frame)
        draw.text((x, y - 17), path.name.split('_idle_')[0].split('_loop')[0].split('_build_')[0],
                  fill='#e9d3a1', font=FONT)
    output = OUT / f'gallery-{name}.png'
    result.save(output)
    print(output.name, result.size, len(files))


if __name__ == '__main__':
    gallery('bosses', 'boss_*.png', 128, 5)
    gallery('npcs', 'npc_*.png', 64, 4)
    gallery('props', 'prop_*.png', 128, 4)
    gallery('vfx', 'vfx_*.png', 96, 4)
    gallery('vfx-sword', 'vfx_skill_sword_*.png', 96, 4)
    gallery('vfx-spell', 'vfx_skill_spell_*.png', 96, 4)
    gallery('vfx-body', 'vfx_skill_body_*.png', 96, 4)
    gallery('vfx-breakthrough', 'vfx_breakthrough_*.png', 96, 2)
