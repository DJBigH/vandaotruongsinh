"""Verify all v1.0.5 delivered game assets have usable opaque pixels and alpha."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / 'client' / 'public' / 'assets' / 'v105'
MOUNTS = ('crane', 'shadow_wolf', 'fox', 'turtle', 'stag', 'underworld_horse')
WEAPONS = ('sword', 'spear', 'staff', 'bow', 'axe', 'fists')

for mount in MOUNTS:
    sheet = Image.open(ASSETS / f'mount_{mount}_ride.png').convert('RGBA')
    card = Image.open(ASSETS / f'mount_{mount}_card.png').convert('RGBA')
    assert sheet.size == (512, 96), (mount, sheet.size)
    assert card.size == (256, 192), (mount, card.size)
    for index in range(4):
        frame = sheet.crop((index * 128, 0, (index + 1) * 128, 96))
        alpha = frame.getchannel('A')
        assert alpha.getbbox(), (mount, index, 'empty frame')
        assert alpha.getextrema() == (0, 255), (mount, index, 'no transparent canvas')
    assert sheet.crop((0, 0, 128, 96)).tobytes() == sheet.crop((384, 0, 512, 96)).tobytes(), mount

for weapon in WEAPONS:
    icon = Image.open(ASSETS / f'weapon_{weapon}.png').convert('RGBA')
    assert icon.size == (64, 64), (weapon, icon.size)
    assert icon.getchannel('A').getextrema() == (0, 255), weapon

print('PASS: 6 animated mount sheets, 6 cards and 6 transparent weapon icons')
