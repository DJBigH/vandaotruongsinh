"""Validate native frame, portrait, branch and elite coverage for v1.7.0."""
import hashlib
import json
from pathlib import Path
from PIL import Image

ROOT=Path(__file__).resolve().parents[2]
DATA=json.loads((Path(__file__).parent/'manifest.json').read_text(encoding='utf-8'))
assert {k:len(v) for k,v in DATA.items()} == {'npc':12,'monster':160,'map':10,'portal':2,'prop':10,'environment':10}

def check(path, size):
    im=Image.open(ROOT/'client/public'/path).convert('RGBA')
    assert im.size==size,(path,im.size,size)
    assert im.getbbox(),path
    return hashlib.sha256(im.tobytes()).hexdigest()

for row in DATA['npc']:
    assert row['alignment']=='demonic'
    sheet=Image.open(ROOT/'client/public'/row['sprite'])
    assert sheet.height==64 and sheet.width in (64,256),row
    check(row['avatar'],(192,192))
monster_sprites=set()
for row in DATA['monster']:
    monster_sprites.add(check(row['sprite'],(384,64)))
    check(row['avatar'],(192,192))
assert len(monster_sprites)==160,'monster variants must have distinct painted sheets'
assert len({(row['id'],row['alignment'],row['elite']) for row in DATA['monster']})==160
for row in DATA['map']:
    check(row['ground'],(256,256)); check(row['avatar'],(192,192))
for row in DATA['prop']:
    check(row['sprite'],(96,128)); check(row['avatar'],(192,192))
for row in DATA['environment']:
    sprite=Image.open(ROOT/'client/public'/row['sprite'])
    assert sprite.width>=38 and sprite.height>=55
    check(row['avatar'],(192,192))
for row in DATA['portal']:
    check(row['sprite'],(64,64)); check(row['avatar'],(192,192))
    alignment=row['alignment']
    sheet=Image.open(ROOT/f'client/public/assets/v170/vfx_teleport_{alignment}.png')
    assert sheet.size==(384,96)
    assert len({sheet.crop((i*96,0,(i+1)*96,96)).tobytes() for i in range(4)})==4
print('v1.7.0 art: 160 monster variants, 12 Ma NPCs, 10 regions, 10 steles, 10 Ma environment pieces and ritual sheets valid')
