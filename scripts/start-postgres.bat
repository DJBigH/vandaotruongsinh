@echo off
title [Van Dao Truong Sinh] Khoi Dong Co So Du Lieu PostgreSQL
chcp 65001 >nul
echo ============================================================
echo   VẠN ĐẠO TRƯỜNG SINH - KHỞI ĐỘNG CƠ SỞ DỮ LIỆU POSTGRESQL
echo ============================================================
echo.
echo [1/2] Đang kích hoạt dịch vụ PostgreSQL trong WSL Ubuntu...
wsl -d Ubuntu -u root service postgresql start

echo [2/2] Đang thiết lập tiến trình nền duy trì kết nối cổng 5432...
start "" /B wsl -d Ubuntu --exec sleep infinity

echo.
echo ============================================================
echo   ✓ HOÀN TẤT! PostgreSQL 127.0.0.1:5432 đã sẵn sàng.
echo   Bạn có thể mở Desktop Launcher để bắt đầu chơi game.
echo ============================================================
timeout /t 3 >nul
