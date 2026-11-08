Add-Type -AssemblyName System.Drawing

$bmp = New-Object System.Drawing.Bitmap 256, 256, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

# Background circle
$brushBg = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 8, 15, 29))
$g.FillEllipse($brushBg, 4, 4, 248, 248)

# Cyan Outer Ring
$penCyan = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 0, 242, 254)), 6
$g.DrawEllipse($penCyan, 8, 8, 240, 240)

# Gold Inner Ring
$penGold = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 251, 191, 36)), 3
$g.DrawEllipse($penGold, 20, 20, 216, 216)

# Central Symbol '道'
$font = New-Object System.Drawing.Font 'Segoe UI', 100, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
$brushText = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 251, 191, 36))
$sf = New-Object System.Drawing.StringFormat
$sf.Alignment = [System.Drawing.StringAlignment]::Center
$sf.LineAlignment = [System.Drawing.StringAlignment]::Center
$rect = New-Object System.Drawing.RectangleF 0, 0, 256, 256
$g.DrawString('道', $font, $brushText, $rect, $sf)

$targetPng = Join-Path -Path $PSScriptRoot -ChildPath 'icon.png'
$targetIco = Join-Path -Path $PSScriptRoot -ChildPath 'icon.ico'

$bmp.Save($targetPng, [System.Drawing.Imaging.ImageFormat]::Png)

$hIcon = $bmp.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($hIcon)
$fs = [System.IO.FileStream]::new($targetIco, [System.IO.FileMode]::Create)
$icon.Save($fs)
$fs.Close()
$icon.Dispose()
$g.Dispose()
$bmp.Dispose()
Write-Output "Successfully generated: $targetPng and $targetIco"
