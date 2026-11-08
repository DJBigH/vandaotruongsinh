Add-Type -AssemblyName System.Drawing

$sourceJpg = "C:\Users\BigK\.gemini\antigravity\brain\8c752d2f-7cf8-48f0-82df-5fe92d89f147\game_app_icon_celestial_sword_1794161375904.jpg"
$outDir = "E:\tutienAI\desktop-launcher\build"
$clientDir = "E:\tutienAI\client\public"

if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir }
if (-not (Test-Path $clientDir)) { New-Item -ItemType Directory -Path $clientDir }

# 1. Load source image
$srcImg = [System.Drawing.Image]::FromFile($sourceJpg)

# 2. Create 1024x1024 32bppArgb bitmap with transparent background
$bmp1024 = New-Object System.Drawing.Bitmap 1024, 1024, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g1024 = [System.Drawing.Graphics]::FromImage($bmp1024)
$g1024.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g1024.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g1024.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

# Clear with transparent
$g1024.Clear([System.Drawing.Color]::Transparent)

# Create circular clip path for the medallion
$clipPath = New-Object System.Drawing.Drawing2D.GraphicsPath
$margin = 12
$diameter = 1024 - (2 * $margin)
$clipPath.AddEllipse($margin, $margin, $diameter, $diameter)

# Draw image inside clip
$g1024.SetClip($clipPath)
$g1024.DrawImage($srcImg, 0, 0, 1024, 1024)
$g1024.ResetClip()

# Draw radiant outer gold talisman rim
$goldPenOuter = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 251, 191, 36)), 8
$cyanPenGlow = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(180, 0, 242, 254)), 4
$g1024.DrawEllipse($goldPenOuter, $margin, $margin, $diameter, $diameter)
$g1024.DrawEllipse($cyanPenGlow, ($margin + 6), ($margin + 6), ($diameter - 12), ($diameter - 12))

$target1024 = Join-Path $outDir "icon-1024.png"
$bmp1024.Save($target1024, [System.Drawing.Imaging.ImageFormat]::Png)
Copy-Item $target1024 (Join-Path $outDir "icon.png") -Force
Copy-Item $target1024 (Join-Path $clientDir "icon-1024.png") -Force
Write-Output "Saved 1024x1024 PNG with transparent outer background to: $target1024"

# 3. Generate individual resolutions for multi-res ICO: 256, 128, 64, 48, 32, 24, 16
$sizes = @(256, 128, 64, 48, 32, 24, 16)
foreach ($sz in $sizes) {
    $bmp = New-Object System.Drawing.Bitmap $sz, $sz, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    $g.DrawImage($bmp1024, 0, 0, $sz, $sz)

    # For small sizes (16, 24, 32), reinforce contrast ring
    if ($sz -le 32) {
        $p = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 251, 191, 36)), 1
        $g.DrawEllipse($p, 0, 0, ($sz - 1), ($sz - 1))
        $p.Dispose()
    }

    $destFile = Join-Path $outDir "icon_${sz}.png"
    $bmp.Save($destFile, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Output "Generated: icon_${sz}.png"
}

# 4. Generate Tray Icon (High contrast cyan phi kiếm & gold ring on transparent)
$traySizes = @(16, 32)
foreach ($tsz in $traySizes) {
    $tbmp = New-Object System.Drawing.Bitmap $tsz, $tsz, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $tg = [System.Drawing.Graphics]::FromImage($tbmp)
    $tg.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $tg.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $tg.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $tg.Clear([System.Drawing.Color]::Transparent)

    # Dark background circle
    $brushNavy = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(240, 8, 15, 29))
    $tg.FillEllipse($brushNavy, 1, 1, ($tsz - 2), ($tsz - 2))

    # Outer Gold Ring
    $penGold = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 251, 191, 36)), 1
    $tg.DrawEllipse($penGold, 1, 1, ($tsz - 3), ($tsz - 3))

    # Inner Cyan Glow Ring
    $penCyan = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(220, 0, 242, 254)), 1
    $tg.DrawEllipse($penCyan, 2, 2, ($tsz - 5), ($tsz - 5))

    # Sharp Celestial Sword Blade (Vertical)
    $midX = [math]::Floor($tsz / 2)
    $penBlade = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 0, 242, 254)), ([math]::Max(1, [math]::Floor($tsz / 10)))
    $tg.DrawLine($penBlade, $midX, 3, $midX, ($tsz - 5))

    # Blade Core White
    $penCore = New-Object System.Drawing.Pen ([System.Drawing.Color]::White), 1
    $tg.DrawLine($penCore, $midX, 4, $midX, ($tsz - 6))

    # Sword Guard Gold
    $penGuard = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 251, 191, 36)), 1
    $guardY = [math]::Floor($tsz * 0.65)
    $tg.DrawLine($penGuard, ($midX - 2), $guardY, ($midX + 2), $guardY)

    $trayFile = Join-Path $outDir "tray_icon_${tsz}.png"
    $tbmp.Save($trayFile, [System.Drawing.Imaging.ImageFormat]::Png)
    if ($tsz -eq 16) {
        Copy-Item $trayFile (Join-Path $outDir "tray-icon.png") -Force
    }
    $tg.Dispose()
    $tbmp.Dispose()
    Write-Output "Generated Tray Icon: tray_icon_${tsz}.png"
}

$goldPenOuter.Dispose()
$cyanPenGlow.Dispose()
$clipPath.Dispose()
$g1024.Dispose()
$bmp1024.Dispose()
$srcImg.Dispose()

Write-Output "All icon PNG assets successfully created in $outDir"
