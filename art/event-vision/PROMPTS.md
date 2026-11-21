# Prompt set mỹ thuật sự kiện

Chế độ tạo: **built-in ImageGen**, ảnh PNG nguồn trong `source/`. Mọi sprite dùng `transparent_background=true`; ba tranh thẻ dùng cảnh có nền. Ảnh tham chiếu chỉ để giữ phong cách/nhận diện, không phải asset runtime mới.

| Nguồn | Ảnh tham chiếu | Chỉ dẫn chủ thể và bố cục |
| --- | --- | --- |
| `event-boss-avatar.png` | `art/motion-library/source/boss_001-pose-source.png` | Cận đầu/ngực Xích Nha Lang Vương, giữ lông nâu đỏ, bờm trắng, mắt vàng; thêm ngọc Thiên Khế gắn lên giáp đồng, ánh cyan rất ít; nét pixel sắc, mặt rõ ở 96 px, nền alpha, không khung/chữ/sương. |
| `event-boss-actions-v2.png` | `art/motion-library/source/boss_001-pose-source.png` | Atlas 4 cột × 2 hàng, một sói nhất quán: hàng 1 đứng gồng, lấy đà, vồ, trúng đòn; hàng 2 bốn bước chạy. Cùng tỉ lệ và chân neo, không cắt đuôi/chân. Bản đầu dính nền trắng; chỉnh bằng yêu cầu giữ nguyên tám hình và thay toàn bộ nền, đường chia ô bằng alpha thật. |
| `event-boss-phase-death.png` | `source/event-boss-actions-v2.png` | Atlas 4 cột × 2 hàng cùng biến thể sói: hàng trên bốn pha kích hoạt ngọc khế ước, hàng dưới loạng choạng → ngã → nằm yên. Giữ nguyên nhận diện, không biến mất trong hạt sáng, alpha trong suốt. |
| `event-noon-basin.png` | `art/future-library/source/landmarks-02.png` | Bốn khung ngang cùng bồn tụ linh hoa sen bằng ngọc, đĩa mặt trời vàng cũ, nước phản sáng tăng giảm rất nhẹ; ba phần tư nhìn từ trên; chừa viền trong suốt. |
| `event-wolf-standard.png` | `art/future-library/source/landmarks-02.png` | Bốn khung ngang cùng cờ rách móng sói, chuông báo và chân cột đồng/đá, vải dao động nhẹ; không có sói mới hay chữ. |
| `event-night-beacon-v2.png` | `art/future-library/source/landmarks-02.png` | Bốn khung ngang cùng đèn tuần đêm dưới mái tre/đá, giấy trấn yêu trắng, lửa cyan thay nhịp. Bản đầu có bầu trời trắng/vàng bẩn; chỉnh bằng yêu cầu chỉ giữ bốn cấu trúc, xóa toàn bộ trời/halo thành alpha. |
| `card-noon.png` | `source/event-noon-basin.png` | Tranh sự kiện ngang không chữ: sân Thanh Khê giữa trưa, bồn tụ linh giữa cảnh, cây và kiến trúc cổ, yên tĩnh, pixel art rõ. |
| `card-wolf.png` | `source/event-boss-avatar.png` | Tranh ngang không chữ: Xích Nha Lang Vương cùng giáp ngọc Thiên Khế vào bãi rừng lúc hoàng hôn, cờ móng sói bên trái, không thêm sinh vật khác. |
| `card-night.png` | `source/event-night-beacon-v2.png` | Tranh ngang không chữ: đường tre đêm trăng, đèn trấn yêu là điểm sáng, không nhân vật/quái mới; cắt dải đen điện ảnh chỉ ở bước xuất card. |

Chỉ dẫn chung cho sprite: **xianxia 2D pixel art, top-down ba phần tư khoảng 60°, chi tiết vật liệu đá/đồng/ngọc, màu đất trầm, silhouette rõ ở cỡ game, không nhựa bóng, không airbrush mờ, không nền giả hoặc chữ, alpha sạch ngoài vật thể**. Bản vẽ bị loại nằm trong `drafts/` để có thể xem nguyên nhân khi sửa tiếp; `manifest.json` chỉ trỏ tới nguồn được chọn.
