@echo off
chcp 65001 > nul
title VẠN ĐẠO TRƯỜNG SINH - Trình Khởi Chạy Desktop

cd /d "%~dp0"

if exist "desktop-launcher\dist-packaged\win-unpacked\VanDaoLauncher.exe" (
    start "" "desktop-launcher\dist-packaged\win-unpacked\VanDaoLauncher.exe"
    exit /b 0
)

if exist "desktop-launcher\dist-packaged\VanDaoLauncher.exe" (
    start "" "desktop-launcher\dist-packaged\VanDaoLauncher.exe"
    exit /b 0
)

echo [THÔNG BÁO] Chưa tìm thấy file VanDaoLauncher.exe đã đóng gói.
echo Đang khởi chạy launcher ở chế độ phát triển...
cd desktop-launcher

if not exist "node_modules\" (
    echo [THÔNG BÁO] Đang cài đặt thư viện cho Desktop Launcher...
    call npm install
    if errorlevel 1 exit /b 1
)

call npm run build
if errorlevel 1 exit /b %errorlevel%
call npm run start
exit /b %errorlevel%
