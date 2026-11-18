# VẠN ĐẠO TRƯỜNG SINH (萬道長生)
## QUY CHUẨN MỸ THUẬT VÀ TÀI NGUYÊN ĐỒ HỌA (ART DIRECTION SPECIFICATION)

**Phiên bản:** 2.1  
**Mục tiêu áp dụng:** Toàn bộ hệ thống đồ họa 2D Pixel Art Cổ Phong Tiên Hiệp (ARPG Real-Time)  
**Tài liệu tham chiếu:** GDD 2.0 (`DOCS_GAME_DESIGN_DOCUMENT_VAN_DAO.md`) & Mẫu hình ảnh gameplay Tu Tiên 2D

---

## 1. Góc Nhìn, Kích Thước & Tỷ Lệ Cơ Thể (Viewport & Proportions)

### 1.1. Góc Nhìn (Camera Perspective)
* **Góc chiếu:** 2D Top-Down chếch góc khoảng **60°** (bán Isometric/Top-Down nhìn từ trên nghiêng xuống).
* **Mặt phẳng sàn:** Mặt đất phẳng nhìn thấy diện tích bề mặt.
* **Mặt phẳng đứng:** Nhân vật, công trình, cây cối, quái vật thể hiện mặt trước hoặc nghiêng (không phải nhìn từ đỉnh đầu bổ thẳng xuống).

### 1.2. Kích Thước & Tỷ Lệ Nhân Vật (Character Anatomy)
* **Kích thước ô canvas:** **64 × 64 pixels** cho nhân vật chính, NPC và quái cỡ trung.
* **Chiều cao hiển thị thực tế của nhân vật:** **42 ~ 46 pixels** (để lại khoảng đệm 18~22px trên/dưới cho mũ mão, kiếm khí, cử động nhảy/vung vũ khí).
* **Tỷ lệ đầu - thân:** **1 : 3.5 đến 1 : 4.0** (Phong cách Cổ Phong Bán Tả Thực / Chibi Trưởng Thành thanh thoát, tuyệt đối không dùng chibi đầu to 1:1.5 hoặc hình hộp đơn điệu).
  * **Đầu & Tóc:** Chiều cao 11 - 13px (nhìn rõ búi tóc đạo quán, lọn tóc mai, mắt 2px có thần thái).
  * **Thân & Áo bào:** Chiều cao 16 - 18px (vùng cổ áo giao lĩnh, thắt lưng ngọc đới, tà áo thướt tha).
  * **Chân & Hài:** Chiều cao 13 - 15px (ống quần túm, giày cổ phong, phân biệt rõ bước chân trái/phải).
* **Điểm neo trọng tâm (Anchor / Pivot Point):**
  * Tọa độ neo chân cố định: **X = 32, Y = 56** (trong khung 64×64).
  * Chân chạm đất ổn định qua mọi frame của cùng một hướng, không để nhân vật bị "nổi bồng bềnh" hay trượt chân.

---

## 2. Bảng Màu Tiên Hiệp Cổ Phong (Color Palette & Lighting)

### 2.1. Triết Lý Màu Sắc
Màu sắc thiên về độ bão hòa vừa phải (Muted / Earthy / Celestial), sắc độ trầm ấm tự nhiên của gỗ, đá, linh thảo và đạo bào. Tuyệt đối tránh màu neon chói mắt, tránh màu nhựa phản chiếu phi lý.

### 2.2. Bảng Màu Tiêu Chuẩn

| Yếu tố | Mã Màu Chính (Base / Highlight / Shadow) | Cảm Nhận Thị Giác |
| :--- | :--- | :--- |
| **Cỏ & Cây cối** | `#264e1e`, `#38762b`, `#1a3514` | Xanh rêu trầm, xanh ngọc cổ thụ, điểm hoa trắng ngà `#e8f0e0` |
| **Đất & Đường mòn** | `#6e5239`, `#8d6c4f`, `#4a3625` | Nâu hoàng thổ, vân đất phong trần tự nhiên |
| **Đá & Đèn đá** | `#5c676d`, `#7e8d95`, `#3d4549` | Xám thanh thạch trầm tĩnh, có đốm rêu xanh |
| **Công trình cổ** | `#7c2a1e`, `#441812`, `#e2b467` | Gỗ sưa đỏ trầm, mái ngói cổ phong, ngọc thếp vàng |
| **Y phục Kiếm Tu** | `#1c3b57`, `#2e5b82`, `#f0f4f8` | Đạo bào thanh lam bạch y, viền bạc, thắt lưng lam ngọc |
| **Y phục Pháp Tu** | `#3b2354`, `#5a367f`, `#e8d584` | Tử hà đạo bào huyền bí, phù văn hoàng kim thếp vân |
| **Y phục Thể Tu** | `#5c241c`, `#84382c`, `#d48c3b` | Chiến bào xích đồng, đai da hộ tâm kính, cuồng dũng |
| **VFX Kiếm Khí** | `#8ae0f2`, `#dcf7fd`, `#228fa8` | Băng lam kiếm quang trong vắt, sắc nhọn |
| **VFX Lôi Hỏa Pháp** | `#ffaa33`, `#ffdd66`, `#cc3300` | Linh hỏa rực rỡ, lôi điện tím hoàng kim |
| **Báo đòn (Telegraph)**| `#e74c3c` (Alpha 0.25 fill, 0.85 border) | Vùng nguy hiểm đỏ hổ phách nhấp nháy, cảnh báo rõ |

### 2.3. Hướng Chiếu Sáng & Đổ Bóng (Lighting & Shadow)
* **Hướng sáng:** Chiếu từ góc **Trên - Trái** (45° Top-Left).
* **Quy tắc bóng:**
  * Highlight tập trung ở đỉnh đầu, vai trái, mép ngoài tay trái và lưỡi kiếm.
  * Shadow đổ dần về phía dưới - phải.
  * **Bóng chân (Drop Shadow):** Hình elip mờ mềm mại màu đen trong suốt (`rgba(0, 0, 0, 0.35)`), kích thước khoảng 24×8px đặt ngay dưới gót chân nhân vật.

---

## 3. Cấu Trúc Khung Hình Sprite Sheet (LPC Compatible Standard)

### 3.1. Phân Bố Hướng (Directional Layout)
Tương thích hoàn toàn với chuẩn mã nguồn `AnimationManager.ts`:
* **Hàng 0 (Row 0 - Y: 0):** Hướng **UP** (Quay lưng lên trên Bắc).
* **Hàng 1 (Row 1 - Y: 64):** Hướng **LEFT** (Nghiêng người sang Tây).
* **Hàng 2 (Row 2 - Y: 128):** Hướng **DOWN** (Mặt nhìn thẳng xuống Nam).
* **Hàng 3 (Row 3 - Y: 192):** Hướng **RIGHT** (Nghiêng người sang Đông).

### 3.2. Thông Số Từng Sprite Sheet
1. **`player_idle.png`** (256 × 256px): 4 frames/hướng × 4 hướng = 16 frames. Nhịp thở ngực nhấp nhô nhẹ 1px, tà áo lay động theo gió.
2. **`player_walk.png`** (576 × 256px): 9 frames/hướng × 4 hướng = 36 frames. Bước chân chuyển động tự nhiên, tay vung nhịp nhàng, tà áo bay nhẹ.
3. **`player_slash.png`** (384 × 256px): 6 frames/hướng × 4 hướng = 24 frames. Tư thế chuẩn bị → vung kiếm chém mạnh hình vòng cung → hồi kiếm thế.
4. **`player_cast.png`** (448 × 256px): 7 frames/hướng × 4 hướng = 28 frames. Chắp tay kết ấn → linh lực dâng tràn tụ quanh người → bung chiêu pháp thuật.
5. **`player_hurt.png`** (384 × 64px): 6 frames đơn hướng. Cơ thể giật lùi, nháy đỏ, khựng nhẹ.
6. **`player_death.png`** (384 × 64px): 6 frames đơn hướng. Nhân vật gối khuỵu, thanh kiếm cắm đất, hóa thành đốm linh quang tiêu tán.

---

## 4. Thứ Tự Vẽ Lớp Đồ Họa (Depth Layering / Y-Sorting)

Để đảm bảo nhân vật có thể đi ra sau thân cây hoặc đi trước cửa điện mà không bị đè hình phi lý:
* **Lớp 0 (Depth: 0 - 10):** Mặt đất nền (Tileset cỏ, đường mòn, thảm hoa, mặt nước).
* **Lớp 1 (Depth: 15):** Dấu vết mặt đất, bóng râm tĩnh, viền bờ suối.
* **Lớp 2 (Depth = Object.Y):** **Y-Sorting Dynamic Layer** bao gồm:
  * Nhân vật người chơi (`depth = y`)
  * NPCs (`depth = y`)
  * Quái vật & Boss (`depth = y`)
  * Rương kho báu, tảng đá thấp, đèn lồng (`depth = y`)
  * Gốc cây thông, chân tường nhà (`depth = y`)
* **Lớp 3 (Depth = Object.Y + 100):** Tán cây thông cao, mái ngói vòm cổng (khi người chơi đi ngang dưới tán cây sẽ bị che bóng một cách chân thực).
* **Lớp 4 (Depth: 1000+):** Projectiles bay trên không, hiệu ứng VFX kiếm khí, vòng cảnh báo Telegraph, Floating Damage Text.
* **Lớp 5 (Depth: 2000+):** Giao diện người dùng React HUD / Minimap / Canvas HUD overlay.

---

## 5. Tiêu Chuẩn Nghiệm Thu Mỹ Thuật (Pass / Fail Criteria)

* **[PASS - ĐẠT]:**
  * Nhìn thấy rõ mặt, ánh mắt, mái tóc cổ phong và chi tiết đạo bào ở kích thước hiển thị chuẩn 100%.
  * Nền ảnh hoàn toàn trong suốt (Alpha = 0), không vướng viền trắng bẩn hay ô bàn cờ checkerboard.
  * Animation chuyển hướng 4 chiều mượt mà, chân không bị trượt hoặc giật lệch vị trí gót.
  * Phân biệt rõ ràng hình tượng Kiếm Tu, Pháp Tu và Thể Tu cũng như 3 NPC chính (Trưởng Lão, Dược Sĩ, Vệ Binh).
  * Môi trường có bố cục khu vực rõ rệt, lối đi rõ ràng, không bị chướng ngại vật tàng hình.
* **[FAIL - CHƯA ĐẠT]:**
  * Dùng khối màu đơn thuần, hình vuông/tròn placeholder sơ sài.
  * Chibi đầu to biến dạng phong cách cổ phong.
  * Màu sắc lòe loẹt, độ tương phản gây nhức mắt hoặc đục ngầu không thấy chiêu thức.
