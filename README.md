# VẠN ĐẠO TRƯỜNG SINH (萬道長生)

> **Tác giả:** BigK  
> **Phiên bản:** 1.0.2
> **Kho lưu trữ mã nguồn:** [DJBigH/vandaotruongsinh](https://github.com/DJBigH/vandaotruongsinh)
> **Hướng dẫn cài đặt:** [HUONG_DAN_CAI_DAT.md](HUONG_DAN_CAI_DAT.md)
> **Hướng dẫn Launcher:** [LAUNCHER_GUIDE.md](LAUNCHER_GUIDE.md)

**Game Tu Tiên ARPG 2D Đồ Họa Cổ Phong — Chiến Đấu Thời Gian Thực Chơi Trực Tiếp Trên Web**

---

## 1. Giới Thiệu & Triết Lý Thiết Kế

**VẠN ĐẠO TRƯỜNG SINH** là tựa game nhập vai tu tiên **ARPG 2D Top-Down Đánh Theo Thời Gian Thực**. Người chơi trực tiếp điều khiển nhân vật di chuyển tự do, vung kiếm, ngắm bắn pháp thuật, thi triển tuyệt kỹ và lướt né (Dash/i-frame) tránh các đòn đánh cảnh báo nguy hiểm (Telegraphs) của Boss ngay trên bản đồ.

- **Ngôn ngữ:** 100% tiếng Việt (giao diện, cốt truyện, lời thoại NPC, chiêu thức, vật phẩm).
- **Hệ thống chiến đấu:** **ARPG Thời gian thực (Real-time)**. Không còn vòng chờ lượt, máy chủ mô phỏng với tần số cố định 20 ticks/giây (Server-authoritative WebSocket) để bảo đảm công bằng, mượt mà và triệt tiêu hack tốc độ/spam gói tin.
- **Nguyên tắc "4 Không":**
  1. **Không nạp tiền**, không VIP, không Battle Pass trả phí.
  2. **Không mua bán tiền tệ bằng tiền thật**, không tiền mã hóa / crypto.
  3. **Không giới hạn thể lực**, không ép đăng nhập điểm danh hàng ngày.
  4. **Không quảng cáo đổi thưởng**. Toàn bộ linh thạch, pháp bảo, đan dược và công pháp đều kiếm được tự do thông qua quá trình trải nghiệm game.
- **Hệ thống 3 Ô Nhân Vật (3 Character Slots):** Mỗi tài khoản hỗ trợ tối đa 3 nhân vật hoàn toàn độc lập về hướng tu luyện, trang bị và nhiệm vụ. Có thể chuyển đổi qua lại thuận tiện mà không bị mất tiến trình.

---

## 2. Công Nghệ & Kiến Trúc Dự Án

| Thành phần | Công nghệ sử dụng | Vai trò |
|---|---|---|
| **Frontend UI** | React 18, Vite 5, TypeScript | Giao diện túi đồ, tu vi, nhiệm vụ, chế tạo, đàm thoại, Admin Panel |
| **Game Engine** | Phaser 3 CE | Điều khiển di chuyển 2D, camera, bản đồ và chiến đấu thời gian thực |
| **Backend API** | Node.js, Fastify 5, TypeScript | Xử lý toàn bộ logic máy chủ, chống gian lận (Server-authoritative) |
| **Cơ sở dữ liệu** | PostgreSQL 16, Prisma ORM | Lưu trữ tài khoản, nhân vật, túi đồ, nhiệm vụ, ContentVersion, AuditLog |
| **Bảo mật** | bcrypt, @fastify/jwt (httpOnly) | Mã hóa mật khẩu, bảo mật phiên, phân quyền RBAC đa cấp độ |

### Cấu Trúc Thư Mục

```
vandaotruongsinh/
├── shared/                     # Mã nguồn chia sẻ kiểu dữ liệu & hằng số dùng chung
│   ├── src/index.ts            # Enums, Interfaces, Base Stats, 9 Realm Multipliers, Story, Tower
│   └── package.json
├── server/                     # Backend API & Game Engine Server
│   ├── prisma/
│   │   ├── schema.prisma       # Schema PostgreSQL (Accounts, Characters, Items, Combat, Audit, Sect, Pet, Abode...)
│   │   └── seed.ts             # Dữ liệu khởi tạo (150 Items, 36 Skills, 40 Monsters, 20 Bosses, 58 Quests)
│   ├── src/
│   │   ├── config.ts           # Cấu hình môi trường (.env)
│   │   ├── data/               # Kho dữ liệu nội dung dạng module hoàn chỉnh
│   │   │   ├── skills.ts       # 36 Kỹ năng (12 Kiếm, 12 Pháp, 12 Thể)
│   │   │   ├── monsters.ts     # 40 Quái vật thường & tinh anh
│   │   │   ├── bosses.ts       # 20 Boss (8 Chương, 6 Ẩn/Phụ, 6 Trấn Yêu Tháp)
│   │   │   ├── items.ts        # 150 Vật phẩm (Vũ khí, Giáp, Đan dược, Pháp bảo, Thần khí...)
│   │   │   ├── maps.ts         # 10 Bản đồ thế giới chi tiết
│   │   │   ├── quests.ts       # 58 Nhiệm vụ (24 Chính, 24 Phụ, 8 Ẩn, 2 chuẩn bị kết cục)
│   │   │   ├── story.ts        # 8 Chương cốt truyện & 3 Đại kết cục
│   │   │   └── game-content.ts # Bảng dữ liệu trung tâm & Môn phái, Linh thú, Đột phá
│   │   ├── engine/
│   │   │   ├── realtime-arpg-engine.ts # Chiến đấu và di chuyển do máy chủ xác thực
│   │   │   └── realm-engine.ts # Động cơ tu vi, điều kiện đột phá 9 cảnh giới
│   │   ├── middleware/
│   │   │   └── auth.ts         # Xác thực JWT & phân quyền RBAC (Player, Editor, GM, Owner)
│   │   ├── modules/
│   │   │   ├── auth/           # Đăng ký, đăng nhập, phiên
│   │   │   ├── character/      # Nhân vật, tính chỉ số (stats)
│   │   │   ├── inventory/      # Túi đồ, trang bị, sử dụng, khóa, bán
│   │   │   ├── disciple/       # Đệ tử đi theo và hỗ trợ chiến đấu
│   │   │   ├── quest/          # Động cơ nhiệm vụ, tiến trình, trả thưởng transaction
│   │   │   ├── crafting/       # Luyện đan, rèn đúc trang bị
│   │   │   ├── world/          # Bản đồ, dịch chuyển, đàm thoại NPC, tương tác miếu/khoáng
│   │   │   ├── sect/           # Hệ thống Môn Phái, Nhiệm vụ Tông Môn, Tàng Bảo Các
│   │   │   ├── pet/            # Hệ thống 6 Thần Thú, Xuất chiến, Thăng cấp, Hóa hình
│   │   │   ├── cave-abode/     # Động Phủ, Tụ Linh Trận, Linh Điền thảo dược
│   │   │   ├── offline/        # Tu Luyện Vắng Mặt tích lũy tu vi (tối đa 8 giờ)
│   │   │   ├── story/          # Tiến trình 8 Chương cốt truyện & Lựa chọn 3 Kết cục
│   │   │   ├── tower/          # Trấn Yêu Tháp (Endgame Boss Rush 6 Tầng Thần Thoại)
│   │   │   └── admin/          # Quản lý người chơi, chỉnh sửa nội dung, audit log
│   │   ├── scripts/
│   │   │   └── create-admin.ts # CLI tạo tài khoản Owner an toàn
│   │   ├── tests/
│   │   │   ├── gameplay-test.ts# Kiểm thử Giai đoạn 1 (23 tiêu chí)
│   │   │   ├── phase2-test.ts  # Kiểm thử Giai đoạn 2 (31 tiêu chí)
│   │   │   └── phase3-test.ts  # Kiểm thử Giai đoạn 3 Hoàn thiện (20 tiêu chí)
│   │   └── index.ts            # Khởi động máy chủ Fastify
│   └── package.json
├── client/                     # Frontend Client Game Web
│   ├── src/
│   │   ├── api/                # Client kết nối API backend (Axios, withCredentials)
│   │   ├── components/
│   │   │   ├── game/           # React HUD, DialogueModal, Inventory, Character, Quest, Crafting, Map,
│   │   │   │                   # SectPanel, CaveAbodePanel, PetPanel, OfflineRewardModal, StoryJournalPanel, TowerPanel
│   │   │   └── admin/          # Admin Dashboard, PlayerManager, ContentEditor, AuditLog
│   │   ├── game/
│   │   │   ├── EventBridge.ts  # Cầu nối sự kiện 2 chiều giữa Phaser và React
│   │   │   ├── PhaserGame.ts   # Cấu hình Phaser 3 Game instance
│   │   │   └── scenes/         # BootScene (tạo pixel art), ExplorationScene (2D), CombatScene
│   │   ├── pages/              # Login, Register, CharacterCreate, GamePage, AdminPage
│   │   ├── stores/             # Zustand state stores (authStore, gameStore)
│   │   └── styles/             # CSS cổ phong Tiên Hiệp thống nhất
│   └── package.json
├── docker-compose.yml          # Container PostgreSQL 16
├── .env.example
├── .env
└── README.md
```

---

## 3. Hướng Dẫn Cài Đặt & Khởi Chạy

> Xem hướng dẫn cài đặt chi tiết từng bước tại [HUONG_DAN_CAI_DAT.md](HUONG_DAN_CAI_DAT.md).

### Khởi Chạy Nhanh Bằng Desktop Launcher GUI:
1. Nhấp đúp vào **`CHAY_LAUNCHER.bat`** tại thư mục gốc.
2. Trên giao diện Launcher, nhấn nút **"Khởi động tất cả"** để tự động kiểm tra PostgreSQL, bật Server và bật Client.
3. Nhấn **"⚔️ VÀO GAME"** để bắt đầu chơi trên trình duyệt.

---

### Khởi Chạy Bằng Dòng Lệnh Thủ Công:

### Yêu Cầu Môi Trường
- **Node.js**: v18.0.0 trở lên (Khuyến nghị Node.js 20 hoặc 24).
- **PostgreSQL**: PostgreSQL 16 (chạy qua Docker Compose hoặc dịch vụ cục bộ).

### Bước 1: Khởi Động Cơ Sở Dữ Liệu
Chạy Docker Compose:
```bash
docker compose up -d
```
*(Nếu sử dụng PostgreSQL cài sẵn hoặc qua WSL, đảm bảo database `vandao` và user `vandao_user` đã được tạo tương ứng với tệp `.env`).*

### Bước 2: Đồng Bộ Cơ Sở Dữ Liệu & Nạp Dữ Liệu Khởi Tạo (Seed)
Tại thư mục `server`:
```bash
cd server
npm install
npx prisma db push
npx prisma generate
npm run seed
```

### Bước 3: Tạo Tài Khoản Quản Trị Viên (Owner)
Hệ thống **không sử dụng mật khẩu mặc định trong môi trường production**. Chạy lệnh CLI để thiết lập tài khoản Chủ sở hữu (Owner):
```bash
npm run create-admin
```
Nhập tên đăng nhập, email và mật khẩu (tối thiểu 8 ký tự).

### Bước 4: Khởi Động Backend Server
```bash
npm run dev
```
Máy chủ backend sẽ lắng nghe tại `http://localhost:3001`.

### Bước 5: Khởi Động Frontend Game Client
Mở một cửa sổ dòng lệnh khác:
```bash
cd client
npm install
npm run dev
```
Mở trình duyệt truy cập: `http://localhost:5173`.

---

## 4. Chạy Bộ Kiểm Thử Tự Động (Test Suite)

Dự án có các bộ kiểm thử ARPG, nội dung, bảo mật và launcher. Chạy `npm run test:all` ở thư mục gốc, sau đó chạy `npm run test:v102` để kiểm tra các luồng của bản 1.0.2.

```bash
cd server

# 1. Kiểm thử Toàn Diện ARPG 2D Thời Gian Thực:
npx tsx src/tests/arpg-test.ts

# 2. Kiểm thử Môn Phái, Động Phủ, Linh Thú, Tu Luyện Vắng Mặt:
npx tsx src/tests/phase2-test.ts

# 3. Kiểm thử 8 Chương, 20 Boss, 150 Vật Phẩm, 36 Kỹ Năng, 58 Nhiệm Vụ, 3 Kết Cục, Trấn Yêu Tháp:
npx tsx src/tests/phase3-test.ts
```

### Chi Tiết Kết Quả Kiểm Thử
- **Động cơ ARPG Máy chủ (27/27 PASS):**
  - Khởi tạo quái vật và Boss `boss_001` (Xích Nha Lang Vương) tại tọa độ thực của bản đồ.
  - Tốc độ di chuyển cố định do server kiểm soát (7.20px/tick), spam gói tin không làm nhân vật chạy nhanh hơn.
  - Đánh thường cận chiến/tầm xa và kỹ năng kiếm khí bay theo thời gian thực làm suy giảm sinh lực quái vật.
  - Kích hoạt Lướt Né (Space), miễn nhiễm 100% sát thương nhờ khung bất tử (i-frame 0.22s) và tự động hết bất tử sau khi kết thúc.
  - Boss tung vùng cảnh báo nguy hiểm màu đỏ (Telegraph), người chơi né ra ngoài không nhận sát thương.
  - Boss tự động kích hoạt trạng thái Cuồng Nộ (Enraged) khi sinh lực dưới 40%.
  - Cơ chế cùng chết: Cả hai cùng tử trận trong 1 tick tính thất bại và không trao thưởng.
  - Quản lý 3 ô nhân vật độc lập (Slot 0, 1, 2) cho mỗi tài khoản, chuyển đổi an toàn và không mất dữ liệu cũ.
  - Vô hiệu hóa toàn bộ API theo lượt cũ (`/combat/start`, `/combat/action` trả mã 410 Gone).
- **Giai đoạn 2 (31/31 PASS):**
  - 3 Đại Tông Môn (Thanh Vân Kiếm Tông, Đan Hà Cốc, Bách Luyện Bảo Các), cống hiến môn phái, Tàng Bảo Các.
  - Động Phủ, Tụ Linh Trận tăng tốc độ tu vi, Linh Điền gieo hạt & thu hoạch thảo dược.
  - 6 Linh Thú Thần Thoại (Thanh Loan, Hỏa Lân, Bạch Hổ, Huyền Vũ, U Minh Điệp, Lôi Bằng), xuất chiến trợ lực, thăng cấp & hóa hình đan.
  - Tu Luyện Vắng Mặt (Offline Cultivation) tích lũy tu vi & kinh nghiệm theo thời gian thực (giới hạn an toàn tối đa 8 giờ).
- **Giai đoạn 3 (20/20 PASS):**
  - Toàn bộ 150 mẫu vật phẩm (Vũ khí, Giáp, Giày, Hộ phù, Pháp bảo, Thần Khí...).
  - Đầy đủ 40 loại quái vật và 20 Boss đầu lĩnh đa giai đoạn qua 8 chương và tháp thần thoại.
  - Đầy đủ 36 kỹ năng (12 Kiếm, 12 Pháp, 12 Thể) bao quát toàn bộ 9 đại cảnh giới tu vi.
  - Đầy đủ 58 nhiệm vụ (24 chính, 24 phụ, 8 ẩn, 2 chuẩn bị kết cục) với chuỗi sự kiện và thưởng linh thạch/tu vi.
  - Đầy đủ 10 bản đồ 2D top-down kết nối cổng dịch chuyển.
  - 8 chương cốt truyện Thiên Thư và 3 kết cục: *Vô Tình Phi Thăng*, *Nghịch Thiên Phá Đạo*, *Luân Hồi Trọng Sinh*.
  - Trấn Yêu Tháp 6 tầng chiến đấu Boss Thần Thoại đỉnh phong và Boss chung cực Vạn Đạo Thiên Tôn.

---

## 5. Hướng Dẫn Trải Nghiệm Gameplay

1. **Đăng ký tài khoản:** Truy cập giao diện web, chọn *Đăng Ký Tài Khoản*.
2. **Khởi tạo Đạo Thân:**
   - Đặt Đạo hiệu (tên nhân vật).
   - Chọn hướng tu luyện:
     - **Kiếm Tu:** Tích kiếm ý, công kích vũ bão, phá giáp và dồn sát thương chí mạng.
     - **Pháp Tu:** Linh lực thâm hậu, khống chế hàn băng, thiêu đốt diện rộng bằng hỏa cầu.
     - **Thể Tu:** Khí huyết dồi dào, thân thể như kim chung thiết giáp, phản kích lấy thủ làm công.
   - Chọn khí chất ngoại hình bổn mệnh.
3. **Khám Phá Thế Giới (2D Top-down):**
   - Di chuyển bằng các phím `W`, `A`, `S`, `D` hoặc các phím Mũi Tên.
   - Nhấn phím `E` để:
     - Đàm thoại với các NPC cốt truyện và nhận nhiệm vụ.
     - Thu hái Linh Thảo hoặc khai thác Thiết Khoáng.
     - Tương tác với Linh Miếu cổ kính để thanh lọc tâm thần và hồi phục 100% Sinh Lực & Linh Lực.
     - Bước qua Cổng Dịch Chuyển để khám phá 10 bản đồ: Làng Thanh Khê, Rừng Thanh Khê, Núi Thanh Vân, Đan Hà Cốc, Cổ Kiếm Di Tích, U Minh Vực, Kính Tâm Cảnh, Long Mạch Thiên Sơn, Thiên Khế Đài và Trấn Yêu Tháp.
4. **Chiến Đấu ARPG Thời Gian Thực (Real-Time Combat):**
   - Không chuyển cảnh, chiến đấu trực tiếp ngay trên bản đồ!
   - **Chuột:** Di chuyển chuột để xoay hướng ngắm và thi triển chiêu thức.
   - **Chuột Trái:** Tung đòn đánh thường theo hướng con trỏ chuột.
   - **Phím `1`, `2`, `3`, `4`:** Kích hoạt 4 kỹ năng chủ động bổn mệnh (Kiếm Khí Trảm, Hỏa Cầu, Băng Phong, Lôi Đình, Hộ Thể...).
   - **Phím `Space` (Cách):** **Lướt Né (Dash)** — Dịch chuyển nhanh 140px và kích hoạt khung bất tử **i-frame (0.22s)** để tránh mọi đòn đánh chết người (Hồi chiêu né 1.2s).
   - **Cơ chế Boss:** Boss tung ra các vùng cảnh báo nguy hiểm màu đỏ (**Telegraph Red Zones**). Quan sát vòng đỏ co thắt để lướt né ra ngoài trước khi chiêu thức bộc phát sát thương!
   - **Boss Cuồng Nộ:** Khi máu Boss xuống dưới 40%, Boss chuyển dạng Cuồng Bạo (+35% ATK, +25% Spd, mở chiêu thức thần thông mới).
   - **Quy tắc cùng chết:** Nếu cả hai cùng tử trận trong 1 tick, trận đấu được tính thất bại để bảo đảm thử thách chân thực.
5. **Đột Phá 9 Cảnh Giới:**
   - Mở giao diện `🧘 Tu Vi` (phím bấm thanh menu dưới).
   - Tiến trình 9 cảnh giới: **Luyện Khí ➔ Trúc Cơ ➔ Kim Đan ➔ Nguyên Anh ➔ Hóa Thần ➔ Luyện Hư ➔ Hợp Thể ➔ Đại Thừa ➔ Độ Kiếp**.
   - Mỗi cảnh giới có 3 tầng: Sơ Kỳ, Trung Kỳ, Hậu Kỳ / Đại Viên Mãn.
   - Tích lũy đủ tu vi thông qua đánh quái, nhiệm vụ hoặc đan dược, chuẩn bị đủ đan dược đột phá (như Trúc Cơ Đan, Kim Đan...) rồi nhấn *⚡ Đột Phá Cảnh Giới*.
6. **Môn Phái & Tông Môn:**
   - Mở giao diện `🏯 Môn Phái`.
   - Lựa chọn bái nhập 1 trong 3 đại tông môn: *Thanh Vân Kiếm Tông* (+ATK/SPD), *Đan Hà Cốc* (+MP), *Bách Luyện Bảo Các* (+DEF/HP). Có thể chuyển phái trong giao diện môn phái.
   - Làm nhiệm vụ tông môn nhận điểm Cống Hiến, mua sắm pháp bảo & đan dược hiếm tại Tàng Bảo Các.
7. **Động Phủ & Thảo Dược:**
   - Mở giao diện `🏡 Động Phủ`.
   - Nâng cấp **Tụ Linh Trận** để tăng tốc độ hấp thu linh khí và sản sinh tu vi.
   - Nâng cấp **Linh Điền** và gieo hạt giống (Hạt Giống Linh Thảo, Ngưng Thần Thảo, Huyết Tinh Chi...) để thu hoạch nguyên liệu luyện đan cao cấp.
8. **Linh Thú Bổn Mệnh:**
   - Mở giao diện `🐾 Linh Thú`.
   - Thuần phục và nuôi dưỡng 6 Thần Thú: Thanh Loan, Hỏa Lân Ấu Thú, Bạch Hổ, Huyền Vũ Thần Quy, U Minh Điệp, Lôi Bằng.
   - Chọn Thần Thú xuất chiến để nhận buff chỉ số và kỹ năng hỗ trợ độc quyền trong chiến đấu.
9. **Đệ Tử Đồng Hành:**
   - Sau chương 1, mở giao diện `Đệ Tử` để chiêu mộ Liễu Muội. Đệ tử đi theo, hỗ trợ đánh quái và có thể nâng cấp bằng linh thạch.
10. **Tu Luyện Vắng Mặt (Offline Cultivation):**
   - Khi đạo hữu rời mạng, nhân vật tự động tĩnh tâm đả tọa hấp thu thiên địa linh khí.
   - Đăng nhập lại, hệ thống hiển thị bảng nhận thưởng Tu vi và Kinh nghiệm tương ứng với thời gian vắng mặt (tối đa 8 giờ).
11. **Sử Ký Cốt Truyện & 3 Đại Kết Cục:**
   - Mở giao diện `📖 Sử Ký`.
   - Xem lại hành trình 8 chương cốt truyện, ghi chú bí mật Thiên Thư và hồ sơ quan hệ với các nhân vật then chốt.
   - Tại chương 8 (Thiên Khế Đài), người chơi được quyền tự do lựa chọn 1 trong 3 đại kết cục:
     - **Vô Tình Phi Thăng:** Đổi ký ức lấy đường lên Thượng Giới.
     - **Nghịch Thiên Phá Đạo:** Gom chứng cứ để phá Thiên Khế và trả ký ức cho nhân gian.
     - **Luân Hồi Trọng Sinh:** Giữ ký ức, chữa long mạch và trở về đời phàm trong câu chuyện.
   - Hai kết cục sau cần hoàn thành nhiệm vụ hồi tưởng tương ứng. Sau hoạt cảnh, save vẫn chơi tiếp được.
12. **Trấn Yêu Tháp (Endgame Boss Rush):**
   - Mở giao diện `🗼 Trấn Yêu`.
   - Chinh phục 6 tầng tháp theo thứ tự, đối đầu Thái Cổ Hỗn Độn Ma Viên, Cửu U Minh Hoàng, Diệt Thế Lôi Long, Hư Không Thôn Thiên Thú, Bất Diệt Kiếm Tổ và đỉnh tháp là **Vạn Đạo Thiên Tôn**.
   - Nhận kho tàng linh thạch khổng lồ, mảnh Thiên Thư Cổ và trang bị Thần Khí cực phẩm.

---

## 6. Hướng Dẫn Admin Panel (`/admin`)

Đăng nhập bằng tài khoản có quyền `GAME_MASTER` hoặc `OWNER` (tạo bằng `npm run create-admin` ở bước 3).
- Truy cập đường dẫn: `http://localhost:5173/admin`
- **Các phân hệ quản trị:**
  - **📊 Tổng Quan (Dashboard):** Xem số lượng người chơi thời gian thực, phân bố cảnh giới tu vi, thống kê số lượt boss bị hạ.
  - **👥 Người Chơi (Player Manager):** Tra cứu danh sách người chơi, kiểm tra nhân vật, trang bị, kho đồ, khóa/mở khóa tài khoản, điều chỉnh linh thạch/kinh nghiệm kèm lý do bắt buộc.
  - **📦 Quản Trị Nội Dung (Content Editor):** Xem và chỉnh sửa trực tiếp thông số vật phẩm, quái vật, boss, nhiệm vụ. Lưu thay đổi sẽ xuất bản bản ghi `ContentVersion` mới an toàn cho máy chủ.
  - **🛡️ Nhật Ký Thao Tác (Audit Logs):** Xem lịch sử toàn bộ các hành động của admin (thời gian, người thực hiện, đối tượng, lý do, dữ liệu trước/sau) bất biến.

---

*Vạn Đạo Trường Sinh — Nhất niệm thông thiên, vạn đạo quy nhất.*
