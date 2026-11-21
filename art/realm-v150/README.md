# Mỹ thuật cảnh giới 1.5.0

`export.py` vẽ huy hiệu 64×64 và dải hiệu ứng bốn khung 96×96 trên lưới pixel, rồi phát triển chân dung và trang phục cảnh giới từ nguồn đã duyệt ở `vnext` và `v120`. Lệnh `python art/realm-v150/export.py` xuất ảnh vào `sheets/`, `previews/` và `client/public/assets/v150/`. Lệnh `python art/realm-v150/validate.py` kiểm tra 24 huy hiệu, 24 dải hiệu ứng, 144 avatar và 768 sheet đạo thân mới. Bốn bậc đầu của đạo thân ở `v104`, tám bậc tiếp theo ở `v150`.

`manifest.json` ghi đường dẫn, danh tính, bậc, tư thế, số khung và nguồn. `source/palettes-and-motifs.json` ghi tên, bảng màu và nguồn hình. Hai ảnh trong `previews/` cho phép xem liên tục hai nhánh để so diện mạo. Giữ alpha trong suốt, nội suy nearest, neo chân (32, 56) và bốn hàng up/left/down/right. Khi bổ sung nhân vật tương tác, xuất avatar 192×192 cùng lúc với sprite.
