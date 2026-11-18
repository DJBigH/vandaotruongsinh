# VẠN ĐẠO TRƯỜNG SINH (萬道長生)
## QUY CHUẨN MỸ THUẬT VÀ TÀI NGUYÊN ĐỒ HỌA (ART DIRECTION SPECIFICATION)

**Phiên bản:** M1 · Thanh Khê

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
Bộ Kiếm Tu trong `client/public/assets/vnext/` dùng chung khung 64 × 64, chân tại (32, 56). Mỗi hàng là một hướng. Cột đầu luôn là tư thế mở đầu của hướng đó.

| Sheet | Khung mỗi hướng | Thời lượng cả chuỗi |
| --- | ---: | ---: |
| `player_idle` | 2 | 1000 ms |
| `player_walk` | 4 | 500 ms |
| `player_slash` | 3 | 428,57 ms |
| `player_cast` | 3 | 583,33 ms |
| `player_dodge` | 3 | 312,5 ms |
| `player_hurt` | 2 | 500 ms |
| `player_death` | 3 | 1000 ms |
| `player_respawn` | 3 | 500 ms |

Kiếm Tu đứng yên không có hào quang liên tục. Mỗi NPC Thanh Khê có bốn tư thế trên **một hàng**. Sói, rắn, hồ ly và Lang Vương có một hàng sáu khung. Bốn khung đầu dành cho di chuyển, khung 4 giữ tư thế lấy đà và khung 5 ra đòn theo trạng thái quái do máy chủ gửi. Lang Vương hiển thị ở tỷ lệ 1,55×. Hắc Lang dùng màu tối hơn trên cùng sheet sói.

Pháp Tu và Thể Tu giữ sheet riêng `player_magic_idle` và `player_body_idle` trong mọi trạng thái. Bộ tư thế hành động chuyên biệt cho hai phái thuộc đợt mỹ thuật sau. Hướng chân bên dưới vạt áo Kiếm Tu khi đi ngang cần được đánh giá bằng vòng lặp trong game. Manifest xuất ảnh và nguồn được lưu tại `art/vnext/`.

---

## 4. Thứ Tự Vẽ Lớp Đồ Họa (Depth Layering / Y-Sorting)

Làng Thanh Khê dùng nền 2048 × 1536, Rừng Thanh Khê dùng nền 2048 × 2048 theo dữ liệu bản đồ hiện tại. Nền được vẽ một lần khi vào bản đồ, trên đúng kích thước lưới. Đường lát đá nối quảng trường với NPC và cổng. Đường đất dẫn tới cửa nhà và các bãi săn. Suối, hồ, vách đá và hàng cây đặc bám theo vùng va chạm. Các khu vực sau dùng nền gạch tương thích.

Nhà, cây, đá, NPC, nhân vật và quái dùng vị trí chân để xếp lớp. Mái và tán cây trước mặt người xem mờ xuống khi che vị trí người chơi. Cảnh báo đòn diện rộng nằm sát nền, đạn bay và số sát thương nằm trên nhân vật. Các hiệu ứng đánh, thi triển và né chỉ xuất hiện khi có xác nhận từ máy chủ. Trong Thiết lập, người chơi có thể bật tắt âm hiệu và giảm hiệu ứng/rung màn hình. Đạn và vòng báo nguy vẫn hiển thị khi giảm hiệu ứng.

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
