"""Check shipped branches, portraits, four-frame titles, and skippable story media."""
import hashlib
import json
import wave
from pathlib import Path
from PIL import Image

ROOT=Path(__file__).resolve().parents[2]
ART=Path(__file__).resolve().parent
OUT=ROOT/'client/public/assets/v160'
data=json.loads((ART/'manifest.json').read_text(encoding='utf-8'))
expected={'npc':24,'mount':12,'weapon':132,'equipment':88,'boss':40,'prop':22,'map':22,'title':12,'cinematic':4}
assert {key:len(value) for key,value in data.items()}==expected

def read(path: str, size: tuple[int,int] | None=None):
    image=Image.open(ROOT/'client/public'/path).convert('RGBA')
    assert image.getbbox(),path
    if size: assert image.size==size,(path,image.size,size)
    return image

for group in ('npc','mount','weapon','equipment','boss','prop','map','title'):
    variants={}
    for entry in data[group]:
        assert entry['alignment'] in ('immortal','demonic')
        for key,path in entry.items():
            if key in ('id','alignment'): continue
            image=read(path)
            if key.startswith('avatar'): assert image.size==(192,192),path
            if group in ('weapon','equipment') and key=='icon': assert image.size==(64,64),path
            if group=='map' and key=='ground': assert image.size==(256,256),path
            if group=='title' and key=='banner':
                assert image.size==(768,48),path
                frames=[image.crop((i*192,0,(i+1)*192,48)).tobytes() for i in range(4)]
                assert len({hashlib.sha256(frame).digest() for frame in frames})==4,path
            digest=hashlib.sha256(image.tobytes()).digest()
            variants.setdefault((entry['id'],key),{})[entry['alignment']]=digest
    assert all(set(pair)=={'immortal','demonic'} and len(set(pair.values()))==2 for pair in variants.values()),group

for entry in data['cinematic']:
    image=read(entry['file'])
    assert image.width>=1280 and image.height>=700
for alignment in ('immortal','demonic'):
    with wave.open(str(OUT/f'intro_{alignment}_score.wav')) as audio:
        assert 17<=audio.getnframes()/audio.getframerate()<=21
assert len(list(OUT.glob('avatar_*.png'))) >= 24+24+132+88+80+4+22+12
print('v1.6.0 art: all faction variants, portraits, map grounds, title frames, cinematic scenes and scores validated')
