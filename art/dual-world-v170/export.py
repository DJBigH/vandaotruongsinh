"""Paint native-size dual-world character, monster, map and ritual art."""
from __future__ import annotations

import hashlib
import json
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageOps

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'client/public/assets'
OUT = SOURCE / 'v170'
OUT.mkdir(exist_ok=True)
NPCS = ('elder', 'healer', 'guard', 'mentor', 'sect_master', 'sword_spirit',
        'rebel_cultivator', 'mountain_god', 'dan_ton', 'inner_voice',
        'covenant_arbiter', 'tower_keeper')
MA_MAPS = ('map_huyen_u_khe', 'map_u_lam', 'map_huyen_ma_tong', 'map_huyet_dan_coc',
           'map_huyet_kiem_di_tich', 'map_cuu_u_vuc', 'map_vong_tam_canh',
           'map_huyet_mach_thien_son', 'map_huyet_khe_dai', 'map_tran_hon_thap')
TIAN_MAPS = ('map_thanh_khe', 'map_thanh_khe_rung', 'map_thanh_van', 'map_dan_ha',
             'map_co_kiem_di_tich', 'map_u_minh_vuc', 'map_kinh_tam_canh',
             'map_long_mach_thien_son', 'map_thien_khe_dai', 'map_tran_yeu_thap')
# Each row is the native painted anatomy used as a starting point, with a unique
# silhouette, trim, pigment and sigil for that monster ID and its elite variant.
FORMS = ('wolf wolf snake fox wolf puppet snake fox fox fox '
         'fox fox treant snake snake fox puppet treant puppet puppet '
         'fox puppet snake fox wolf puppet wolf fox fox wolf '
         'fox wolf wolf treant snake puppet puppet puppet fox puppet').split()
assert len(FORMS) == 40
PALETTE = {
    'immortal': [(74, 124, 102), (150, 168, 133), (191, 159, 94), (76, 127, 148)],
    'demonic': [(119, 46, 64), (147, 74, 73), (97, 57, 108), (168, 105, 68)],
}
manifest = {'npc': [], 'monster': [], 'map': [], 'portal': [], 'prop': []}
ENVIRONMENT = ('building_hall','building_herbalist','building_barracks','building_house',
               'prop_pine_tree','prop_broadleaf_tree','prop_ancient_rock',
               'prop_stone_lantern','prop_shrine','prop_sect_gate')
manifest['environment'] = []


def src(path: str) -> Image.Image:
    return Image.open(SOURCE / path).convert('RGBA')


def save(im: Image.Image, name: str) -> str:
    im.save(OUT / name, optimize=True)
    return 'assets/v170/' + name


def shade(im: Image.Image, color: tuple[int, int, int], amount: float) -> Image.Image:
    rgb = Image.blend(im.convert('RGB'), ImageOps.colorize(ImageOps.grayscale(im.convert('RGB')),
        black=tuple(max(0, v // 4) for v in color), white=tuple(min(255, v + 100) for v in color)), amount)
    rgb.putalpha(im.getchannel('A'))
    return rgb


def crest(d: ImageDraw.ImageDraw, x: int, y: int, scale: int,
          color: tuple[int, int, int], alignment: str, index: int, elite: bool = False):
    ink = (*color, 255)
    line = max(1, scale // 6)
    # Organic antlers, bone, feathers and beast teeth rather than polygon badges.
    if index % 4 == 0:
        d.arc((x-scale,y-scale,x+scale,y+scale), 192, 340, fill=ink, width=line)
        d.line((x-scale//2,y-scale//2,x-scale,y-scale*2), fill=ink, width=line)
        d.line((x+scale//2,y-scale//2,x+scale,y-scale*2), fill=ink, width=line)
    elif index % 4 == 1:
        for side in (-1,1):
            d.polygon(((x+side*scale//3,y),(x+side*scale,y-scale*2),
                       (x+side*scale//2,y-scale//2)), fill=ink)
    elif index % 4 == 2:
        d.line((x-scale,y,x,y-scale,x+scale,y),fill=ink,width=line)
        d.arc((x-scale,y-scale,x+scale,y+scale),15,160,fill=ink,width=line)
    else:
        for side in (-1,1):
            d.ellipse((x+side*scale-scale//3,y-scale,x+side*scale+scale//3,y-scale//3),fill=ink)
    if elite:
        d.arc((x-scale*2,y-scale*2,x+scale*2,y+scale*2),202,338,fill=(234,190,116,255),width=line)
    if alignment == 'demonic':
        d.polygon(((x,y-scale),(x+scale//3,y),(x,y+scale//2),(x-scale//3,y)),
                  fill=(226,123,110,255))


def paint_npcs():
    for index, name in enumerate(NPCS):
        key = 'npc_' + name
        sheet = src(f'v160/{key}_demonic.png')
        pigment = PALETTE['demonic'][index % 4]
        portrait = shade(src(f'v120/avatar_{key}.png'),pigment,.44)
        px=portrait.load()
        for y in range(100,192):
            for x in range(192):
                r,g,b,a=px[x,y]
                if a>0 and b>r*1.04 and b>g*.91:
                    tone=(r+g+b)//3
                    px[x,y]=(int(tone*.73),int(tone*.43),int(tone*.55),a)
        for frame in range(sheet.width // 64):
            d = ImageDraw.Draw(sheet)
            x = frame * 64 + 32
            # Recut the robes: dark shoulder mantle, split skirt, embroidered hem.
            d.polygon(((x-13,32),(x-19,40),(x-12,46),(x-7,37),
                       (x+7,37),(x+12,46),(x+19,40),(x+13,32)),fill=(*pigment,255))
            d.polygon(((x-10,44),(x-14,58),(x-2,56),(x,45),(x+2,56),(x+14,58),(x+10,44)),
                      fill=(47,26,43,255))
            d.line((x-13,54,x-4,52,x,56,x+4,52,x+13,54),fill=(195,132,93,255),width=2)
            crest(d,x,31,5,(181,93,88),'demonic',index)
            if index in (2,4,6,10):
                d.line((x+15,26,x+18,53),fill=(106,70,59,255),width=2)
                d.polygon(((x+15,25),(x+19,18),(x+21,28)),fill=(216,143,100,255))
        p = ImageDraw.Draw(portrait)
        # Fine embroidery leaves the painted face, hands and props visible.
        p.arc((11,131,46,185),200,318,fill=(181,113,100,255),width=3)
        p.arc((146,131,181,185),222,340,fill=(181,113,100,255),width=3)
        crest(p,96,31,7,(219,141,106),'demonic',index)
        manifest['npc'].append({'id':key,'alignment':'demonic',
            'sprite':save(sheet,f'{key}_demonic.png'),
            'avatar':save(portrait,f'avatar_{key}_demonic.png')})


def paint_monsters():
    for number, form in enumerate(FORMS, 1):
        key=f'mon_{number:03d}'
        base=src(f'vnext/monster_{form}.png')
        face=src(f'v120/avatar_monster_{form}.png')
        for alignment in ('immortal','demonic'):
            pigment=PALETTE[alignment][(number + number//5) % 4]
            for elite in (False,True):
                marker='_elite' if elite else ''
                # Six native 64px frames: walk 0-3, windup 4, strike 5.
                sprite=shade(base.crop((0,0,384,64)),pigment,.16 if not elite else .28)
                for frame in range(6):
                    d=ImageDraw.Draw(sprite)
                    x=frame*64+32+(frame%2)
                    if elite: crest(d,x,23,4,pigment,alignment,number,True)
                    d.line((x-13,43,x-6,38,x+7,39,x+14,43),
                           fill=(*pigment,255),width=2 if elite else 1)
                    if number%3==0:
                        d.polygon(((x-3,29),(x+2,23),(x+6,32)),fill=(*pigment,255))
                    for bit in range(6):
                        if number & (1 << bit):
                            px=x-12+bit*4
                            d.ellipse((px,54,px+1,55),fill=(*pigment,255))
                    if elite:
                        d.arc((x-19,18,x+19,51),200,340,fill=(222,170,99,255),width=2)
                avatar=shade(face,pigment,.24 if not elite else .33)
                d=ImageDraw.Draw(avatar)
                if elite: crest(d,96,58,23,pigment,alignment,number,True)
                else: crest(d,31,136,10,pigment,alignment,number)
                d.arc((22,143,170,182),15,165,fill=(*pigment,255),width=4 if elite else 2)
                for i in range(number%5+1):
                    x=61+i*17
                    d.ellipse((x,178,x+4,182),fill=(237,198,125,255))
                if elite:
                    d.arc((15,15,177,177),190,350,fill=(225,177,107,255),width=5)
                    d.polygon(((96,7),(106,29),(96,38),(86,29)),fill=(225,177,107,255))
                if alignment=='demonic':
                    d.arc((17,25,175,177),25,135,fill=(188,103,93,255),width=2)
                entry={'id':key,'alignment':alignment,'elite':elite,
                    'sprite':save(sprite,f'{key}{marker}_{alignment}.png'),
                    'avatar':save(avatar,f'avatar_{key}{marker}_{alignment}.png')}
                manifest['monster'].append(entry)


def portal(alignment: str):
    im=Image.new('RGBA',(64,64))
    d=ImageDraw.Draw(im)
    ma=alignment=='demonic'
    stone=(61,45,53,255) if ma else (91,105,86,255)
    edge=(180,105,91,255) if ma else (206,185,123,255)
    mist=(130,55,67,185) if ma else (105,160,139,185)
    # Ancient hand-hewn standing stones, no electronic ring.
    for flip in (-1,1):
        x=32+flip*22
        d.polygon(((x-5,57),(x-6,21),(x-2,13),(x+4,17),(x+5,56)),fill=stone)
        d.line((x-3,23,x-1,18,x+2,21),fill=edge,width=2)
        for y in (28,39,48):
            d.arc((x-3,y-3,x+3,y+3),20 if flip>0 else 180,160 if flip>0 else 340,fill=edge,width=1)
    d.arc((10,3,54,46),188,352,fill=stone,width=8)
    d.arc((12,5,52,43),192,348,fill=edge,width=2)
    d.line((7,57,57,57),fill=stone,width=5)
    d.arc((15,26,49,53),190,345,fill=mist,width=3)
    d.arc((19,22,45,49),18,170,fill=mist,width=2)
    d.line((20,45,27,40,36,42,44,34),fill=mist,width=2)
    if ma:
        d.polygon(((31,13),(35,20),(32,27),(29,20)),fill=edge)
        d.line((29,46,32,39,36,46),fill=edge,width=2)
    else:
        d.arc((25,12,40,27),185,330,fill=edge,width=2)
        d.ellipse((31,13,34,16),fill=edge)
    return im


def paint_portals():
    for alignment in ('immortal','demonic'):
        im=portal(alignment)
        portrait=im.resize((192,192),Image.Resampling.NEAREST)
        # Source gate is native 64px; portrait adds native 192px ink rather than
        # presenting a blurred enlargement as its only detail.
        p=ImageDraw.Draw(portrait)
        c=(218,185,124,255) if alignment=='immortal' else (218,124,107,255)
        for i in range(7):
            x=29+i*22
            p.arc((x-8,136-i%2*5,x+14,154-i%2*5),210,330,fill=c,width=2)
        p.arc((18,6,174,182),201,337,fill=c,width=4)
        manifest['portal'].append({'alignment':alignment,
            'sprite':save(im,f'prop_portal_{alignment}.png'),
            'avatar':save(portrait,f'avatar_prop_portal_{alignment}.png')})
        sheet=Image.new('RGBA',(96*4,96))
        for frame in range(4):
            d=ImageDraw.Draw(sheet)
            x=frame*96+48
            radius=15+frame*8
            d.arc((x-radius,48-radius,x+radius,48+radius),185,350,fill=c,width=3)
            d.arc((x-radius+7,48-radius+7,x+radius-7,48+radius-7),20,160,fill=c,width=2)
            d.polygon(((x,48-radius),(x+4,48-radius+8),(x,48-radius+13),(x-4,48-radius+8)),fill=c)
        save(sheet,f'vfx_teleport_{alignment}.png')


def paint_maps():
    for index,map_id in enumerate(MA_MAPS):
        rng=random.Random(map_id)
        base=src(f'v160/mapground_{"map_huyen_u_khe" if index == 0 else ["map_thanh_khe_rung","map_thanh_van","map_dan_ha","map_co_kiem_di_tich","map_u_minh_vuc","map_kinh_tam_canh","map_long_mach_thien_son","map_thien_khe_dai","map_tran_yeu_thap"][index-1]}_demonic.png')
        tile=shade(base, PALETTE['demonic'][index%4],.52)
        d=ImageDraw.Draw(tile)
        for n in range(28):
            x,y=rng.randrange(256),rng.randrange(256)
            length=5+(index+n)%13
            d.line((x,y,x+length//2,y-length,x+length,y-length//2),
                   fill=(*PALETTE['demonic'][index%4],140),width=1)
        portrait=tile.resize((192,192),Image.Resampling.LANCZOS)
        landmark=src(f'v160/avatar_{"map_huyen_u_khe" if index == 0 else ["map_thanh_khe_rung","map_thanh_van","map_dan_ha","map_co_kiem_di_tich","map_u_minh_vuc","map_kinh_tam_canh","map_long_mach_thien_son","map_thien_khe_dai","map_tran_yeu_thap"][index-1]}_demonic.png')
        portrait=Image.blend(portrait,shade(landmark,PALETTE['demonic'][index%4],.42),.48)
        p=ImageDraw.Draw(portrait)
        crest(p,96,35,12,PALETTE['demonic'][index%4],'demonic',index,True)
        p.arc((8,6,184,185),18,160,fill=(223,139,107,255),width=3)
        manifest['map'].append({'id':map_id,'alignment':'demonic',
            'ground':save(tile,f'mapground_{map_id}_demonic.png'),
            'avatar':save(portrait,f'avatar_{map_id}_demonic.png')})


def paint_region_steles():
    for index, map_id in enumerate(TIAN_MAPS):
        stone=Image.new('RGBA',(96,128))
        d=ImageDraw.Draw(stone)
        c=PALETTE['demonic'][index%4]
        d.ellipse((13,108,83,126),fill=(48,29,40,255))
        d.polygon(((28,111),(24,41),(34,24),(47,13),(58,26),(71,40),
                   (68,111)),fill=(61,48,55,255))
        d.polygon(((36,107),(34,44),(47,26),(60,45),(59,107)),fill=(91,69,68,255))
        d.line((25,42,34,26,47,13,58,26,70,42),fill=(167,119,99,255),width=3)
        d.line((26,102,69,102),fill=(185,130,101,255),width=3)
        crest(d,47,62,11,c,'demonic',index,True)
        for y in (80,91):
            d.arc((38,y-4,57,y+4),195,345,fill=(177,118,99,255),width=2)
        portrait=Image.new('RGBA',(192,192))
        portrait.alpha_composite(stone.resize((144,192),Image.Resampling.LANCZOS),(24,0))
        manifest['prop'].append({'id':f'prop_ma_{map_id}','alignment':'demonic',
            'sprite':save(stone,f'prop_ma_{map_id}.png'),
            'avatar':save(portrait,f'avatar_prop_ma_{map_id}.png')})


def paint_environment():
    for index,key in enumerate(ENVIRONMENT):
        art=src(f'v160/{key}_demonic.png')
        w,h=art.size
        pixels=art.load()
        for y in range(h):
            for x in range(w):
                r,g,b,a=pixels[x,y]
                if not a: continue
                green=g>r*1.05 and g>b*.82
                roof=key.startswith('building') and y<h*.53
                if green and (roof or 'tree' in key):
                    light=(r+g+b)/3
                    pixels[x,y]=(int(light*.67),int(light*.48),int(light*.57),a)
                elif roof and a>180:
                    pixels[x,y]=(int(r*.73),int(g*.65),int(b*.72),a)
        d=ImageDraw.Draw(art)
        if key.startswith('building'):
            for anchor in (.24,.76):
                x=int(w*anchor)
                y=int(h*.56)
                d.line((x,y,x,y+int(h*.12)),fill=(178,117,94,255),width=max(2,w//110))
                d.polygon(((x-7,y+int(h*.12)),(x,y+int(h*.16)),
                           (x+7,y+int(h*.12))),fill=(106,47,65,255))
            d.arc((w*.17,h*.12,w*.83,h*.49),185,350,fill=(174,117,93,255),width=3)
        elif 'tree' in key:
            for n in range(5):
                x=int(w*(.22+n*.13)); y=int(h*(.25+(n%2)*.14))
                d.ellipse((x-3,y-3,x+3,y+3),fill=(161,80,89,255))
        else:
            crest(d,w//2,int(h*.44),max(5,min(w,h)//9),
                  PALETTE['demonic'][index%4],'demonic',index)
        portrait=Image.new('RGBA',(192,192))
        size=art.copy()
        size.thumbnail((176,176),Image.Resampling.LANCZOS)
        portrait.alpha_composite(size,((192-size.width)//2,(192-size.height)//2))
        p=ImageDraw.Draw(portrait)
        p.arc((8,8,184,184),198,340,fill=(188,122,99,255),width=3)
        p.arc((18,18,174,174),20,155,fill=(121,65,80,255),width=2)
        manifest['environment'].append({'id':key,'alignment':'demonic',
            'sprite':save(art,f'{key}_demonic.png'),
            'avatar':save(portrait,f'avatar_{key}_demonic.png')})


paint_npcs()
paint_monsters()
paint_portals()
paint_maps()
paint_region_steles()
paint_environment()
(Path(__file__).parent/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
print({key:len(value) for key,value in manifest.items()})
