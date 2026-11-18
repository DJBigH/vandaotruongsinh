# PROMPT PHÁT TRIỂN VẠN ĐẠO TRƯỜNG SINH — VNEXT

## Tự tạo mỹ thuật nguyên bản, hoàn thiện cảm giác chiến đấu và tăng chiều sâu chơi

Bạn đang tiếp tục phát triển game VẠN ĐẠO TRƯỜNG SINH. Tôi cần một phiên bản mới có chất lượng hình ảnh và trải nghiệm khác rõ bản hiện tại.

Ưu tiên lớn nhất là tự tạo bộ tài nguyên hình ảnh hợp phong cách tu tiên và đưa chúng vào game chạy thật. Nhân vật phải có mặt, cơ thể, trang phục và chuyển động rõ; cảnh quan có bố cục; chiến đấu mượt; người chơi có nhiều mục tiêu đáng theo đuổi.

Đây là yêu cầu thực hiện công việc trong dự án: đọc mã nguồn, thiết kế, tạo tài nguyên, sửa hoặc viết code, tích hợp, chạy thử và bàn giao. Không dừng ở một bản kế hoạch, ảnh concept hoặc báo cáo tính năng.

---

## 1. Yêu cầu đã chốt và phạm vi phiên bản mới

- Game 2D góc nhìn từ trên chếch xuống, chơi trên website.
- Chiến đấu thời gian thực: trực tiếp di chuyển, ngắm, đánh, né và tung kỹ năng.
- Ba hướng tu: Kiếm Tu, Pháp Tu, Thể Tu; ba ô nhân vật độc lập.
- Có tám chương cốt truyện và ba kết cục; cho phép cày tự do trước khi làm truyện và chơi tiếp sau khi kết thúc.
- Server quyết định kết quả chiến đấu, tài sản và tiến trình.
- Không nạp tiền, VIP trả phí, gacha trả phí hoặc quảng cáo bắt buộc để tiến bộ.
- Có admin panel, launcher Windows giao diện đồ họa và chức năng xuất log dễ gửi cho AI đọc.
- Giữ các chức năng và dữ liệu đang hoạt động, nâng cấp có kiểm chứng.

Đọc GDD 2.0 và các hướng dẫn dự án nếu có. Yêu cầu mới ở đây ưu tiên việc tự tạo mỹ thuật lõi và nâng chất lượng chơi; những quyết định đã chốt trong GDD vẫn áp dụng nếu không mâu thuẫn.

Trước khi sửa, kiểm tra repository thực tế, cấu hình chạy, asset, schema, lưu game và kết nối mạng. Phân biệt rõ: đã xác minh trong mã nguồn; có mô tả nhưng chưa kiểm chứng; mới nằm trong kế hoạch.

Chuyện chuyển Godot từng được thảo luận, chưa có nghĩa đã chốt đổi engine. Làm theo quyết định engine thực sự của dự án. Nếu chưa có quyết định mới, tiếp tục trên nền tảng hiện tại; chỉ đề xuất chuyển khi có lý do cụ thể và phương án bảo toàn dữ liệu. Không tự viết lại cả backend vì đổi phần hiển thị.

Làm trong nhánh hoặc bản sao làm việc phù hợp. Không xóa dự án cũ, save hay dữ liệu thật để có một bản chạy sạch dễ báo cáo.

---

## 2. Định hướng mỹ thuật phải theo

### 2.1. Mẫu cảm giác hình ảnh

Tham khảo https://tutien2d.com/trang-chu về hình ảnh bên trong game: nhân vật tu tiên toàn thân, đạo bào, vũ khí, môi trường có chiều sâu và chiêu thức đọc được khi chiến đấu.

Ninja School và Ngọc Rồng Online là tham khảo phụ về độ rõ của nhân vật và cảm giác một game 2D có chuyển động. Giữ góc nhìn top-down đã chốt; không tự chuyển thành game đi cảnh ngang.

Tạo thế giới và hình ảnh riêng cho Vạn Đạo Trường Sinh. Không lấy sprite, map, logo, mã nguồn hoặc giao diện của game tham khảo để ghép vào dự án.

Nếu không truy cập được nguồn tham khảo, nói rõ; dùng các ảnh đã được cung cấp và tiêu chí dưới đây. Không nói đã xem khi chưa xem.

### 2.2. Phong cách đề xuất để triển khai

Pixel art tu tiên có chi tiết và sắc độ, nhân vật toàn thân rõ hình dáng, màu dịu, ánh sáng nhất quán. Tránh vẻ nhựa bóng, hình hộp sơ sài hoặc chibi đầu quá lớn không giống mẫu.

Định hướng màu:

- Cỏ và cây: xanh rêu, xanh ngọc trầm; không xanh neon hoặc sọc vàng chói.
- Đất, đá, gỗ: nâu đất, xám ấm, có biến thể nhẹ.
- Công trình: gỗ, ngói, đá, giấy, vải mang cảm giác cổ phong.
- Y phục: xanh lam/ngọc, trắng ngà, đỏ trầm; vàng dùng làm điểm nhấn.
- VFX: màu có ý nghĩa theo hệ, đủ nổi trên nền nhưng không phủ kín nhân vật.

Bảng màu là định hướng mỹ thuật, không yêu cầu mọi bản đồ phải giống nhau. Rừng, hang động, tông môn và vùng băng cần bản sắc riêng nhưng vẫn cùng một thế giới.

### 2.3. Tạo quy chuẩn mỹ thuật ngắn

Trước khi sản xuất hàng loạt, lập ART_DIRECTION.md ghi:

- Góc nhìn, tỷ lệ đầu–thân, kích thước hữu ích của nhân vật trong màn chơi.
- Mật độ pixel, độ dày nét, bảng màu, hướng sáng, bóng chân.
- Kích thước frame, điểm neo, quy tắc layer và cách scale.
- Mức chi tiết của nhân vật, công trình, quái, icon và hiệu ứng.
- Ví dụ đạt/chưa đạt bằng ảnh thực tế của tài nguyên đang làm.

Không dùng những từ như “tinh xảo”, “sống động”, “chuẩn game thương mại” để thay cho hình ảnh chứng minh.

---

## 3. Tự tạo tài nguyên hình ảnh lõi

### 3.1. Những gì phải tự thiết kế và tạo

- Nhân vật ba hướng tu, các phần trang phục/vũ khí cần dùng.
- NPC chính với diện mạo phân biệt được.
- Quái thường, quái tinh anh và boss có nhận diện riêng.
- Địa hình, cây, đá, nhà, cổng, cầu, vật trang trí, tài nguyên thu thập.
- Icon vật phẩm và kỹ năng quan trọng, rương và đồ rơi.
- Hiệu ứng đánh thường, kỹ năng, báo đòn, trúng đòn và trạng thái.
- Các thành phần nhận diện của HUD và icon launcher.

Không dùng lại một bộ sprite tải sẵn làm hình ảnh chính rồi đổi màu và gọi là asset tự tạo. Không lấy nhiều gói khác phong cách để tăng số lượng.

Font, âm thanh hoặc công cụ hỗ trợ có thể dùng nguồn miễn phí phù hợp và ghi nguồn. Không phát sinh mua hàng/thuê bao. Danh mục xuất xứ phải nói đúng phần tự tạo, phần chỉnh sửa và phần dùng từ bên ngoài.

### 3.2. Cách tạo và kiểm tra

Nếu có công cụ tạo ảnh, dùng nó để tạo thiết kế và tài nguyên nguồn có kiểm soát. Giữ mẫu nhân vật đã chọn làm tham chiếu khi tạo các hướng và tư thế tiếp theo.

Ảnh AI sinh ra chưa tự trở thành sprite sheet hoàn chỉnh. Phải xử lý nền, căn khung, sửa lỗi tay/chân, kiểm tra sự nhất quán và chạy thử animation trong engine.

Có thể tự vẽ raster, vector rồi xuất raster, hoặc dùng mã tạo texture/hình ảnh nguyên bản. Dù dùng công cụ nào, kết quả vẫn phải đạt tiêu chuẩn thị giác. Một script vẽ vài hình chữ nhật và ellipse không được coi là nhân vật hoàn thiện.

Nếu không có công cụ phù hợp để đạt yêu cầu, báo rõ phần thiếu và tiếp tục những việc không bị chặn. Không giả vờ đã gọi công cụ, không gọi placeholder là asset cuối.

### 3.3. Yêu cầu kỹ thuật của asset

- Nền trong suốt thực bằng alpha khi cần; không có nền bàn cờ hoặc viền nền bị đóng vào ảnh.
- Frame không cắt đầu, chân, tà áo hoặc vũ khí trong các tư thế cần dùng.
- Điểm neo chân ổn định giữa frame và giữa hướng.
- Có khoảng đệm atlas phù hợp; không bị lẫn màu từ frame bên cạnh.
- File, key và metadata có tên ổn định; import không phụ thuộc đường dẫn ngoài máy khác.
- Tài nguyên nguồn, bản xuất và metadata liên kết được với nhau.
- Có manifest ghi loại asset, nguồn/công cụ tạo, kích thước, hướng, animation và nơi sử dụng.
- Phong cách pixel được kiểm tra ở kích thước gameplay; không chỉ xem ảnh phóng lớn.

Hình học đơn giản vẫn được dùng cho hitbox debug, thanh trạng thái hoặc vùng báo đòn khi phù hợp. Điều không được chấp nhận là dùng hình học thô thay cho mỹ thuật nhân vật và cảnh quan cuối cùng.

---

## 4. Nhân vật, animation và cảm giác đánh

### 4.1. Nhân vật

Nhân vật phải nhìn thấy rõ tóc, vùng mặt và mắt ở góc phù hợp; có cổ áo, vai, tay, thân, đai lưng, tà áo, chân/giày và vũ khí.

Không coi việc nhân vật quay lưng không thấy mặt là lỗi. Phải phân biệt quay lưng đúng với mất layer mặt hoặc cắt sai frame.

Kiếm Tu, Pháp Tu, Thể Tu khác nhau về hình dáng, tư thế và vũ khí; không chỉ thay màu áo. Trưởng lão, dược sĩ và vệ binh cũng có diện mạo hợp vai trò.

Kiểm tra nhân vật khi tắt aura. Nhãn tên không che mặt; hiệu ứng không che lỗi hình thể.

### 4.2. Animation

Bắt đầu bằng bốn hướng hoàn chỉnh cho nhân vật chính; di chuyển tám hướng vẫn giữ được. Chỉ mở rộng tám hướng hình ảnh khi có đủ tài nguyên nhất quán.

Phải có:

- Idle: đứng có nhịp tự nhiên.
- Walk/run: chân bước, tay và áo chuyển động hợp lý.
- Attack: chuẩn bị, ra đòn, hồi phục có thể nhận biết.
- Cast: động tác thi triển và thời điểm phát chiêu rõ.
- Dodge: tư thế/hướng lướt rõ, bóng dư vừa đủ.
- Hurt: phản ứng trúng đòn có kiểm soát.
- Death/respawn: kết thúc và hồi sinh sạch trạng thái.

Không thay động tác bằng rung, kéo giãn hoặc nhấp nháy cả nhân vật. Không tự đổi mặt, chiều dài kiếm, tỷ lệ người hoặc vị trí chân giữa các frame.

Kiểm tra chuỗi: đi → đánh → né → thi triển → đi; bị ngắt giữa chiêu; quay hướng; chết; hồi sinh; đổi bản đồ. Không restart animation mỗi frame hoặc chờ callback hình ảnh vô hạn khiến nhân vật kẹt.

### 4.3. Cảm giác chiến đấu

- Phản hồi input rõ và nhanh; phân biệt trễ mạng với thời gian chuẩn bị có chủ ý.
- Kiếm có quỹ đạo, pháp thuật có đường bay, Thể Tu có lực áp sát.
- Có âm thanh, phản ứng mục tiêu và hiệu ứng trúng đòn phù hợp.
- Camera shake và hiệu ứng mạnh có tùy chọn giảm/tắt.
- VFX phải khớp thời điểm và vùng gây sát thương do server xác nhận.
- Cảm giác giật ngắn khi trúng đòn nếu dùng chỉ là trình diễn; không tự đóng băng đồng hồ chiến đấu trên server.
- Quái và boss có thời gian chuẩn bị, ra đòn và hồi phục để người chơi đọc được.
- Vùng nguy hiểm phân biệt bằng hình dạng/tiến độ, không chỉ bằng màu đỏ.

Giữ quy tắc chiến đấu và thông số nhất quán với cấu hình đã chốt. Không đổi damage, cooldown, tốc độ hoặc i-frame tùy tiện để animation trông hợp.

---

## 5. Làm lại môi trường theo bố cục có chủ đích

Thanh Khê cần giống một nơi có người sinh sống:

- Khu trung tâm có điểm nhấn và NPC chính.
- Nhà/công trình có tỷ lệ hợp nhân vật.
- Đường nối các dịch vụ và lối ra rừng rõ.
- Cây, đá, cỏ, nước, cầu, hàng rào hoặc bậc thềm đặt thành cụm.
- Có góc khám phá hoặc dấu hiệu dẫn tới nội dung phụ.
- Có khoảng thở để nhìn và di chuyển, không trang trí kín mọi ô.

Không lặp một viên gạch khắp màn hình rồi gọi là quảng trường. Không dùng cỏ sọc, noise dày, ô đen hoặc các tài nguyên lệch góc nhìn để lấp chỗ trống.

Đất–cỏ–đá–nước có mép và chuyển tiếp; biến thể có quy luật. Ánh sáng và bóng nhất quán. Phần nền dịu hơn nhân vật và tín hiệu chiến đấu.

Va chạm theo phần vật thể thực sự cản đường. Tán cây, tà áo, bóng và aura không được tự trở thành bức tường. Thứ tự vẽ dựa trên vị trí chân và lớp cảnh; không để cây/nhà che mất người chơi mà không có cách đọc vị trí.

Điểm spawn, cổng, bậc thềm và lối hẹp phải thử đi thật. Hình ảnh cho thấy đường đi được thì va chạm phải phù hợp.

---

## 6. “Nhiều việc để làm” phải thành vòng chơi thật

Người chơi cần trả lời được ba câu: Tôi đang theo mục tiêu gì? Tôi còn có thể làm gì? Muốn món đồ/kỹ năng này thì kiếm ở đâu?

Triển khai các hoạt động dưới đây bằng hành động thật, dùng chung hệ thống chiến đấu, nhiệm vụ và tài sản. Mỗi hoạt động cần điều kiện mở, cách tham gia, cách kết thúc, phần thưởng và tiến trình có lưu.

| Hoạt động | Trải nghiệm cần có | Giá trị lâu dài |
|---|---|---|
| Cốt truyện | Hội thoại, khám phá, lựa chọn và boss theo chương | Mở vùng, cơ chế và các điều kiện kết cục |
| Khám phá bí mật | Dấu vết trong cảnh, đường phụ, rương ẩn, câu đố ngắn | Công thức, truyền thừa, đường tắt, sổ khám phá |
| Bí cảnh | Chuỗi phòng hoặc khu chiến đấu có tinh anh, hiểm họa và boss | Vật liệu và trang bị; độ khó cao đổi cách đánh |
| Săn boss | Tìm manh mối/điều kiện gặp, học đòn và đối phó cơ chế | Nguyên liệu đặc trưng, đồ mục tiêu, dấu mốc chinh phục |
| Nhiệm vụ phụ | Tình huống riêng của NPC, hỗ trợ hoặc quyết định có hệ quả | Thay đổi nhỏ trong thế giới, công thức và câu chuyện |
| Ủy thác/truy nã | Chọn hợp đồng săn mục tiêu, xử lý ổ quái, bảo vệ hoặc thu hồi | Danh vọng và phần thưởng phù hợp build đang theo |
| Thu thập/luyện chế | Chọn món muốn làm, xem nguồn nguyên liệu, thu thập rồi chế tạo | Chủ động chuẩn bị và hoàn thiện bộ trang bị |
| Thử luyện/hậu truyện | Thử kỹ năng, chuỗi thử thách, boss tái đấu hoặc biến thể bí cảnh | Hoàn thiện build, sưu tầm và thử thách tiếp sau cốt truyện |

Tông môn, động phủ, linh điền và linh thú phải liên kết với những vòng chơi này: cung cấp công thức, nguyên liệu, hỗ trợ hoặc mục tiêu mở khóa. Không làm thành các bảng bấm nhận thưởng rời rạc.

Ví dụ boss cần khác cách đối phó:

- Lang Vương ép đọc hướng lao và xử lý đàn sói.
- Cổ Thụ Yêu tạo vùng rễ cản đường và điểm cần phá.
- Kiếm Linh có nhịp phản đòn hoặc khe hở sau chuỗi kiếm.
Các cơ chế này là đề xuất thiết kế, phải phù hợp dữ liệu và thử nghiệm thực tế.

Boss phụ và đồ mục tiêu có con đường tiến dần như gom mảnh/đổi vật liệu, tránh phụ thuộc hoàn toàn vào tỷ lệ rơi cực thấp. Vật phẩm bắt buộc của truyện có cách lấy bảo đảm.

Mở hoạt động dần, tránh dồn hàng chục menu vào đầu game. Không dùng điểm danh bắt buộc, chuỗi đăng nhập mất thưởng, giờ online cứng hoặc auto-play thay toàn bộ chiến đấu để giả lập chiều sâu.

Không tự thêm PvP, chợ người chơi hoặc MMO quy mô lớn chỉ để tăng danh sách tính năng.

---

## 7. Tiến trình và nội dung đầy đủ

Giữ câu chuyện Thiên Khế, sự đánh đổi ký ức/nhân tính và khả năng lựa chọn. Cả ba hướng tu đều đi hết truyện; Pháp Tu/Thể Tu không bị ép sử dụng kiếm để nhận thưởng chính.

Hết truyện vẫn chơi tiếp được. Kết cục Luân Hồi mang ý nghĩa trong truyện không được âm thầm xóa tu vi, trang bị hoặc save. Thưởng kết cục và boss không nhận lặp do tải lại hoặc reconnect.

Mục tiêu nội dung đầy đủ từ GDD:

- 3 hướng tu, 3 ô nhân vật.
- 8 chương, 3 kết cục.
- 36 kỹ năng, 12 mỗi hướng; bốn ô kỹ năng chủ động đang trang bị.
- 8 boss chương và mục tiêu 8 boss tùy chọn.
- 150 mẫu vật phẩm.
- 56 nhiệm vụ có nội dung, gồm 40 chính và 16 phụ.
- Tông môn, động phủ, linh điền, mục tiêu 6 linh thú và tu luyện vắng mặt theo cấu hình.

Các số trên là mục tiêu sản xuất, không phải tuyên bố hiện đã có. Tách trạng thái: thiết kế → có dữ liệu → tích hợp → đã kiểm chứng.

Không tính đổi màu thành một boss mới, bản sao item thành mẫu mới hoặc một nút menu trống thành tính năng hoàn chỉnh. Một nhiệm vụ phải nhận, làm, nhận thưởng và tải lại đúng; một skill phải có hành vi, cost, cooldown, animation/VFX và va chạm đúng.

Có thể chia thành nhiều đợt triển khai. Không giảm chất lượng để đạt số lượng và không gọi bản mẫu đầu tiên là toàn bộ phiên bản đã hoàn tất.

---

## 8. Sửa độ mượt, kẹt và giao diện

Tái hiện và phân loại lỗi trước khi sửa:

- FPS thấp hoặc khựng khung hình.
- Animation sai nhịp.
- Input bị UI/focus giữ.
- Va chạm hoặc điểm spawn sai.
- Client và server khác vị trí/phiên bản map.
- Server xử lý tick chậm.
- Mạng trễ, jitter hoặc reconnect.

Không gộp tất cả thành “lag”. Dùng số đo và log để tìm nguyên nhân; không tắt collision hoặc kiểm tra server để làm game có vẻ mượt.

Client có thể dự đoán/nội suy, nhưng server vẫn kiểm soát vị trí hợp lệ, cost, cooldown, i-frame, damage, loot và tiến trình. Dự đoán không được cấp thêm tốc độ hoặc quyền nhận thưởng.

Nếu giữ server 20 Hz, dựng hình vẫn phải cập nhật độc lập, không để mọi chuyển động trên màn hình chỉ nhảy theo từng gói mạng.

Canvas phủ vùng chơi phù hợp; camera, map bounds, zoom và tọa độ chuột khớp sau resize. Không kéo giãn hình hoặc zoom quá lớn để giấu khoảng trống.

HUD phải dùng được ở 1366×768 và 1920×1080:

- Menu mở không che thanh kỹ năng.
- Nhãn NPC không che mặt.
- Thông tin HP/MP/cooldown rõ.
- Có thể thu gọn nhiệm vụ/menu phụ.
- UI nhận click không kích hoạt đánh xuyên.
- Tiếng Việt và font hiển thị đúng.

Đặt ngưỡng hiệu năng trên máy/cảnh thử ghi rõ. Có thể dùng baseline GDD: mục tiêu 60 FPS, trung bình ít nhất 55 FPS và p95 frametime không quá 25 ms trong cảnh thông thường sau tải ban đầu. Đây là mục tiêu kiểm thử, không phải cam kết mọi máy.

Đo cảnh có người chơi, 10 quái hoạt động, một boss và kỹ năng; thêm cảnh tải cao để biết giới hạn. Ghi cấu hình, trình duyệt, độ phân giải, số lượng và số đo. Chưa đạt thì ghi CHƯA ĐẠT và tiếp tục xử lý.

Chơi thử ít nhất 10 phút với đánh–né–cast, đi chéo sát góc, đổi focus, menu, cổng, chết/hồi sinh và khu từng kẹt. Ảnh tĩnh không chứng minh hết giật hay animation đã đúng.

---

## 9. Giữ khả năng vận hành và dữ liệu an toàn

- Giữ tài khoản, ba nhân vật và tiến trình đã xác nhận.
- Thay schema cần backup, migration và thử phục hồi.
- Nhận thưởng/craft/đột phá phải xử lý nguyên tử; retry cùng một sự kiện không cấp lại.
- Admin kiểm quyền ở server, có lý do và lịch sử thao tác; không chỉ ẩn nút ở client.
- Giữ hoặc hoàn thiện launcher GUI: Start/Stop/Restart server và client, trạng thái sẵn sàng, mở game/admin và xem log.
- Launcher chỉ điều khiển đúng tiến trình của nó; game web vẫn mở trong trình duyệt.
- Icon launcher phải theo bộ nhận diện tu tiên mới.
- Xuất TXT/ZIP UTF-8: tóm tắt môi trường/build, lỗi, bước tái hiện, log launcher/server/client đã được thu nhận và số đo nếu có.
- Che token, cookie, mật khẩu và dữ liệu nhạy cảm khi xuất.
- Kiểm tra lỗi chữ tiếng Việt trong UI, tên cửa sổ, launcher, JSON và log.

Không bỏ admin, launcher hoặc lưu game để chỉ bàn giao một màn chơi đẹp.

---

## 10. Thứ tự thực hiện

### M0 — Kiểm kê và dựng lại hiện trạng

Đọc repo, chạy bản hiện tại, xác minh engine và chức năng, chụp baseline, tái hiện lỗi. Ghi những gì tái sử dụng được và những gì cần làm lại. Không coi báo cáo cũ là bằng chứng kiểm thử.

### M1 — Khu vực mẫu hoàn chỉnh về trải nghiệm

Tự tạo và tích hợp:

- Một Kiếm Tu có đủ animation cơ bản.
- Một khu Thanh Khê liên kết khu rừng.
- Ba NPC có vai trò.
- Ít nhất hai kiểu quái và một boss có cơ chế.
- Đánh thường, né và bốn kỹ năng.
- Một tuyến nhiệm vụ ngắn, một chỗ khám phá, một phần thưởng làm thay đổi trang bị/build.
- Lưu/tải, camera, HUD và va chạm hoạt động.

Cho xem nhân vật tắt aura, nhân vật trong map, toàn cảnh và video chạy thật. Tự sửa lỗi hình thể/phong cách trước khi nhân rộng. Có thể đưa hai biến thể ở cùng một cảnh nếu còn cần chọn hướng mỹ thuật; không sản xuất hàng trăm asset theo một mẫu chưa được kiểm chứng.

Không hỏi xác nhận từng tệp hoặc từng thao tác. Tự xử lý quyết định thường lệ theo yêu cầu này. Nếu thật sự cần ý kiến về thẩm mỹ, đưa mẫu cụ thể và gom câu hỏi ở mốc này; các phần độc lập vẫn tiếp tục.

### M2 — Mở rộng vòng chơi

Hoàn thiện ba hướng tu và thêm các vòng chơi ở mục 6 theo thứ tự có thể chơi được. Mỗi đợt phải có mục tiêu, phần thưởng và tiến trình lưu; kiểm tra lại phong cách và hiệu năng khi thêm nội dung.

### M3 — Hoàn thành phạm vi phiên bản mới

Mở rộng tới các chương, kết cục, boss, vật phẩm và hệ thống đã chốt. Kiểm kê theo nội dung đã tích hợp thực tế, giữ rõ phần chưa đạt.

### M4 — Ổn định và bàn giao

Kiểm tra gameplay, lưu/tải, reconnect, quyền admin, launcher, log, hiệu năng và bản đóng gói/web. Bàn giao cách chạy và danh sách giới hạn còn lại.

Nếu giới hạn một phiên làm việc, lưu checkpoint với file đã sửa, lệnh đã chạy, kết quả thật, lỗi còn lại và bước tiếp theo. Không rút gọn phạm vi rồi tuyên bố hoàn thành toàn bộ.

---

## 11. Bằng chứng bắt buộc khi báo cáo

Mỗi mốc báo cáo các bằng chứng phù hợp dưới đây. Mục chưa phát sinh ghi rõ không áp dụng; không dựng kết quả để đủ checklist. Riêng M0 tập trung vào baseline và hiện trạng, chưa yêu cầu có asset mới hoặc lỗi đã sửa.

1. Danh sách thay đổi và file liên quan.
2. Asset nguồn/bản xuất/metadata đã tạo thật.
3. Ảnh chụp game đang chạy ở kích thước chơi thực.
4. Bằng chứng chuyển động: video 60–90 giây hoặc hình thức ghi lại tương đương nếu công cụ có. Với nhân vật đã làm, thể hiện bốn hướng và chuỗi đi → đánh → né → thi triển, trúng đòn, chết/hồi sinh; có đoạn tắt aura. Cảnh đứng hoặc chạy đơn thuần không chứng minh toàn bộ animation.
5. Kết quả kiểm tra các luồng chính và số đo hiệu năng trong môi trường được nêu.
6. Lỗi đã tái hiện, nguyên nhân đã xác minh, cách sửa và kết quả thử lại.
7. Nội dung chưa làm, chưa chạy được hoặc chưa đạt.

Ảnh concept, sprite sheet đứng riêng và ảnh tham khảo không được dùng thay ảnh sản phẩm đã tích hợp. Build thành công không chứng minh game đẹp, mượt hoặc hết kẹt.

Không ghi 100%, hoàn hảo, hết mọi lỗi hoặc số lượng nội dung đã hoàn thành khi chưa có bằng chứng. Không có công cụ để kiểm tra thì nói đúng hạn chế, không bịa kết quả.

---

## 12. Bắt đầu thực hiện ngay

Hãy bắt đầu M0, tạo quy chuẩn mỹ thuật và sản xuất tài nguyên cho M1. Tiếp tục tới phần chơi thực tế trong khả năng môi trường; đừng chỉ trả lại kế hoạch.

Ưu tiên công việc theo thứ tự:

1. Nhân vật và môi trường hợp mắt.
2. Animation, điều khiển và va chạm đúng.
3. Chiến đấu có phản hồi, boss có cơ chế.
4. Vòng chơi và phần thưởng có ý nghĩa.
5. Mở rộng nội dung, tối ưu và hoàn thiện công cụ vận hành.

Tôi đánh giá kết quả bằng những gì nhìn thấy và chơi được trong bản game, cùng tài nguyên và bằng chứng được bàn giao.
