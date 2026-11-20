# Nguồn mỹ thuật 1.0.4

Các tranh thú cưỡi và trang bị được tạo riêng bằng ImageGen, nền trong suốt, chủ đề tu tiên cổ phong, màu rêu/đất/vàng trầm, đường viền và cấu trúc rõ. Ảnh nguồn giữ ở `art/vnext/source/`; ảnh dùng trong game ở `client/public/assets/v104/`.

| Tệp | Mô tả lệnh tạo |
| --- | --- |
| `mount_crane.png` | Linh hạc trắng cổ phong với yên, toàn thân nhìn nghiêng, sprite rõ nét, nền trong suốt. |
| `mount_shadow_wolf.png` | Lang thú U Minh lông đen đỏ trầm với yên cưỡi, toàn thân nhìn nghiêng, nền trong suốt. |
| `equipment_sword.png` | Kiếm tu tiên cổ phong bằng thép sáng và đồng trầm, minh họa vật phẩm tách nền. |
| `equipment_staff.png` | Pháp trượng tu tiên cổ phong bằng gỗ và đồng, minh họa vật phẩm tách nền. |
| `equipment_armor.png` | Bộ giáp tu tiên cổ phong vải và kim loại, minh họa vật phẩm tách nền. |

12 thân phận nhân vật × 4 cấp áo × 8 động tác là biến thể có thể tái tạo từ sprite gốc `client/public/assets/vnext/player*.png` bằng `art/vnext/generate_v104_variants.py`. Tất cả giữ lưới 64×64, bốn hướng, chân tại (32, 56), số khung hình từng động tác và nền alpha; danh mục tệp ở `art/vnext/v104-variant-manifest.json`. Xem `art/vnext/qa/v104-identities.png` để so sánh 12 thân phận.
