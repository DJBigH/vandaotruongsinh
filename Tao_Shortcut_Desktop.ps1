# ============================================================
# Vạn Đạo Trường Sinh - Trình Tạo Phím Tắt Màn Hình (Desktop Shortcut)
# Sử dụng trực tiếp Windows Shell API (IShellLinkW) để ghi Unicode tiếng Việt chuẩn xác
# ============================================================

$source = @"
using System;
using System.Runtime.InteropServices;
using System.Text;

[ComImport]
[Guid("00021401-0000-0000-C000-000000000046")]
public class ShellLinkClass {}

[ComImport]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
[Guid("000214F9-0000-0000-C000-000000000046")]
public interface IShellLinkW {
    void GetPath([Out, MarshalAs(UnmanagedType.LPWStr)] StringBuilder pszFile, int cchMaxPath, IntPtr pfd, uint fFlags);
    void GetIDList(out IntPtr ppidl);
    void SetIDList(IntPtr pidl);
    void GetDescription([Out, MarshalAs(UnmanagedType.LPWStr)] StringBuilder pszName, int cchMaxName);
    void SetDescription([MarshalAs(UnmanagedType.LPWStr)] string pszName);
    void GetWorkingDirectory([Out, MarshalAs(UnmanagedType.LPWStr)] StringBuilder pszDir, int cchMaxPath);
    void SetWorkingDirectory([MarshalAs(UnmanagedType.LPWStr)] string pszDir);
    void GetArguments([Out, MarshalAs(UnmanagedType.LPWStr)] StringBuilder pszArgs, int cchMaxPath);
    void SetArguments([MarshalAs(UnmanagedType.LPWStr)] string pszArgs);
    void GetHotkey(out ushort pwHotkey);
    void SetHotkey(ushort wHotkey);
    void GetShowCmd(out int piShowCmd);
    void SetShowCmd(int iShowCmd);
    void GetIconLocation([Out, MarshalAs(UnmanagedType.LPWStr)] StringBuilder pszIconPath, int cchIconPath, out int piIcon);
    void SetIconLocation([MarshalAs(UnmanagedType.LPWStr)] string pszIconPath, int iIcon);
    void SetRelativePath([MarshalAs(UnmanagedType.LPWStr)] string pszPathRel, uint dwReserved);
    void Resolve(IntPtr hwnd, uint fFlags);
    void SetPath([MarshalAs(UnmanagedType.LPWStr)] string pszFile);
}

[ComImport]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
[Guid("0000010b-0000-0000-C000-000000000046")]
public interface IPersistFile {
    void GetClassID(out Guid pClassID);
    void IsDirty();
    void Load([MarshalAs(UnmanagedType.LPWStr)] string pszFileName, uint dwMode);
    void Save([MarshalAs(UnmanagedType.LPWStr)] string pszFileName, [MarshalAs(UnmanagedType.Bool)] bool fRemember);
    void SaveCompleted([MarshalAs(UnmanagedType.LPWStr)] string pszFileName);
    void GetCurFile([Out, MarshalAs(UnmanagedType.LPWStr)] StringBuilder ppszFileName);
}

public static class VanDaoShortcut {
    public static void Create(string shortcutPath, string targetPath, string workingDir, string description, string iconPath) {
        var link = (IShellLinkW)new ShellLinkClass();
        link.SetPath(targetPath);
        link.SetWorkingDirectory(workingDir);
        link.SetDescription(description);
        if (!string.IsNullOrEmpty(iconPath)) {
            link.SetIconLocation(iconPath, 0);
        }
        var file = (IPersistFile)link;
        file.Save(shortcutPath, true);
    }
}
"@

Add-Type -TypeDefinition $source

$desktop = [System.Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktop "Van Dao Truong Sinh.lnk"

# Ưu tiên tệp VanDaoLauncher.exe đã đóng gói, nếu chưa có thì dùng CHAY_LAUNCHER.bat
$launcherExe = Join-Path $PSScriptRoot "desktop-launcher\dist-packaged\VanDaoLauncher.exe"
$unpackedExe = Join-Path $PSScriptRoot "desktop-launcher\dist-packaged\win-unpacked\VanDaoLauncher.exe"
$targetBat = Join-Path $PSScriptRoot "CHAY_LAUNCHER.bat"

if (Test-Path $unpackedExe) {
    $targetPath = $unpackedExe
} elseif (Test-Path $launcherExe) {
    $targetPath = $launcherExe
} else {
    $targetPath = $targetBat
}

$iconFile = Join-Path $PSScriptRoot "desktop-launcher\build\icon.ico"
$description = "Vạn Đạo Trường Sinh - Game Tu Tiên 2D Web"

[VanDaoShortcut]::Create($shortcutPath, $targetPath, $PSScriptRoot, $description, $iconFile)

Write-Host "==========================================================" -ForegroundColor Green
Write-Host "✅ Đã tạo phím tắt 'Vạn Đạo Trường Sinh' trên Desktop!" -ForegroundColor Green
Write-Host "Tệp đích: $targetPath" -ForegroundColor Yellow
Write-Host "Biểu tượng: $iconFile" -ForegroundColor Yellow
Write-Host "Mô tả: $description" -ForegroundColor Cyan
Write-Host "Đạo hữu chỉ cần nhấp đúp vào biểu tượng ngoài Desktop để mở game." -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
