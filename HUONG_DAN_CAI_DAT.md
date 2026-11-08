# HƯỚNG DẪN CÀI ĐẶT VÀ VẬN HÀNH DỰ ÁN VẠN ĐẠO TRƯỜNG SINH (萬道長生)

> **Tác giả:** BigK  
> **Repository:** [https://github.com/DJBigH/tutien_game.git](https://github.com/DJBigH/tutien_game.git)  
> **Thể loại:** Game Tu Tiên ARPG 2D Đồ Họa Cổ Phong — Chiến Đấu Thời Gian Thực Chơi Trực Tiếp Trên Web  
> **Phiên bản:** 1.0.0  

---

## 1. Yêu Cầu Môi Trường Tiên Quyết (Prerequisites)

Trước khi bắt đầu, hãy đảm bảo máy tính của bạn đã cài đặt các công cụ sau:

1. **Git:** [https://git-scm.com/](https://git-scm.com/) (Phiên bản mới nhất).
2. **Node.js & npm:** [https://nodejs.org/](https://nodejs.org/) (Khuyến nghị **Node.js v20.x LTS** hoặc **v22.x LTS**).
3. **PostgreSQL:** PostgreSQL 16 (Hỗ trợ 1 trong 3 cách: Docker Compose, WSL Ubuntu, hoặc PostgreSQL cài trực tiếp trên Windows).

---

## 2. Các Bước Cài Đặt Từ Đầu (Step-by-Step Setup)

### Bước 1: Sao chép mã nguồn (Clone Repository)

Mở terminal (PowerShell, Command Prompt hoặc Git Bash) và chạy lệnh:

```bash
git clone https://github.com/DJBigH/tutien_game.git
cd tutien_game
```

---

### Bước 2: Cài đặt thư viện phụ thuộc (Install Dependencies)

Dự án gồm có 3 phân hệ chính: Backend (`server`), Frontend (`client`), và Trình khởi chạy Desktop (`desktop-launcher`). Bạn có thể cài đặt tự động bằng các lệnh sau:

```bash
# 1. Cài đặt thư viện gốc (Root)
npm install

# 2. Cài đặt thư viện Backend
cd server
npm install
cd ..

# 3. Cài đặt thư viện Frontend Web
cd client
npm install
cd ..

# 4. Cài đặt thư viện Desktop Launcher (Tùy chọn nếu dùng Desktop Launcher)
cd desktop-launcher
npm install
cd ..
```

---

### Bước 3: Cấu hình biến môi trường (Environment Configuration)

Tạo tệp cấu hình `.env` cho máy chủ backend từ tệp mẫu có sẵn:

```bash
# Trên Windows PowerShell:
Copy-Item .env.example server/.env

# Hoặc trên Linux / macOS / Git Bash:
cp .env.example server/.env
```

**Nội dung chuẩn của `server/.env`:**
```env
# Database PostgreSQL
DB_NAME=vandao
DB_USER=vandao_user
DB_PASSWORD=vandao_dev_password
DB_HOST=127.0.0.1
DB_PORT=5432
DATABASE_URL=postgresql://vandao_user:vandao_dev_password@127.0.0.1:5432/vandao

# JWT Secret
JWT_SECRET=dev_secret_key_change_in_production_abc123xyz789
JWT_EXPIRES_IN=7d

# Server
SERVER_PORT=3001
SERVER_HOST=0.0.0.0
NODE_ENV=development

# Client
VITE_API_URL=http://localhost:3001
```

---

### Bước 4: Khởi động Cơ sở dữ liệu PostgreSQL

Bạn có thể chọn **1 trong 3 cách** sau:

#### Cách A: Sử dụng Docker Compose (Khuyên dùng)
Nếu máy bạn đã cài Docker Desktop:
```bash
docker compose up -d
```
Lệnh trên sẽ tự động khởi tạo cơ sở dữ liệu `vandao` với tài khoản `vandao_user` và mật khẩu `vandao_dev_password` trên cổng `5432`.

#### Cách B: Sử dụng WSL (Ubuntu trên Windows)
Nếu bạn đang dùng PostgreSQL trong WSL:
```bash
wsl -u postgres psql -c "CREATE USER vandao_user WITH PASSWORD 'vandao_dev_password';"
wsl -u postgres psql -c "CREATE DATABASE vandao OWNER vandao_user;"
wsl -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE vandao TO vandao_user;"
```

#### Cách C: PostgreSQL cài trực tiếp trên Windows
Mở công cụ `psql` hoặc `pgAdmin 4` và thực thi:
```sql
CREATE USER vandao_user WITH PASSWORD 'vandao_dev_password';
CREATE DATABASE vandao OWNER vandao_user;
GRANT ALL PRIVILEGES ON DATABASE vandao TO vandao_user;
```

---

### Bước 5: Khởi tạo Schema & Nạp Dữ Liệu Ban Đầu (Seed Data)

Di chuyển vào thư mục `server` để đồng bộ cơ sở dữ liệu và nạp toàn bộ 150 vật phẩm, 36 kỹ năng, 40 quái vật, 20 boss, và 56 nhiệm vụ:

```bash
cd server

# Đồng bộ Prisma schema vào PostgreSQL
npx prisma db push

# Nạp dữ liệu mẫu ban đầu (150 Items, 36 Skills, 20 Bosses, Story...)
npm run seed

cd ..
```

*(Tùy chọn)* Nếu muốn tạo tài khoản Admin/Owner riêng:
```bash
cd server
npm run create-admin
cd ..
```
*(Hoặc sử dụng tài khoản Admin mẫu sẵn có từ seed: Tài khoản: `daochu` | Mật khẩu: `Admin@123456`).*

---

## 3. Khởi Chạy Game

Bạn có thể lựa chọn 1 trong 3 phương thức khởi chạy thuận tiện:

### Cách 1: Sử dụng Desktop Launcher GUI (Khuyên dùng trên Windows)
- **Nhấp đúp chuột vào tệp `CHAY_LAUNCHER.bat`** tại thư mục gốc.
- Giao diện đồ họa sẽ mở lên:
  - Nhấn nút **"Khởi động tất cả"** trên thẻ Tổng quan.
  - Khi Server và Client hiển thị màu xanh ngọc `SẴN SÀNG`, nhấn **"⚔️ VÀO GAME"** (tự động mở trình duyệt tại `http://localhost:5173`).
  - Để vào trang quản trị, nhấn **"👑 MỞ ADMIN"** (`http://localhost:5173/admin`).
  - Nếu gặp bất kỳ sự cố nào, nhấn **"🤖 XUẤT LOG CHO AI"** để xuất file báo cáo gửi AI xử lý.

### Cách 2: Sử dụng Script Khởi Động Tự Động
Chạy tệp lệnh:
```bash
# Windows
.\KHOI_DONG_GAME.bat

# Hoặc qua lệnh npm:
npm start
```

### Cách 3: Khởi chạy thủ công từng dịch vụ (Dành cho Developer)

**Terminal 1 (Backend Fastify + WebSocket):**
```bash
cd server
npm run dev
# Máy chủ sẽ chạy tại http://localhost:3001
```

**Terminal 2 (Frontend Client React + Phaser 3):**
```bash
cd client
npm run dev
# Giao diện web sẽ chạy tại http://localhost:5173
```

Mở trình duyệt truy cập: **`http://localhost:5173`**

---

## 4. Hướng Dẫn Điều Khiển & Phím Tắt ARPG Thời Gian Thực

Game áp dụng cơ chế **ARPG 2D Top-Down thời gian thực**:

| Thao tác | Phím tắt / Điều khiển | Mô tả chi tiết |
| :--- | :--- | :--- |
| **Di chuyển** | `W`, `A`, `S`, `D` hoặc Phím Mũi Tên | Di chuyển nhân vật tự do 8 hướng |
| **Ngắm & Định hướng** | Con trỏ chuột | Xoay hướng mặt và hướng tấn công của nhân vật |
| **Đánh thường** | `Chuột Trái` | Tung đòn đánh thường theo hướng trỏ chuột |
| **Kỹ năng chủ động** | Phím `1`, `2`, `3`, `4` | Kích hoạt 4 kỹ năng đang trang bị |
| **Lướt né (Dash)** | Phím `Space` (Phím Cách) | Lướt nhanh 140px, kích hoạt **i-frame bất tử (0.22s)** để né đòn Boss |
| **Tương tác NPC / Vật thể** | Phím `E` | Đàm thoại NPC, thu hái linh thảo, khai khoáng, hồi phục tại Linh Miếu, bước qua Cổng Dịch Chuyển |
| **Túi đồ & Trang bị** | Phím `I` | Mở/đóng kho đồ cá nhân |
| **Bản đồ thế giới** | Phím `M` | Mở bản đồ 8 đại vực |

---

## 5. Chạy Kiểm Thử Tự Động (Automated Test Suite)

Dự án tích hợp bộ kiểm thử toàn diện 107/107 assertions kiểm tra tính toàn vẹn của hệ thống:

```bash
# Chạy toàn bộ 107 bài test
npm run test:all

# Hoặc chạy riêng từng phần:
npm run test:arpg       # Kiểm thử động cơ ARPG thời gian thực (27 bài)
npm run test:sec        # Kiểm thử bảo mật & chống hack số âm, WS (26 bài)
npm run test:p3         # Kiểm thử 150 vật phẩm, 36 kỹ năng, 20 boss (20 bài)
npm run test:launcher   # Kiểm thử launcher, secret redaction, AI export (34 bài)
```

---

## 6. Xử Lý Sự Cố Thường Gặp (Troubleshooting)

1. **Lỗi cổng 3001 hoặc 5173 đã bị chiếm dụng:**
   - Mở thẻ **Cài đặt** trên Launcher và đổi cổng Server thành `3002`, Client thành `5174`, sau đó nhấn Lưu.
2. **Lỗi `Can't reach database server at 127.0.0.1:5432`:**
   - Kiểm tra xem service PostgreSQL hoặc Docker container đã được bật hay chưa: `docker ps` hoặc kiểm tra dịch vụ PostgreSQL trong `services.msc`.
3. **Lỗi `PrismaClientInitializationError`:**
   - Đảm bảo bạn đã chạy `npx prisma db push` trong thư mục `server/` để cập nhật cấu trúc bảng mới nhất.

---

**Tác giả:** BigK  
**Bản quyền:** Dự án mã nguồn mở phát triển phi lợi nhuận vì cộng đồng yêu thích thể loại Tu Tiên Cổ Phong.
