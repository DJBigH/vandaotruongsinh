' ============================================================
' VẠN ĐẠO TRƯỜNG SINH - Silent PostgreSQL Auto-Starter
' Khởi động ngầm dịch vụ PostgreSQL trong WSL Ubuntu và duy trì kết nối
' Tự động thử lại tối đa 4 lần nếu hệ thống vừa khởi động chưa sẵn sàng
' Không hiện bất kỳ cửa sổ console nào (100% silent)
' ============================================================

Set WshShell = CreateObject("WScript.Shell")

Dim success
success = False

For attempt = 1 To 4
    On Error Resume Next
    Dim ret
    ret = WshShell.Run("wsl -d Ubuntu -u root service postgresql start", 0, True)
    If ret = 0 Then
        success = True
        Exit For
    End If
    WScript.Sleep 4000
Next

' Duy trì tiến trình nền để WSL không tự đóng
WshShell.Run "wsl -d Ubuntu --exec sleep infinity", 0, False
