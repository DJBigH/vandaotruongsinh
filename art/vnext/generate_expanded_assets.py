"""============================================================
VẠN ĐẠO TRƯỜNG SINH - Technical Asset Synthesis Script
Generates expanded high-detail pixel art assets complying with:
- ART_DIRECTION.md (proportions, color palette, lighting, 64x64 grid, foot pivot 32,56)
- PROMPT_VAN_DAO_VNEXT_TU_TAO_ASSET.md (original art, no recolors of foreign packs)
============================================================"""

import os
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageColor, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
OUT_VNEXT = ROOT / 'client/public/assets/vnext'
OUT_LEGACY = ROOT / 'client/public/assets'
OUT_VNEXT.mkdir(parents=True, exist_ok=True)
OUT_LEGACY.mkdir(parents=True, exist_ok=True)

# ============================================================
# HELPER UTILITIES
# ============================================================

def hex_to_rgb(hex_str):
    c = hex_str.lstrip('#')
    return tuple(int(c[i:i+2], 16) for i in (0, 2, 4))

def hex_to_rgba(hex_str, alpha=255):
    rgb = hex_to_rgb(hex_str)
    return (rgb[0], rgb[1], rgb[2], alpha)

def create_base_canvas(width, height):
    return Image.new('RGBA', (width, height), (0, 0, 0, 0))

# ============================================================
# 1. ICON GENERATOR (48x48 Pixel Art with Antique Gold Frame)
# ============================================================

def make_icon_frame(draw, bg_color=(15, 23, 42)):
    # Outer rounded border
    border_gold = hex_to_rgb('#c5a059')
    highlight_gold = hex_to_rgb('#fde047')
    shadow_gold = hex_to_rgb('#785a28')
    bg_dark = bg_color

    # Fill background
    draw.rounded_rectangle([2, 2, 45, 45], radius=6, fill=bg_dark)
    # Inner border
    draw.rounded_rectangle([2, 2, 45, 45], radius=6, outline=border_gold, width=2)
    # Highlight top-left
    draw.line([(4, 3), (20, 3)], fill=highlight_gold, width=1)
    draw.line([(3, 4), (3, 20)], fill=highlight_gold, width=1)
    # Shadow bottom-right
    draw.line([(25, 44), (43, 44)], fill=shadow_gold, width=1)
    draw.line([(44, 25), (44, 43)], fill=shadow_gold, width=1)
    # Corner studs
    for cx, cy in [(4, 4), (43, 4), (4, 43), (43, 43)]:
        draw.point((cx, cy), fill=highlight_gold)

def generate_skill_icons():
    print("-> Generating Skill Icons (48x48)...")
    icons = {}

    # 1. Attack (Chém thường - Thanh kiếm cơ bản)
    im = create_base_canvas(48, 48)
    draw = ImageDraw.Draw(im)
    make_icon_frame(draw, bg_color=(20, 26, 38))
    # Slash trail
    draw.arc([10, 8, 38, 38], start=210, end=340, fill=hex_to_rgb('#dcf7fd'), width=3)
    draw.arc([8, 6, 40, 40], start=220, end=330, fill=hex_to_rgb('#8ae0f2'), width=1)
    # Diagonal sword
    for i in range(18):
        x = 14 + i
        y = 34 - i
        draw.line([(x, y), (x+2, y-2)], fill=hex_to_rgb('#f0f4f8'), width=2)
    # Blade tip highlight
    draw.point((33, 15), fill=hex_to_rgb('#ffffff'))
    # Hilt & Guard
    draw.line([(12, 34), (16, 38)], fill=hex_to_rgb('#e2b467'), width=3)
    draw.line([(11, 37), (9, 39)], fill=hex_to_rgb('#7c2a1e'), width=3)
    icons['icon_action_attack'] = im

    # 2. Dodge (Thân pháp né đòn - Dư ảnh đạp tuyết)
    im = create_base_canvas(48, 48)
    draw = ImageDraw.Draw(im)
    make_icon_frame(draw, bg_color=(15, 30, 35))
    # Wind streaks
    for y, x1, x2 in [(16, 8, 22), (24, 6, 30), (32, 10, 24)]:
        draw.line([(x1, y), (x2, y)], fill=hex_to_rgb('#5eead4'), width=2)
        draw.point((x2+2, y), fill=hex_to_rgb('#dcf7fd'))
    # Shadow silhouette dashing right
    draw.ellipse([26, 12, 34, 20], fill=hex_to_rgb('#2dd4bf')) # head
    draw.polygon([(28, 20), (38, 24), (32, 36), (24, 30)], fill=hex_to_rgb('#14b8a6')) # body
    draw.line([(28, 32), (36, 40)], fill=hex_to_rgb('#0d9488'), width=2) # leg
    draw.line([(32, 30), (40, 34)], fill=hex_to_rgb('#5eead4'), width=2)
    icons['icon_action_dodge'] = im

    # 3. Kiếm Khí Trảm (Kiếm Tu - Chiêu 1)
    im = create_base_canvas(48, 48)
    draw = ImageDraw.Draw(im)
    make_icon_frame(draw, bg_color=(12, 28, 44))
    # Flying crescent blade beam
    draw.arc([8, 10, 40, 38], start=120, end=270, fill=hex_to_rgb('#dcf7fd'), width=4)
    draw.arc([6, 8, 42, 40], start=110, end=280, fill=hex_to_rgb('#8ae0f2'), width=2)
    draw.arc([12, 14, 36, 34], start=130, end=260, fill=hex_to_rgb('#0284c7'), width=2)
    # Energy sparks
    for px, py in [(18, 12), (32, 16), (12, 28), (28, 36)]:
        draw.line([(px-2, py), (px+2, py)], fill=hex_to_rgb('#ffffff'), width=1)
        draw.line([(px, py-2), (px, py+2)], fill=hex_to_rgb('#ffffff'), width=1)
    icons['icon_skill_sword_slash'] = im

    # 4. Vạn Kiếm Quy Tông (Kiếm Tu - Chiêu 2)
    im = create_base_canvas(48, 48)
    draw = ImageDraw.Draw(im)
    make_icon_frame(draw, bg_color=(10, 24, 40))
    # 5 Swords pointing skyward in fan formation
    swords = [(-16, 24, -10), (-8, 20, -5), (0, 16, 0), (8, 20, 5), (16, 24, 10)]
    for ox, base_y, ang in swords:
        tip_x = 24 + ox
        tip_y = base_y
        draw.line([(tip_x, tip_y+16), (tip_x, tip_y)], fill=hex_to_rgb('#f0f4f8'), width=2)
        draw.polygon([(tip_x-2, tip_y+2), (tip_x+2, tip_y+2), (tip_x, tip_y-3)], fill=hex_to_rgb('#dcf7fd'))
        draw.line([(tip_x-2, tip_y+14), (tip_x+2, tip_y+14)], fill=hex_to_rgb('#e2b467'), width=1)
    # Golden ring aura
    draw.ellipse([14, 30, 34, 40], outline=hex_to_rgb('#e8d584'), width=1)
    icons['icon_skill_sword_array'] = im

    # 5. Bạt Kiếm Thuật (Kiếm Tu - Chiêu 3)
    im = create_base_canvas(48, 48)
    draw = ImageDraw.Draw(im)
    make_icon_frame(draw, bg_color=(15, 25, 45))
    # Flash of sword draw
    draw.line([(8, 40), (40, 8)], fill=hex_to_rgb('#ffffff'), width=3)
    draw.line([(6, 42), (42, 6)], fill=hex_to_rgb('#38bdf8'), width=1)
    # Radial flash lines
    for fx, fy in [(20, 28), (28, 20)]:
        draw.line([(fx-4, fy+4), (fx+4, fy-4)], fill=hex_to_rgb('#dcf7fd'), width=2)
    # Scabbard at bottom left
    draw.line([(8, 40), (16, 32)], fill=hex_to_rgb('#7c2a1e'), width=4)
    icons['icon_skill_sword_dash'] = im

    # 6. Kiếm Ý Hộ Thể (Kiếm Tu - Chiêu 4)
    im = create_base_canvas(48, 48)
    draw = ImageDraw.Draw(im)
    make_icon_frame(draw, bg_color=(12, 26, 42))
    # Circular rotating sword barrier
    draw.ellipse([10, 10, 38, 38], outline=hex_to_rgb('#38bdf8'), width=2)
    draw.ellipse([13, 13, 35, 35], outline=hex_to_rgb('#dcf7fd'), width=1)
    # 4 small swords around circle
    for sx, sy in [(24, 7), (24, 41), (7, 24), (41, 24)]:
        draw.ellipse([sx-2, sy-2, sx+2, sy+2], fill=hex_to_rgb('#f0f4f8'))
    # Meditating silhouette inside
    draw.ellipse([21, 16, 27, 22], fill=hex_to_rgb('#e2b467'))
    draw.polygon([(24, 22), (18, 32), (30, 32)], fill=hex_to_rgb('#0284c7'))
    icons['icon_skill_sword_shield'] = im

    # 7. Cửu Thiên Dẫn Lôi (Pháp Tu - Chiêu 1)
    im = create_base_canvas(48, 48)
    draw = ImageDraw.Draw(im)
    make_icon_frame(draw, bg_color=(32, 16, 45))
    # Purple & gold lightning bolt
    bolt = [(24, 8), (18, 20), (26, 20), (16, 40), (28, 24), (20, 24), (27, 8)]
    draw.polygon(bolt, fill=hex_to_rgb('#ffd700'), outline=hex_to_rgb('#a855f7'))
    draw.line([(24, 8), (17, 20), (25, 20), (18, 38)], fill=hex_to_rgb('#ffffff'), width=1)
    # Electric sparks around
    for px, py in [(12, 14), (34, 18), (10, 30), (32, 34)]:
        draw.line([(px-2, py), (px+2, py)], fill=hex_to_rgb('#e8d584'), width=1)
        draw.line([(px, py-2), (px, py+2)], fill=hex_to_rgb('#c084fc'), width=1)
    icons['icon_skill_spell_thunder'] = im

    # 8. Hỏa Phượng Liêu Nguyên (Pháp Tu - Chiêu 2)
    im = create_base_canvas(48, 48)
    draw = ImageDraw.Draw(im)
    make_icon_frame(draw, bg_color=(40, 16, 18))
    # Phoenix / Firebird wings of spiritual flame
    draw.polygon([(24, 10), (14, 22), (20, 26), (24, 18), (28, 26), (34, 22)], fill=hex_to_rgb('#f97316'))
    draw.polygon([(24, 14), (16, 32), (24, 28), (32, 32)], fill=hex_to_rgb('#ef4444'))
    draw.polygon([(24, 18), (20, 36), (24, 38), (28, 36)], fill=hex_to_rgb('#fbbf24'))
    # Core pearl
    draw.ellipse([22, 18, 26, 22], fill=hex_to_rgb('#ffffff'))
    icons['icon_skill_spell_fire'] = im

    # 9. Băng Phong Vạn Lý (Pháp Tu - Chiêu 3)
    im = create_base_canvas(48, 48)
    draw = ImageDraw.Draw(im)
    make_icon_frame(draw, bg_color=(15, 28, 42))
    # 6-branch Frost Snowflake
    cx, cy = 24, 24
    for a in range(6):
        rad = a * math.pi / 3
        ex = cx + int(14 * math.cos(rad))
        ey = cy + int(14 * math.sin(rad))
        draw.line([(cx, cy), (ex, ey)], fill=hex_to_rgb('#a5f3fc'), width=2)
        # Branchlets
        bx = cx + int(9 * math.cos(rad))
        by = cy + int(9 * math.sin(rad))
        draw.line([(bx, by), (bx + int(4*math.cos(rad+0.6)), by + int(4*math.sin(rad+0.6)))], fill=hex_to_rgb('#ffffff'), width=1)
        draw.line([(bx, by), (bx + int(4*math.cos(rad-0.6)), by + int(4*math.sin(rad-0.6)))], fill=hex_to_rgb('#ffffff'), width=1)
    draw.ellipse([21, 21, 27, 27], fill=hex_to_rgb('#38bdf8'), outline=hex_to_rgb('#ffffff'))
    icons['icon_skill_spell_ice'] = im

    # 10. Thái Hư Hộ Thuẫn (Pháp Tu - Chiêu 4)
    im = create_base_canvas(48, 48)
    draw = ImageDraw.Draw(im)
    make_icon_frame(draw, bg_color=(28, 14, 40))
    # Bagua circle
    draw.ellipse([10, 10, 38, 38], outline=hex_to_rgb('#c084fc'), width=2)
    draw.ellipse([14, 14, 34, 34], outline=hex_to_rgb('#e8d584'), width=1)
    # Yin yang inner swirl
    draw.arc([16, 16, 32, 32], start=0, end=180, fill=hex_to_rgb('#ffffff'), width=3)
    draw.arc([16, 16, 32, 32], start=180, end=360, fill=hex_to_rgb('#581c87'), width=3)
    draw.ellipse([22, 19, 26, 23], fill=hex_to_rgb('#ffffff'))
    draw.ellipse([22, 25, 26, 29], fill=hex_to_rgb('#581c87'))
    icons['icon_skill_spell_shield'] = im

    # 11. Băng Sơn Quyền (Thể Tu - Chiêu 1)
    im = create_base_canvas(48, 48)
    draw = ImageDraw.Draw(im)
    make_icon_frame(draw, bg_color=(38, 18, 14))
    # Cracking mountain / boulder
    draw.polygon([(10, 38), (24, 14), (38, 38)], fill=hex_to_rgb('#78350f'), outline=hex_to_rgb('#d97706'))
    # Big glowing fist hitting from top right
    draw.polygon([(26, 14), (36, 10), (38, 22), (28, 24)], fill=hex_to_rgb('#ea580c'))
    # Fist knuckles
    for kx, ky in [(27, 16), (29, 19), (31, 22)]:
        draw.ellipse([kx-2, ky-2, kx+2, ky+2], fill=hex_to_rgb('#fde047'))
    # Impact fracture cracks
    draw.line([(24, 20), (18, 28)], fill=hex_to_rgb('#fde047'), width=2)
    draw.line([(18, 28), (22, 34)], fill=hex_to_rgb('#fde047'), width=1)
    draw.line([(24, 20), (30, 32)], fill=hex_to_rgb('#fde047'), width=2)
    icons['icon_skill_body_punch'] = im

    # 12. Bất Hoại Kim Thân (Thể Tu - Chiêu 2)
    im = create_base_canvas(48, 48)
    draw = ImageDraw.Draw(im)
    make_icon_frame(draw, bg_color=(36, 24, 12))
    # Golden Bell / Kim Chung Tráo
    draw.arc([10, 12, 38, 40], start=180, end=360, fill=hex_to_rgb('#fbbf24'), width=3)
    draw.line([(10, 26), (10, 36)], fill=hex_to_rgb('#fbbf24'), width=3)
    draw.line([(38, 26), (38, 36)], fill=hex_to_rgb('#fbbf24'), width=3)
    draw.line([(8, 36), (40, 36)], fill=hex_to_rgb('#f59e0b'), width=4)
    # Bell top stud
    draw.ellipse([21, 9, 27, 14], fill=hex_to_rgb('#fef08a'))
    # Bell runes
    draw.line([(16, 26), (32, 26)], fill=hex_to_rgb('#d97706'), width=2)
    draw.ellipse([22, 20, 26, 24], fill=hex_to_rgb('#ffffff'))
    icons['icon_skill_body_iron'] = im

    # 13. Cuồng Long Xuất Hải (Thể Tu - Chiêu 3)
    im = create_base_canvas(48, 48)
    draw = ImageDraw.Draw(im)
    make_icon_frame(draw, bg_color=(42, 14, 14))
    # Roaring red dragon head silhouette
    # Snout & jaw
    draw.polygon([(14, 20), (28, 14), (32, 22), (24, 26)], fill=hex_to_rgb('#dc2626'))
    draw.polygon([(16, 26), (28, 28), (24, 34)], fill=hex_to_rgb('#b91c1c'))
    # Dragon horns
    draw.line([(28, 14), (38, 8)], fill=hex_to_rgb('#fbbf24'), width=3)
    draw.line([(30, 16), (40, 12)], fill=hex_to_rgb('#d97706'), width=2)
    # Dragon glowing golden eye
    draw.ellipse([25, 17, 28, 20], fill=hex_to_rgb('#fef08a'))
    # Dragon whiskers & fire breath
    draw.arc([8, 16, 22, 30], start=90, end=270, fill=hex_to_rgb('#f97316'), width=2)
    icons['icon_skill_body_roar'] = im

    # 14. Huyết Khí Liệt Ba (Thể Tu - Chiêu 4)
    im = create_base_canvas(48, 48)
    draw = ImageDraw.Draw(im)
    make_icon_frame(draw, bg_color=(36, 12, 18))
    # Concentric ground shockwave ripples in crimson & gold
    draw.ellipse([14, 26, 34, 38], outline=hex_to_rgb('#f87171'), width=2)
    draw.ellipse([8, 20, 40, 42], outline=hex_to_rgb('#ef4444'), width=2)
    draw.ellipse([4, 14, 44, 46], outline=hex_to_rgb('#b91c1c'), width=1)
    # Central burst pillar
    draw.polygon([(21, 32), (24, 8), (27, 32)], fill=hex_to_rgb('#fde047'))
    draw.ellipse([21, 28, 27, 34], fill=hex_to_rgb('#ffffff'))
    icons['icon_skill_body_wave'] = im

    # Save to disk
    for name, img in icons.items():
        img.save(OUT_VNEXT / f'{name}.png', optimize=True)
        img.save(OUT_LEGACY / f'{name}.png', optimize=True)
    print(f"   -> Successfully saved {len(icons)} skill icons.")
    return icons

# ============================================================
# 2. INVENTORY ITEM ICONS (48x48 Pixel Art)
# ============================================================

def generate_item_icons():
    print("-> Generating Item Icons (48x48)...")
    icons = {}

    # 1. Vũ khí Kiếm (Thanh Phong Kiếm)
    im = create_base_canvas(48, 48)
    draw = ImageDraw.Draw(im)
    make_icon_frame(draw, bg_color=(18, 25, 38))
    for i in range(20):
        x = 12 + i
        y = 36 - i
        draw.line([(x, y), (x+1, y-1)], fill=hex_to_rgb('#8ae0f2'), width=2)
    draw.point((32, 15), fill=hex_to_rgb('#ffffff')) # tip glint
    draw.line([(10, 36), (14, 40)], fill=hex_to_rgb('#e2b467'), width=4) # guard
    draw.line([(9, 39), (7, 41)], fill=hex_to_rgb('#5c241c'), width=3) # hilt
    draw.line([(6, 42), (4, 45)], fill=hex_to_rgb('#ef4444'), width=2) # red tassel
    icons['icon_item_sword'] = im

    # 2. Pháp Trượng (Tử Tiêu Trượng)
    im = create_base_canvas(48, 48)
    draw = ImageDraw.Draw(im)
    make_icon_frame(draw, bg_color=(25, 18, 38))
    # Wooden staff shaft
    draw.line([(10, 40), (32, 18)], fill=hex_to_rgb('#78350f'), width=3)
    # Golden ring head
    draw.ellipse([28, 8, 40, 20], outline=hex_to_rgb('#e2b467'), width=2)
    # Purple spiritual orb in center
    draw.ellipse([31, 11, 37, 17], fill=hex_to_rgb('#c084fc'))
    draw.point((33, 13), fill=hex_to_rgb('#ffffff'))
    icons['icon_item_staff'] = im

    # 3. Quyền Sáo (Xích Đồng Quyền Sáo)
    im = create_base_canvas(48, 48)
    draw = ImageDraw.Draw(im)
    make_icon_frame(draw, bg_color=(35, 20, 16))
    # Bronze gauntlet plate
    draw.rounded_rectangle([14, 14, 34, 34], radius=4, fill=hex_to_rgb('#b45309'), outline=hex_to_rgb('#d97706'), width=2)
    # 4 bronze knuckle studs
    for kx in [17, 22, 27, 31]:
        draw.ellipse([kx, 15, kx+3, 18], fill=hex_to_rgb('#fde047'))
    # Gem core in back of palm
    draw.ellipse([21, 23, 27, 29], fill=hex_to_rgb('#dc2626'), outline=hex_to_rgb('#fca5a5'))
    icons['icon_item_fist'] = im

    # 4. Đạo Bào (Thanh Vân Đạo Bào)
    im = create_base_canvas(48, 48)
    draw = ImageDraw.Draw(im)
    make_icon_frame(draw, bg_color=(15, 25, 38))
    # Robe collar & body
    draw.polygon([(18, 12), (30, 12), (38, 20), (34, 38), (14, 38), (10, 20)], fill=hex_to_rgb('#1c3b57'), outline=hex_to_rgb('#2e5b82'))
    # Cross-collar white / ivory
    draw.line([(20, 12), (25, 24)], fill=hex_to_rgb('#f0f4f8'), width=2)
    draw.line([(28, 12), (22, 24)], fill=hex_to_rgb('#f0f4f8'), width=2)
    # Golden sash
    draw.rectangle([17, 25, 31, 28], fill=hex_to_rgb('#e2b467'))
    draw.line([(24, 28), (24, 36)], fill=hex_to_rgb('#e2b467'), width=2)
    icons['icon_item_robe'] = im

    # 5. Huyền Vũ Chiến Giáp
    im = create_base_canvas(48, 48)
    draw = ImageDraw.Draw(im)
    make_icon_frame(draw, bg_color=(20, 22, 28))
    # Heavy stone / dark metal chestplate
    draw.polygon([(16, 12), (32, 12), (36, 18), (34, 36), (14, 36), (12, 18)], fill=hex_to_rgb('#374151'), outline=hex_to_rgb('#6b7280'), width=2)
    # Turtle shell scale lines
    draw.line([(24, 16), (24, 32)], fill=hex_to_rgb('#9ca3af'), width=1)
    draw.line([(18, 24), (30, 24)], fill=hex_to_rgb('#9ca3af'), width=1)
    # Bronze borders & rivets
    draw.line([(14, 12), (34, 12)], fill=hex_to_rgb('#d97706'), width=2)
    draw.ellipse([22, 22, 26, 26], fill=hex_to_rgb('#f59e0b'))
    icons['icon_item_armor'] = im

    # 6. Đạp Vân Hài (Giày cổ phong)
    im = create_base_canvas(48, 48)
    draw = ImageDraw.Draw(im)
    make_icon_frame(draw, bg_color=(18, 24, 32))
    # Pair of martial boots
    draw.polygon([(12, 16), (20, 16), (22, 30), (26, 32), (18, 36), (12, 34)], fill=hex_to_rgb('#1e293b'), outline=hex_to_rgb('#475569'))
    draw.polygon([(24, 16), (32, 16), (34, 30), (38, 32), (30, 36), (24, 34)], fill=hex_to_rgb('#1e293b'), outline=hex_to_rgb('#475569'))
    # Silver cloud scroll on edge
    draw.line([(18, 35), (26, 31)], fill=hex_to_rgb('#e2e8f0'), width=2)
    draw.line([(30, 35), (38, 31)], fill=hex_to_rgb('#e2e8f0'), width=2)
    icons['icon_item_boots'] = im

    # 7. Trữ Vật Giới Chỉ (Nhẫn trữ vật)
    im = create_base_canvas(48, 48)
    draw = ImageDraw.Draw(im)
    make_icon_frame(draw, bg_color=(16, 28, 32))
    # Green Jade ring band
    draw.ellipse([14, 14, 34, 34], outline=hex_to_rgb('#10b981'), width=4)
    # Golden top bezel
    draw.ellipse([20, 10, 28, 18], fill=hex_to_rgb('#e2b467'), outline=hex_to_rgb('#fef08a'))
    # Center celestial pearl
    draw.ellipse([22, 12, 26, 16], fill=hex_to_rgb('#38bdf8'))
    draw.point((23, 13), fill=hex_to_rgb('#ffffff'))
    icons['icon_item_ring'] = im

    # 8. Bổ Huyết Đan (Viên đan đỏ)
    im = create_base_canvas(48, 48)
    draw = ImageDraw.Draw(im)
    make_icon_frame(draw, bg_color=(36, 16, 18))
    # Jade pedestal plate
    draw.ellipse([12, 30, 36, 38], fill=hex_to_rgb('#065f46'), outline=hex_to_rgb('#10b981'))
    # Red pill sphere
    draw.ellipse([17, 15, 31, 29], fill=hex_to_rgb('#dc2626'), outline=hex_to_rgb('#ef4444'), width=1)
    # Highlight shine
    draw.ellipse([20, 18, 24, 22], fill=hex_to_rgb('#fca5a5'))
    draw.point((22, 19), fill=hex_to_rgb('#ffffff'))
    # Crimson steam wisps
    draw.arc([16, 8, 24, 18], start=200, end=340, fill=hex_to_rgb('#f87171'), width=1)
    draw.arc([24, 6, 32, 16], start=180, end=320, fill=hex_to_rgb('#f87171'), width=1)
    icons['icon_item_pill_red'] = im

    # 9. Tụ Khí Đan (Viên đan xanh lam)
    im = create_base_canvas(48, 48)
    draw = ImageDraw.Draw(im)
    make_icon_frame(draw, bg_color=(15, 24, 40))
    # Jade pedestal plate
    draw.ellipse([12, 30, 36, 38], fill=hex_to_rgb('#1e3a8a'), outline=hex_to_rgb('#3b82f6'))
    # Blue pill sphere
    draw.ellipse([17, 15, 31, 29], fill=hex_to_rgb('#0284c7'), outline=hex_to_rgb('#38bdf8'), width=1)
    # Highlight
    draw.ellipse([20, 18, 24, 22], fill=hex_to_rgb('#bae6fd'))
    draw.point((22, 19), fill=hex_to_rgb('#ffffff'))
    # Azure steam wisps
    draw.arc([22, 6, 30, 16], start=180, end=320, fill=hex_to_rgb('#38bdf8'), width=1)
    icons['icon_item_pill_blue'] = im

    # 10. Trúc Cơ Đan (Kim đan vàng rực)
    im = create_base_canvas(48, 48)
    draw = ImageDraw.Draw(im)
    make_icon_frame(draw, bg_color=(36, 28, 12))
    # Golden pill
    draw.ellipse([16, 14, 32, 30], fill=hex_to_rgb('#f59e0b'), outline=hex_to_rgb('#fde047'), width=2)
    draw.ellipse([19, 17, 24, 22], fill=hex_to_rgb('#ffffff'))
    # Three heavenly cloud rings around pill
    draw.arc([10, 16, 38, 28], start=20, end=160, fill=hex_to_rgb('#fde047'), width=1)
    draw.arc([10, 16, 38, 28], start=200, end=340, fill=hex_to_rgb('#fde047'), width=1)
    # Pedestal
    draw.ellipse([14, 32, 34, 38], fill=hex_to_rgb('#78350f'), outline=hex_to_rgb('#d97706'))
    icons['icon_item_pill_gold'] = im

    # 11. Hạ Phẩm Linh Thạch (Linh thạch tinh thể)
    im = create_base_canvas(48, 48)
    draw = ImageDraw.Draw(im)
    make_icon_frame(draw, bg_color=(12, 28, 36))
    # 3 Crystal shards
    # Center main crystal
    draw.polygon([(24, 10), (28, 18), (28, 34), (20, 34), (20, 18)], fill=hex_to_rgb('#38bdf8'), outline=hex_to_rgb('#bae6fd'))
    draw.line([(24, 10), (24, 34)], fill=hex_to_rgb('#ffffff'), width=1)
    # Left crystal
    draw.polygon([(16, 18), (20, 24), (18, 36), (14, 36)], fill=hex_to_rgb('#0284c7'), outline=hex_to_rgb('#38bdf8'))
    # Right crystal
    draw.polygon([(32, 18), (34, 36), (30, 36), (28, 24)], fill=hex_to_rgb('#0369a1'), outline=hex_to_rgb('#7dd3fc'))
    # Glints
    draw.point((24, 12), fill=hex_to_rgb('#ffffff'))
    draw.point((16, 20), fill=hex_to_rgb('#ffffff'))
    icons['icon_item_spirit_stone'] = im

    # 12. Thất Diệp Linh Thảo (Linh thảo dược liệu)
    im = create_base_canvas(48, 48)
    draw = ImageDraw.Draw(im)
    make_icon_frame(draw, bg_color=(16, 32, 20))
    # Stem
    draw.arc([18, 18, 30, 42], start=90, end=180, fill=hex_to_rgb('#15803d'), width=2)
    # Leaves
    for lx, ly, ang in [(20, 24, 45), (28, 22, -45), (16, 30, 60), (30, 28, -60), (24, 14, 0)]:
        draw.ellipse([lx-3, ly-5, lx+3, ly+5], fill=hex_to_rgb('#22c55e'), outline=hex_to_rgb('#86efac'))
    # Central dewdrop blossom
    draw.ellipse([22, 12, 26, 16], fill=hex_to_rgb('#fef08a'), outline=hex_to_rgb('#ffffff'))
    icons['icon_item_herb'] = im

    # 13. Huyền Thiết Khoáng (Khoáng thạch kim loại)
    im = create_base_canvas(48, 48)
    draw = ImageDraw.Draw(im)
    make_icon_frame(draw, bg_color=(20, 22, 26))
    # Rough dark rock chunk
    draw.polygon([(14, 24), (20, 14), (32, 12), (38, 22), (36, 34), (26, 38), (14, 32)], fill=hex_to_rgb('#1f2937'), outline=hex_to_rgb('#4b5563'), width=2)
    # Metallic facets
    draw.polygon([(20, 14), (28, 20), (26, 30), (16, 26)], fill=hex_to_rgb('#374151'))
    # Gold ore veins
    draw.line([(22, 16), (25, 24)], fill=hex_to_rgb('#fde047'), width=2)
    draw.line([(25, 24), (32, 28)], fill=hex_to_rgb('#eab308'), width=2)
    draw.point((23, 18), fill=hex_to_rgb('#ffffff'))
    icons['icon_item_ore'] = im

    # 14. Lang Yêu Đan (Nội đan quái vật)
    im = create_base_canvas(48, 48)
    draw = ImageDraw.Draw(im)
    make_icon_frame(draw, bg_color=(38, 14, 16))
    # Dark crimson demon core
    draw.ellipse([16, 16, 32, 32], fill=hex_to_rgb('#991b1b'), outline=hex_to_rgb('#dc2626'), width=2)
    draw.ellipse([20, 20, 28, 28], fill=hex_to_rgb('#ef4444'))
    draw.point((22, 22), fill=hex_to_rgb('#fca5a5'))
    # Red demonic aura flames
    draw.arc([12, 12, 36, 36], start=30, end=90, fill=hex_to_rgb('#f87171'), width=2)
    draw.arc([12, 12, 36, 36], start=150, end=210, fill=hex_to_rgb('#f87171'), width=2)
    draw.arc([12, 12, 36, 36], start=270, end=330, fill=hex_to_rgb('#f87171'), width=2)
    icons['icon_item_beast_core'] = im

    # 15. Bảo Rương (Rương báu)
    im = create_base_canvas(48, 48)
    draw = ImageDraw.Draw(im)
    make_icon_frame(draw, bg_color=(32, 24, 18))
    # Wooden chest base
    draw.rectangle([12, 22, 36, 36], fill=hex_to_rgb('#78350f'), outline=hex_to_rgb('#451a03'), width=1)
    # Curved chest lid
    draw.rounded_rectangle([11, 14, 37, 24], radius=3, fill=hex_to_rgb('#92400e'), outline=hex_to_rgb('#d97706'), width=1)
    # Brass bands
    draw.line([(18, 14), (18, 36)], fill=hex_to_rgb('#e2b467'), width=2)
    draw.line([(30, 14), (30, 36)], fill=hex_to_rgb('#e2b467'), width=2)
    # Keyhole lock
    draw.ellipse([22, 22, 26, 26], fill=hex_to_rgb('#fef08a'), outline=hex_to_rgb('#785a28'))
    draw.point((24, 25), fill=hex_to_rgb('#000000'))
    icons['icon_item_chest'] = im

    # 16. Tông Môn Lệnh Bài
    im = create_base_canvas(48, 48)
    draw = ImageDraw.Draw(im)
    make_icon_frame(draw, bg_color=(28, 22, 16))
    # Rectangular wooden pass
    draw.rounded_rectangle([15, 10, 33, 38], radius=3, fill=hex_to_rgb('#854d0e'), outline=hex_to_rgb('#ca8a04'), width=2)
    # Top hole & hanging knot
    draw.ellipse([22, 12, 26, 16], fill=hex_to_rgb('#000000'))
    draw.line([(24, 6), (24, 12)], fill=hex_to_rgb('#dc2626'), width=2)
    # Engraved ancient character
    draw.line([(20, 22), (28, 22)], fill=hex_to_rgb('#fef08a'), width=2)
    draw.line([(24, 22), (24, 32)], fill=hex_to_rgb('#fef08a'), width=2)
    draw.line([(19, 32), (29, 32)], fill=hex_to_rgb('#fef08a'), width=2)
    icons['icon_item_token'] = im

    for name, img in icons.items():
        img.save(OUT_VNEXT / f'{name}.png', optimize=True)
        img.save(OUT_LEGACY / f'{name}.png', optimize=True)
    print(f"   -> Successfully saved {len(icons)} item icons.")
    return icons

# ============================================================
# 3. CHARACTER SPRITE SHEETS FOR PHÁP TU & THỂ TU (64x64)
# ============================================================

def draw_character_frame(draw, role='magic', pose='idle', direction='down', frame_idx=0):
    """Draws a single 64x64 frame with foot anchor at (32, 56) conforming to ART_DIRECTION.md."""
    # Foot anchor: X=32, Y=56.
    # Height of character: 44px (Y from 12 to 56).
    foot_x = 32
    foot_y = 56

    # Shadow under feet (24x8 ellipse)
    draw.ellipse([foot_x - 12, foot_y - 4, foot_x + 12, foot_y + 4], fill=(0, 0, 0, 80))

    # Palettes
    if role == 'magic':
        # Pháp Tu: Tử hà đạo bào (#3b2354, #5a367f, #e8d584)
        c_robe_main = hex_to_rgb('#5a367f')
        c_robe_shadow = hex_to_rgb('#3b2354')
        c_robe_trim = hex_to_rgb('#e8d584')
        c_hair = hex_to_rgb('#1e102d')
        c_skin = hex_to_rgb('#fbe8d0')
        c_skin_shadow = hex_to_rgb('#e5c3a3')
        c_pants = hex_to_rgb('#2a183c')
        c_boots = hex_to_rgb('#1a0f26')
        c_weapon = hex_to_rgb('#c084fc')
    else:
        # Thể Tu: Chiến bào xích đồng (#5c241c, #84382c, #d48c3b)
        c_robe_main = hex_to_rgb('#84382c')
        c_robe_shadow = hex_to_rgb('#5c241c')
        c_robe_trim = hex_to_rgb('#d48c3b')
        c_hair = hex_to_rgb('#20120f')
        c_skin = hex_to_rgb('#f5d0b5')
        c_skin_shadow = hex_to_rgb('#d9a786')
        c_pants = hex_to_rgb('#3d1812')
        c_boots = hex_to_rgb('#220e0b')
        c_weapon = hex_to_rgb('#ea580c')

    # Step offsets for walking animation (4 frames)
    step_l = 0
    step_r = 0
    torso_bob = 0
    arm_swing = 0

    if pose == 'walk':
        # 4 poses: left contact, pass, right contact, pass
        if frame_idx == 0:
            step_l = -3
            step_r = 3
            arm_swing = 2
        elif frame_idx == 1:
            step_l = 0
            step_r = 0
            torso_bob = -1
        elif frame_idx == 2:
            step_l = 3
            step_r = -3
            arm_swing = -2
        elif frame_idx == 3:
            step_l = 0
            step_r = 0
            torso_bob = 0
    elif pose == 'attack':
        # 3 poses: windup, lunge, recover
        if frame_idx == 0:
            torso_bob = 1
            arm_swing = -4
        elif frame_idx == 1:
            torso_bob = 2
            arm_swing = 6
        elif frame_idx == 2:
            torso_bob = 0
            arm_swing = 2
    elif pose == 'cast':
        if frame_idx == 0:
            torso_bob = 0
            arm_swing = -2
        elif frame_idx == 1:
            torso_bob = -1
            arm_swing = 4
        elif frame_idx == 2:
            torso_bob = 0
            arm_swing = 1
    elif pose == 'dodge':
        torso_bob = 2
        if direction in ['left', 'right']:
            step_l = -4 if direction == 'right' else 4
    elif pose == 'hurt':
        torso_bob = -2 if frame_idx == 0 else 0
    elif pose == 'death':
        # Fall down progression
        if frame_idx == 1:
            torso_bob = 8
        elif frame_idx == 2:
            torso_bob = 14

    head_y = 14 + torso_bob
    torso_y = 26 + torso_bob

    # 1. LEGS & BOOTS (Y: 42 to 56)
    if pose != 'death' or frame_idx < 2:
        # Left leg
        draw.rectangle([foot_x - 6 + step_l, 44, foot_x - 2 + step_l, foot_y - 2], fill=c_pants)
        draw.rectangle([foot_x - 7 + step_l, foot_y - 4, foot_x - 1 + step_l, foot_y], fill=c_boots)
        # Right leg
        draw.rectangle([foot_x + 2 + step_r, 44, foot_x + 6 + step_r, foot_y - 2], fill=c_pants)
        draw.rectangle([foot_x + 1 + step_r, foot_y - 4, foot_x + 7 + step_r, foot_y], fill=c_boots)

    # 2. ROBE & TORSO (Y: 26 to 46)
    if direction in ['down', 'up']:
        robe_box = [foot_x - 8, torso_y, foot_x + 8, torso_y + 18]
        draw.rectangle(robe_box, fill=c_robe_main, outline=c_robe_shadow)
        # Belt / sash
        draw.rectangle([foot_x - 8, torso_y + 8, foot_x + 8, torso_y + 11], fill=c_robe_trim)
        # Collar if facing down
        if direction == 'down':
            draw.line([(foot_x - 4, torso_y), (foot_x, torso_y + 6)], fill=c_skin, width=2)
            draw.line([(foot_x + 4, torso_y), (foot_x, torso_y + 6)], fill=c_skin, width=2)
    else: # left or right
        flip = 1 if direction == 'right' else -1
        robe_box = [foot_x - 7, torso_y, foot_x + 7, torso_y + 18]
        draw.rectangle(robe_box, fill=c_robe_main, outline=c_robe_shadow)
        draw.rectangle([foot_x - 7, torso_y + 8, foot_x + 7, torso_y + 11], fill=c_robe_trim)

    # 3. HEAD & HAIR (Y: 14 to 25)
    # Head skin
    draw.rounded_rectangle([foot_x - 5, head_y, foot_x + 5, head_y + 10], radius=3, fill=c_skin, outline=c_skin_shadow)
    # Hair topknot
    draw.ellipse([foot_x - 3, head_y - 4, foot_x + 3, head_y + 2], fill=c_hair)
    # Hair crown
    if direction == 'up':
        draw.rectangle([foot_x - 5, head_y, foot_x + 5, head_y + 8], fill=c_hair)
    elif direction == 'down':
        # Hair bangs on top
        draw.rectangle([foot_x - 5, head_y, foot_x + 5, head_y + 3], fill=c_hair)
        # Eyes (2px each)
        draw.point((foot_x - 3, head_y + 5), fill=hex_to_rgb('#111827'))
        draw.point((foot_x + 2, head_y + 5), fill=hex_to_rgb('#111827'))
    elif direction == 'left':
        draw.rectangle([foot_x - 2, head_y, foot_x + 5, head_y + 7], fill=c_hair)
        draw.point((foot_x - 4, head_y + 5), fill=hex_to_rgb('#111827'))
    elif direction == 'right':
        draw.rectangle([foot_x - 5, head_y, foot_x + 2, head_y + 7], fill=c_hair)
        draw.point((foot_x + 3, head_y + 5), fill=hex_to_rgb('#111827'))

    # 4. ARMS & WEAPON
    if role == 'magic':
        # Holds staff in right hand
        staff_x = foot_x + 9 + arm_swing
        draw.line([(staff_x, head_y), (staff_x, foot_y - 2)], fill=hex_to_rgb('#78350f'), width=2)
        # Staff top gem
        draw.ellipse([staff_x - 3, head_y - 4, staff_x + 3, head_y + 2], fill=c_weapon, outline=hex_to_rgb('#ffffff'))
    else:
        # Thể Tu: Armored bronze bracers on hands
        hand_l = (foot_x - 10, torso_y + 6 - arm_swing)
        hand_r = (foot_x + 8, torso_y + 8 + arm_swing)
        draw.ellipse([hand_l[0], hand_l[1], hand_l[0] + 4, hand_l[1] + 4], fill=c_weapon, outline=c_robe_trim)
        draw.ellipse([hand_r[0], hand_r[1], hand_r[0] + 4, hand_r[1] + 4], fill=c_weapon, outline=c_robe_trim)

def generate_cultivator_spritesheets():
    print("-> Generating Pháp Tu & Thể Tu Spritesheets (64x64, 4 directions)...")
    directions = ['up', 'left', 'down', 'right']
    roles = ['magic', 'body']
    poses_config = [
        ('idle', 2, 1000),
        ('walk', 4, 500),
        ('slash', 3, 428),
        ('cast', 3, 583),
        ('dodge', 3, 312),
        ('hurt', 2, 500),
        ('death', 3, 1000),
    ]

    for role in roles:
        for pose_name, num_frames, _duration in poses_config:
            sheet_w = num_frames * 64
            sheet_h = 4 * 64 # 4 directions
            sheet = create_base_canvas(sheet_w, sheet_h)

            for dir_idx, d in enumerate(directions):
                for f in range(num_frames):
                    frame_img = create_base_canvas(64, 64)
                    draw = ImageDraw.Draw(frame_img)
                    draw_character_frame(draw, role=role, pose=pose_name, direction=d, frame_idx=f)
                    sheet.alpha_composite(frame_img, (f * 64, dir_idx * 64))

            # Save as e.g. player_magic_walk.png
            filename = f'player_{role}_{pose_name}.png'
            sheet.save(OUT_VNEXT / filename, optimize=True)
            sheet.save(OUT_LEGACY / filename, optimize=True)

            # For idle pose, also keep player_magic_idle.png as legacy fallback
            if pose_name == 'idle':
                sheet.save(OUT_LEGACY / f'player_{role}_idle.png', optimize=True)

    print("   -> Successfully generated full animation sets for Pháp Tu & Thể Tu.")

# ============================================================
# 4. MONSTERS & SUB-BOSSES (Cổ Thụ Yêu, Khôi Lỗi)
# ============================================================

def generate_monsters():
    print("-> Generating Expanded Monsters (Cổ Thụ Yêu, Khôi Lỗi Giáp Sĩ)...")

    # 1. monster_treant.png (Cổ Thụ Yêu - 6 frames: 4 walk, 1 windup, 1 attack)
    # 6 cols x 64px = 384x64
    im_treant = create_base_canvas(64 * 6, 64)
    for f in range(6):
        frame = create_base_canvas(64, 64)
        draw = ImageDraw.Draw(frame)
        foot_x, foot_y = 32, 56
        # Shadow
        draw.ellipse([foot_x - 16, foot_y - 6, foot_x + 16, foot_y + 4], fill=(0, 0, 0, 90))
        # Trunk / Body
        sway = int(2 * math.sin(f * math.pi / 2))
        draw.polygon([(foot_x - 14, foot_y), (foot_x - 8 + sway, 20), (foot_x + 8 + sway, 20), (foot_x + 14, foot_y)],
                     fill=hex_to_rgb('#3f2817'), outline=hex_to_rgb('#2a1a0f'), width=2)
        # Ancient Mossy Foliage Canopy
        draw.ellipse([foot_x - 22 + sway, 8, foot_x + 22 + sway, 34], fill=hex_to_rgb('#166534'), outline=hex_to_rgb('#14532d'))
        draw.ellipse([foot_x - 16 + sway, 4, foot_x + 16 + sway, 24], fill=hex_to_rgb('#15803d'))
        # Glowing Demon Eyes in hollow bark
        draw.ellipse([foot_x - 6 + sway, 26, foot_x - 2 + sway, 30], fill=hex_to_rgb('#4ade80'))
        draw.ellipse([foot_x + 2 + sway, 26, foot_x + 6 + sway, 30], fill=hex_to_rgb('#4ade80'))
        # Gnarled Branch Arms
        arm_reach = 8 if f == 5 else -4 if f == 4 else 0
        draw.line([(foot_x - 10 + sway, 24), (foot_x - 24 + arm_reach, 30)], fill=hex_to_rgb('#3f2817'), width=4)
        draw.line([(foot_x + 10 + sway, 24), (foot_x + 24 + arm_reach, 28)], fill=hex_to_rgb('#3f2817'), width=4)
        im_treant.alpha_composite(frame, (f * 64, 0))

    im_treant.save(OUT_VNEXT / 'monster_treant.png', optimize=True)
    im_treant.save(OUT_LEGACY / 'monster_treant.png', optimize=True)

    # 2. monster_puppet.png (Khôi Lỗi Giáp Sĩ - 6 frames)
    im_puppet = create_base_canvas(64 * 6, 64)
    for f in range(6):
        frame = create_base_canvas(64, 64)
        draw = ImageDraw.Draw(frame)
        foot_x, foot_y = 32, 56
        draw.ellipse([foot_x - 10, foot_y - 4, foot_x + 10, foot_y + 4], fill=(0, 0, 0, 70))
        # Mechanical Wooden / Bronze Body
        bob = 1 if f in (1, 3) else 0
        draw.rectangle([foot_x - 7, 26 + bob, foot_x + 7, 44 + bob], fill=hex_to_rgb('#854d0e'), outline=hex_to_rgb('#ca8a04'), width=2)
        # Bronze armor plate
        draw.rectangle([foot_x - 5, 28 + bob, foot_x + 5, 36 + bob], fill=hex_to_rgb('#b45309'))
        # Head
        draw.rectangle([foot_x - 5, 14 + bob, foot_x + 5, 24 + bob], fill=hex_to_rgb('#a16207'), outline=hex_to_rgb('#713f12'))
        draw.point((foot_x - 2, 18 + bob), fill=hex_to_rgb('#ef4444')) # red optical eye
        draw.point((foot_x + 2, 18 + bob), fill=hex_to_rgb('#ef4444'))
        # Bronze Spear in arm
        spear_thrust = 10 if f == 5 else -4 if f == 4 else 0
        draw.line([(foot_x + 10 + spear_thrust, 10 + bob), (foot_x + 10 + spear_thrust, 52)], fill=hex_to_rgb('#78350f'), width=2)
        draw.polygon([(foot_x + 8 + spear_thrust, 10 + bob), (foot_x + 12 + spear_thrust, 10 + bob), (foot_x + 10 + spear_thrust, 2 + bob)], fill=hex_to_rgb('#e2e8f0'))
        # Legs
        l_step = -3 if f == 0 else 3 if f == 2 else 0
        r_step = -l_step
        draw.rectangle([foot_x - 5 + l_step, 44, foot_x - 1 + l_step, foot_y], fill=hex_to_rgb('#713f12'))
        draw.rectangle([foot_x + 1 + r_step, 44, foot_x + 5 + r_step, foot_y], fill=hex_to_rgb('#713f12'))
        im_puppet.alpha_composite(frame, (f * 64, 0))

    im_puppet.save(OUT_VNEXT / 'monster_puppet.png', optimize=True)
    im_puppet.save(OUT_LEGACY / 'monster_puppet.png', optimize=True)
    print("   -> Successfully generated Cổ Thụ Yêu & Khôi Lỗi Giáp Sĩ.")

# ============================================================
# 5. ENVIRONMENT PROPS (Alchemy Furnace, Wooden Bridge, etc.)
# ============================================================

def generate_environment_props():
    print("-> Generating Environment Props (Đan Lô, Cầu Gỗ, Bồ Đoàn, Bia Đá)...")

    # 1. prop_alchemy_furnace.png (Cửu Long Luyện Đan Lô - 64x80)
    im_furnace = create_base_canvas(64, 80)
    draw = ImageDraw.Draw(im_furnace)
    # Contact shadow
    draw.ellipse([8, 64, 56, 76], fill=(0, 0, 0, 90))
    # 3 Tripod legs
    draw.polygon([(14, 55), (10, 72), (18, 65)], fill=hex_to_rgb('#451a03'))
    draw.polygon([(50, 55), (54, 72), (46, 65)], fill=hex_to_rgb('#451a03'))
    draw.polygon([(30, 55), (32, 74), (34, 55)], fill=hex_to_rgb('#451a03'))
    # Cauldron bowl (antique bronze)
    draw.ellipse([10, 28, 54, 60], fill=hex_to_rgb('#92400e'), outline=hex_to_rgb('#b45309'), width=2)
    # Golden dragon relief / band
    draw.line([(12, 44), (52, 44)], fill=hex_to_rgb('#e2b467'), width=3)
    # Lid / Domed cover with vents
    draw.arc([14, 16, 50, 42], start=180, end=360, fill=hex_to_rgb('#b45309'), width=3)
    draw.polygon([(14, 29), (50, 29), (32, 14)], fill=hex_to_rgb('#78350f'))
    # Lid finial top handle
    draw.ellipse([28, 8, 36, 16], fill=hex_to_rgb('#fde047'), outline=hex_to_rgb('#ca8a04'))
    # Glowing spiritual flame vents
    draw.ellipse([22, 34, 28, 40], fill=hex_to_rgb('#ef4444'))
    draw.ellipse([36, 34, 42, 40], fill=hex_to_rgb('#ef4444'))
    draw.point((25, 37), fill=hex_to_rgb('#fde047'))
    draw.point((39, 37), fill=hex_to_rgb('#fde047'))
    im_furnace.save(OUT_VNEXT / 'prop_alchemy_furnace.png', optimize=True)
    im_furnace.save(OUT_LEGACY / 'prop_alchemy_furnace.png', optimize=True)

    # 2. prop_wooden_bridge.png (Cầu Gỗ Thanh Khê - 128x64)
    im_bridge = create_base_canvas(128, 64)
    draw = ImageDraw.Draw(im_bridge)
    # Arch shadow
    draw.ellipse([10, 36, 118, 58], fill=(0, 0, 0, 60))
    # Wooden planks across
    for x in range(12, 116, 8):
        h = int(8 * math.sin((x - 12) / 104 * math.pi))
        draw.rectangle([x, 28 - h, x + 6, 44 - h], fill=hex_to_rgb('#854d0e'), outline=hex_to_rgb('#593309'))
    # Side guard railings
    draw.line([(8, 26), (64, 16), (120, 26)], fill=hex_to_rgb('#a16207'), width=3)
    draw.line([(8, 44), (64, 34), (120, 44)], fill=hex_to_rgb('#a16207'), width=3)
    # Posts
    for px in [12, 40, 64, 88, 116]:
        ph = int(8 * math.sin((px - 12) / 104 * math.pi))
        draw.line([(px, 20 - ph), (px, 46 - ph)], fill=hex_to_rgb('#713f12'), width=3)
    im_bridge.save(OUT_VNEXT / 'prop_wooden_bridge.png', optimize=True)
    im_bridge.save(OUT_LEGACY / 'prop_wooden_bridge.png', optimize=True)

    # 3. prop_meditation_mat.png (Bồ Đoàn Tĩnh Tọa - 48x48)
    im_mat = create_base_canvas(48, 48)
    draw = ImageDraw.Draw(im_mat)
    draw.ellipse([6, 18, 42, 36], fill=hex_to_rgb('#854d0e'), outline=hex_to_rgb('#ca8a04'), width=2)
    draw.ellipse([10, 21, 38, 33], fill=hex_to_rgb('#a16207'))
    # Woven straw spiral
    draw.ellipse([16, 23, 32, 31], outline=hex_to_rgb('#fde047'), width=1)
    im_mat.save(OUT_VNEXT / 'prop_meditation_mat.png', optimize=True)
    im_mat.save(OUT_LEGACY / 'prop_meditation_mat.png', optimize=True)

    # 4. prop_boundary_stele.png (Bia Đá Ranh Giới - 48x64)
    im_stele = create_base_canvas(48, 64)
    draw = ImageDraw.Draw(im_stele)
    draw.ellipse([6, 50, 42, 60], fill=(0, 0, 0, 80))
    # Stone plinth
    draw.polygon([(8, 54), (40, 54), (36, 48), (12, 48)], fill=hex_to_rgb('#4b5563'))
    # Vertical stone slab with weathered top
    draw.polygon([(14, 48), (34, 48), (32, 14), (24, 10), (16, 14)], fill=hex_to_rgb('#6b7280'), outline=hex_to_rgb('#374151'), width=2)
    # Red carved glyphs
    draw.line([(24, 18), (24, 40)], fill=hex_to_rgb('#dc2626'), width=2)
    draw.line([(20, 24), (28, 24)], fill=hex_to_rgb('#dc2626'), width=2)
    draw.line([(21, 32), (27, 32)], fill=hex_to_rgb('#dc2626'), width=2)
    im_stele.save(OUT_VNEXT / 'prop_boundary_stele.png', optimize=True)
    im_stele.save(OUT_LEGACY / 'prop_boundary_stele.png', optimize=True)
    print("   -> Successfully generated Environment Props.")

# ============================================================
# 6. COMBAT VFX SPRITES (Sword Slash, Lightning Burst, Shield)
# ============================================================

def generate_combat_vfx():
    print("-> Generating Enhanced Combat VFX Sprites...")

    # 1. vfx_sword_slash.png (64x64 radiant crescent blade arc)
    im_slash = create_base_canvas(64, 64)
    draw = ImageDraw.Draw(im_slash)
    draw.arc([6, 6, 58, 58], start=210, end=350, fill=hex_to_rgba('#8ae0f2', 240), width=6)
    draw.arc([8, 8, 56, 56], start=220, end=340, fill=hex_to_rgba('#ffffff', 255), width=3)
    draw.arc([4, 4, 60, 60], start=205, end=355, fill=hex_to_rgba('#38bdf8', 160), width=2)
    im_slash.save(OUT_VNEXT / 'vfx_sword_slash.png', optimize=True)
    im_slash.save(OUT_LEGACY / 'vfx_sword_slash.png', optimize=True)

    # 2. vfx_sword_beam.png (64x32 aerodynamic crystalline sword beam)
    im_beam = create_base_canvas(64, 32)
    draw = ImageDraw.Draw(im_beam)
    draw.polygon([(4, 16), (24, 8), (60, 16), (24, 24)], fill=hex_to_rgba('#8ae0f2', 220), outline=hex_to_rgba('#dcf7fd', 255))
    draw.line([(10, 16), (56, 16)], fill=hex_to_rgba('#ffffff', 255), width=2)
    # Wind trails
    draw.line([(0, 12), (18, 12)], fill=hex_to_rgba('#38bdf8', 180), width=1)
    draw.line([(0, 20), (18, 20)], fill=hex_to_rgba('#38bdf8', 180), width=1)
    im_beam.save(OUT_VNEXT / 'vfx_sword_beam.png', optimize=True)
    im_beam.save(OUT_LEGACY / 'vfx_sword_beam.png', optimize=True)

    # 3. vfx_lightning_burst.png (64x64 radial lightning spark)
    im_light = create_base_canvas(64, 64)
    draw = ImageDraw.Draw(im_light)
    cx, cy = 32, 32
    for angle in [0, 45, 90, 135, 180, 225, 270, 315]:
        rad = math.radians(angle)
        x1 = cx + int(12 * math.cos(rad))
        y1 = cy + int(12 * math.sin(rad))
        x2 = cx + int(26 * math.cos(rad + 0.2))
        y2 = cy + int(26 * math.sin(rad + 0.2))
        draw.line([(cx, cy), (x1, y1), (x2, y2)], fill=hex_to_rgba('#ffd700', 240), width=2)
        draw.line([(cx, cy), (x1, y1)], fill=hex_to_rgba('#ffffff', 255), width=1)
    draw.ellipse([cx - 6, cy - 6, cx + 6, cy + 6], fill=hex_to_rgba('#ffffff', 255), outline=hex_to_rgba('#c084fc', 220))
    im_light.save(OUT_VNEXT / 'vfx_lightning_burst.png', optimize=True)
    im_light.save(OUT_LEGACY / 'vfx_lightning_burst.png', optimize=True)

    # 4. vfx_shield.png (64x64 golden hexagram barrier)
    im_shield = create_base_canvas(64, 64)
    draw = ImageDraw.Draw(im_shield)
    draw.ellipse([4, 4, 60, 60], outline=hex_to_rgba('#fbbf24', 200), width=3)
    draw.ellipse([8, 8, 56, 56], fill=hex_to_rgba('#fef08a', 40), outline=hex_to_rgba('#fde047', 150), width=1)
    im_shield.save(OUT_VNEXT / 'vfx_shield.png', optimize=True)
    im_shield.save(OUT_LEGACY / 'vfx_shield.png', optimize=True)
    print("   -> Successfully generated Combat VFX Sprites.")

# ============================================================
# MAIN ORCHESTRATION
# ============================================================

if __name__ == '__main__':
    print("============================================================")
    print(" VẠN ĐẠO TRƯỜNG SINH - ASSET SYNTHESIS RUNNER")
    print("============================================================")
    generate_skill_icons()
    generate_item_icons()
    generate_cultivator_spritesheets()
    generate_monsters()
    generate_environment_props()
    generate_combat_vfx()
    print("============================================================")
    print(" ✅ ALL EXPANDED ASSETS SUCCESSFULLY GENERATED & SYNCHRONIZED!")
    print("============================================================")
