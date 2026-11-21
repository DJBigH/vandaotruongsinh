# Bộ tranh hai thế giới 1.7.0

Chạy `python art/dual-world-v170/export.py` rồi `python art/dual-world-v170/validate.py` từ gốc repo. Nguồn 192 px được vẽ tiếp từ kho tranh chân dung gốc; sprite giữ khung 64 px. Không lấy sprite 64 px phóng lên làm chân dung.

- 10 địa vực Ma có nền và avatar riêng, mười bia đá đánh dấu địa vực có sprite và avatar. Nhà, cây, linh miếu và sơn môn Ma được vẽ lại chất liệu/màu và có chân dung riêng.
- 12 NPC Ma được vẽ lại y phục, phụ kiện và chân dung; kịch bản đối thoại Ma tách khỏi Tiên.
- 40 mã quái × Tiên/Ma × thường/tinh anh = 160 sheet sáu khung và 160 avatar. Bản tinh anh đã sẵn sàng cho nội dung tiếp theo; quái thường xuất hiện trong game hiện dùng art mới.
- Cổng Tiên/Ma bằng đá phù văn, avatar 192 px và hai sheet niệm phép bốn khung.

Manifest ghi cặp sprite/avatar và vị trí từng tệp. Kiểm tra bắt buộc đếm số lượng, kích thước, alpha và biến thể khác nhau.
