# FFmpeg 安装脚本（Windows）
# 已将便携版下载到 tools/ffmpeg，并写入 api/.env

$ProjectRoot = Split-Path $PSScriptRoot -Parent
if (-not (Test-Path "$ProjectRoot\tools\ffmpeg\ffmpeg.exe")) {
  Write-Host "Downloading FFmpeg..."
  $zip = "$env:TEMP\ffmpeg-win64.zip"
  Invoke-WebRequest -Uri "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip" -OutFile $zip
  Expand-Archive $zip -DestinationPath "$env:TEMP\ffmpeg-extract" -Force
  $binDir = (Get-ChildItem "$env:TEMP\ffmpeg-extract" -Recurse -Filter "ffmpeg.exe" | Select-Object -First 1).DirectoryName
  New-Item -ItemType Directory -Force -Path "$ProjectRoot\tools\ffmpeg" | Out-Null
  Copy-Item "$binDir\*" "$ProjectRoot\tools\ffmpeg" -Force
}

$ffmpegDir = "$ProjectRoot\tools\ffmpeg"
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($userPath -notlike "*$ffmpegDir*") {
  [Environment]::SetEnvironmentVariable("Path", "$userPath;$ffmpegDir", "User")
  Write-Host "Added to user PATH: $ffmpegDir"
}

Write-Host "FFmpeg ready:"
& "$ffmpegDir\ffmpeg.exe" -version | Select-Object -First 1
