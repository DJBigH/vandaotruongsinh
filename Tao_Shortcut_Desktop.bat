@echo off
chcp 65001 > nul
title Tạo Phím Tắt Desktop - Vạn Đạo Trường Sinh
cd /d "%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -Command "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; & '%~dp0Tao_Shortcut_Desktop.ps1'"
echo.
pause
