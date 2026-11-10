# VẠN ĐẠO TRƯỜNG SINH — TÀI LIỆU THIẾT KẾ GAME VÀ TIÊU CHÍ NGHIỆM THU

**Phiên bản tài liệu:** 2.0  
**Ngày cập nhật:** 10/11/2026  
**Thể loại:** ARPG tu tiên 2D, góc nhìn từ trên chếch xuống, chiến đấu thời gian thực.  
**Nền tảng bắt buộc:** chơi trên website; có launcher GUI phục vụ vận hành bản bàn giao.  
**Mẫu mỹ thuật chính:** [Tu Tiên 2D](https://tutien2d.com/trang-chu), phần hình ảnh/gameplay bên trong game.  
**Trạng thái:** thiết kế cập nhật; chưa chứng nhận mã nguồn, dữ liệu xuất hoặc bản game đã triển khai đúng.

> Tài liệu này thay bản phác thảo trước làm cơ sở thiết kế và nghiệm thu. Đợt rà soát chỉ nhận được một file Markdown, các ảnh trong hội thoại và yêu cầu của chủ dự án; không có repository, thư mục game-data-export, database hay bản build để chạy. Mọi khẳng định triển khai phải được đối chiếu lại bằng tệp và bằng chứng thật.

## 0. Cách đọc và những quyết định của bản cập nhật

### 0.1. Phân biệt yêu cầu, đề xuất và hiện trạng

| Nhãn | Ý nghĩa |
|---|---|
| **YC** | Yêu cầu đã được chủ dự án nêu: web 2D, real-time, cốt truyện và cày tự do, không nạp, admin, launcher, log, mẫu mỹ thuật. |
| **D0** | Thiết kế hoặc thông số khởi đầu do bản cập nhật đề xuất; cần kiểm chứng bằng chơi thử và cân bằng. |
| **CX** | Chưa kiểm chứng: chỉ có mô tả trong tài liệu/báo cáo, chưa có tệp hoặc kết quả chạy để xác nhận. |

Các con số về nội dung, cân bằng, thời gian và tải thử trong tài liệu là D0 trừ khi ghi khác. “Thiết kế xong”, “có dữ liệu”, “tích hợp” và “nghiệm thu” là bốn trạng thái khác nhau. Không cộng một asset chưa có animation hoặc một nhiệm vụ chưa chơi được vào số lượng hoàn thành.

### 0.2. Thay đổi chính so với bản trước

| Vấn đề cũ | Quyết định cập nhật |
|---|---|
| Tài liệu thiên về làm lại bằng engine khác | Hoàn thiện game web hiện có là mặc định; chuyển engine cần đánh giá riêng. |
| Thiếu chuẩn đồ họa cụ thể | Khóa mẫu Tu Tiên 2D; nhân vật toàn thân, mặt rõ, môi trường đồng bộ. |
| Công thức “Stats” có thể bị áp cho mọi chỉ số | Tách HP/MP/ATK/DEF khỏi crit, tốc độ, hồi chiêu, phạm vi và i-frame. |
| Dash thiếu đơn vị, mốc thời gian không thống nhất | Có cấu hình D0 theo tick, khoảng cách cố định và tốc độ suy ra. |
| Chương 6 còn Nguyên Anh nhưng chương 8 phi thăng | Phân bổ lại 9 cảnh giới xuyên suốt 8 chương. |
| Pháp Tu/Thể Tu bị ép theo kiếm tông và tiên kiếm | Tuyến truyện chung; bài học và bản mệnh pháp bảo phù hợp từng hướng. |
| Kết cục 3 tự phế tu vi | Hy sinh thuộc diễn biến truyện; chế độ chơi tiếp bảo toàn nhân vật. |
| Chưa đặc tả chơi sau truyện, admin, launcher, hiệu năng | Bổ sung quy tắc và tiêu chí kiểm tra. |
| Khẳng định toàn bộ dữ liệu đã xuất và SQL chạy mọi DB | Chuyển thành danh mục CX; yêu cầu schema, kiểm tra tham chiếu và migration theo DB thật. |

---

## 1. Tầm nhìn và phạm vi sản phẩm

### 1.1. Lời hứa trải nghiệm

Người chơi bắt đầu tại Thanh Khê, trực tiếp di chuyển, đánh, né và thi triển kỹ năng; khám phá thế giới, kiếm trang bị và tu vi, lựa chọn cách đối mặt với Thiên Khế, rồi tiếp tục săn boss và hoàn thiện nhân vật sau cốt truyện.

**Thiên Khế** là điểm riêng của câu chuyện: quyền năng càng lớn thì ký ức và nhân tính càng bị đe dọa. Người chơi có cách bảo lưu ký ức bằng hành động và tài nguyên kiếm trong game. Việc tu luyện không tự động xóa dữ liệu nhân vật hoặc phạt người chơi vì tiến bộ.

### 1.2. Yêu cầu cố định

- Game 2D chạy trong trình duyệt, chiến đấu real-time, có boss và kỹ năng để quan sát rồi phản ứng.
- Tự do cày trước khi tiếp tục nhiệm vụ; kết thúc truyện vẫn có hoạt động và mục tiêu.
- Ba hướng tu: Kiếm Tu, Pháp Tu, Thể Tu; tối đa ba nhân vật độc lập mỗi tài khoản.
- Server quyết định trạng thái chiến đấu và tài sản hợp lệ.
- Không nạp tiền, VIP trả phí, gacha trả phí, bán sức mạnh hoặc bắt xem quảng cáo để tiến triển.
- Có admin panel, launcher GUI bật/tắt server và client, xuất log dễ đưa cho AI đọc.
- Nhân vật có mặt và cơ thể rõ; animation đúng; môi trường có bố cục; HUD không che kỹ năng.
- Giữ dữ liệu đã có khi nâng cấp; thay đổi schema phải có migration và cách phục hồi.

### 1.3. Phạm vi mạng và nền tảng

D0 ưu tiên PvE cá nhân trên hạ tầng client/server. “Có server” chưa đồng nghĩa đã có MMO, giao dịch giữa người chơi hoặc PvP. Nếu repo đã có các chức năng đó, ghi vào danh mục hiện trạng và giữ tương thích; nếu chưa có, chúng nằm ở giai đoạn riêng.

Bản nghiệm thu đầu ưu tiên trình duyệt desktop tại 1366×768 và 1920×1080. Giao diện thích ứng khi resize. Điều khiển cảm ứng/mobile được đặc tả và kiểm thử riêng trước khi công bố hỗ trợ.

---

## 2. Vòng lặp chơi, tiến triển và tự do cày

### 2.1. Vòng lặp cốt lõi

Nhận nhiệm vụ hoặc chọn mục tiêu → khám phá/chiến đấu/thu thập → nhận tu vi, đồ và nguyên liệu → đổi trang bị, kỹ năng, luyện chế → đột phá → mở thử thách tiếp theo.

Có ba nhịp chơi:

| Nhịp | Người chơi làm gì | Kết quả |
|---|---|---|
| Theo truyện | Hội thoại, khám phá, giải quyết lựa chọn, hạ boss chương | Mở vùng, cơ chế và diễn biến mới |
| Cày tự do | Săn quái, boss phụ, thu thập và chế tạo tại vùng đã mở | Tăng sức mạnh, chuẩn bị trước nhiệm vụ |
| Sau truyện | Tái đấu boss, bí cảnh thử thách, sưu tầm và hoàn thiện build | Mục tiêu lâu dài, không xóa tiến trình |

Nhiệm vụ chính phải cấp tài nguyên nền tảng để tiếp tục. Cày thêm giúp dễ hơn hoặc mở build khác; không chèn số lần farm vô nghĩa để kéo dài chương. Vật phẩm bắt buộc của truyện có nguồn chắc chắn hoặc cơ chế bảo đảm, không phụ thuộc hoàn toàn vào đồ cực hiếm.

### 2.2. Nhịp độ và độ khó D0

- Hướng dẫn đầu cho người chơi đi, đánh, né, nhận nhiệm vụ và dùng kỹ năng trong một chuỗi ngắn có thể bỏ qua khi chơi nhân vật thứ hai.
- Quái thường tạo cơ hội thực hành; quái tinh anh buộc đọc đòn; boss kiểm tra di chuyển và quản lý tài nguyên.
- Đo thời gian hạ mục tiêu, số lần tử trận và tiêu hao của ba hướng tu ở cùng cảnh giới/trang bị trước khi chốt độ khó.
- Không tự đặt cam kết số giờ hoàn thành hoặc tốc độ cày khi chưa có dữ liệu chơi thử.
- Quy mô nội dung ở mục 11 là mục tiêu sản xuất, không phải điều kiện để được phép bắt đầu chơi thử.

---

## 3. Chuẩn mỹ thuật và quy trình tài nguyên

### 3.1. Chuẩn tham khảo đã chốt

Dùng hình/gameplay tại Tu Tiên 2D làm tham khảo về mức hoàn thiện, tỷ lệ nhân vật, cảnh quan và khả năng phân biệt chiêu. Các ảnh đã được xem trong đợt trao đổi gồm làng khởi đầu, cảnh giao chiến và boss. Đây là tham khảo thị giác, không chứng minh engine, FPS hay hệ thống mạng của mẫu. [R1–R4]

Giữ bản sắc Thanh Khê và câu chuyện Thiên Khế. Thiết kế bản đồ, tên gọi và nội dung riêng. Không coi nguồn tham khảo là kho asset miễn phí.

### 3.2. Nhân vật

- Góc nhìn từ trên chếch xuống; nhân vật toàn thân với đầu, mặt, tóc, vai, thân, tay chân và vũ khí rõ.
- Hướng chính diện/góc có thể thấy mặt phải đọc được vùng mặt và mắt ở kích thước gameplay; quay lưng được phép không thấy mặt.
- Trang phục có hình dáng và sắc độ; không nghiệm thu hình nhân đầu vuông/thân chữ nhật quá sơ sài làm mỹ thuật cuối.
- Tỷ lệ người chơi và NPC nhất quán; trưởng lão, dược sĩ, vệ binh có diện mạo phù hợp vai trò.
- Xem sprite trên nền trung tính, trong map và khi tắt aura. Kích thước ô frame không thay thế đánh giá chất lượng.
- Nếu ghép nhiều layer, kiểm tra body/head/eyes/hair/beard/outfit/weapon, hướng, offset, thứ tự vẽ và animation tương thích.
- Asset tạm và fallback khi tải lỗi phải được nhận diện trong bản phát triển; không âm thầm thay bằng hình khối rồi báo đạt.

### 3.3. Môi trường

Thanh Khê có khu sinh hoạt, công trình/NPC, đường nối, khu luyện tập, lối sang rừng và điểm dịch chuyển. Cây, đá, hoa, nước, cầu, bậc thềm hoặc vách đá tạo bố cục và chiều sâu; chừa đủ chỗ chiến đấu.

Nền cỏ dịu, biến thể nhẹ; đồ trang trí theo cụm. Đường/sân có mép, góc và chuyển tiếp. Tránh cỏ sọc chéo quá chói, lưới ô đen không chủ ý, sân gạch lặp đều trên diện tích lớn và công trình nhỏ như icon.

Dùng chung chuẩn góc nhìn, tỷ lệ, mật độ pixel, nét viền, bảng màu và hướng sáng. Điều chỉnh hoặc thay asset lệch phong cách. Hình chênh cao phải khớp lối đi và va chạm; không để một bậc đá có vẻ đi được nhưng collider chặn vô lý.

Xếp lớp theo vị trí chân trong từng lớp cảnh phù hợp. Tách mặt đất, bóng, thực thể, phần che phía trước và HUD; không áp một giá trị depth cho mọi thứ mà bỏ qua cấu trúc scene/container.

### 3.4. Chọn và tích hợp asset miễn phí

Được chủ động thay bộ hiện tại, kể cả LPC, và tìm mọi loại asset phù hợp: người, quái, boss, tileset, công trình, VFX, UI, font, âm thanh. Không phát sinh mua hàng hoặc thuê bao.

Quy trình: tìm ở trang tác giả → xác nhận gói miễn phí và giấy phép → xem file thực tế → thử trong một cảnh → chỉnh phong cách trong quyền cho phép → tích hợp → ghi credits.

Nguồn khảo sát: [itch.io](https://itch.io/game-assets/free), [OpenGameArt](https://opengameart.org/), [Kenney](https://kenney.nl/assets), [Universal LPC](https://liberatedpixelcup.github.io/Universal-LPC-Spritesheet-Character-Generator/) và các tác giả có điều khoản rõ. Danh sách này không xác nhận mọi asset trên đó đều miễn phí hoặc phù hợp.

Mỗi asset/layer ghi tên, tác giả, URL gốc, gói/phiên bản, giấy phép, đường dẫn sử dụng và chỉnh sửa. LPC có thông tin giấy phép/tác giả theo thành phần; phải lấy đúng credits của phần đã dùng. [R5]

Lưu tài nguyên trong dự án hoặc hạ tầng do dự án quản lý; không hotlink phụ thuộc trang tác giả. Không dùng asset ripped hoặc tự gán quyền sở hữu cho tài nguyên bên thứ ba. Nếu thiếu bộ miễn phí đạt chất lượng, báo phần thiếu và giải pháp cụ thể.

---

## 4. Điều khiển, camera, HUD và animation

### 4.1. Điều khiển desktop

| Thao tác | Điều khiển mặc định |
|---|---|
| Di chuyển | WASD hoặc phím mũi tên, 8 hướng |
| Ngắm | Con trỏ chuột quy đổi về tọa độ thế giới |
| Đánh thường | Chuột trái; giữ để đánh theo nhịp vũ khí do server kiểm soát |
| Lướt né | Space |
| Kỹ năng đang trang bị | 1–4 |
| Tương tác | E |
| Túi đồ / bản đồ | I / M |
| Đóng hộp thoại, menu | Esc theo lớp giao diện đang mở |

Chuẩn hóa vector chéo để không chạy nhanh hơn. Khi chat, nhập liệu hoặc thao tác menu, khóa đúng nhóm input; đóng menu/đổi focus phải khôi phục điều khiển. Đánh thường và kỹ năng không kích hoạt xuyên phần UI đang nhận chuột.

### 4.2. Camera và HUD

Vùng chơi phủ khung cửa sổ; camera theo nhân vật, giới hạn trong vùng đã thiết kế. Kích thước canvas, viewport, worldView và map bounds được đo riêng. Phaser RESIZE chỉ giải quyết kích thước canvas theo vùng chứa; nội dung/camera vẫn phải được thiết kế và kiểm tra. [R6]

Không phóng camera quá lớn hoặc kéo giãn texture chỉ để giấu khoảng trống. Tọa độ chuột phải đúng sau resize/zoom. Không tuyên bố hỗ trợ mọi độ phân giải khi chỉ thử hai cấu hình.

HUD tối thiểu: HP/MP/cảnh giới, mục tiêu/boss, nhiệm vụ hiện tại, bốn kỹ năng, đánh thường, né và menu chức năng thu gọn. Thanh kỹ năng luôn thấy và bấm được ở cả menu mở/thu. Thiếu MP, cooldown, trạng thái khóa phải phân biệt rõ.

Dùng chữ tiếng Việt rõ; nhãn NPC tránh che mặt. Cho chỉnh nhạc/âm thanh, mức hiệu ứng, rung màn hình và độ dày nhãn khi đông. Đồ họa thấp giảm chi tiết phụ, giữ nhân vật và báo đòn dễ đọc.

### 4.3. Animation

| Trạng thái | Yêu cầu |
|---|---|
| Idle | Tư thế đứng tự nhiên; giữ hướng cuối hợp lệ |
| Walk/run | Chân bước, tay/áo phù hợp; tránh trượt chân |
| Attack | Chuẩn bị, xuất đòn, hồi phục có thể nhận biết |
| Cast | Tư thế thi triển; gắn mốc phóng chiêu |
| Dodge | Tư thế và hướng lướt rõ; không reset mỗi frame |
| Hurt | Phản ứng phù hợp; không khóa điều khiển vô hạn |
| Death | Dừng input chiến đấu, phát đúng một lần |
| Respawn | Xóa trạng thái cũ, trả vận tốc/input/animation về trạng thái hợp lệ |

Điều khiển 8 hướng không đồng nghĩa asset đã có 8 hướng animation. D0 cho phép bộ 4 hướng hoàn chỉnh; chuyển hướng theo quy tắc ổn định, aim vẫn liên tục. Mỗi trạng thái ghi rõ các hướng được hỗ trợ, frame, tốc độ phát và cách dùng chung nếu có.

Điểm neo dựa trên chân; collider tách khỏi tóc/áo/kiếm/aura. Animation chỉ phản ánh trạng thái gameplay; callback hình ảnh không được là điều kiện duy nhất để mở khóa nhân vật.

Kiểm tra chuỗi walk → attack → dodge → cast → move, bị ngắt, chết, hồi sinh và đổi map. VFX không thay động tác cơ thể bằng một ảnh đứng rung/chớp.

---

## 5. Ba hướng tu và kỹ năng

### 5.1. Vai trò và chỉ số nền D0

Giữ các chỉ số gốc trong bản trước làm điểm xuất phát để cân bằng, không xác nhận chúng trùng code hiện tại.

| Hướng tu | HP | MP | ATK | DEF | Tốc độ chạy nền (world px/s) | Crit chance |
|---|---:|---:|---:|---:|---:|---:|
| Kiếm Tu | 100 | 50 | 25 | 10 | 110 | 0.15 |
| Pháp Tu | 80 | 100 | 30 | 8 | 95 | 0.05 |
| Thể Tu | 150 | 30 | 18 | 20 | 90 | 0.05 |

- Kiếm Tu: cơ động, chém và phi kiếm; cần chọn vị trí để gây sát thương.
- Pháp Tu: tầm xa, vùng ảnh hưởng, kiểm soát; quản lý MP và khoảng cách.
- Thể Tu: chịu đòn, áp sát, phản ứng phòng thủ; không được vô hạn hồi máu/phản sát thương.
- Hướng tu khác với tông môn. Cả ba có thể theo tuyến truyện và nhận phần thưởng bản mệnh phù hợp.

### 5.2. Bộ kỹ năng đặc trưng

Các ví dụ dưới đây định nghĩa hành vi, chưa phải danh mục 36 kỹ năng hoàn chỉnh. “Cấp kỹ năng 1” không có nghĩa cấp cả tuyệt kỹ ngay khi tạo nhân vật.

| Hướng | Kỹ năng | Quy tắc thiết kế cần triển khai |
|---|---|---|
| Kiếm | Thanh Phong Kiếm Khí | Đạn có tốc độ/tầm hữu hạn; khai báo số xuyên và mỗi mục tiêu nhận tối đa bao nhiêu hit |
| Kiếm | Huyền Thiên Nhất Kiếm | Quét hình quạt 160° theo hướng ngắm; bán kính trong tọa độ thế giới |
| Kiếm | Hộ Thể Kiếm Cương | D0 giảm 50% sát thương trong thời lượng cấu hình; không cộng dồn vô hạn |
| Kiếm | Vạn Kiếm Quy Tông | Cự kiếm giáng điểm ngắm sau thời gian chuẩn bị; phạm vi và hit khớp VFX |
| Pháp | Hỏa Cầu Thuật | Đạn phát nổ; một mục tiêu không bị tính trùng hit đạn và vụ nổ ngoài thiết kế |
| Pháp | Băng Phong Trận | Vùng làm chậm/đóng băng có thời lượng; boss có luật kháng riêng |
| Pháp | Linh Thuẫn | Dùng MP để chặn một phần sát thương, không biến sát thương thành nguồn MP vô hạn |
| Pháp | Lôi Đình Vạn Quân | Vùng có tâm và bán kính cố định; hiệu ứng có thể rộng nhưng không lấy viewport làm phạm vi |
| Thể | Thiết Sơn Kháo | Lao theo hướng chọn; kiểm tra toàn đường đi, dừng khi gặp vật cản |
| Thể | Kim Chung Tráo | D0 tăng 100% DEF trong 5 giây; tính từ DEF trước buff này, không tự nhân lặp |
| Thể | Bất Hoại Thân | Kỹ năng chủ động mở cửa sổ bảo hộ; hồi phục có điều kiện và giới hạn một lần |
| Thể | Thiên Băng Địa Liệt | Vùng quanh thân, sát thương/choáng theo dữ liệu; không khóa boss vô hạn |

**D0 làm rõ kỹ năng dễ hiểu sai:**

- Hộ Thể: thời lượng đề xuất 3 giây, tổng giảm sát thương từ các nguồn có trần 80%; số này phải playtest.
- Linh Thuẫn: đề xuất 6 giây, chặn tối đa 50% damage sau giáp/giảm trừ, tối đa 2 damage cho 1 MP; giới hạn thêm bởi ngân sách khiên khai báo trong skill. Tốn MP theo phần thực chặn, phần còn lại vào HP. MP không đủ thì khiên chỉ chặn phần đủ trả.
- Bất Hoại Thân: đề xuất cửa sổ 6 giây; kích hoạt hồi 20% MaxHP một lần khi một hit gây mất ít nhất 15% MaxHP và nhân vật vẫn sống sau hit. Không hồi sinh từ hit chí tử; không tự reset cửa sổ; cooldown kỹ năng tối thiểu 20 giây trong D0.

D0 dùng HP/MP nguyên cho Linh Thuẫn: lượng chặn = min(floor(damage × 0.5), ngân sách khiên còn lại, 2 × MP khả dụng); MP tiêu hao = ceil(lượng chặn / 2). Giảm ngân sách khiên đúng lượng chặn; không chặn thì không tiêu MP. Cost kích hoạt đã được trừ trước khi tính MP khả dụng.

Mỗi skill cần ID, hướng tu, điều kiện mở, cost, cooldown, cast/recovery, hình hitbox, range/radius, projectile speed nếu có, hệ số damage, trạng thái, giới hạn hit, quy tắc ngắt và liên kết animation/VFX. Thiếu các trường này thì chưa được tính là sẵn sàng chiến đấu.

Mục tiêu nội dung đầy đủ: 36 kỹ năng, 12 mỗi hướng, trang bị tối đa 4 kỹ năng chủ động. Cơ cấu passive nếu thêm phải ghi riêng, không âm thầm dùng passive để thay số lượng active đã công bố. D0 mở kỹ năng theo tiến trình; đổi loadout tại khu an toàn.

---

## 6. Cảnh giới, chỉ số và công thức

### 6.1. Chín cảnh giới

Mỗi cảnh giới có Sơ Kỳ (tier 0), Trung Kỳ (1), Hậu Kỳ (2), Đại Viên Mãn (3).

| Index | Cảnh giới | Hệ số sức mạnh D0 |
|---:|---|---:|
| 0 | Luyện Khí | 1.0 |
| 1 | Trúc Cơ | 1.5 |
| 2 | Kim Đan | 2.2 |
| 3 | Nguyên Anh | 3.2 |
| 4 | Hóa Thần | 4.5 |
| 5 | Luyện Hư | 6.0 |
| 6 | Hợp Thể | 8.0 |
| 7 | Đại Thừa | 11.0 |
| 8 | Độ Kiếp | 15.0 |

Đột phá cần đủ tu vi, vật liệu/đan và điều kiện nhiệm vụ được hiển thị trước. D0 không dùng xác suất thất bại để phá trang bị hoặc tụt cảnh giới; nếu có thiên kiếp chiến đấu thì thất bại cho thử lại theo quy tắc rõ.

### 6.2. Đơn vị và phân nhóm

- Tọa độ, range, radius, dash dùng **world px** tại scale logic 1.0; không phải pixel màn hình sau zoom/DPR.
- Tốc độ dùng world px/s. Đổi camera hoặc kích thước cửa sổ không đổi gameplay.
- Thời gian cấu hình chuẩn dùng millisecond; bảng UI có thể hiển thị giây. Dữ liệu cũ dùng giây phải chuyển qua adapter có kiểm tra.
- Xác suất dùng số 0–1; 15% lưu là 0.15. Hệ số 1.5 khác với cộng 50 điểm phần trăm.

Chỉ HP tối đa, MP tối đa, ATK và DEF đi qua công thức cảnh giới:

```text
core = (base + equipmentFlat + permanentFlat)
       × realmMultiplier × (1 + tier × 0.05)
effective = floor(core × max(0, 1 + sum(additivePercentBonuses)))
```

HPmax ≥ 1, MPmax/ATK/DEF ≥ 0. Các phép nhân đặc biệt khác chỉ dùng khi dữ liệu khai báo; không lặp buff mỗi tick. HP/MP hiện tại khi đổi trang bị được clamp vào khoảng 0 đến HPmax/MPmax mới, không tự hồi đầy.

Quy tắc riêng D0:

- Crit chance = clamp(base + equipment + buffs, 0, 0.60).
- Crit multiplier = clamp(1.50 + bonuses, 1.00, 2.50).
- Move speed = clamp(baseMoveSpeed × (1 + realmIndex × 0.05) × speedModifiers, 0, 220 world px/s); trạng thái stun/root xử lý riêng.
- Cooldown reduction có trần D0 40%; skill khai báo được hưởng hay không. Né cơ bản không hưởng trong D0.
- Range, i-frame, dash distance, projectile speed không nhân bằng realmMultiplier.

Trần 220 world px/s chỉ áp dụng cho chạy thông thường. Né, lao tới, đẩy lùi hoặc dịch chuyển hợp lệ có quy tắc riêng do server xác nhận; không dùng trần chạy để cắt quãng né 560 world px/s hoặc kết luận gian lận.

Ví dụ kiểm tra công thức: Kiếm Tu ở Độ Kiếp Đại Viên Mãn, không đồ/buff, có ATK = floor(25 × 15 × 1.15) = 431. Crit vẫn 15%, không biến thành 258.75%. Đây là kiểm tra tính nhất quán, chưa chứng minh cân bằng.

### 6.3. Damage và thứ tự xử lý

```text
raw = ATK × skillCoefficient × critFactor × randomVariance
afterArmor = raw × 100 / (100 + max(0, effectiveTargetDEF))
afterReduction = afterArmor × (1 - clampedDamageReduction)
if not isDamagingHit or isImmune or afterReduction <= 0:
    damage = 0
else:
    damage = max(1, floor(afterReduction))
```

randomVariance D0 trong [0.95, 1.05]; server sinh kết quả. effectiveTargetDEF đã tính xuyên/giảm giáp theo dữ liệu và clamp. Sát thương đặc biệt bỏ giáp phải có tag, không áp ngầm.

Pipeline: xác nhận hit hợp lệ → kiểm tra miễn nhiễm → tính crit/damage/giảm trừ → khiên → HP → trigger hợp lệ → trạng thái chết → quyết toán.

Miễn nhiễm trả 0 trước quy tắc tối thiểu 1. ATK hoặc hệ số damage bằng 0 không tự tạo 1 sát thương; hồi phục và hiệu ứng chỉ áp trạng thái xử lý theo loại riêng. DOT mặc định không crit; từng hiệu ứng có lịch tick/thời lượng và quy tắc cộng dồn. Phản đòn không tự kích hoạt phản đòn tiếp; hút máu tính trên HP damage thực, không tính phần overkill hoặc damage bị khiên chặn.

Mỗi hit mang attackId/targetId/hitIndex để tránh cộng damage nhiều lần ngoài số hit thiết kế. Tổng kết cuối tick phải nhất quán, độc lập thứ tự nhận gói mạng.

---

## 7. Né, boss, tử trận và lưu kết quả

### 7.1. Cấu hình né D0 duy nhất

Bản cũ mô tả 220 ms × 2.2 lần tốc độ nhưng không ghi đơn vị SPD. Nếu SPD=110 world px/s, khoảng đi chỉ 53.24 world px, khác mô tả 140 px ở báo cáo trước. Vì thế bản này đề xuất bộ cấu hình mới có phiên bản, chưa phải thay đổi đã áp dụng trong code.

| Tham số | D0 |
|---|---:|
| Tick server dùng để thiết kế | 20 Hz, 50 ms/tick |
| Khoảng né tối đa | 140 world px |
| Thời lượng né | 250 ms = 5 tick |
| Cửa sổ i-frame | [0, 200 ms) tính từ tick bắt đầu = 4 tick |
| Cooldown | 1200 ms = 24 tick, tính từ lúc bắt đầu |
| Tốc độ né suy ra | 140 / 0.25 = 560 world px/s |

Server nhận và chấp nhận input tại tick bắt đầu; trạng thái miễn nhiễm được áp dụng trước giải quyết hit của tick đó, hết hiệu lực tại mốc 200 ms. Không dùng thời gian do client gửi để kéo dài i-frame hoặc hồi cooldown.

Né bị giới hạn bởi vật cản/biên map; kiểm tra đường quét giữa vị trí đầu/cuối, không dịch chuyển xuyên tường. Va chạm vật lý vẫn tồn tại trong i-frame. Né không xóa debuff; các tick damage nằm trong cửa sổ miễn nhiễm trả 0 theo chính sách combat.

D0 cho phép né hủy phần chuẩn bị/hồi phục của chiêu có thể hủy, không hủy stun, death hoặc khóa tương tác bắt buộc. Cost/cooldown được chốt khi server nhận cast hợp lệ; hủy không hoàn lại trừ khi skill ghi khác. Gameplay không chờ animationcomplete để thoát né.

Nếu giữ thông số 220/180 ms của bản cũ, phải có đặc tả timestamp/substep và kiểm thử tương ứng. Không trộn hai bộ cấu hình trong client, server và tài liệu.

### 7.2. Boss

Mỗi boss có bộ chiêu, hình báo đòn, thời gian chuẩn bị, vùng va chạm và chuyển pha riêng. D0 đòn nguy hiểm thường báo 800–1200 ms; không chỉ dựa vào màu đỏ mà có đường viền/tiến độ và âm thanh hỗ trợ.

Enrage mẫu dưới 40% HP: ATK +35%, tốc độ +30%, kích hoạt một lần. Tần suất chiêu là dữ liệu từng boss; không mặc định nhân đôi mọi chiêu hoặc cắt mất thời gian phản ứng. Thông số cũ +25%/+30% tốc độ phải được thống nhất tại gameDataVersion.

Boss không bị khóa vô hạn bởi stun/freeze. Mỗi boss khai báo miễn, giảm thời lượng hoặc cơ chế phá thế; không tự thêm cơ chế phá thế nếu chưa có dữ liệu/UI.

### 7.3. Tử trận và phần thưởng

- Nếu người chơi và boss đều chết trong cùng tick quyết toán: thất bại, không cấp thưởng thắng boss hoặc hoàn thành nhiệm vụ hạ boss của lần thử đó.
- Tử trận đưa nhân vật về điểm an toàn, hồi đầy HP/MP; giữ cảnh giới, trang bị và tiến trình đã xác nhận.
- Mỗi lần nhận thưởng boss/quest, chế tạo hoặc đột phá dùng khóa idempotency gắn với sự kiện nghiệp vụ và nhân vật, giữ nguyên qua retry/reconnect, kiểm tra quyền ở server và có ràng buộc unique trong DB. Trừ chi phí, ghi kết quả/thưởng và đánh dấu sự kiện đã quyết toán nằm trong cùng giao dịch atomic; retry trả kết quả đã lưu, không tạo mã mới để cấp lại.
- Túi đầy đưa thưởng vào nơi nhận chờ có lưu server; vật phẩm nhiệm vụ không bị mất âm thầm.
- Reconnect không khôi phục boss đã chết rồi cấp lại thưởng; bản ghi trận và bản ghi thưởng có quan hệ rõ.

---

## 8. Cốt truyện Thiên Khế, tám chương và ba kết cục

### 8.1. Cơ chế ký ức

Thiên Khế ảnh hưởng hội thoại, quan hệ, nhiệm vụ phụ và các lựa chọn kết cục. D0 dùng một số cờ có ý nghĩa rõ: các ký ức đã bảo lưu, bằng chứng đã tìm và quyết định ở những nút truyện.

Trước một đánh đổi quan trọng, giải thích hậu quả và cách bảo lưu. Mảnh Thiên Thư, nhiệm vụ và vật liệu cho con đường giữ ký ức. Không tự xóa nhật ký, vật phẩm nhiệm vụ hoặc khóa vĩnh viễn cốt truyện vì một lựa chọn không được thông báo.

Mọi hướng tu đều có con đường hoàn thành truyện; sức mạnh không chỉ dành cho người chấp nhận mất nhân tính.

### 8.2. Phân bổ tiến trình D0

| Chương | Vùng / mốc cảnh giới | Diễn biến và mục tiêu | Boss chính dự kiến |
|---|---|---|---|
| 1 | Thanh Khê / Luyện Khí | Linh khí hỗn loạn, thú biến dị; học chiến đấu, tìm mảnh Thiên Thư bảo lưu ký ức | Xích Nha Lang Vương |
| 2 | Thanh Vân Môn / Trúc Cơ | Tông môn có các nhánh Kiếm/Pháp/Thể; phát hiện trưởng lão quên quá khứ; lựa chọn giúp một người giữ ký ức | Hộ Pháp Thất Niệm |
| 3 | Đan Hà Cốc / Kim Đan | Điều tra đan dược tẩy trí; học luyện chế và chọn công bố hay giữ bằng chứng để cứu người | Đan Khôi Vô Tâm |
| 4 | U Hồn Cực Địa / Nguyên Anh | Gặp tàn hồn bị thanh trừng; đối chiếu các lời chứng về Thiên Khế | U Hồn Trấn Chủ |
| 5 | Huyền Thiên Kiếm Trũng / Hóa Thần | Rèn bản mệnh pháp bảo phù hợp hướng tu; xác định lý do tu luyện | Thủ Mộ Kiếm Linh |
| 6 | Bắc Băng Cung / Luyện Hư | Tìm cách phong ấn ký ức trong hàn ngọc trước thử thách Thiên Khế cấp cao | Hàn Ngọc Tâm Ma |
| 7 | Viễn Cổ Di Tích / Hợp Thể → Đại Thừa | Hai hồi: khám phá cơ chế thu hoạch linh hồn, sau đó chuẩn bị và phá các trụ Thiên Khế | Giám Khế Cổ Tượng |
| 8 | Vạn Đạo Chi Đỉnh / Độ Kiếp | Đối mặt người canh giữ Thiên Khế; quyết định con đường cuối | Thiên Khế Chấp Chưởng |

Các boss mới trong bảng là đề xuất sáng tác, chưa có asset/data/AI được xác minh. Tên vùng Kiếm Trũng không ép Pháp Tu/Thể Tu sử dụng kiếm: phần thưởng tương ứng là kiếm, phù/châu/trượng, hoặc quyền sáo/pháp khí luyện thể.

Mỗi chương cần quest graph, điều kiện mở/khóa, NPC, hội thoại, vật phẩm tiến trình và cách thoát softlock. Giai đoạn 7 có hai hồi để đủ không gian cho hai cảnh giới; không lấp bằng yêu cầu farm lặp vô nghĩa.

### 8.3. Ba kết cục

| Kết cục | Nội dung giữ lại | Hệ quả thiết kế |
|---|---|---|
| Vô Tình Phi Thăng | Chấp nhận đánh đổi ký ức để bước qua cổng Thượng Giới | Hoạt cảnh và cờ kết thúc phản ánh các lựa chọn trước |
| Nghịch Thiên Phá Đạo | Dùng Thiên Thư phá Thiên Khế, bảo vệ nhân thế và ký ức | Cần bằng chứng/chuẩn bị đã được gợi ý; có đường bổ sung trước quyết định cuối |
| Luân Hồi Trọng Sinh | Hy sinh tu vi trong câu chuyện để chữa lành thế giới, trở về đời phàm | Không tự reset cảnh giới, đồ hoặc save của nhân vật đang chơi |

D0 kết cục thứ nhất luôn có thể chọn tại điểm cuối; hai kết cục còn lại mở qua tuyến chuẩn bị được hướng dẫn. Cơ hội còn thiếu được báo trước và có nhiệm vụ hồi tưởng để bổ sung, không buộc xóa nhân vật chơi lại.

### 8.4. Chơi tiếp sau truyện

Trước lựa chọn cuối, lưu mốc thế giới để tiếp tục. Sau hoạt cảnh, ghi cờ đã xem kết cục và thưởng hợp lệ rồi cho chọn **Tiếp tục tu luyện**.

Chế độ chơi tiếp đặt thế giới ở mốc trước quyết định cuối; đây không phải rollback database. Giữ tu vi, đồ, kỹ năng, cờ hoàn thành và thưởng đã nhận. Nhờ vậy không có tình trạng mở lại checkpoint để nhân đôi đồ.

Có thể xem lại kết cục qua hồi tưởng; thưởng lần đầu được chốt một lần. D0 không tự thực hiện New Game+. Nếu thêm Luân Hồi thực sự, đó là lựa chọn riêng có bảng giữ/mất, xác nhận rõ và bản lưu dự phòng.

Hậu truyện có tái đấu boss, bí cảnh tăng thử thách, mục tiêu sưu tầm, luyện chế và đổi build. Đồ cốt truyện không yêu cầu xem lại cùng hoạt cảnh nhiều lần để farm.

---

## 9. Thế giới, nhiệm vụ và các hệ thống tu tiên

### 9.1. Map và quái

Mỗi map khai báo ID, kích thước logic, vùng đi được/collision, spawn, NPC, điểm an toàn, cổng, spawn quái, boss và vùng cấm. Dùng một nguồn dữ liệu chuẩn có phiên bản cho client/server.

Quái có vai trò: cận chiến áp sát, tầm xa, lao vào, hỗ trợ hoặc tinh anh. Không gọi đổi màu và tăng HP là một cơ chế boss mới. Boss chính gắn chương; boss phụ cung cấp vật liệu và lựa chọn cày.

Cổng và hồi sinh kiểm tra vị trí đích hợp lệ. Sau cập nhật map, nhân vật đang lưu ở ô bị chặn được đưa tới điểm an toàn có lý do/log; không dùng teleport tùy tiện để che lỗi collision.

### 9.2. Nhiệm vụ

State chuẩn: chưa mở → có thể nhận → đang làm → đủ điều kiện → đã nhận thưởng. Điều kiện và thưởng kiểm ở server.

Quest hỗ trợ hội thoại, tới vùng, đánh quái, boss, thu thập/chế tạo và lựa chọn. Item bắt buộc không bị bán/hủy khiến mất tuyến truyện; NPC hoặc cổng bị thay đổi phải có đường phục hồi nhiệm vụ.

Lưu nhật ký và mục tiêu rõ; người chơi có thể tạm ngừng cốt truyện để cày tại vùng đã mở. Tự động chỉ đường có thể bổ sung sau, không thay yêu cầu trực tiếp điều khiển chiến đấu.

### 9.3. Tông môn, động phủ, linh điền, linh thú

D0 ba tông môn theo các địa điểm truyện: Thanh Vân Môn, Đan Hà Cốc, Bắc Băng Cung. Tông môn cung cấp nhiệm vụ, công thức hoặc tiện ích; không khóa toàn bộ tiến triển của một hướng tu.

Động phủ có kho và nâng cấp tiện ích. Linh điền sản xuất nguyên liệu theo thời gian server. Linh thú cung cấp hỗ trợ có giới hạn; mục tiêu đủ nội dung là 6 loại, mỗi loại có vai trò và cách kiếm trong game.

Đây là phạm vi thiết kế cần đối chiếu với chức năng đã tồn tại. Nếu repo đã có dữ liệu hoặc hệ thống tương ứng, ưu tiên giữ và nâng cấp, không tự xóa để làm lại.

### 9.4. Tu luyện vắng mặt

D0 tối đa 8 giờ mỗi lần tính tích lũy. Server dùng thời gian của mình và mốc nhận đã lưu; đổi giờ máy/retry không tăng thưởng.

Phần vắng mặt cho tu vi hoặc nguyên liệu nền theo cấu hình, không tự thắng boss, hoàn thành lựa chọn truyện hoặc cấp đồ hiếm như đã chiến đấu. Không có gói trả tiền tăng thời gian hay tốc độ.

---

## 10. Vật phẩm, luyện chế và kinh tế miễn phí

### 10.1. Hệ thống đồ

Nhóm đồ: vũ khí, y phục/giáp, phụ kiện, pháp bảo, đan dược, nguyên liệu, vật phẩm nhiệm vụ và ngoại hình. Phẩm cấp D0: Phàm, Linh, Huyền, Địa, Thiên; phẩm cấp không thay thế cảnh giới yêu cầu.

Tách itemDefinition (mẫu) khỏi itemInstance (món sở hữu). Instance giữ UID, templateId, số lượng, nâng cấp, thuộc tính ngẫu nhiên, trạng thái khóa và chủ sở hữu. Đồ nhiệm vụ/không thể giao dịch phải có flag rõ.

Ngoại hình có thể kiếm bằng chơi; không bán bằng tiền thật. D0 chưa mở chợ/giao dịch giữa người chơi nếu chưa có thiết kế chống nhân đôi và phân quyền tương ứng.

### 10.2. Nguồn và nơi tiêu tài nguyên

| Tài nguyên | Nguồn | Nơi tiêu |
|---|---|---|
| Tu vi | Nhiệm vụ, chiến đấu, tu luyện vắng mặt có trần | Tăng tầng/đột phá theo cấu hình |
| Linh thạch | Nhiệm vụ, quái, boss, bán đồ hợp lệ | Mua vật tư trong game, luyện chế, tiện ích |
| Nguyên liệu | Thu hái, khai thác, quái/boss, linh điền | Đan dược, trang bị, bản mệnh, động phủ |
| Vật liệu chuyên biệt | Boss/vùng tương ứng, đổi mảnh | Mục tiêu build và tiến trình cao |

Drop table ghi rõ weighted-choice hay các lượt roll độc lập; không nhầm tổng trọng số với phần trăm. Roll và thay đổi tài sản ở server. Công bố nơi kiếm đồ; boss chính bảo đảm vật liệu tiến truyện của lần thắng hợp lệ đầu tiên.

D0 có đổi mảnh cho đồ mục tiêu để giảm farm vô hạn. Thông số tỷ lệ rơi/chi phí chưa được đặt hàng loạt khi chưa có dữ liệu và mô phỏng kinh tế.

Craft/nâng cấp kiểm công thức, số lượng, quyền sở hữu và nguyên liệu trong cùng giao dịch; thiếu điều kiện không mất tài sản. Không phá đồ đang trang bị hoặc tiêu item nhiệm vụ ngoài thiết kế được hiển thị.

---

## 11. Quy mô nội dung và trạng thái sản xuất

Các con số là ngân sách nội dung D0, không phải thống kê đã hoàn thành.

| Hạng mục | Khu vực mẫu đầu tiên | Mục tiêu bản cốt truyện đầy đủ |
|---|---|---|
| Nhân vật/hướng tu | 1 Kiếm Tu hoàn chỉnh, không xóa hai hướng còn lại nếu đã có | 3 hướng đều hoàn thành truyện được |
| Kỹ năng | Đánh thường, né, 4 kỹ năng có đủ data/animation/VFX | 36 kỹ năng, 12 mỗi hướng |
| Khu vực | Hub Thanh Khê và vùng rừng giao chiến liên kết | 8 vùng chính theo chương, thêm bí cảnh/hậu truyện theo kế hoạch |
| NPC | Ít nhất 3 vai trò có tương tác | Danh mục theo quest graph và dịch vụ |
| Quái thường | Ít nhất 2 vai trò | Mục tiêu ít nhất 20 mẫu có hành vi/phân bố rõ |
| Boss | 1 boss chính, thêm Cổ Thụ Yêu khi đủ dữ liệu | 8 boss chương + mục tiêu 8 boss phụ |
| Vật phẩm | 15–20 mẫu đủ cho vòng chơi thử | Mục tiêu 150 mẫu; số bản sao/roll không tính thành mẫu mới |
| Nhiệm vụ | 6–8 nhiệm vụ có thể chơi trọn vòng | Mục tiêu 56 nhiệm vụ có nội dung: 40 chính + 16 phụ |
| Hệ thống phụ | Phần tối thiểu để thử lưu/đồ/tiến triển | Tông môn, động phủ, linh điền, 6 linh thú, tu luyện vắng mặt |

Một nhiệm vụ chỉ được tính hoàn thành khi nhận → thực hiện → nhận thưởng → tải lại tiến trình đều đúng. Một boss chỉ tính hoàn thành khi có asset, AI, telegraph, collision, loot và kiểm thử.

---

## 12. Kiến trúc real-time, tài khoản và lưu trữ

### 12.1. Ranh giới client/server

| Client | Server |
|---|---|
| Nhận input, dựng hình, animation, âm thanh, HUD | Xác thực tài khoản/nhân vật và xử lý input hợp lệ |
| Có thể dự đoán chuyển động để phản hồi nhanh | Quyết định vị trí, va chạm, tốc độ và trạng thái |
| Nội suy thực thể khác, hiệu chỉnh từ snapshot | Quyết định MP, cooldown, i-frame, hits, chết và thưởng |
| Gửi ý định, không gửi “tôi đã thắng/nhận X đồ” làm chân lý | Lưu và quyết toán tài sản, nhiệm vụ, cảnh giới |

20 Hz là baseline mô phỏng D0 theo báo cáo trước, cần xác minh trong repo. Render FPS và tốc độ phát sprite animation độc lập với tick server.

Mỗi phiên có session/character/instanceId và phiên bản dữ liệu. Input có thứ tự; server phản hồi mốc đã xử lý. Client sửa dự đoán từ trạng thái xác nhận và các input chưa xử lý, hoặc cơ chế tương đương đã kiểm thử. Không dùng riêng ngưỡng snap 48 px làm bằng chứng đồng bộ đúng.

Giới hạn tốc độ dựa trên thời gian server; spam gói không tạo thêm bước di chuyển. Input quá cũ, lặp hoặc không hợp lệ bị xử lý theo chính sách rõ. Tọa độ, vector và số liệu phải hữu hạn, trong miền cho phép.

### 12.2. Tài khoản và ba ô nhân vật

Tối đa ba slot độc lập; giữ slot và characterId cũ qua migration. Túi đồ, đồ mặc, quest và tiến trình tách theo characterId.

D0 một nhân vật hoạt động mỗi tài khoản tại một thời điểm; server quản lý phiên hoạt động. Chuyển nhân vật ở trạng thái an toàn, chốt lưu trước khi giải phóng phiên. Xóa nhân vật phải có xác nhận rõ và chính sách khôi phục đã công bố.

Không đưa mật khẩu, token hoặc khóa admin vào bundle client. Chọn cơ chế xác thực theo repo và kiểm tra hết hạn/thu hồi; không coi tên “JWT HttpOnly” là bằng chứng đã an toàn.

### 12.3. Mất kết nối

D0 phát hiện mất kết nối sau khoảng 5 giây không có tín hiệu; giá trị cần được kiểm thử với heartbeat thực tế. Khi chưa phát hiện, server tiếp tục mô phỏng theo luật thông thường.

Chỉ instance PvE cá nhân được phép tạm dừng sau khi phát hiện, lưu snapshot tối đa D0 120 giây. Nếu có world/instance chung thì không đóng băng người khác. Hết thời gian phục hồi đưa về mốc an toàn theo kết quả đã chốt.

Kết nối lại xác thực quyền nhân vật, hủy input cũ, đồng bộ trạng thái và đồng hồ. Cooldown/trạng thái trong instance đang tạm dừng dùng cùng đồng hồ mô phỏng; không để người chơi chờ ngoài game để hồi toàn bộ cooldown rồi trở lại trận đã đóng băng.

### 12.4. Lưu dữ liệu

Lưu ở các giao dịch quan trọng và checkpoint phù hợp; không ghi toàn bộ thế giới vào DB mỗi tick. Khi restart server, khôi phục theo checkpoint và các giao dịch đã commit, không tin dữ liệu client gửi bù.

Schema theo DB thật của dự án. Sao lưu, migration và phục hồi phải được thử trên dữ liệu test. Một file SQL chưa được chạy trên từng hệ không được gọi là tương thích mọi DB.

---

## 13. Bảo mật, chống gian lận và admin panel

### 13.1. Bảo vệ tối thiểu

- Xác thực và phân quyền ở server cho API, kết nối game và hành động quản trị; kiểm tra quyền sở hữu character/item, không chỉ vai trò tổng.
- Môi trường public dùng HTTPS/WSS, kiểm tra Origin hợp lệ, schema/kích thước/tần suất message và phiên hết hạn. Cookie-auth cần chính sách chống CSRF tương ứng. [R7]
- Server kiểm cost/cooldown/range/collision, điều kiện quest, loot, craft và đột phá; không tin chỉ số client.
- Đăng nhập có giới hạn thử và thông báo không lộ thông tin tài khoản không cần thiết.
- Quyền mặc định tối thiểu; quyết định quyền được kiểm ở từng yêu cầu liên quan. [R8]
- Hành vi bất thường được ghi để điều tra. Không tự ban chỉ từ một lần lệch vị trí hoặc mạng chậm.
- Không gọi anti-cheat “100%” hoặc audit “bất biến” nếu chưa chứng minh được phạm vi bảo vệ.

### 13.2. Admin panel bắt buộc

| Vai trò D0 | Phạm vi |
|---|---|
| Owner | Quản lý quyền, cấu hình vận hành, phê duyệt thao tác quan trọng |
| GM | Quản lý nội dung và hỗ trợ nhân vật trong quyền được cấp |
| Moderator | Xử lý báo cáo, khóa/mở theo chính sách được cấp; không tự phát đồ |
| Read-only | Xem dashboard, log và dữ liệu được cho phép |

Tính năng tối thiểu:

- Tìm tài khoản/nhân vật, xem tiến trình và lịch sử thao tác.
- Quản lý trạng thái tài khoản; thao tác hỗ trợ đồ/quest có lý do và audit.
- Tra cứu/chỉnh cấu hình item, skill, quái, boss, quest và drop trong phạm vi công cụ đã triển khai.
- Kiểm tra dữ liệu trước áp dụng, xem diff, lưu phiên bản và rollback cấu hình.
- Xem trạng thái server/instance, sự kiện lỗi và chỉ số hiệu năng.
- Xác nhận riêng trước xóa/reset dữ liệu; không có endpoint tùy ý chạy SQL/shell từ trình duyệt.

Audit ghi actor, quyền, thời điểm, đối tượng, lý do, dữ liệu trước/sau và kết quả; role thường không sửa/xóa audit. Bảo vệ lưu trữ và sao lưu được mô tả đúng mức thực tế.

Cấu hình chiến đấu áp dụng tại ranh giới an toàn hoặc instance mới để tránh đổi stats/loot giữa trận. Công cụ biên tập map trực quan là phạm vi riêng; không tuyên bố “kiểm soát mọi thứ” khi chỉ có dashboard.

---

## 14. Launcher GUI và gói log cho AI

### 14.1. Launcher

Bản bàn giao Windows có ứng dụng GUI chạy được, không dùng file .bat làm giao diện cuối. Game vẫn mở và chơi bằng trình duyệt.

Chức năng:

- Start/Stop/Restart Server và Client riêng; Start All/Stop All.
- Trạng thái stopped/starting/ready/stopping/error; Play chỉ sẵn sàng khi health check thành công.
- Mở game, mở admin theo quyền tài khoản, xem log và xuất gói chẩn đoán.
- Kiểm tra cấu hình/port/dependency cần thiết; báo lỗi cụ thể.
- Theo dõi đúng tiến trình do launcher khởi tạo; không kill nhầm tiến trình khác chỉ vì trùng port/tên.
- Dừng an toàn, chốt lưu trong thời hạn rồi mới cưỡng bức tiến trình thuộc quyền launcher nếu cần.
- Nút Client nghĩa là dịch vụ phục vụ giao diện web; dừng dịch vụ phải phản ánh trạng thái các tab đang mở, không hứa đóng được mọi tab trình duyệt.

Database là dịch vụ riêng: phát hiện trạng thái; chỉ điều khiển khi cấu hình và quyền vận hành cho phép. Không mặc định tự dừng PostgreSQL/WSL dùng chung.

Icon tiên hiệp nhất quán trên cửa sổ, exe, shortcut, taskbar/tray theo phạm vi có hỗ trợ. Kiểm tra tên game tiếng Việt trong bản đóng gói và đường dẫn có dấu/khoảng trắng.

### 14.2. Xuất log

Một lần bấm xuất được TXT dễ đọc và ZIP khi cần nhiều tệp:

| Tệp đề xuất | Nội dung |
|---|---|
| SUMMARY.txt | Build, thời điểm, môi trường, trạng thái dịch vụ, lỗi gần nhất |
| REPRO_STEPS.txt | Các bước tái hiện do người dùng nhập hoặc ghi nhận |
| launcher.log | Vòng đời tiến trình, health check, lỗi khởi động |
| server.log | Lỗi server, instance, lưu và giao dịch liên quan |
| client.log | Chẩn đoán client đã được tích hợp thu nhận |
| events.jsonl | Sự kiện có cấu trúc: thời gian, level, source, eventCode, correlationId |
| performance.json | Cảnh đo, cấu hình và số liệu nếu bật chẩn đoán |

Không hứa thu toàn bộ console của mọi tab nếu chưa có cơ chế thu nhận client. Có timestamp, múi giờ/UTC rõ, UTF-8, rotation và giới hạn dung lượng.

Che mật khẩu, token, cookie, khóa bí mật, chuỗi kết nối và thông tin nhạy cảm trước khi xuất. Redaction là che dữ liệu, không được gọi là mã hóa. Không ghi log mỗi entity mỗi frame ở chế độ thông thường.

Rà UTF-8 xuyên suốt source, JSON, DB, API, log, UI và launcher; không sửa lỗi mã hóa bằng đổi font đơn thuần.

---

## 15. Hiệu năng, chẩn đoán và điều kiện thử

### 15.1. Phân loại vấn đề

Tách FPS thấp/frametime bất thường, animation sai nhịp, input trễ, server tick chậm, mạng jitter và kéo ngược vị trí. Chỉ ghi nguyên nhân sau khi có profiler/log hoặc reproduction tương ứng.

Rà vòng lặp/listener/scene trùng, cấp phát bộ nhớ, texture/particle/chữ tạo liên tục, vật thể ngoài màn vẫn cập nhật, React/HUD render quá rộng, tải asset giữa trận và log quá dày.

Tối ưu theo số đo: tái sử dụng, atlas phù hợp, culling, giới hạn hiệu ứng, dọn scene, thu hẹp cập nhật UI. Không tắt collision hoặc kiểm tra server để làm số đo đẹp hơn.

### 15.2. Bài đo D0

| Bài đo | Điều kiện |
|---|---|
| Cảnh thông thường | Thanh Khê/rừng, người chơi + 10 quái hoạt động + 1 boss, dùng đủ kỹ năng |
| Cảnh tải cao | Cùng máy/map, 30 quái hoạt động và mật độ VFX cao; ghi chính xác cấu hình |
| Chuyển trạng thái | Đổi map, hồi sinh, đổi nhân vật, mở/đóng menu nhiều lần |
| Mạng | Localhost và RTT mô phỏng 150 ms, jitter 30 ms bằng công cụ tác động đúng kết nối game |

Các tải trên là kịch bản thử, không xác nhận game hiện đã hỗ trợ số lượng đó. Nếu công cụ không mô phỏng được WebSocket, báo rõ và chọn cách thử hợp lệ.

Mục tiêu cảnh thông thường trên máy được ghi rõ: hướng tới 60 FPS; D0 FPS trung bình ≥55, p95 frametime ≤25 ms sau tải ban đầu; không có khựng >100 ms lặp lại đều trong lúc điều khiển. Server 20 Hz phải xử lý kịp ngân sách 50 ms/tick; báo p95 và số tick trễ.

Cảnh tải cao ghi số liệu và giới hạn, không buộc “60 FPS mọi máy”. Đo trước/sau cùng build settings, trình duyệt, máy, độ phân giải và cảnh. Không chỉ ghi FPS trung bình ở cảnh trống.

### 15.3. Kiểm thử chơi

Chơi liên tục ít nhất 10 phút ở khu mẫu, đi chéo sát góc, né sát vật cản, đánh → né → cast, đổi focus/menu, qua cổng, chết/hồi sinh và qua vùng từng kẹt. Ghi vị trí client/server, state và phiên bản map khi có lỗi.

---

## 16. Hợp đồng dữ liệu và danh mục export

### 16.1. Những gì bản cũ mô tả

Tất cả các tệp sau đều **CX trong lần rà soát này**; không được cung cấp kèm để đọc. Bảng giữ lại đường dẫn dự kiến để AI đối chiếu, không xác nhận chúng tồn tại hoặc đầy đủ.

| Đường dẫn được nêu | Phạm vi bản cũ mô tả | Việc phải kiểm tra |
|---|---|---|
| game-data-export/items.json | 15 mẫu vật phẩm | Đây có thể là gói mẫu; không tương đương mục tiêu 150 |
| game-data-export/skills.json | 36 kỹ năng | ID, trường, phạm vi, animation/VFX và tính chơi được |
| game-data-export/monsters.json | 5 loại quái | Stats, AI, collision, spawn và drop |
| game-data-export/bosses.json | Lang Vương, Cổ Thụ Yêu | Phase/telegraph/loot; chưa chứng minh đủ boss truyện |
| game-data-export/quests.json | Nhiệm vụ chương 1 | Quest graph, reward, không softlock |
| game-data-export/maps.json | Làng và rừng | Bounds, collision, cổng, phiên bản client/server |
| game-data-export/story_chapters.json | Tóm tắt 8 chương | Tóm tắt khác với 8 chương playable |
| game-data-export/realms_and_stats.json | Cảnh giới, chỉ số, né | Đơn vị, cap, bộ cấu hình D0 và compatibility |
| game-data-export/breakthrough_requirements.json | Tu vi/vật liệu đột phá | Thiếu/có đủ điều kiện, giao dịch và lỗi |
| game-data-export/schema.sql | Bảng tài khoản/nhân vật/đồ/skill/quest | DB dialect thật, migration, khóa/tham chiếu và restore |

Báo cáo trước từng nêu 150 vật phẩm/56 nhiệm vụ; các số đó chưa được đối chiếu với danh mục này. Không tự suy ra đã mất dữ liệu hoặc đã có đủ; phải đếm và kiểm tra tệp thật.

### 16.2. Quy ước dữ liệu

Mỗi gói có schemaVersion, gameDataVersion, sourceBuild/commit, ngày xuất và đơn vị. ID ổn định; đổi tên hiển thị không đổi ID. Tách dữ liệu thiết kế công khai khỏi save, tài khoản và secret.

Các trường liên kết item/skill/quest/map/drop phải tồn tại; kiểm tra ID trùng, số ngoài miền, cooldown âm, NaN/infinity, asset thiếu và điểm spawn bị chặn. Thông báo lỗi chỉ rõ file, ID và trường.

Ví dụ cấu hình đề xuất dưới đây chỉ minh họa schema, không phải file export đã tạo:

```json
{
  "schemaVersion": "2.0",
  "gameDataVersion": "D0-design",
  "units": { "distance": "world_px", "time": "ms" },
  "simulation": { "tickRateHz": 20 },
  "dodge": {
    "distance": 140,
    "durationMs": 250,
    "invulnerableFromMs": 0,
    "invulnerableUntilMs": 200,
    "cooldownMs": 1200
  }
}
```

Dùng adapter/migration cho dữ liệu cũ, không copy đè rồi hy vọng tương thích. Muốn hỗ trợ nhiều DB phải có migration/adapter và kiểm thử cho từng hệ; chưa kiểm chứng thì chỉ công bố DB thực tế đã chạy.

---

## 17. Engine và kế hoạch thực hiện

### 17.1. Quyết định nền tảng

Ưu tiên hoàn thiện dự án web đang có. Các báo cáo trước nhắc Phaser/React/TypeScript và backend Node; trạng thái này cần xác minh từ repo. Không đổi engine chỉ vì asset xấu, cắt sai frame hoặc bố cục chưa đạt.

Nếu cần đánh giá chuyển engine, làm một cảnh thử cùng asset, cùng gameplay và kết nối backend; so sánh chất lượng, tải trang, hiệu năng, camera/input, lưu dữ liệu, admin, launcher và công sức migration.

Godot có khả năng xuất web nhưng có điều kiện về renderer/ngôn ngữ/trình duyệt; tài liệu stable tại thời điểm rà soát nêu Godot 4 C# chưa xuất web. Unity có hệ sprites/tilemaps/physics 2D; không mô tả Unity là “chỉ 2.5D”. [R9–R10]

RPG Maker/ABS hoặc Spine chỉ xét sau khi kiểm tra phiên bản, quyền sử dụng, chi phí và khả năng tích hợp real-time/server. Đọc được JSON không có nghĩa tự động chuyển được AI, animation, bản đồ, collision, mạng và save.

### 17.2. Các mốc bàn giao

| Mốc | Nội dung | Điều kiện qua mốc |
|---|---|---|
| M0 — Hiện trạng | Kiểm kê repo/data/build, sao lưu và tái hiện lỗi | Có danh sách đã xác minh/CX, baseline và kế hoạch sửa |
| M1 — Khu vực mẫu | Một nhân vật, NPC, quái, boss, map, 4 kỹ năng và HUD | Mỹ thuật đúng hướng; thao tác/collision/animation và hai viewport đạt |
| M2 — Tiến trình đầu | Chương 1, lưu/tải, đồ, đột phá, admin/launcher tối thiểu | Chơi trọn vòng, thưởng không trùng, không mất save |
| M3 — Nội dung đầy đủ | Ba hướng tu, các chương, boss, đồ, hệ thống phụ và hậu truyện | Danh mục được đếm từ nội dung đã tích hợp, cả ba hướng hoàn thành truyện |
| M4 — Ổn định bàn giao | Hiệu năng, phân quyền, reconnect, đóng gói, log, credits | Có bằng chứng theo bảng nghiệm thu và lỗi tồn đọng rõ |

Không đưa thời hạn hoàn thành khi chưa có repo, đội ngũ và lượng asset phù hợp. Chốt hình ảnh của khu mẫu trước khi nhân rộng; các sửa lỗi đã xác định vẫn tiếp tục thực hiện.

---

## 18. Nghiệm thu và quy tắc báo cáo

### 18.1. Bảng nghiệm thu

| Nhóm | Điều kiện đạt | Bằng chứng |
|---|---|---|
| Nhân vật | Mặt/cơ thể rõ, các hướng và trạng thái đúng | Preview tắt aura + ảnh trong game + video |
| Môi trường | Không ô đen/sọc lỗi, có bố cục, phong cách đồng bộ | Ảnh khu mẫu và đi thực tế |
| Animation | Không restart sai, trượt chân hoặc kẹt state | Chuỗi thao tác, chết/hồi sinh/đổi map |
| Camera/HUD | Phủ khung phù hợp, aim đúng, menu không che hotbar | 1366×768, 1920×1080, resize, menu mở/thu |
| Combat | Cost/cooldown/range/i-frame đúng, viewport không đổi damage area | Test logic có kết quả và thử trình duyệt |
| Va chạm/mạng | Không xuyên tường, spawn kẹt hoặc kéo ngược lặp do mismatch | Log đối chiếu, bài mạng mô phỏng |
| Tiến trình | Ba hướng không bị ép dùng kiếm; đột phá/cảnh giới có cap | Playtest và kiểm tra dữ liệu |
| Kết cục | Xem ending và chơi tiếp không mất nhân vật/nhân đôi thưởng | Cả ba đường kết thúc |
| Tài sản | Loot/quest/craft/retry không nhận trùng, túi đầy không mất đồ | Test giao dịch và restore |
| Admin | Quyền đúng ở server, audit/diff/rollback trong phạm vi công cụ | Kịch bản từng vai trò |
| Launcher/log | Start/Stop đúng tiến trình, Play/health/export hoạt động | Bản đóng gói + gói TXT/ZIP |
| Hiệu năng | Đạt ngưỡng D0 đã chốt ở mục 15 trong môi trường/cảnh thử được ghi rõ | Số đo trước/sau, môi trường, trace cần thiết |
| Dữ liệu/credits | Gói đúng schema/ID, nguồn asset rõ, migration đã thử | Validator, danh mục tệp, credits |

Hạng mục không đạt ngưỡng phải ghi **CHƯA ĐẠT**, kèm số đo, giới hạn và tác động. Báo trung thực một giới hạn không tự chuyển kết quả thành PASS; cảnh tải cao chưa có ngưỡng chốt chỉ được báo kết quả khảo sát.

### 18.2. Hồ sơ mỗi lần bàn giao

- Build/commit, ngày, môi trường, cảnh thử và phạm vi đã thay đổi.
- Ảnh sau sửa ở hai độ phân giải, không dùng ảnh mẫu làm bằng chứng sản phẩm.
- Video gameplay 60–90 giây và ghi nhận chơi liên tục tối thiểu 10 phút ở khu mẫu.
- Bảng lỗi với bước tái hiện, nguyên nhân đã xác minh, file sửa và retest.
- Log build/test gốc, số đo hiệu năng, asset manifest và credits.
- Nội dung chưa triển khai/chưa kiểm chứng, lỗi còn lại và tác động.

Không ghi “hoàn tất 100%” từ build thành công hoặc test server riêng lẻ. Không có công cụ quay hay chạy một kiểm thử thì ghi đúng hạn chế và bằng chứng thay thế.

## 19. Nguồn tham chiếu và phạm vi sử dụng

**Nguồn nội bộ:** bản DOCS_GAME_DESIGN_DOCUMENT_VAN_DAO.md trước cập nhật; yêu cầu và ảnh chủ dự án cung cấp trong hội thoại. Những lỗi nhận xét từ ảnh chỉ là bằng chứng thị giác; nguyên nhân code và hiệu năng cần tái hiện.

Nguồn ngoài được xem ngày 10/11/2026, phục vụ tham khảo thiết kế/kỹ thuật. Tài liệu của công cụ có thể thay đổi; khi triển khai cần khóa phiên bản dự án.

- **R1:** [Tu Tiên 2D — trang chủ](https://tutien2d.com/trang-chu): mẫu thị giác chính do chủ dự án chọn.
- **R2:** [Ảnh làng khởi đầu](https://tutien2d.com/landing-assets/maps/tan-vien.webp?v=2d579fa2671e): tham khảo bố cục và môi trường.
- **R3:** [Ảnh cảnh giao chiến](https://tutien2d.com/landing-assets/hero-bg/1.webp?v=07151553e66d): tham khảo tỷ lệ nhân vật và VFX.
- **R4:** [Ảnh boss](https://tutien2d.com/landing-assets/boss/linh-ho.webp?v=2d112ff7e6b9): tham khảo hình dáng và mức chi tiết.
- **R5:** [Universal LPC — tài liệu dự án](https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator): credits, giấy phép và phạm vi animation theo thành phần.
- **R6:** [Phaser — Scale Manager](https://docs.phaser.io/phaser/concepts/scale-manager): phân biệt canvas, vùng chứa và scale.
- **R7:** [OWASP — WebSocket Security](https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html): bảo vệ kết nối và message.
- **R8:** [OWASP — Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html): quyền tối thiểu và kiểm tra quyền.
- **R9:** [Godot — Exporting for the Web](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html): điều kiện xuất web.
- **R10:** [Unity — 2D game development](https://docs.unity.com/en-us/engine/6000.6/manual/unity2d): sprites, tilemaps và physics 2D.

Quyền sử dụng của asset, mã nguồn, font và âm thanh bên thứ ba theo giấy phép tương ứng. Tài liệu này không xác nhận quyền sở hữu độc quyền của mọi thành phần trong một dự án chưa được kiểm kê.

