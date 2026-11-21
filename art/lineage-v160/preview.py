"""Build a compact visual review sheet from the shipped Tiên/Ma assets."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageOps

HERE = Path(__file__).resolve().parent
ASSETS = HERE.parents[1] / 'client' / 'public' / 'assets' / 'v160'
DEST = HERE / 'previews' / 'contact.png'

ROWS = [
    [('NPC · Tiên','avatar_npc_elder_immortal.png'),('NPC · Ma','avatar_npc_elder_demonic.png'),
     ('Thú · Tiên','avatar_mount_fox_bonded_immortal.png'),('Thú · Ma','avatar_mount_fox_bonded_demonic.png'),
     ('Boss · Tiên','avatar_boss_001_immortal.png'),('Boss · Ma','avatar_boss_001_demonic.png')],
    [('Kiếm · Tiên','avatar_weapon_sword_5_immortal.png'),('Kiếm · Ma','avatar_weapon_sword_5_demonic.png'),
     ('Giáp · Tiên','avatar_equipment_armor_10_immortal.png'),('Giáp · Ma','avatar_equipment_armor_10_demonic.png'),
     ('Danh hiệu · Tiên','avatar_title_immortal_dragon.png'),('Danh hiệu · Ma','avatar_title_demonic_dragon.png')],
    [('Cổng · Tiên','avatar_prop_portal_immortal.png'),('Cổng · Ma','avatar_prop_portal_demonic.png'),
     ('Nền · Tiên','mapground_map_thanh_khe_immortal.png'),('Nền · Ma','mapground_map_thanh_khe_demonic.png'),
     ('Mở đầu · Tiên','intro_immortal_birth.webp'),('Mở đầu · Ma','intro_demonic_birth.webp')],
]

card_w, card_h = 224, 232
sheet = Image.new('RGB', (card_w*6, card_h*3), '#121b1a')
draw = ImageDraw.Draw(sheet)
for row, cards in enumerate(ROWS):
    for column, (label, filename) in enumerate(cards):
        x, y = column*card_w, row*card_h
        draw.rounded_rectangle((x+5,y+5,x+card_w-5,y+card_h-5), radius=10,
                               fill='#1b2927', outline='#566354', width=1)
        image = Image.open(ASSETS/filename).convert('RGBA')
        image = ImageOps.contain(image, (192,192), Image.Resampling.LANCZOS)
        px, py = x+(card_w-image.width)//2, y+8+(192-image.height)//2
        sheet.paste(image, (px,py), image)
        draw.text((x+13,y+210), label, fill='#e8ddbb')
DEST.parent.mkdir(parents=True, exist_ok=True)
sheet.save(DEST)
print(DEST)
