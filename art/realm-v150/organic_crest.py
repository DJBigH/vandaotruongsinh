"""Small hand-painted xianxia scroll seals for the twelve Tiên/Ma realms."""
from __future__ import annotations

from PIL import Image, ImageDraw


def shade(color: tuple[int, int, int], amount: float) -> tuple[int, int, int, int]:
    return tuple(max(0, min(255, round(channel * amount))) for channel in color) + (255,)


def flower(draw: ImageDraw.ImageDraw, x: int, y: int, color, center, size: int = 4) -> None:
    for dx, dy in ((-size, 0), (size, 0), (0, -size), (0, size), (-size+1, -size+1)):
        draw.ellipse((x+dx-2, y+dy-2, x+dx+2, y+dy+2), fill=color)
    draw.ellipse((x-2, y-2, x+2, y+2), fill=center)


def cloud(draw: ImageDraw.ImageDraw, x: int, y: int, color, scale: int = 1) -> None:
    s = scale
    draw.arc((x-10*s, y-7*s, x+2*s, y+5*s), 150, 332, fill=color, width=max(1, s))
    draw.arc((x-2*s, y-10*s, x+10*s, y+2*s), 215, 395, fill=color, width=max(1, s))
    draw.line((x-9*s, y+2*s, x+9*s, y+2*s), fill=color, width=max(1, s))


def draw_motif(draw: ImageDraw.ImageDraw, rank: int, alignment: str, ink, light, dark) -> None:
    heavenly = alignment == 'immortal'
    if rank == 0:  # floating cloud / climbing plum
        if heavenly:
            cloud(draw, 32, 32, ink, 2)
            draw.arc((29, 18, 43, 34), 18, 210, fill=light, width=2)
        else:
            draw.line((24, 45, 32, 33, 35, 20), fill=ink, width=3)
            for x,y in ((29,35),(35,28),(26,41)):
                flower(draw,x,y,ink,light,3)
    elif rank == 1:  # bamboo / thorned stalk
        draw.line((31, 48, 31, 20), fill=ink, width=4)
        for y in (27, 35, 43):
            draw.line((27, y, 35, y), fill=light, width=2)
        draw.polygon(((31, 34), (19, 26 if heavenly else 20), (24, 37)), fill=ink)
        draw.polygon(((31, 29), (43, 21 if heavenly else 16), (39, 35)), fill=light)
    elif rank == 2:  # golden cauldron / blood censer
        draw.polygon(((22, 26), (42, 26), (39, 43), (25, 43)), fill=ink)
        draw.line((20, 26, 44, 26), fill=light, width=3)
        draw.line((27, 43, 25, 48, 30, 48), fill=ink, width=2)
        draw.line((37, 43, 39, 48, 34, 48), fill=ink, width=2)
        draw.arc((23, 16, 40, 30), 190, 354, fill=light, width=2)
    elif rank == 3:  # nascent spirit / shadow spirit
        draw.ellipse((27, 19, 37, 31), fill=light)
        draw.polygon(((25, 31), (39, 31), (44, 45), (32, 40), (20, 45)), fill=ink)
        draw.line((22, 42, 32, 33, 42, 42), fill=light, width=2)
        if not heavenly:
            draw.line((26, 22, 21, 16), fill=ink, width=3)
            draw.line((38, 22, 43, 16), fill=ink, width=3)
    elif rank == 4:  # crane / crow wings
        draw.polygon(((32, 38), (15, 23), (21, 39), (29, 43)), fill=ink)
        draw.polygon(((32, 38), (49, 23), (43, 39), (35, 43)), fill=light)
        draw.line((32, 38, 32, 19), fill=ink, width=3)
        draw.polygon(((32, 19), (39, 16), (33, 24)), fill=light)
        for x in (20, 25, 39, 44):
            draw.line((x, 30, 32, 41), fill=dark, width=1)
    elif rank == 5:  # torn scroll / void tear
        draw.polygon(((22, 17), (41, 20), (37, 47), (24, 44)), fill=ink)
        draw.line((25, 20, 36, 23, 33, 43), fill=light, width=2)
        draw.line((28, 28, 33, 32, 28, 39), fill=dark, width=3)
        draw.arc((17, 28, 48, 51), 175, 305, fill=light, width=2)
    elif rank == 6:  # lotus / bone flower
        draw.polygon(((32, 43), (22, 29), (26, 20), (32, 31), (38, 20), (42, 29)), fill=ink)
        draw.polygon(((32, 43), (15, 34), (20, 28), (32, 37), (44, 28), (49, 34)), fill=light)
        draw.line((19, 45, 45, 45), fill=ink, width=3)
        if not heavenly:
            draw.line((25, 25, 20, 19), fill=light, width=2)
            draw.line((39, 25, 44, 19), fill=light, width=2)
    elif rank == 7:  # mountain / black fortress
        draw.polygon(((16, 43), (28, 22), (34, 32), (42, 19), (50, 43)), fill=ink)
        draw.line((21, 43, 29, 29, 34, 37, 42, 26, 46, 42), fill=light, width=2)
        cloud(draw, 30, 43, light)
    elif rank == 8:  # lightning through cloud / claw through storm
        cloud(draw, 31, 29, ink, 2)
        draw.polygon(((34, 18), (27, 34), (34, 33), (25, 48), (42, 29), (35, 30)), fill=light)
        if not heavenly:
            draw.line((20, 42, 25, 36), fill=ink, width=2)
            draw.line((43, 43, 40, 36), fill=ink, width=2)
    elif rank == 9:  # immortal peach / plum bough
        draw.line((29, 48, 34, 21), fill=ink, width=3)
        draw.polygon(((31, 32), (18, 22), (22, 37)), fill=light)
        draw.polygon(((34, 29), (47, 20), (43, 36)), fill=ink)
        flower(draw, 31, 22, light, ink, 4)
        if not heavenly: flower(draw, 43, 32, ink, light, 3)
    elif rank == 10:  # celestial sword / demon standard
        draw.line((32, 47, 32, 16), fill=light, width=3)
        draw.polygon(((32, 13), (27, 25), (32, 22), (37, 25)), fill=ink)
        draw.line((24, 39, 40, 39), fill=ink, width=4)
        draw.line((30, 47, 34, 47), fill=ink, width=3)
        draw.line((19, 24, 24, 20), fill=light, width=2)
        draw.line((45, 24, 40, 20), fill=light, width=2)
    else:  # open heavenly gate / sovereign demon throne
        draw.polygon(((19, 45), (20, 23), (27, 17), (37, 17), (44, 23), (45, 45)), fill=ink)
        draw.polygon(((25, 44), (26, 25), (32, 21), (38, 25), (39, 44)), fill=dark)
        draw.line((19, 46, 45, 46), fill=light, width=3)
        if heavenly:
            cloud(draw, 32, 32, light)
        else:
            draw.polygon(((24, 29), (18, 17), (30, 23), (34, 23), (46, 17), (40, 29)), fill=light)


def organic_crest(rank: int, alignment: str, hex_color: str) -> Image.Image:
    base = tuple(bytes.fromhex(hex_color.removeprefix('#')))
    ink = shade(base, 1.08)
    light = shade(base, 1.38)
    dark = shade(base, .39)
    accent = shade(base, .72)
    pearl = (238, 227, 193, 255) if alignment == 'immortal' else (242, 182, 154, 255)
    silk = (31, 42, 37, 255) if alignment == 'immortal' else (39, 25, 30, 255)
    image = Image.new('RGBA', (64, 64))
    d = ImageDraw.Draw(image)
    if alignment == 'immortal':
        # The rolled parchment and drifting cloud edge deliberately avoid a circuit-like ring.
        d.polygon(((14, 10), (25, 7), (45, 10), (52, 16), (50, 45), (43, 51),
                   (30, 53), (19, 49), (12, 42), (10, 22)), fill=silk)
        d.arc((9, 6, 53, 24), 178, 352, fill=light, width=3)
        d.line((11, 18, 13, 42, 22, 49), fill=ink, width=2)
        d.line((49, 19, 49, 43, 41, 50), fill=ink, width=2)
        cloud(d, 15, 48, light)
    else:
        d.polygon(((12, 12), (24, 8), (41, 11), (53, 8), (49, 26), (53, 42),
                   (43, 52), (34, 50), (25, 55), (15, 48), (11, 32)), fill=silk)
        d.line((12, 13, 24, 9, 41, 12, 52, 10), fill=light, width=3)
        d.line((12, 15, 12, 34, 17, 47, 25, 52), fill=ink, width=2)
        d.line((51, 12, 48, 28, 51, 41, 42, 50), fill=ink, width=2)
        d.line((24, 53, 22, 60), fill=ink, width=2)
        d.line((42, 50, 44, 58), fill=ink, width=2)
        flower(d, 15, 44, ink, light, 2)
    d.line((21, 15, 42, 15), fill=accent, width=1)
    d.ellipse((17, 15, 19, 17), fill=pearl)
    d.ellipse((45, 45, 47, 47), fill=accent)
    draw_motif(d, rank, alignment, ink, light, dark)
    return image
