# V1.0.3: Hành trình tu đạo

## Mục tiêu

Người chơi mới biết ngay phải làm gì, thấy được lý do đi đến vùng kế tiếp, nhận phần thưởng khám phá có giới hạn, dùng tài nguyên để cường hóa trang bị và thấy tiến độ tu vi. Save 1.0.2 vẫn hoạt động.

## Thiết kế

- Hội thoại dùng ảnh chân dung rõ từ nguồn mỹ thuật gốc của NPC, không lấy một khung sprite 64×64. Chân dung theo vai, có ảnh riêng cho NPC chính ở Thanh Khê và Thanh Vân; đối thoại luôn hiện đúng nhân vật.
- Hướng dẫn lần đầu gồm bốn trang ngắn: di chuyển và tương tác, theo dõi chính tuyến, dùng bản đồ/cổng, trang bị và đột phá. Lưu đã xem theo từng nhân vật tại trình duyệt; có nút mở lại. Hướng dẫn không xuất hiện trước khi thế giới tải xong.
- Bản đồ có trạng thái đã đặt chân tới từng vùng, nhật ký manh mối theo cốt truyện, và thưởng lần đầu mỗi vùng. Cổng vẫn đi được; dịch chuyển từ bảng chỉ tới vùng đã khám phá, tránh bỏ qua hành trình. Dữ liệu khám phá lưu trên máy chủ, cập nhật một lần kể cả khi gọi đồng thời.
- Trang bị có cường hóa chắc chắn +1 đến +5 bằng linh thạch và khoáng. Máy chủ kiểm tra quyền sở hữu, tiền, nguyên liệu; trừ và cộng thuộc tính trong một giao dịch. Trang bị đã cường hóa có bản ghi riêng, không gộp vào stack thường. Tính lại chỉ số chiến đấu ngay khi đang mặc.
- Bảng tu vi hiển thị lượng hiện có, mốc đột phá tiếp theo, vật phẩm cần và các hoạt động có thể làm ngay. Nhật ký nhiệm vụ đặt chính tuyến lên trước, đưa gợi ý vùng/NPC và kết nối với sử ký.

## Kiểm chứng

Viết kiểm thử trước cho quy tắc cường hóa, tích lũy khám phá, đường dịch chuyển và dữ liệu chân dung/hướng dẫn. Chạy build cả client/server, kiểm thử máy chủ với CSDL thử riêng, và thử tương tác qua trình duyệt nếu có khả năng điều khiển trình duyệt.
