#!/usr/bin/env python3
"""
VẠN ĐẠO TRƯỜNG SINH - Pixel Art Asset Generator
Sinh toàn bộ asset đồ họa tiên hiệp cổ phong theo ART_DIRECTION.md
Đảm bảo 100% alpha transparency, đúng pixel grid, tỷ lệ chuẩn.
"""

import os
import math
from PIL import Image, ImageDraw

ASSETS_DIR = os.path.join(os.path.dirname(__file__), '..', 'client', 'public', 'assets')
os.makedirs(ASSETS_DIR, exist_ok=True)

def create_transparent(w, h):
    return Image.new('RGBA', (w, h), (0, 0, 0, 0))

# -------------------------------------------------------------
# 1. RƯƠNG KHO BÁU BÍ CẢNH (prop_chest.png) - 48x48
# -------------------------------------------------------------
def generate_prop_chest():
    im = create_transparent(48, 48)
    draw = ImageDraw.Draw(im)
    
    # Bóng chân rương
    draw.ellipse([8, 38, 40, 46], fill=(0, 0, 0, 80))
    
    # Thân rương gỗ sưa đỏ cổ phong
    # Thân dưới: 10..38, 22..38
    draw.rectangle([10, 22, 38, 38], fill=(120, 45, 25, 255), outline=(65, 20, 10, 255))
    # Nếp gỗ thân
    draw.line([11, 30, 37, 30], fill=(95, 35, 18, 255))
    
    # Nắp rương hình vòm cong cổ phong
    draw.rectangle([8, 12, 40, 22], fill=(145, 55, 30, 255), outline=(75, 25, 12, 255))
    draw.line([9, 13, 39, 13], fill=(185, 85, 50, 255)) # Highlight nắp
    
    # Viền vàng kim thếp đồng bảo vệ
    draw.rectangle([10, 12, 14, 38], fill=(218, 165, 32, 255), outline=(150, 110, 15, 255))
    draw.rectangle([34, 12, 38, 38], fill=(218, 165, 32, 255), outline=(150, 110, 15, 255))
    
    # Khóa linh phù / ngọc linh thạch ở giữa
    draw.rectangle([21, 19, 27, 26], fill=(245, 205, 50, 255), outline=(140, 100, 10, 255))
    # Viên ngọc bích phong ấn phát sáng
    draw.rectangle([23, 21, 25, 24], fill=(0, 220, 180, 255))
    
    # Tia sáng linh khí nhẹ quanh ổ khóa
    draw.point([24, 18], fill=(120, 255, 220, 200))
    draw.point([20, 22], fill=(120, 255, 220, 200))
    draw.point([28, 22], fill=(120, 255, 220, 200))
    draw.point([24, 27], fill=(120, 255, 220, 200))
    
    out_path = os.path.join(ASSETS_DIR, 'prop_chest.png')
    im.save(out_path)
    print(f"Generated: {out_path} ({im.size})")

# -------------------------------------------------------------
# 2. LINH THẢO TIÊN DƯỢC (prop_herb.png) - 32x32
# -------------------------------------------------------------
def generate_prop_herb():
    im = create_transparent(32, 32)
    draw = ImageDraw.Draw(im)
    
    # Bóng gốc thảo dược
    draw.ellipse([8, 25, 24, 30], fill=(0, 0, 0, 60))
    
    # Thân cọng xanh ngọc
    draw.line([16, 26, 16, 15], fill=(30, 120, 60, 255), width=2)
    
    # Lá linh thảo xòe 3 cánh tiên thảo
    # Lá trái
    draw.polygon([(15, 22), (8, 18), (10, 14), (15, 18)], fill=(45, 185, 95, 255), outline=(20, 95, 45, 255))
    # Lá phải
    draw.polygon([(17, 20), (24, 16), (23, 12), (17, 16)], fill=(55, 200, 110, 255), outline=(25, 105, 50, 255))
    # Nụ hoa linh đan đỉnh ngọn phát quang
    draw.ellipse([13, 8, 19, 14], fill=(160, 240, 255, 255), outline=(70, 180, 220, 255))
    draw.point([15, 10], fill=(255, 255, 255, 255))
    
    # Linh quang lấp lánh xung quanh
    draw.point([11, 9], fill=(180, 255, 240, 220))
    draw.point([21, 8], fill=(180, 255, 240, 220))
    draw.point([16, 5], fill=(220, 255, 255, 240))
    draw.point([7, 16], fill=(150, 230, 210, 180))
    draw.point([25, 15], fill=(150, 230, 210, 180))
    
    out_path = os.path.join(ASSETS_DIR, 'prop_herb.png')
    im.save(out_path)
    print(f"Generated: {out_path} ({im.size})")

# -------------------------------------------------------------
# 3. KHOÁNG THẠCH LINH TINH (prop_ore.png) - 32x32
# -------------------------------------------------------------
def generate_prop_ore():
    im = create_transparent(32, 32)
    draw = ImageDraw.Draw(im)
    
    # Bóng tảng đá
    draw.ellipse([4, 22, 28, 30], fill=(0, 0, 0, 70))
    
    # Tảng đá mẹ xám than cổ
    draw.polygon([(6, 26), (9, 16), (17, 12), (25, 15), (27, 25), (20, 28), (10, 28)],
                 fill=(75, 82, 90, 255), outline=(45, 50, 55, 255))
    draw.polygon([(10, 25), (12, 18), (18, 15), (23, 17), (24, 24), (18, 26)],
                 fill=(95, 105, 115, 255))
    
    # Tinh thể linh khoáng tím ngọc lồi ra
    # Tinh thể 1 (lớn)
    draw.polygon([(12, 17), (15, 6), (19, 10), (16, 20)], fill=(160, 90, 230, 255), outline=(90, 40, 150, 255))
    draw.line([(15, 6), (16, 20)], fill=(210, 160, 255, 255)) # Sống tinh thể sáng
    
    # Tinh thể 2 (nhỏ bên phải)
    draw.polygon([(18, 16), (23, 9), (25, 13), (21, 20)], fill=(130, 70, 200, 255), outline=(75, 30, 130, 255))
    
    # Đốm sáng phản chiếu
    draw.point([15, 8], fill=(255, 255, 255, 255))
    draw.point([23, 11], fill=(235, 205, 255, 255))
    
    out_path = os.path.join(ASSETS_DIR, 'prop_ore.png')
    im.save(out_path)
    print(f"Generated: {out_path} ({im.size})")

# -------------------------------------------------------------
# 4. QUÁI VẬT U HỒN CHUẨN 32x32 FRAME (monster_ghost.png) - 96x128
# Layout: 3 frames ngang x 4 hướng dọc (up, left, down, right)
# -------------------------------------------------------------
def generate_monster_ghost():
    fw, fh = 32, 32
    im = create_transparent(fw * 3, fh * 4)
    draw = ImageDraw.Draw(im)
    
    for row in range(4): # 0=up, 1=left, 2=down, 3=right
        for col in range(3): # 3 frames animation (lơ lửng bồng bềnh)
            ox = col * fw
            oy = row * fh
            
            # Dao động nổi bồng bềnh theo frame
            bob = [0, -1, 1][col]
            
            # Bóng mờ dưới đất
            shadow_alpha = [40, 30, 50][col]
            draw.ellipse([ox + 10, oy + 26, ox + 22, oy + 30], fill=(0, 0, 0, shadow_alpha))
            
            # Thân ma mị lơ lửng: đầu tròn, đuôi xé mờ
            cy = oy + 14 + bob
            cx = ox + 16
            
            # Hào quang âm linh xung quanh (xanh lơ mờ)
            draw.ellipse([cx - 9, cy - 9, cx + 9, cy + 9], fill=(60, 160, 230, 70))
            draw.ellipse([cx - 7, cy - 7, cx + 7, cy + 7], fill=(100, 200, 255, 130))
            
            # Đầu u hồn
            draw.ellipse([cx - 6, cy - 6, cx + 6, cy + 5], fill=(190, 235, 255, 220), outline=(80, 170, 230, 240))
            
            # Đuôi u hồn uốn lượn
            tail_wobble = [-2, 0, 2][col]
            draw.polygon([
                (cx - 5, cy + 2),
                (cx + 5, cy + 2),
                (cx + tail_wobble + 2, cy + 12),
                (cx + tail_wobble - 2, cy + 10)
            ], fill=(150, 215, 255, 180))
            
            # Mắt u hồn theo hướng
            if row == 2: # down: 2 mắt xanh u lam rực sáng
                draw.rectangle([cx - 3, cy - 2, cx - 2, cy], fill=(30, 60, 180, 255))
                draw.rectangle([cx + 1, cy - 2, cx + 2, cy], fill=(30, 60, 180, 255))
                draw.point([cx - 3, cy - 2], fill=(180, 255, 255, 255))
                draw.point([cx + 1, cy - 2], fill=(180, 255, 255, 255))
            elif row == 1: # left: nhìn sang trái
                draw.rectangle([cx - 4, cy - 2, cx - 3, cy], fill=(30, 60, 180, 255))
                draw.point([cx - 4, cy - 2], fill=(180, 255, 255, 255))
            elif row == 3: # right: nhìn sang phải
                draw.rectangle([cx + 2, cy - 2, cx + 3, cy], fill=(30, 60, 180, 255))
                draw.point([cx + 2, cy - 2], fill=(180, 255, 255, 255))
            else: # up: nhìn từ phía sau, tóc âm khí mờ
                draw.arc([cx - 4, cy - 4, cx + 4, cy + 2], 180, 360, fill=(120, 180, 240, 200))
    
    out_path = os.path.join(ASSETS_DIR, 'monster_ghost.png')
    im.save(out_path)
    print(f"Generated: {out_path} ({im.size})")

# -------------------------------------------------------------
# 5. QUÁI VẬT HẮC XÀ CHUẨN 32x32 FRAME (monster_snake.png) - 96x128
# -------------------------------------------------------------
def generate_monster_snake():
    fw, fh = 32, 32
    im = create_transparent(fw * 3, fh * 4)
    draw = ImageDraw.Draw(im)
    
    for row in range(4): # 0=up, 1=left, 2=down, 3=right
        for col in range(3): # 3 frames bò trườn
            ox = col * fw
            oy = row * fh
            wave = [-2, 0, 2][col]
            
            # Bóng trườn sát đất
            draw.ellipse([ox + 6, oy + 22, ox + 26, oy + 28], fill=(0, 0, 0, 60))
            
            if row == 2: # Down
                # Thân uốn lượn S
                draw.line([(ox + 16, oy + 12), (ox + 14 + wave, oy + 18), (ox + 18 - wave, oy + 23), (ox + 16, oy + 27)],
                          fill=(35, 75, 45, 255), width=4)
                draw.line([(ox + 16, oy + 12), (ox + 14 + wave, oy + 18), (ox + 18 - wave, oy + 23), (ox + 16, oy + 27)],
                          fill=(55, 120, 70, 255), width=2)
                # Đầu rắn
                draw.polygon([(ox + 13, oy + 11), (ox + 19, oy + 11), (ox + 16, oy + 16)], fill=(25, 55, 35, 255))
                # 2 Mắt đỏ tinh anh
                draw.point([ox + 14, oy + 12], fill=(230, 30, 30, 255))
                draw.point([ox + 18, oy + 12], fill=(230, 30, 30, 255))
                # Lưỡi rắn thè ra ở frame 1
                if col == 1:
                    draw.line([(ox + 16, oy + 16), (ox + 16, oy + 19)], fill=(220, 40, 40, 255))
            elif row == 0: # Up
                draw.line([(ox + 16, oy + 26), (ox + 18 - wave, oy + 20), (ox + 14 + wave, oy + 15), (ox + 16, oy + 10)],
                          fill=(35, 75, 45, 255), width=4)
                draw.polygon([(ox + 13, oy + 13), (ox + 19, oy + 13), (ox + 16, oy + 8)], fill=(25, 55, 35, 255))
            elif row == 1: # Left
                draw.line([(ox + 26, oy + 20), (ox + 20, oy + 18 + wave), (ox + 14, oy + 22 - wave), (ox + 8, oy + 20)],
                          fill=(35, 75, 45, 255), width=4)
                draw.polygon([(ox + 11, oy + 17), (ox + 11, oy + 23), (ox + 6, oy + 20)], fill=(25, 55, 35, 255))
                draw.point([ox + 8, oy + 19], fill=(230, 30, 30, 255))
            else: # Right
                draw.line([(ox + 6, oy + 20), (ox + 12, oy + 18 + wave), (ox + 18, oy + 22 - wave), (ox + 24, oy + 20)],
                          fill=(35, 75, 45, 255), width=4)
                draw.polygon([(ox + 21, oy + 17), (ox + 21, oy + 23), (ox + 26, oy + 20)], fill=(25, 55, 35, 255))
                draw.point([ox + 24, oy + 19], fill=(230, 30, 30, 255))

    out_path = os.path.join(ASSETS_DIR, 'monster_snake.png')
    im.save(out_path)
    print(f"Generated: {out_path} ({im.size})")

# -------------------------------------------------------------
# 6. HIỆU ỨNG CHIÊU THỨC CHIẾN ĐẤU MỚI (VFX)
# -------------------------------------------------------------
def generate_vfx_assets():
    # 6.1. Hỏa Cầu Pháp Thuật (vfx_fire_orb.png) - 32x32
    im_fire = create_transparent(32, 32)
    draw = ImageDraw.Draw(im_fire)
    draw.ellipse([4, 4, 28, 28], fill=(255, 100, 0, 80))
    draw.ellipse([7, 7, 25, 25], fill=(255, 160, 20, 180))
    draw.ellipse([10, 10, 22, 22], fill=(255, 230, 80, 240))
    draw.ellipse([13, 13, 19, 19], fill=(255, 255, 220, 255))
    im_fire.save(os.path.join(ASSETS_DIR, 'vfx_fire_orb.png'))
    print("Generated: vfx_fire_orb.png")

    # 6.2. Sóng Xung Kích Thể Phá (vfx_shockwave.png) - 48x48
    im_shock = create_transparent(48, 48)
    draw = ImageDraw.Draw(im_shock)
    draw.ellipse([6, 6, 42, 42], outline=(240, 120, 40, 220), width=3)
    draw.ellipse([12, 12, 36, 36], outline=(255, 180, 80, 180), width=2)
    draw.ellipse([18, 18, 30, 30], fill=(255, 220, 140, 150))
    im_shock.save(os.path.join(ASSETS_DIR, 'vfx_shockwave.png'))
    print("Generated: vfx_shockwave.png")

    # 6.3. Bùa Chú Phù Văn (vfx_talisman.png) - 24x32
    im_tal = create_transparent(24, 32)
    draw = ImageDraw.Draw(im_tal)
    draw.rectangle([4, 2, 20, 30], fill=(240, 220, 110, 255), outline=(180, 150, 40, 255))
    draw.line([7, 7, 17, 7], fill=(190, 30, 30, 255), width=2)
    draw.line([12, 7, 12, 25], fill=(190, 30, 30, 255), width=2)
    draw.line([8, 14, 16, 14], fill=(190, 30, 30, 255), width=1)
    draw.line([9, 20, 15, 20], fill=(190, 30, 30, 255), width=1)
    im_tal.save(os.path.join(ASSETS_DIR, 'vfx_talisman.png'))
    print("Generated: vfx_talisman.png")

# -------------------------------------------------------------
# 7. SPRITESHEET ĐỒNG HÓA PHÁP TU & THỂ TU (64x64 Frame)
# -------------------------------------------------------------
def generate_cultivation_path_sprites():
    # Sinh spritesheet 4 hướng Idle cho Pháp Tu (Áo tím hoàng kim)
    fw, fh = 64, 64
    im_pt_idle = create_transparent(fw * 4, fh * 4)
    draw_pt = ImageDraw.Draw(im_pt_idle)
    
    for row in range(4): # 0=up, 1=left, 2=down, 3=right
        for col in range(4): # 4 frames idle
            ox = col * fw
            oy = row * fh
            bob = [0, 1, 0, -1][col]
            
            # Drop shadow
            draw_pt.ellipse([ox + 20, oy + 54, ox + 44, oy + 60], fill=(0, 0, 0, 80))
            
            # Thân áo thụng Tử Hà Pháp Bào (Tím đậm với viền vàng kim)
            robe_color = (60, 35, 90, 255)
            robe_highlight = (85, 50, 125, 255)
            gold_trim = (235, 190, 60, 255)
            skin_color = (250, 215, 180, 255)
            hair_color = (30, 20, 40, 255)
            
            # Tà áo dài quét đất
            draw_pt.polygon([
                (ox + 23, oy + 32 + bob),
                (ox + 41, oy + 32 + bob),
                (ox + 46, oy + 56),
                (ox + 18, oy + 56)
            ], fill=robe_color, outline=(40, 20, 60, 255))
            
            # Thắt lưng & ngọc bội
            draw_pt.rectangle([ox + 24, oy + 34 + bob, ox + 40, oy + 37 + bob], fill=gold_trim)
            draw_pt.rectangle([ox + 30, oy + 37 + bob, ox + 34, oy + 42 + bob], fill=(0, 200, 180, 255))
            
            # Cổ áo & thân trên
            draw_pt.rectangle([ox + 25, oy + 24 + bob, ox + 39, oy + 33 + bob], fill=robe_highlight)
            
            # Đầu & khuôn mặt
            draw_pt.rectangle([ox + 26, oy + 12 + bob, ox + 38, oy + 23 + bob], fill=skin_color)
            
            # Mái tóc dài búi đạo quan
            draw_pt.rectangle([ox + 25, oy + 9 + bob, ox + 39, oy + 15 + bob], fill=hair_color)
            draw_pt.polygon([(ox + 30, oy + 9 + bob), (ox + 34, oy + 9 + bob), (ox + 32, oy + 4 + bob)], fill=gold_trim)
            
            # Chi tiết mặt theo hướng
            if row == 2: # Down
                # Mắt & mày
                draw_pt.rectangle([ox + 28, oy + 17 + bob, ox + 30, oy + 18 + bob], fill=(50, 25, 70, 255))
                draw_pt.rectangle([ox + 34, oy + 17 + bob, ox + 36, oy + 18 + bob], fill=(50, 25, 70, 255))
                # Tay cầm pháp trượng ngọc bên phải
                draw_pt.line([(ox + 44, oy + 10 + bob), (ox + 44, oy + 56)], fill=(160, 110, 40, 255), width=2)
                draw_pt.ellipse([ox + 41, oy + 8 + bob, ox + 47, oy + 14 + bob], fill=(120, 230, 255, 255), outline=gold_trim)
            elif row == 1: # Left
                draw_pt.rectangle([ox + 27, oy + 17 + bob, ox + 29, oy + 18 + bob], fill=(50, 25, 70, 255))
                draw_pt.line([(ox + 21, oy + 10 + bob), (ox + 21, oy + 56)], fill=(160, 110, 40, 255), width=2)
            elif row == 3: # Right
                draw_pt.rectangle([ox + 35, oy + 17 + bob, ox + 37, oy + 18 + bob], fill=(50, 25, 70, 255))
                draw_pt.line([(ox + 43, oy + 10 + bob), (ox + 43, oy + 56)], fill=(160, 110, 40, 255), width=2)
            else: # Up
                # Tóc sau lưng
                draw_pt.rectangle([ox + 26, oy + 14 + bob, ox + 38, oy + 24 + bob], fill=hair_color)

    im_pt_idle.save(os.path.join(ASSETS_DIR, 'player_magic_idle.png'))
    print("Generated: player_magic_idle.png")

    # Sinh spritesheet Thể Tu (Chiến bào xích đồng, cơ bắp uy dũng)
    im_tt_idle = create_transparent(fw * 4, fh * 4)
    draw_tt = ImageDraw.Draw(im_tt_idle)
    
    for row in range(4):
        for col in range(4):
            ox = col * fw
            oy = row * fh
            bob = [0, 1, 0, -1][col]
            
            draw_tt.ellipse([ox + 18, oy + 54, ox + 46, oy + 60], fill=(0, 0, 0, 90))
            
            armor_color = (120, 45, 30, 255)
            armor_highlight = (165, 65, 45, 255)
            gold_buckle = (210, 145, 30, 255)
            skin_color = (235, 190, 155, 255)
            hair_color = (25, 15, 10, 255)
            
            # Chân vững chãi
            draw_tt.rectangle([ox + 22, oy + 42 + bob, ox + 29, oy + 56], fill=(55, 40, 35, 255))
            draw_tt.rectangle([ox + 35, oy + 42 + bob, ox + 42, oy + 56], fill=(55, 40, 35, 255))
            
            # Thân trên giáp hộ tâm kính
            draw_tt.polygon([
                (ox + 21, oy + 23 + bob),
                (ox + 43, oy + 23 + bob),
                (ox + 39, oy + 44 + bob),
                (ox + 25, oy + 44 + bob)
            ], fill=armor_color, outline=(70, 25, 15, 255))
            # Hộ tâm kính tròn ở ngực
            draw_tt.ellipse([ox + 28, oy + 27 + bob, ox + 36, oy + 35 + bob], fill=gold_buckle, outline=(130, 85, 15, 255))
            
            # Cánh tay lực lưỡng
            draw_tt.rectangle([ox + 16, oy + 25 + bob, ox + 21, oy + 40 + bob], fill=skin_color)
            draw_tt.rectangle([ox + 43, oy + 25 + bob, ox + 48, oy + 40 + bob], fill=skin_color)
            # Bao cổ tay sắt
            draw_tt.rectangle([ox + 16, oy + 36 + bob, ox + 21, oy + 41 + bob], fill=(60, 65, 70, 255))
            draw_tt.rectangle([ox + 43, oy + 36 + bob, ox + 48, oy + 41 + bob], fill=(60, 65, 70, 255))
            
            # Đầu
            draw_tt.rectangle([ox + 26, oy + 12 + bob, ox + 38, oy + 22 + bob], fill=skin_color)
            # Băng trán chiến binh
            draw_tt.rectangle([ox + 25, oy + 13 + bob, ox + 39, oy + 16 + bob], fill=(180, 40, 30, 255))
            draw_tt.rectangle([ox + 25, oy + 8 + bob, ox + 39, oy + 13 + bob], fill=hair_color)
            
            if row == 2: # Down
                draw_tt.rectangle([ox + 28, oy + 17 + bob, ox + 30, oy + 18 + bob], fill=(30, 15, 10, 255))
                draw_tt.rectangle([ox + 34, oy + 17 + bob, ox + 36, oy + 18 + bob], fill=(30, 15, 10, 255))
            elif row == 1: # Left
                draw_tt.rectangle([ox + 27, oy + 17 + bob, ox + 29, oy + 18 + bob], fill=(30, 15, 10, 255))
            elif row == 3: # Right
                draw_tt.rectangle([ox + 35, oy + 17 + bob, ox + 37, oy + 18 + bob], fill=(30, 15, 10, 255))
            else: # Up
                draw_tt.rectangle([ox + 26, oy + 13 + bob, ox + 38, oy + 22 + bob], fill=hair_color)

    im_tt_idle.save(os.path.join(ASSETS_DIR, 'player_body_idle.png'))
    print("Generated: player_body_idle.png")

if __name__ == '__main__':
    print("--- BẮT ĐẦU SINH TÀI NGUYÊN PIXEL ART TU TIÊN ---")
    generate_prop_chest()
    generate_prop_herb()
    generate_prop_ore()
    generate_monster_ghost()
    generate_monster_snake()
    generate_vfx_assets()
    generate_cultivation_path_sprites()
    print("--- HOÀN TẤT SINH TÀI NGUYÊN ---")
