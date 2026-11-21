# Quy ước phiên bản

Game dùng `major.minor.patch`.

- **Patch** (`1.1.0` → `1.1.1`): sửa lỗi, tối ưu, bổ sung asset thay thế mà không đổi luật chơi hoặc dữ liệu lưu.
- **Minor** (`1.0.5` → `1.1.0`): thêm một nhóm tính năng hoặc nâng cấp trải nghiệm lớn; tài khoản và save cũ vẫn dùng được.
- **Major** (`1.x.y` → `2.0.0`): thay đổi thiết kế hoặc định dạng save không tương thích; cần kế hoạch chuyển dữ liệu riêng.

Không tự động nhảy sang `2.0.0` khi số patch tới 9. Script `nextGameVersion(current, kind)` yêu cầu chọn ý nghĩa bản phát hành; mặc định là patch. 1.1.0 là bản nâng menu, GM và hệ mỹ thuật chiến đấu/môi trường.

**1.2.0** là bản minor lớn về trải nghiệm hình ảnh: gắn kho tranh mới vào NPC, thú chưa thu phục, trang bị +0 đến +5, mốc tám vùng, menu, lịch sự kiện, 20 boss, 36 bí kíp, đột phá và biến thể Lang Vương Thiên Khế. Luật chiến đấu và dữ liệu lưu vẫn tương thích.

**1.3.0** mở cường hóa trang bị lên +10 với hình riêng từng cấp và hiệu ứng riêng cho cường hóa, thu phục thú và đột phá. Từ +6 cường hóa có thể thất bại; cấp đồ không giảm. Thu phục thú bảo đảm thành công ở lần thử hợp lệ thứ ba. Không đổi schema hoặc save.

**1.4.0** bổ sung cấp nhân vật theo EXP và yêu cầu đủ cấp, tu vi, linh thạch cùng vật phẩm để đột phá. Linh thạch bị trừ cho mỗi lần thử hợp lệ, kể cả khi thất bại. Có 9 cảnh giới, mỗi cảnh giới 4 tầng; Độ Kiếp Đại Viên Mãn là giới hạn hiện tại. Save cũ được tính lại cấp từ EXP, không đổi schema.
