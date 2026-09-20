Add-Type -AssemblyName System.Drawing

$sourcePath = Join-Path (Get-Location) "Software\pos_preview.jpg"
$destPath = Join-Path (Get-Location) "Software\app.ico"

$img = [System.Drawing.Image]::FromFile($sourcePath)
$bmp = New-Object System.Drawing.Bitmap $img, 256, 256
$hIcon = $bmp.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($hIcon)

$fs = New-Object System.IO.FileStream($destPath, [System.IO.FileMode]::Create)
$icon.Save($fs)
$fs.Close()
$fs.Dispose()

$bmp.Dispose()
$img.Dispose()

Copy-Item $destPath (Join-Path (Get-Location) "public\favicon.ico") -Force
Copy-Item $destPath (Join-Path (Get-Location) "Software\app\favicon.ico") -Force

Write-Host "[SUCCESS] Generated Software\app.ico successfully!"
