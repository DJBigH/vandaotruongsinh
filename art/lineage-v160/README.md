# Bộ tranh Tiên/Ma 1.6.0

`export.py` tạo các asset riêng cho hai hệ từ tranh gốc trong `client/public/assets/`. Mỗi NPC, boss, thú, vũ khí, áo bào, giáp, giày, nhẫn, bản đồ và đạo cụ được ghi ID cùng ảnh đại diện trong `manifest.json`. Chạy `python art/lineage-v160/export.py`, rồi `python art/lineage-v160/validate.py` từ gốc repo. Nguồn và ảnh xuất đều nằm trong git để bản game chạy ngay mà không cần dựng ảnh tại máy người chơi.

## Tranh mở đầu

Bốn ảnh trong `source/` được tạo bằng công cụ ImageGen tích hợp, chế độ tạo ảnh mới, theo brief tranh tay cổ phong 16:9, không chữ, chừa khoảng tối cho phụ đề:

- `intro_immortal_birth.png`: Tiên Nhân nâng đứa trẻ trên điện mây, núi và thiên quang ở xa.
- `intro_immortal_arrival.png`: đứa trẻ tới Thanh Khê, mảnh ngọc trong tay và bóng người dẫn đường.
- `intro_demonic_birth.png`: đứa trẻ của Ma Tôn dưới nguyệt thực, điện đá, huyết hỏa và bóng áo choàng.
- `intro_demonic_arrival.png`: Huyền U Khê và U Lâm, đứa trẻ cầm huyết ngọc trước ngã rẽ.

Ảnh nguồn được thu nhỏ bằng Lanczos rồi đóng WebP 1440 × 810, chất lượng 88. Hai bản nhạc WAV là bản tổng hợp mới từ ngũ cung và tiếng gảy dây có envelope ngắn trong `export.py`; không dùng tệp âm thanh bên ngoài. React chỉ phát âm thanh khi trình duyệt cho phép, luôn có nút bật/tắt và bỏ qua.

## Quy tắc bổ sung

Khi thêm sinh vật, NPC, boss, trang bị hoặc địa điểm có tên/bảng tương tác, phải xuất avatar 192 × 192 cùng nhánh Tiên/Ma. Không phóng sprite 64 px để làm chân dung. Tranh nguồn 192 px giữ khuôn mặt và chi tiết vật thể; hoa văn nhận diện hệ được vẽ trên thân, yên hoặc cán vũ khí. Asset không được đổi footprint va chạm.
