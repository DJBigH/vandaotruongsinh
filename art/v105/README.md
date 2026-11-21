# Nguồn asset 1.0.5

`source/` chứa 12 ảnh PNG gốc được tạo cho bản này bằng ImageGen: sáu loài linh thú và sáu họ vũ khí. Hình được yêu cầu theo mỹ thuật pixel cổ phong tu tiên, thân hình có tỷ lệ rõ, viền sắc, màu giới hạn và nền trong suốt. Mỗi ảnh thú có các tư thế bước chân nhìn nghiêng; ảnh vũ khí có hình dạng riêng cho kiếm, thương, trượng, cung, rìu và quyền sáo.

Chạy `python art/v105/build_mount_sheets.py` và `python art/v105/build_weapon_icons.py` từ thư mục gốc để đóng gói thành phẩm tại `client/public/assets/v105/`. Script cắt nền alpha, căn hình vào khung cố định, giới hạn bảng màu và làm biên alpha dứt khoát. Sheet thú có bốn ô `128 × 96`; ô thứ tư quay về tư thế đầu vì tư thế cuối ảnh gốc chạm mép canvas. Ba tư thế khác nhau vẫn tạo vòng chuyển động chân khi cưỡi. Icon vũ khí `64 × 64` giữ nền trong suốt.

Nhân vật cưỡi dùng bộ sprite riêng đã có theo phái, giới tính, tiên/ma và cảnh giới. Trong cảnh game, thân nhân vật được đặt thấp trên lưng thú và lớp yên phía trước che phần chân. Không có một hình nhân vật mới thay thế cho các lựa chọn ngoại hình đó.

Ảnh kiểm tra trong `qa-*.png` ghi lại trạng thái bản đồ, bảng Bí Kíp, Thú Cưỡi, Lò Rèn, đứng yên và di chuyển trên thú ở kích thước cửa sổ `1440 × 900`. Kiểm tra alpha/kích thước tự động: `python scripts/verification/v105-asset-audit.py`.
