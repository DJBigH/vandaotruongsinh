"""Deterministic Tiên/Ma art pack. Source portraits stay at native 192px detail."""
from __future__ import annotations

import json
import math
import random
import wave
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageOps

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
ASSETS = ROOT / 'client/public/assets'
OUT = ASSETS / 'v160'
OUT.mkdir(parents=True, exist_ok=True)
ALIGNMENTS = ('immortal', 'demonic')
NPCS = ('elder', 'healer', 'guard', 'mentor', 'sect_master', 'sword_spirit',
        'rebel_cultivator', 'mountain_god', 'dan_ton', 'inner_voice',
        'covenant_arbiter', 'tower_keeper')
MOUNTS = ('mount_crane', 'mount_shadow_wolf', 'mount_fox', 'mount_turtle',
          'mount_stag', 'mount_underworld_horse')
WEAPONS = ('sword', 'staff', 'fists', 'spear', 'bow', 'axe')
EQUIPMENT = ('robe', 'armor', 'boots', 'ring')
PROPS = ('building_hall', 'building_herbalist', 'building_barracks', 'building_house',
         'prop_pine_tree', 'prop_broadleaf_tree', 'prop_ancient_rock',
         'prop_stone_lantern', 'prop_shrine', 'prop_sect_gate', 'prop_portal')
MAPS = ('map_thanh_khe', 'map_huyen_u_khe', 'map_thanh_khe_rung', 'map_thanh_van',
        'map_dan_ha', 'map_co_kiem_di_tich', 'map_u_minh_vuc', 'map_kinh_tam_canh',
        'map_long_mach_thien_son', 'map_thien_khe_dai', 'map_tran_yeu_thap')
TITLES = ('heir', 'wanderer', 'guardian', 'dragon', 'sovereign', 'ascendant')
COLORS = {
    'immortal': {'ink': (39, 86, 69, 255), 'light': (231, 211, 151, 255),
                 'deep': (27, 51, 60, 255), 'cloth': (110, 191, 164, 255)},
    'demonic': {'ink': (92, 30, 54, 255), 'light': (224, 127, 115, 255),
                'deep': (35, 20, 43, 255), 'cloth': (145, 64, 79, 255)},
}
manifest: dict[str, list] = {'npc': [], 'mount': [], 'weapon': [], 'equipment': [], 'boss': [],
                             'prop': [], 'map': [], 'title': [], 'cinematic': []}


def source(name: str) -> Image.Image:
    return Image.open(ASSETS / name).convert('RGBA')


def save(image: Image.Image, name: str) -> str:
    image.save(OUT / name, optimize=True)
    return f'assets/v160/{name}'


def lineage_dye(image: Image.Image, alignment: str, strength: float) -> Image.Image:
    """Dye the original garment/material pixels while preserving painted values and alpha."""
    original = image.convert('RGBA')
    shaded = ImageOps.colorize(ImageOps.grayscale(original.convert('RGB')),
        black='#193d3d' if alignment == 'immortal' else '#251326',
        white='#e2d6ac' if alignment == 'immortal' else '#d28b83')
    dyed = Image.blend(original.convert('RGB'), shaded, strength).convert('RGBA')
    dyed.putalpha(original.getchannel('A'))
    return dyed


def branch(image: Image.Image, alignment: str, frame: tuple[int, int] | None = None,
           kind: str = 'person') -> Image.Image:
    """Paint physical faction signifiers on every frame, preserving source silhouette."""
    image = lineage_dye(image, alignment, .23 if alignment == 'immortal' else .38)
    fw, fh = frame or image.size
    colors = COLORS[alignment]
    for index in range(image.width // fw):
        x = index * fw
        layer = Image.new('RGBA', image.size)
        d = ImageDraw.Draw(layer)
        cx = x + fw // 2
        if kind == 'person':
            scale = fh / 64
            y = int(fh * .24)
            if alignment == 'immortal':
                d.polygon([(cx-10*scale,y+7*scale),(cx,y-5*scale),
                           (cx+10*scale,y+7*scale),(cx,y+5*scale)], fill=colors['light'])
                d.line([(cx-13*scale,y+30*scale),(cx-3*scale,y+33*scale),
                        (cx+10*scale,y+28*scale)], fill=colors['cloth'], width=max(2,int(2*scale)))
                d.arc((cx-21*scale,y-15*scale,cx+21*scale,y+27*scale),205,318,
                      fill=colors['light'],width=max(1,int(2*scale)))
            else:
                d.polygon([(cx-12*scale,y+8*scale),(cx-8*scale,y-10*scale),
                           (cx-2*scale,y+5*scale),(cx+2*scale,y+5*scale),
                           (cx+8*scale,y-10*scale),(cx+12*scale,y+8*scale)], fill=colors['deep'])
                d.line([(cx-13*scale,y+29*scale),(cx,y+35*scale),
                        (cx+13*scale,y+29*scale)], fill=colors['light'],width=max(2,int(2*scale)))
                d.polygon([(cx-15*scale,y+23*scale),(cx-8*scale,y+27*scale),
                           (cx-13*scale,y+35*scale)],fill=colors['cloth'])
        elif kind in ('mount', 'boss'):
            y = int(fh * (.38 if kind == 'mount' else .30))
            unit = fh / 96
            if alignment == 'immortal':
                d.polygon([(cx-24*unit,y),(cx,y-8*unit),(cx+23*unit,y+2*unit),
                           (cx+14*unit,y+10*unit),(cx-19*unit,y+10*unit)],fill=colors['ink'])
                d.line([(cx-23*unit,y),(cx,y-8*unit),(cx+22*unit,y+2*unit)],
                       fill=colors['light'],width=max(2,int(3*unit)))
                for off in (-13,0,13):
                    d.line([(cx+off*unit,y+10*unit),(cx+(off-4)*unit,y+19*unit)],
                           fill=colors['light'],width=max(1,int(2*unit)))
            else:
                d.polygon([(cx-25*unit,y+3*unit),(cx-16*unit,y-12*unit),
                           (cx-9*unit,y+3*unit),(cx+14*unit,y-14*unit),
                           (cx+25*unit,y+7*unit),(cx,y+14*unit)],fill=colors['deep'])
                d.line([(cx-25*unit,y+3*unit),(cx,y+14*unit),(cx+25*unit,y+7*unit)],
                       fill=colors['light'],width=max(2,int(3*unit)))
                d.polygon([(cx-22*unit,y+13*unit),(cx-12*unit,y+25*unit),
                           (cx-4*unit,y+12*unit)],fill=colors['cloth'])
        elif kind == 'weapon':
            r = max(4, round(fh * .13))
            d.line([(cx-r*2,fh*.71),(cx+r*2,fh*.25)],fill=colors['light'],width=max(2,round(fh*.035)))
            if alignment == 'immortal':
                d.polygon([(cx+r,fh*.25),(cx+r*2,fh*.15),(cx+r*2,fh*.30)],fill=colors['cloth'])
                d.arc((cx-r*1.7,fh*.23,cx+r*1.7,fh*.56),155,280,fill=colors['ink'],width=max(2,round(fh*.025)))
            else:
                d.polygon([(cx+r,fh*.21),(cx+r*1.5,fh*.07),(cx+r*2.4,fh*.2),
                           (cx+r*2,fh*.31)],fill=colors['cloth'])
                d.line([(cx-r*1.6,fh*.68),(cx-r*.7,fh*.54)],fill=colors['ink'],width=max(2,round(fh*.04)))
        elif kind == 'equipment':
            unit=fh/64
            if alignment=='immortal':
                d.arc((cx-15*unit,fh*.21,cx+15*unit,fh*.68),180,350,
                      fill=colors['light'],width=max(2,round(2*unit)))
                d.polygon([(cx,fh*.25),(cx+5*unit,fh*.36),(cx,fh*.49),(cx-5*unit,fh*.36)],
                          fill=colors['cloth'])
                d.line([(cx-10*unit,fh*.72),(cx+10*unit,fh*.72)],
                       fill=colors['ink'],width=max(2,round(2*unit)))
            else:
                d.polygon([(cx-13*unit,fh*.26),(cx-5*unit,fh*.13),(cx,fh*.29),
                           (cx+5*unit,fh*.13),(cx+13*unit,fh*.26),(cx,fh*.57)],
                          outline=colors['light'],width=max(2,round(2*unit)))
                d.polygon([(cx,fh*.30),(cx+6*unit,fh*.43),(cx,fh*.54),(cx-6*unit,fh*.43)],
                          fill=colors['cloth'])
                d.line([(cx-10*unit,fh*.72),(cx+10*unit,fh*.72)],
                       fill=colors['ink'],width=max(2,round(2*unit)))
        image = Image.alpha_composite(image, layer)
    return image


def avatar(image: Image.Image, alignment: str, kind: str) -> Image.Image:
    # All portraits start from original 192px illustration, never enlarged 64px sprites.
    image = lineage_dye(image, alignment, .16 if alignment == 'immortal' else .29) if kind in ('person','mount','boss') else image.copy()
    palette = COLORS[alignment]
    overlay = Image.new('RGBA',(192,192))
    d = ImageDraw.Draw(overlay)
    if alignment == 'immortal':
        d.arc((15,8,177,177),190,348,fill=palette['light'],width=5)
        d.arc((22,15,170,170),30,150,fill=palette['cloth'],width=3)
        d.polygon([(96,7),(104,18),(96,29),(88,18)],fill=palette['light'])
        d.line([(20,150),(55,166),(96,175),(137,166),(172,150)],fill=palette['ink'],width=5)
    else:
        d.line([(18,158),(45,173),(96,183),(147,173),(174,158)],fill=palette['light'],width=5)
        d.polygon([(24,32),(37,4),(54,30),(96,15),(138,30),(155,4),(168,32)],fill=palette['deep'])
        d.line([(24,32),(37,4),(54,30),(96,15),(138,30),(155,4),(168,32)],fill=palette['light'],width=4)
        d.polygon([(90,12),(96,2),(102,12),(96,24)],fill=palette['light'])
    if kind == 'mount':
        d.line([(25,145),(96,162),(167,145)],fill=palette['cloth'],width=8)
    return Image.alpha_composite(image,overlay)


def make_npcs() -> None:
    for name in NPCS:
        key = 'npc_' + name
        old = name in NPCS[:4]
        sprite = source(f'{"vnext" if old else "v110"}/{key}.png')
        gestures = source(f'v120/{key}_idle_greet_speak_react.png') if not old else None
        face = source(f'v120/avatar_{key}.png')
        for alignment in ALIGNMENTS:
            entry = {'id':key,'alignment':alignment,
                     'sprite':save(branch(sprite,alignment,(64,64)),f'{key}_{alignment}.png'),
                     'avatar':save(avatar(face,alignment,'person'),f'avatar_{key}_{alignment}.png')}
            if gestures:
                entry['gestures'] = save(branch(gestures,alignment,(64,64)),f'{key}_gestures_{alignment}.png')
            manifest['npc'].append(entry)


def make_mounts() -> None:
    for key in MOUNTS:
        for alignment in ALIGNMENTS:
            entry = {'id':key,'alignment':alignment}
            for state,folder in (('ride','v105'),('wild','v120')):
                entry[state] = save(branch(source(f'{folder}/{key}_{state}.png'),alignment,(128,96),'mount'),
                                    f'{key}_{state}_{alignment}.png')
            for state in ('wild','bonded'):
                entry['avatar_'+state] = save(avatar(source(f'v120/avatar_{key}_{state}.png'),alignment,'mount'),
                                              f'avatar_{key}_{state}_{alignment}.png')
            manifest['mount'].append(entry)


def make_bosses() -> None:
    for number in range(1,21):
        key=f'boss_{number:03d}'
        for alignment in ALIGNMENTS:
            entry={'id':key,'alignment':alignment}
            for state in ('actions','move','phase','death'):
                old = 'idle_windup_attack_hurt' if state == 'actions' else state
                entry[state]=save(branch(source(f'v120/{key}_{old}.png'),alignment,(128,128),'boss'),
                                  f'{key}_{state}_{alignment}.png')
            for state in ('normal','phase'):
                suffix='' if state=='normal' else '_phase'
                entry['avatar_'+state]=save(avatar(source(f'v120/avatar_{key}{suffix}.png'),alignment,'boss'),
                                            f'avatar_{key}{suffix}_{alignment}.png')
            manifest['boss'].append(entry)


def make_weapons() -> None:
    for kind in WEAPONS:
        for level in range(11):
            key=f'weapon_{kind}_{level}'
            icon=source(f'{"v110" if level<=5 else "v130"}/{key}.png')
            # Low levels use a detailed portrait reconstructed from the native high-level master.
            face=source(f'v130/avatar_weapon_{kind}_{max(6,level)}.png')
            if level<=5: face=ImageEnhance.Color(face).enhance(.70+level*.05)
            for alignment in ALIGNMENTS:
                manifest['weapon'].append({'id':key,'alignment':alignment,
                    'icon':save(branch(icon,alignment,kind='weapon'),f'{key}_{alignment}.png'),
                    'avatar':save(avatar(branch(face,alignment,kind='weapon'),alignment,'weapon'),
                                  f'avatar_{key}_{alignment}.png')})


def make_equipment() -> None:
    for family in EQUIPMENT:
        for level in range(11):
            key=f'equipment_{family}_{level}'
            folder='v120' if level<=5 else 'v130'
            icon=source(f'{folder}/icon_{key}.png')
            face=source(f'{folder}/avatar_{key}.png')
            for alignment in ALIGNMENTS:
                manifest['equipment'].append({'id':key,'alignment':alignment,
                    'icon':save(branch(icon,alignment,kind='equipment'),f'icon_{key}_{alignment}.png'),
                    'avatar':save(avatar(branch(face,alignment,kind='equipment'),alignment,'equipment'),
                                  f'avatar_{key}_{alignment}.png')})


def make_props() -> None:
    def ritual_site(key: str, alignment: str) -> Image.Image:
        art=Image.new('RGBA',(192,192))
        d=ImageDraw.Draw(art); c=COLORS[alignment]
        if key=='prop_portal':
            if alignment=='immortal':
                d.polygon([(27,174),(34,119),(50,71),(73,39),(96,30),(119,39),
                           (143,71),(158,119),(165,174),(145,167),(135,111),
                           (115,67),(96,58),(77,67),(57,111),(47,167)],fill=c['ink'])
                d.line([(30,167),(40,111),(58,70),(77,47),(96,37),(115,47),
                        (134,70),(152,111),(162,167)],fill=c['light'],width=6,joint='curve')
                for x,y in ((42,110),(149,110),(61,65),(130,65)):
                    d.arc((x-16,y-6,x+16,y+12),160,350,fill=c['cloth'],width=4)
                d.polygon([(83,33),(96,17),(109,33),(96,48)],fill=c['light'])
            else:
                d.polygon([(25,171),(31,121),(43,72),(25,26),(65,55),(80,36),
                           (95,23),(111,36),(127,55),(167,26),(149,72),
                           (161,121),(167,171),(143,164),(134,118),
                           (121,77),(96,59),(71,77),(58,118),(49,164)],fill=c['deep'])
                d.line([(27,167),(39,112),(57,69),(80,48),(95,35),(111,48),
                        (135,69),(153,112),(165,167)],fill=c['light'],width=6,joint='curve')
                d.polygon([(79,37),(95,12),(111,37),(96,54)],fill=c['cloth'])
                for x,y in ((42,108),(151,108),(60,67),(133,67)):
                    d.polygon([(x,y-8),(x+5,y),(x,y+8),(x-5,y)],fill=c['light'])
            d.line([(24,177),(168,177)],fill=c['light'],width=6)
            d.polygon([(28,174),(46,156),(58,175),(130,175),(146,156),(165,174)],fill=c['ink'])
        else:
            d.polygon([(24,153),(45,136),(147,136),(168,153),(160,174),(32,174)],fill=c['deep'])
            d.line([(24,153),(168,153)],fill=c['light'],width=6)
            d.polygon([(54,136),(64,54),(96,28),(128,54),(138,136)],fill=c['ink'])
            d.line([(64,53),(96,29),(128,53)],fill=c['light'],width=5)
            d.polygon([(69,61),(96,46),(123,61),(119,126),(73,126)],fill=c['deep'])
            if alignment=='immortal':
                d.polygon([(96,118),(79,88),(88,67),(96,93),(104,67),(113,88)],fill=c['cloth'])
                d.arc((54,105,138,148),20,160,fill=c['light'],width=4)
            else:
                d.polygon([(96,119),(80,87),(85,64),(95,82),(107,64),(112,87)],fill=c['cloth'])
                d.line([(77,72),(67,54),(84,61)],fill=c['light'],width=4)
                d.line([(115,72),(125,54),(108,61)],fill=c['light'],width=4)
            d.line([(36,172),(156,172)],fill=c['light'],width=5)
        return art

    for key in PROPS:
        old='prop_portal' == key
        base=source(f'{key}.png' if old else f'vnext/{key}.png')
        for alignment in ALIGNMENTS:
            if key in ('prop_portal','prop_shrine'):
                master=ritual_site(key,alignment)
                art=master.resize(base.size,Image.Resampling.LANCZOS)
                manifest['prop'].append({'id':key,'alignment':alignment,
                    'sprite':save(art,f'{key}_{alignment}.png'),
                    'avatar':save(avatar(master,alignment,'prop'),f'avatar_{key}_{alignment}.png')})
                continue
            image=base.copy()
            d=ImageDraw.Draw(image)
            w,h=image.size; c=COLORS[alignment]
            if key.startswith('building') or 'gate' in key:
                for x in (int(w*.23),int(w*.76)):
                    d.polygon([(x-8,int(h*.35)),(x+8,int(h*.35)),(x+8,int(h*.58)),
                               (x,int(h*.53)),(x-8,int(h*.58))],fill=c['ink'])
                    d.line([(x-8,int(h*.35)),(x+8,int(h*.35))],fill=c['light'],width=3)
                d.arc((w*.2,h*.2,w*.8,h*.55),180,360,fill=c['light'],width=3)
            elif 'tree' in key:
                for i in range(3):
                    x=int(w*(.34+i*.16)); y=int(h*(.22+(i%2)*.14))
                    if alignment=='immortal':
                        for dx,dy in ((-5,0),(5,0),(0,-5),(0,5)):
                            d.ellipse((x+dx-3,y+dy-3,x+dx+3,y+dy+3),fill=c['light'])
                    else:
                        d.polygon([(x,y-9),(x+7,y),(x,y+10),(x-7,y)],fill=c['cloth'])
            else:
                d.arc((w*.2,h*.16,w*.8,h*.8),80,310,fill=c['light'],width=max(2,w//40))
                d.polygon([(w*.5,h*.15),(w*.6,h*.36),(w*.5,h*.50),(w*.4,h*.36)],fill=c['ink'])
            entry={'id':key,'alignment':alignment,'sprite':save(image,f'{key}_{alignment}.png')}
            manifest['prop'].append(entry)


def make_maps() -> None:
    bases=['ground_grass','ground_dirt','ground_stone','ground_water']
    for map_id in MAPS:
        source_key=bases[2] if map_id in ('map_thanh_van','map_co_kiem_di_tich','map_u_minh_vuc',
                  'map_kinh_tam_canh','map_long_mach_thien_son','map_thien_khe_dai','map_tran_yeu_thap') else bases[1] if map_id=='map_dan_ha' else bases[0]
        raw=source('vnext/'+source_key+'.png')
        for alignment in ALIGNMENTS:
            tint=Image.new('RGBA',(256,256),COLORS[alignment]['deep'][:3]+(255,))
            tile=Image.blend(raw,tint,.20 if alignment=='immortal' else .31)
            d=ImageDraw.Draw(tile)
            rng=random.Random(map_id+alignment)
            for i in range(15 if alignment=='demonic' else 11):
                x,y=rng.randrange(256),rng.randrange(256)
                c=(100,121,94,255) if alignment=='immortal' else (105,70,76,255)
                if alignment=='immortal':
                    d.arc((x-5,y-2,x+5,y+3),18,155,fill=c,width=1)
                    d.line([(x-3,y+2),(x+3,y+2)],fill=c,width=1)
                else:
                    d.line([(x-4,y+2),(x-1,y-3),(x+3,y+2)],fill=c,width=1)
                    if i%3==0: d.line([(x-1,y-3),(x,y-6)],fill=c,width=1)
            portrait=tile.resize((192,192),Image.Resampling.LANCZOS)
            landmark=source('vnext/building_hall.png' if map_id in ('map_thanh_khe','map_huyen_u_khe','map_thanh_van')
                            else 'vnext/prop_shrine.png')
            landmark.thumbnail((144,122),Image.Resampling.LANCZOS)
            portrait.alpha_composite(landmark,((192-landmark.width)//2,(192-landmark.height)//2+20))
            pd=ImageDraw.Draw(portrait); pd.rectangle((2,2,189,189),outline=COLORS[alignment]['light'],width=4)
            manifest['map'].append({'id':map_id,'alignment':alignment,
                'ground':save(tile,f'mapground_{map_id}_{alignment}.png'),
                'avatar':save(portrait,f'avatar_{map_id}_{alignment}.png')})


def seal(draw: ImageDraw.ImageDraw, x: int, y: int, alignment: str, slug: str, frame: int) -> None:
    c=COLORS[alignment]; pulse=frame*2
    if alignment=='immortal':
        draw.polygon([(x,y-13),(x+13,y),(x,y+13),(x-13,y)],fill=c['ink'])
        draw.arc((x-17-pulse,y-17-pulse,x+17+pulse,y+17+pulse),210,328,fill=c['light'],width=2)
        draw.line([(x-8,y+3),(x,y-4),(x+8,y+3)],fill=c['light'],width=3)
        draw.ellipse((x-3,y-9,x+3,y-3),fill=c['cloth'])
    else:
        draw.polygon([(x-14,y-12),(x-6,y-2),(x,y-14),(x+6,y-2),(x+14,y-12),
                      (x+11,y+12),(x,y+16),(x-11,y+12)],fill=c['deep'])
        draw.line([(x-14,y-12),(x-6,y-2),(x,y-14),(x+6,y-2),(x+14,y-12)],fill=c['light'],width=2)
        draw.polygon([(x,y-3-pulse),(x+5,y+8),(x,y+5),(x-5,y+8)],fill=c['cloth'])
    index=TITLES.index(slug)
    for n in range(index+1):
        px=x+(n-index/2)*9
        draw.ellipse((px-1,y+19,px+1,y+21),fill=c['light'])


def title_emblem(draw: ImageDraw.ImageDraw, slug: str, alignment: str) -> None:
    c=COLORS[alignment]; light=c['light']; cloth=c['cloth']; ink=c['ink']
    if slug=='heir':
        draw.polygon([(96,39),(75,83),(85,119),(96,138),(111,117),(116,88)],fill=ink)
        draw.polygon([(96,50),(86,91),(94,117),(103,91)],fill=light)
        draw.arc((48,71,144,154),10,170,fill=cloth,width=7)
    elif slug=='wanderer':
        draw.polygon([(42,132),(72,71),(88,98),(113,52),(152,132)],fill=ink)
        draw.line([(50,132),(74,86),(88,111),(113,68),(143,132)],fill=light,width=7)
        draw.arc((50,119,149,165),190,340,fill=cloth,width=6)
    elif slug=='guardian':
        draw.polygon([(96,38),(145,58),(134,119),(96,149),(58,119),(47,58)],fill=ink)
        draw.line([(96,45),(137,63),(127,113),(96,140),(65,113),(55,63),(96,45)],fill=light,width=6)
        draw.line([(96,60),(96,128)],fill=cloth,width=8)
        draw.line([(75,100),(117,100)],fill=light,width=7)
    elif slug=='dragon':
        # An open, winding dragon instead of the closed ring used by digital badges.
        spine=[(60,145),(49,123),(56,97),(79,82),(103,91),(109,118),(91,128),(73,114),(80,89),(113,69)]
        draw.line(spine,fill=ink,width=22,joint='curve')
        draw.line(spine,fill=light,width=10,joint='curve')
        draw.polygon([(110,71),(128,51),(149,53),(139,77),(119,84)],fill=ink)
        draw.polygon([(124,55),(125,38),(136,48)],fill=cloth)
        draw.ellipse((137,61,142,66),fill=cloth)
        draw.line([(145,73),(159,67),(145,82)],fill=light,width=3)
        for x,y in ((52,102),(69,79),(100,85),(109,119),(77,128)):
            draw.polygon([(x,y),(x+5,y-14),(x+11,y+1)],fill=cloth)
    elif slug=='sovereign':
        draw.polygon([(45,125),(43,63),(68,83),(96,41),(124,83),(149,63),(147,125)],fill=ink)
        draw.line([(45,125),(147,125)],fill=light,width=10)
        draw.line([(44,65),(68,85),(96,43),(124,85),(148,65)],fill=light,width=7)
        draw.polygon([(96,63),(109,93),(96,114),(83,93)],fill=cloth)
    else:
        draw.polygon([(50,147),(50,71),(70,40),(122,40),(142,71),(142,147)],fill=ink)
        draw.line([(50,147),(50,71),(70,40),(122,40),(142,71),(142,147)],fill=light,width=7)
        draw.polygon([(77,145),(77,76),(96,59),(115,76),(115,145)],fill=c['deep'])
        draw.arc((63,113,129,172),190,350,fill=cloth,width=7)
    if alignment=='demonic':
        draw.polygon([(54,48),(40,27),(69,42)],fill=cloth)
        draw.polygon([(138,48),(152,27),(123,42)],fill=cloth)
    else:
        draw.arc((31,25,161,151),205,335,fill=cloth,width=4)


def make_titles() -> None:
    for alignment in ALIGNMENTS:
        for slug in TITLES:
            c=COLORS[alignment]
            crest=Image.new('RGBA',(64,64)); seal(ImageDraw.Draw(crest),32,30,alignment,slug,0)
            strip=Image.new('RGBA',(768,48))
            for frame in range(4):
                d=ImageDraw.Draw(strip); x=frame*192
                d.rounded_rectangle((x+17,7,x+175,40),radius=9,fill=c['deep'],outline=c['light'],width=2)
                d.line((x+35,34,x+157,34),fill=c['cloth'],width=2)
                seal(d,x+33,24,alignment,slug,frame)
                seal(d,x+159,24,alignment,slug,frame)
                for petal in range(3):
                    px=x+54+petal*37+frame*(3 if alignment=='immortal' else -3)
                    py=10+(petal*9+frame*3)%23
                    if alignment=='immortal':
                        d.arc((px-4,py-2,px+4,py+3),10,155,fill=c['light'],width=2)
                    else:
                        d.polygon([(px,py-5),(px+3,py+1),(px,py+5),(px-3,py+1)],fill=c['cloth'])
                d.arc((x+3-frame*2,2,x+39+frame*2,45),80,265,fill=c['cloth'],width=2)
                d.arc((x+153-frame*2,2,x+189+frame*2,45),275,100,fill=c['cloth'],width=2)
            portrait=Image.new('RGBA',(192,192))
            pd=ImageDraw.Draw(portrait)
            pd.rounded_rectangle((12,17,180,175),radius=25,fill=c['deep'],outline=c['light'],width=5)
            title_emblem(pd,slug,alignment)
            manifest['title'].append({'id':slug,'alignment':alignment,
                'crest':save(crest,f'title_{alignment}_{slug}_crest.png'),
                'banner':save(strip,f'title_{alignment}_{slug}_banner.png'),
                'avatar':save(portrait,f'avatar_title_{alignment}_{slug}.png')})


def score(alignment: str, path: Path) -> None:
    import struct
    rate=22050; duration=19; notes=[220,293.66,329.63,440,493.88] if alignment=='immortal' else [164.81,220,246.94,293.66,329.63]
    pcm=bytearray()
    for sample in range(rate*duration):
        t=sample/rate; beat=int(t/.72); local=t% .72
        frequency=notes[(beat*2+beat//5)%len(notes)]
        envelope=math.exp(-local*4.1)*min(1,t/.5)*min(1,(duration-t)/1.2)
        pluck=(math.sin(2*math.pi*frequency*t)+.31*math.sin(2*math.pi*frequency*2*t))
        drone=.12*math.sin(2*math.pi*notes[0]/2*t)
        value=int(max(-1,min(1,(pluck*.17*envelope+drone)*.75))*32767)
        pcm.extend(struct.pack('<h',value))
    with wave.open(str(path),'wb') as sound:
        sound.setnchannels(1); sound.setsampwidth(2); sound.setframerate(rate); sound.writeframes(pcm)


def make_cinematic() -> None:
    for alignment in ALIGNMENTS:
        for moment in ('birth','arrival'):
            path=HERE/'source'/f'intro_{alignment}_{moment}.png'
            image=Image.open(path).convert('RGB')
            image.thumbnail((1440,810),Image.Resampling.LANCZOS)
            name=f'intro_{alignment}_{moment}.webp'; image.save(OUT/name,'WEBP',quality=88,method=6)
            manifest['cinematic'].append({'alignment':alignment,'moment':moment,'file':f'assets/v160/{name}'})
        score(alignment,OUT/f'intro_{alignment}_score.wav')


if __name__=='__main__':
    make_npcs();make_mounts();make_bosses();make_weapons();make_equipment();make_props();make_maps();make_titles();make_cinematic()
    (HERE/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print({key:len(entries) for key,entries in manifest.items()})
