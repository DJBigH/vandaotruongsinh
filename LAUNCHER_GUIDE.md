# HƯỚNG DẪN SỬ DỤNG TRÌNH KHỞI CHẠY DESKTOP (VAN DAO LAUNCHER)

**Dự án:** VẠN ĐẠO TRƯỜNG SINH (萬道長生)  
**Phiên bản Launcher:** 1.0.4 (Windows 10/11 x64)
**Công nghệ:** Electron + React 18 + TypeScript + Vite  

---

## 1. Tổng quan Trình Khởi Chạy

Launcher Desktop được thiết kế riêng cho game ARPG 2D Vạn Đạo Trường Sinh nhằm thay thế tệp lệnh `KHOI_DONG_GAME.bat` bằng giao diện người dùng trực quan, quản lý an toàn vòng đời tiến trình Máy chủ (Server Fastify/WebSocket cổng 3001), Giao diện (Client Vite/React cổng 5173), giám sát Cơ sở dữ liệu (PostgreSQL cổng 5432) và cung cấp tính năng **Xuất nhật ký chẩn đoán chuyên dụng cho AI**.

### Các tệp thực thi sẵn sàng:
1. **`CHAY_LAUNCHER.bat`**: Nhấp đúp chuột ngay tại thư mục gốc để mở launcher.
2. **`desktop-launcher/dist-packaged/VanDaoLauncher.exe`**: Tệp thực thi di động (Portable Standalone ~105MB) không cần cài đặt, có thể copy và chạy độc lập.
3. **`desktop-launcher/dist-packaged/win-unpacked/VanDaoLauncher.exe`**: Bản thực thi giải nén trực tiếp cho tốc độ khởi động tức thì.

---

## 2. Các Chức Năng Chính Trên Giao Diện

### 2.1. Thẻ "Tổng quan" (Overview)
- **Thanh tiêu đề (Header):**
  - Hiển thị thông tin phiên bản game, trạng thái tổng thể.
  - Nút **"Khởi động tất cả"**: Tự động kiểm tra kết nối Database -> Bật Server (cổng 3001) -> Bật Client (cổng 5173) -> (Tự động mở trình duyệt nếu bật cấu hình).
  - Nút **"Dừng tất cả"**: Thu hồi an toàn toàn bộ tiến trình do Launcher quản lý.
  - Nút **"⚔️ VÀO GAME"**: Mở URL `http://127.0.0.1:5173` trong trình duyệt mặc định.
  - Nút **"👑 MỞ ADMIN"**: Mở URL `http://127.0.0.1:5173/admin` để quản lý game.
  - Nút **"🤖 XUẤT LOG CHO AI"**: Mở hộp thoại xuất báo cáo phân tích lỗi.
- **Thẻ Dịch vụ Máy chủ (Server Card):**
  - Giám sát trạng thái: `ĐÃ DỪNG` (Xám), `ĐANG BẬT` (Vàng nhấp nháy), `SẴN SÀNG` (Xanh ngọc), `TIẾN TRÌNH NGOÀI` (Tím), `XUNG ĐỘT CỔNG` (Cam), `SỰ CỐ` (Đỏ).
  - Nút Bật / Tắt / Khởi động lại riêng rẽ.
  - Hiển thị PID hệ thống, thời gian hoạt động (uptime) và thông báo lỗi gần nhất.
- **Thẻ Dịch vụ Giao diện (Client Card):**
  - Giám sát tiến trình Vite frontend.
  - Tắt Client chỉ dừng dịch vụ frontend, không làm ảnh hưởng đến phiên Backend đang chạy.
- **Thanh Giám sát Cơ sở dữ liệu (Database Status Bar):**
  - Tự động thăm dò cổng TCP `127.0.0.1:5432`.
  - Hiển thị trạng thái kết nối PostgreSQL rõ ràng, đi kèm nút "Kiểm tra lại".

---

### 2.2. Thẻ "Cài Đặt Tự Động" (Auto-Setup Wizard)
- **Dành riêng cho người mới clone dự án về máy tính:**
  - Cho phép trỏ hoặc chọn thư mục mã nguồn dự án qua nút **"📂 Chọn Thư Mục..."**.
  - **Tự động quét và phát hiện thành phần còn thiếu:**
    - Kiểm tra Node.js & npm runtime.
    - Kiểm tra cấu hình `server/.env` (tự tạo từ `.env.example` nếu chưa có).
    - Kiểm tra các gói phụ thuộc `node_modules` ở cả 3 phân hệ: `shared/`, `server/`, `client/`.
    - Kiểm tra cổng CSDL PostgreSQL (5432).
  - **Cơ chế cài đặt thông minh:**
    - **Chỉ cài những phần còn thiếu**, không tải lại các thành phần đã có sẵn giúp tiết kiệm thời gian và băng thông mạng.
    - Tùy chọn cài đặt lại từ đầu (Force Clean Install) khi cần làm sạch môi trường.
    - Tự động sinh mã Prisma Client, đồng bộ bảng CSDL (`prisma db push`) và nạp dữ liệu mẫu ban đầu (`seed`) nếu PostgreSQL đang hoạt động.
    - Cửa sổ dòng lệnh trực tiếp (Live Terminal) hiển thị tiến trình npm / prisma thời gian thực, có nút sao chép log và xóa màn hình.
  - Sau khi cài đặt hoàn tất, hiển thị nút **"⚔️ Khởi Động Và Vào Game Ngay!"** để vào game tức thì.

---

### 2.3. Thẻ "Nhật ký" (Logs Live Streaming)
- Tự động bắt toàn bộ luồng xuất chuẩn (`stdout`/`stderr`) từ cả Launcher, Server và Client.
- Bộ đệm vòng tròn (Circular Buffer) lưu 2,000 dòng gần nhất trong bộ nhớ và tự động ghi vào tệp `%APPDATA%/VanDaoTruongSinh/logs/`.
- **Bộ lọc đa chiều:**
  - Lọc theo nguồn: Toàn bộ / Launcher / Server / Client.
  - Lọc theo cấp độ: Toàn bộ / INFO / WARN / ERROR.
  - Ô tìm kiếm từ khóa thời gian thực.
- Tự động cuộn theo dòng log mới nhất (Auto-scroll), nút Sao chép toàn bộ vào Clipboard, Xóa màn hình xem và Mở thư mục chứa file log thật.

---

### 2.3. Thẻ "Chẩn đoán" (Preflight Diagnostics)
Kiểm tra tự động 7 tiêu chí hệ thống:
1. **Node.js & npm Runtime**: Xác minh phiên bản Node/npm đang có trên máy.
2. **Cấu trúc tệp tin dự án**: Kiểm tra sự tồn tại của `server/`, `client/`, `shared/`, `package.json`.
3. **Cơ sở dữ liệu PostgreSQL**: Thăm dò kết nối TCP `127.0.0.1:5432`.
4. **Cổng Máy chủ (3001)**: Kiểm tra tính sẵn sàng của cổng Backend.
5. **Cổng Giao diện (5173)**: Kiểm tra tính sẵn sàng của cổng Frontend.
6. **Quyền ghi nhật ký**: Kiểm tra quyền đọc/ghi trên thư mục `%APPDATA%/VanDaoTruongSinh/logs/`.
7. **Phản hồi API Backend**: Thử nghiệm HTTP GET `/api/game/maps` để đảm bảo API định tuyến chuẩn xác.

---

### 2.4. Thẻ "Cài đặt" (Settings)
- Lưu trữ độc lập tại: `%APPDATA%/VanDaoTruongSinh/launcher-settings.json`.
- Tùy chỉnh cổng: Cổng Server (3001), Cổng Client (5173), Host & Cổng Database (5432).
- Thư mục gốc dự án: Hỗ trợ nút duyệt thư mục trực quan.
- Tùy chọn thu nhỏ xuống Khay hệ thống (System Tray) khi ấn nút X đóng cửa sổ.
- Tự động mở trình duyệt web khi toàn bộ hệ thống sẵn sàng.
- Kích hoạt chế độ Che giấu thông tin nhạy cảm (Secret Redaction).
- Nút "Khôi phục mặc định" đưa cấu hình về trạng thái chuẩn ban đầu.

---

## 3. Tính Năng Chuyên Biệt: Xuất Nhật Ký Cho AI (Export Log for AI)

Khi hệ thống gặp sự cố hoặc cần AI trợ giúp phân tích, người dùng chỉ cần nhấp nút **"🤖 Xuất log cho AI"**. Launcher cung cấp 2 định dạng:

### 3.1. Báo cáo nhanh (.txt) - Khuyên Dùng
- **Tên tệp:** `VanDao_Log_AI_YYYYMMDD_HHMMSS.txt` (Mã hóa UTF-8 chuẩn).
- Tệp văn bản được cấu trúc chặt chẽ thành **6 Phần Bắt Buộc**:
  - **Phần 1: Thông tin báo cáo & Môi trường**: Mã phiên chạy (`run_id`), phiên bản launcher/game, hệ điều hành (Windows 10/11 x64), chế độ vận hành.
  - **Phần 2: Tổng quan trạng thái dịch vụ**: Chi tiết Server, Client, Database (PID, cổng, thời gian hoạt động, lỗi phát sinh).
  - **Phần 3: Tóm tắt hành vi gần nhất**: Lịch sử thao tác người dùng (Bật/tắt dịch vụ, vào game, v.v.).
  - **Phần 4: Danh sách lỗi & Bối cảnh phát sinh**: Thống kê lỗi đầu tiên, lỗi gần nhất và stack trace sự cố.
  - **Phần 5: Toàn bộ nhật ký theo nguồn**: Dữ liệu log đã được làm sạch của Launcher, Server và Client.
  - **Phần 6: Phạm vi dữ liệu & Giới hạn kỹ thuật**: Tuyên bố miễn trừ trách nhiệm bảo mật và giới hạn phạm vi.

### 3.2. Gói chẩn đoán đầy đủ (.zip)
- **Tên tệp:** `VanDao_Diagnostics_YYYYMMDD_HHMMSS.zip`.
- Bên trong chứa:
  - `summary.md`: Tóm tắt báo cáo định dạng Markdown.
  - `manifest.json`: Siêu dữ liệu hệ thống, phiên bản, thời gian tạo.
  - `events.jsonl`: Dữ liệu sự kiện chuẩn hóa từng dòng JSON Lines (dễ dàng phân tích tự động bằng script hoặc LLM).
  - `logs/launcher.log`: Nhật ký tiến trình trình khởi chạy.
  - `logs/server.log`: Nhật ký backend Fastify / WebSocket.
  - `logs/client.log`: Nhật ký frontend Vite / React.

### 3.3. Cơ Chế Bảo Mật & Che Giấu Thông Tin (Secret Redaction)
Cả chế độ xem trực tiếp và khi xuất file đều tự động che giấu thông tin nhạy cảm:
- Mật khẩu PostgreSQL trong chuỗi kết nối: `postgres://postgres:***@localhost:5432/vandaodb`.
- Mã thông báo JWT (JSON Web Tokens): thay thế bằng `***JWT***`.
- Header xác thực Bearer: chuyển thành `Bearer ***`.
- Mật khẩu người dùng: `password="***REDACTED***"`.
- Đường dẫn thư mục cá nhân máy tính Windows: `C:\Users\Username\...` -> `<USER_DIR>\...`.

---

## 4. An Toàn Tiến Trình (Process Safety Guardrails)

- **Nguyên tắc quyền sở hữu:** Launcher chỉ gửi tín hiệu tắt/hủy (`taskkill /pid <PID> /T /F`) tới các tiến trình con do chính Launcher sinh ra (`serverProc`, `clientProc`).
- **Không diệt nhầm tiến trình ngoài:** Tuyệt đối không bao giờ chạy lệnh `killall node` hoặc ép tắt cổng của các ứng dụng khác.
- **Tiến trình chạy ngoài (EXTERNAL_RUNNING):** Nếu người dùng đã tự chạy Server hoặc Client từ terminal ngoài trước đó, Launcher sẽ phát hiện qua thăm dò cổng và hiển thị trạng thái `TIẾN TRÌNH NGOÀI`, khóa nút tắt để tránh xung đột quyền điều khiển.
- **Khóa đơn phiên (Single Instance):** Nếu người dùng mở lại Launcher khi ứng dụng đang chạy, cửa sổ đang mở sẽ tự động khôi phục và đưa lên trước màn hình, không sinh ra nhiều phiên làm việc cùng lúc.
