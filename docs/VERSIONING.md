# Quy ước phiên bản

Game dùng `major.minor.patch`.

- **Patch** (`1.1.0` → `1.1.1`): sửa lỗi, tối ưu, bổ sung asset thay thế mà không đổi luật chơi hoặc dữ liệu lưu.
- **Minor** (`1.0.5` → `1.1.0`): thêm một nhóm tính năng hoặc nâng cấp trải nghiệm lớn; tài khoản và save cũ vẫn dùng được.
- **Major** (`1.x.y` → `2.0.0`): thay đổi thiết kế hoặc định dạng save không tương thích; cần kế hoạch chuyển dữ liệu riêng.

Không tự động nhảy sang `2.0.0` khi số patch tới 9. Script `nextGameVersion(current, kind)` yêu cầu chọn ý nghĩa bản phát hành; mặc định là patch. 1.1.0 là bản nâng menu, GM và hệ mỹ thuật chiến đấu/môi trường.
