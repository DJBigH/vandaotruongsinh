"""Build a small review board from exported native art (not used by the game)."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parents[2]
ASSETS=ROOT/'client/public/assets'
OUT=Path(__file__).parent/'preview.png'
board=Image.new('RGB',(1220,820),(28,28,33))
d=ImageDraw.Draw(board)
font=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',20)
small=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',16)
d.text((28,18),'VẠN ĐẠO TRƯỜNG SINH · 1.7.0',font=font,fill='#e8d5a7')
d.text((28,51),'Hai tuyến địa vực · NPC Ma · quái thường / tinh anh · cổng đá phù văn',font=small,fill='#c2b8aa')

def panel(x,y,w,h,label,path,size=None,nearest=False):
    d.rounded_rectangle((x,y,x+w,y+h),radius=10,fill=(44,41,45),outline=(113,85,70),width=2)
    d.text((x+14,y+10),label,font=small,fill='#e4c89f')
    art=Image.open(ASSETS/path).convert('RGBA')
    if size:
        art.thumbnail(size,Image.Resampling.NEAREST if nearest else Image.Resampling.LANCZOS)
    px=x+(w-art.width)//2
    py=y+38+(h-46-art.height)//2
    board.paste(art,(px,py),art)

panel(28,86,226,246,'Ma sư · chân dung','v170/avatar_npc_mentor_demonic.png')
panel(267,86,226,246,'Quái thường · Tiên','v170/avatar_mon_001_immortal.png')
panel(506,86,226,246,'Tinh anh · Ma','v170/avatar_mon_001_elite_demonic.png')
panel(745,86,447,246,'Ma tông · mái ngói huyết','v170/building_hall_demonic.png',(405,190))
panel(28,346,226,222,'Cổng Tiên · đá phù','v170/prop_portal_immortal.png',(128,128),True)
panel(267,346,226,222,'Cổng Ma · huyết khí','v170/prop_portal_demonic.png',(128,128),True)
panel(506,346,226,222,'Bia địa vực Ma','v170/prop_ma_map_thanh_khe_rung.png',(125,160))
panel(745,346,218,222,'U Lâm · mặt đất','v170/mapground_map_u_lam_demonic.png',(174,174))
panel(974,346,218,222,'Thanh Khê · mặt đất','v160/mapground_map_thanh_khe_rung_immortal.png',(174,174))
panel(28,582,372,207,'NPC Ma · sprite gốc 64 px','v170/npc_mentor_demonic.png',(256,64),True)
panel(414,582,372,207,'Quái Tiên · sáu khung','v170/mon_001_immortal.png',(360,64),True)
panel(800,582,392,207,'Quái Ma tinh anh · sáu khung','v170/mon_001_elite_demonic.png',(360,64),True)
board.save(OUT,optimize=True)
print(OUT)
