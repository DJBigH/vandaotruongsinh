@echo off
chcp 65001 > nul
title VẠN ĐẠO TRƯỜNG SINH - Launcher
cd /d "%~dp0"

echo ========================================================================
echo       ⚔️  VẠN ĐẠO TRƯỜNG SINH - TRÌNH KHỞI CHẠY TỰ ĐỘNG  ⚔️
echo ========================================================================
echo.

if exist "desktop-launcher\dist-packaged\win-unpacked\VanDaoLauncher.exe" (
    echo [LAUNCHER] Đang mở giao diện Desktop Launcher...
    start "" "desktop-launcher\dist-packaged\win-unpacked\VanDaoLauncher.exe"
    exit /b 0
)

if exist "desktop-launcher\dist-packaged\VanDaoLauncher.exe" (
    echo [LAUNCHER] Đang mở giao diện Desktop Launcher VanDaoLauncher.exe...
    start "" "desktop-launcher\dist-packaged\VanDaoLauncher.exe"
    exit /b 0
)

where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [LỖI] Máy tính chưa cài đặt Node.js hoặc chưa cấu hình biến môi trường PATH!
    echo Vui lòng tải và cài đặt Node.js từ: https://nodejs.org/ (Phiên bản LTS)
    echo.
    pause
    exit /b 1
)

node launcher.mjs

if %ERRORLEVEL% neq 0 (
    echo.
    echo [LỖI] Trình khởi chạy kết thúc bất thường!
    pause
)
