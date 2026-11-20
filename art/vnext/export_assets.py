"""Technical export of original imagegen poses; never paints/recolors new anatomy.

Usage: python art/vnext/export_assets.py
Requires Pillow, numpy and scipy. Sources and prompts are retained beside this file.
This crops alpha components, normalizes alpha endpoints, aligns a foot pivot,
rescales without distortion and packs frames. Art is supplied by source PNGs.
"""
from pathlib import Path
import hashlib
import json
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
from synthesize_sfx import export_sounds

ROOT = Path(__file__).resolve().parents[2]
SOURCE = Path(__file__).resolve().parent / 'source'
OUT = ROOT / 'client/public/assets/vnext'
QA = Path(__file__).resolve().parent / 'qa'
OUT.mkdir(parents=True, exist_ok=True)
QA.mkdir(parents=True, exist_ok=True)
manifest = {'version': 1, 'tool': 'built-in image_gen',
            'export': 'art/vnext/export_assets.py', 'frameSize': [64, 64],
            'origin': [0.5, 0.875], 'footPivot': [32, 56],
            'directions': ['up', 'left', 'down', 'right'], 'assets': []}


def split_sheet(filename, cols, rows):
    """Use real component bounds: generated cells may cross nominal grid lines."""
    image = Image.open(SOURCE / filename).convert('RGBA')
    rgba = np.array(image)
    alpha = rgba[:, :, 3]
    labels, count = ndimage.label(alpha >= 16)
    sizes = np.bincount(labels.ravel())
    objects = ndimage.find_objects(labels)
    grouped = {}
    for label, slices in enumerate(objects, start=1):
        if slices is None or sizes[label] < 40:
            continue
        yy, xx = slices
        cx, cy = (xx.start + xx.stop) / 2, (yy.start + yy.stop) / 2
        cell = (min(rows-1, int(cy / image.height * rows)),
                min(cols-1, int(cx / image.width * cols)))
        grouped.setdefault(cell, []).append(label)
    frames = []
    for row in range(rows):
        row_frames = []
        for col in range(cols):
            ids = grouped.get((row, col), [])
            if not ids:
                raise ValueError(f'{filename}: missing cell {row},{col}')
            mask = np.isin(labels, ids)
            ys, xs = np.nonzero(mask)
            box = (int(xs.min()), int(ys.min()), int(xs.max()+1), int(ys.max()+1))
            x0, y0, x1, y1 = box
            crop = rgba[y0:y1, x0:x1].copy()
            crop[:, :, 3] = np.where(mask[y0:y1, x0:x1], crop[:, :, 3], 0)
            # Generated alpha occasionally stops at 253 and has isolated 1/255 noise.
            crop[:, :, 3] = np.where(crop[:, :, 3] >= 240, 255, crop[:, :, 3])
            crop[crop[:, :, 3] == 0, :3] = 0
            row_frames.append({'image': Image.fromarray(crop), 'sourceBox': box,
                               'source': filename, 'cell': [row, col]})
        frames.append(row_frames)
    return frames


def foot_anchor(frame):
    rgba = np.array(frame['image'])
    height, width = rgba.shape[:2]
    rgb = rgba[:, :, :3].astype(int)
    # Navy shoes, in the lower part of a pose, exclude a silver sword tip.
    shoes = ((rgba[:, :, 3] >= 160) & (rgb[:, :, 2] >= rgb[:, :, 0] + 4)
             & (rgb[:, :, 2] < 120) & (rgb[:, :, 0] < 100))
    shoes[:int(height * .72)] = False
    ys, xs = np.nonzero(shoes)
    if len(xs) > 10:
        return ((int(xs.min()) + int(xs.max())) / 2, min(height, int(ys.max())+2))
    return (width / 2, height)


def pack_character(name, frame_rows, source_count, duration_ms, reference_height=None):
    count = len(frame_rows[0])
    if reference_height is None:
        reference_height = max(f['image'].height for row in frame_rows for f in row)
    scale = 48 / reference_height
    # One scale for the WHOLE sheet, no per-frame stretching or pose enlargement.
    for row in frame_rows:
        for frame in row:
            im = frame['image']; px, py = foot_anchor(frame)
            scale = min(scale, 29 / max(px, im.width-px, 1), 53/max(py, 1), 6/max(im.height-py, 1))
    sheet = Image.new('RGBA', (64 * count, 64 * len(frame_rows)))
    entries = []
    for r, row in enumerate(frame_rows):
        for c, frame in enumerate(row):
            im = frame['image']; px, py = foot_anchor(frame)
            resized = im.resize((max(1, round(im.width*scale)), max(1, round(im.height*scale))), Image.Resampling.LANCZOS)
            # Alpha endpoint cleanup prevents invisible RGB from bleeding at runtime.
            arr = np.array(resized)
            arr[:, :, 3] = np.where(arr[:, :, 3] < 16, 0, arr[:, :, 3])
            arr[:, :, 3] = np.where(arr[:, :, 3] > 239, 255, arr[:, :, 3])
            arr[arr[:, :, 3] == 0, :3] = 0
            resized = Image.fromarray(arr)
            offset = (32-round(px*scale), 56-round(py*scale))
            assert offset[0] >= 2 and offset[1] >= 2, (name, r, c, offset)
            assert offset[0]+resized.width <= 62 and offset[1]+resized.height <= 62, (name, r, c)
            sheet.alpha_composite(resized, (64*c+offset[0], 64*r+offset[1]))
            entries.append({'frame': r*count+c, 'source': frame['source'], 'cell': frame['cell'],
                            'sourceBox': frame['sourceBox'], 'sourceFootAnchor': [px, py], 'offset': list(offset)})
    sheet.save(OUT / f'{name}.png', optimize=True)
    manifest['assets'].append({'key': name, 'file': f'assets/vnext/{name}.png',
        'size': list(sheet.size), 'type': 'spritesheet', 'frameSize': [64,64],
        'framesPerDirection': count, 'directionCount': len(frame_rows),
        'uniqueSourcePoses': len({(f['source'], tuple(f['cell'])) for row in frame_rows for f in row}), 'durationMs': duration_ms,
        'exportScale': scale, 'frames': entries})
    return sheet


def export_hero():
    walk = split_sheet('kiem-tu-walk-v3.png', 4, 4)
    combat = split_sheet('kiem-tu-combat-v3.png', 6, 4)
    states = split_sheet('kiem-tu-states-v1.png', 7, 4)
    reference = max(states[r][c]['image'].height for r in range(4) for c in (0,1))
    pack_character('player_walk', walk, 16, 500)
    pack_character('player_slash', [row[:3] for row in combat], 12, 6/14*1000,
                   max(row[3]['image'].height for row in combat))
    pack_character('player_cast', [row[3:] for row in combat], 12, 7/12*1000,
                   max(row[3]['image'].height for row in combat))
    pack_character('player_idle', [row[:2] for row in states], 8, 1000, reference)
    pack_character('player_dodge', [[row[2],row[3],row[0]] for row in states], 8, 5/16*1000, reference)
    pack_character('player_hurt', [[row[4],row[0]] for row in states], 4, 500, reference)
    pack_character('player_death', [[row[4],row[5],row[6]] for row in states], 12, 1000, reference)
    pack_character('player_respawn', [[row[5],row[2],row[0]] for row in states], 8, 500, reference)


def export_other_paths():
    """Export the two original V1.0.2 path actors in the hero's runtime layout.

    Reference sheets are 2x2 in down/right/left/up order. Walk and action
    sheets already follow the runtime up/left/down/right row contract. The
    source frames are never mirrored, painted, or replaced by block sprites.
    """
    for role, source in [('magic', 'phap-tu'), ('body', 'the-tu')]:
        reference = split_sheet(f'{source}-reference-v102.png', 2, 2)
        idle = [reference[1][1], reference[1][0], reference[0][0], reference[0][1]]
        walk = split_sheet(f'{source}-walk-v102.png', 4, 4)
        slash = split_sheet(f'{source}-slash-v102.png', 3, 4)
        cast = split_sheet(f'{source}-cast-v102.png', 3, 4)
        states = split_sheet(f'{source}-states-v102.png', 4, 4)

        # Idle uses the approved standing reference. Duplicating the drawing
        # keeps the two-frame runtime contract without inventing new anatomy.
        pack_character(f'player_{role}_idle', [[frame, frame] for frame in idle], 4, 1000)
        pack_character(f'player_{role}_walk', walk, 16, 500)
        pack_character(f'player_{role}_slash', slash, 12, 6/14*1000)
        pack_character(f'player_{role}_cast', cast, 12, 7/12*1000)
        pack_character(f'player_{role}_dodge',
                       [[walk[r][0], states[r][0], walk[r][2]] for r in range(4)],
                       12, 5/16*1000)
        pack_character(f'player_{role}_hurt',
                       [[states[r][1], states[r][2]] for r in range(4)], 8, 500)
        pack_character(f'player_{role}_death',
                       [[states[r][1], states[r][2], states[r][3]] for r in range(4)],
                       12, 1000)
        pack_character(f'player_{role}_respawn',
                       [[states[r][3], states[r][2], walk[r][0]] for r in range(4)],
                       12, 500)


def export_disciple():
    """Liễu Muội has her own identity and four-direction follower actions."""
    walk = split_sheet('lieu-muoi-walk-v102.png', 4, 4)
    attack = split_sheet('lieu-muoi-attack-v102.png', 3, 4)
    cast = split_sheet('lieu-muoi-cast-v102.png', 3, 4)
    # The passing stance is stable for idle; a held drawing avoids foot drift.
    pack_character('disciple_lieu_muoi_idle', [[row[1], row[1]] for row in walk], 4, 1000)
    pack_character('disciple_lieu_muoi_walk', walk, 16, 500)
    pack_character('disciple_lieu_muoi_attack', attack, 12, 6/14*1000)
    pack_character('disciple_lieu_muoi_cast', cast, 12, 7/12*1000)


def export_props():
    rows = split_sheet('thanh-khe-props-v1.png', 4, 4)
    specs = [('building_hall',384),('building_herbalist',320),('building_barracks',320),('building_house',224),
             ('prop_sect_gate',172),('prop_pine_tree',144),('prop_broadleaf_tree',128),('prop_ancient_rock',98),
             ('prop_stone_lantern',38),('prop_dummy',44),('prop_weapon_rack',74),('prop_shrine',94),
             ('prop_chest',42),('prop_herb',34),('prop_ore',45),('prop_stone_wall',96)]
    for frame, (name,width) in zip((f for row in rows for f in row), specs):
        im = frame['image']; height = round(im.height * width / im.width)
        im = im.resize((width,height), Image.Resampling.LANCZOS)
        arr = np.array(im); arr[arr[:,:,3] < 16] = 0
        arr[:,:,3] = np.where(arr[:,:,3] > 239,255,arr[:,:,3])
        im = Image.fromarray(arr)
        im.save(OUT/f'{name}.png',optimize=True)
        manifest['assets'].append({'key':name,'file':f'assets/vnext/{name}.png','type':'image','size':list(im.size),
            'source':frame['source'],'sourceBox':frame['sourceBox'],'cell':frame['cell']})


def export_npcs():
    rows = split_sheet('thanh-khe-npcs-v1.png',4,3)
    for name,row in zip(['npc_elder','npc_healer','npc_guard'],rows):
        pack_character(name,[row],4,1000)


def export_creatures():
    rows = split_sheet('forest-creatures-v1.png',6,3)
    for name,row in zip(['monster_wolf','monster_snake','boss_lang_vuong'],rows):
        # All six frames retain relative pose size; movement uses first four.
        pack_character(name,[row],6,None,max(f['image'].height for f in row[:4]))
    fox = [frame for row in split_sheet('forest-fox-v1.png',3,2) for frame in row]
    pack_character('monster_fox',[fox],6,None,max(f['image'].height for f in fox[:4]))


def export_ground():
    image = Image.open(SOURCE/'ground-materials-v1.png').convert('RGB')
    for name,(col,row) in zip(['ground_grass','ground_stone','ground_dirt','ground_water'],[(0,0),(1,0),(0,1),(1,1)]):
        box=(round(image.width*col/2),round(image.height*row/2),round(image.width*(col+1)/2),round(image.height*(row+1)/2))
        tile=image.crop(box).resize((256,256),Image.Resampling.LANCZOS)
        tile.save(OUT/f'{name}.png',optimize=True)
        manifest['assets'].append({'key':name,'file':f'assets/vnext/{name}.png','type':'ground','size':[256,256],
                                 'source':'ground-materials-v1.png','sourceBox':list(box)})


def write_qa():
    tiles = []
    follower_tiles = []
    for item in manifest['assets']:
        if item['type'] != 'spritesheet':continue
        sheet = Image.open(ROOT/'client/public'/item['file'])
        # View at 2x nearest only for QA; exported gameplay files remain 1x.
        label = Image.new('RGB',(max(512,sheet.width*2),sheet.height*2+28),(43,57,48))
        draw = ImageDraw.Draw(label);draw.text((8,7),item['key'],fill=(240,232,204))
        label.paste(sheet.resize((sheet.width*2,sheet.height*2),Image.Resampling.NEAREST),(0,28),
                    sheet.resize((sheet.width*2,sheet.height*2),Image.Resampling.NEAREST))
        tiles.append(label)
        if item['key'].startswith('disciple_lieu_muoi_'):
            follower_tiles.append(label)
    if tiles:
        contact=Image.new('RGB',(max(im.width for im in tiles),sum(im.height for im in tiles)),(28,36,31))
        y=0
        for im in tiles:contact.paste(im,(0,y));y+=im.height
        contact.save(QA/'sprites-contact-sheet.png')
    if len(follower_tiles) == 4:
        # Focused 2x nearest-neighbor reference; gameplay files stay at 1x.
        focus = Image.new('RGB', (1024, 1080), (28, 36, 31))
        for index, tile in enumerate(follower_tiles):
            focus.paste(tile, ((index % 2) * 512, (index // 2) * 540))
        focus.save(QA/'lieu-muoi-v102-contact-sheet.png')
    for item in manifest['assets']:
        path=ROOT/'client/public'/item['file']
        item['sha256']=hashlib.sha256(path.read_bytes()).hexdigest()
    (OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (Path(__file__).parent/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')


if __name__=='__main__':
    export_hero();export_other_paths();export_disciple();export_props()
    if (SOURCE/'thanh-khe-npcs-v1.png').exists():export_npcs()
    if (SOURCE/'forest-creatures-v1.png').exists():export_creatures()
    if (SOURCE/'ground-materials-v1.png').exists():export_ground()
    manifest['assets'].extend(export_sounds(OUT/'audio'))
    write_qa()
    print(json.dumps({'exported':len(manifest['assets']),'output':str(OUT),'framePivot':[32,56]}))
