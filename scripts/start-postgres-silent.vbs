' ============================================================
' VẠN ĐẠO TRƯỜNG SINH - Silent PostgreSQL Auto-Starter
' Khởi động ngầm dịch vụ PostgreSQL trong WSL Ubuntu và duy trì kết nối
' Không hiện bất kỳ cửa sổ console nào (100% silent)
' ============================================================

Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "wsl -d Ubuntu -u root service postgresql start", 0, True
WshShell.Run "wsl -d Ubuntu --exec sleep infinity", 0, False
