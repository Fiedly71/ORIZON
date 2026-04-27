# ORIZON - Generation assets icones + splash a partir d'un PNG source
#
# Pre-requis : ImageMagick installe (https://imagemagick.org/script/download.php#windows)
# Verifier : magick --version
#
# Usage :
#   .\scripts\generate-assets.ps1 -Source .\source\orizon-icon-1024.png
#
# Le PNG source doit etre :
#   - 1024x1024 px minimum
#   - Sans transparence (Apple n'accepte pas)
#   - Logo centre avec marge ~10% (Apple ajoute les coins arrondis)

param(
  [Parameter(Mandatory=$true)] [string]$Source,
  [string]$OutDir = ".\react-native-app\assets"
)

if (-not (Test-Path $Source)) {
  Write-Error "Source PNG introuvable : $Source"; exit 1
}
if (-not (Get-Command magick -ErrorAction SilentlyContinue)) {
  Write-Error "ImageMagick n'est pas installe. Telecharge : https://imagemagick.org/"; exit 1
}

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
New-Item -ItemType Directory -Force -Path "$OutDir\store" | Out-Null

Write-Host "==> Generation icones depuis $Source" -ForegroundColor Cyan

# === Expo / app.json ===
magick $Source -resize 1024x1024 "$OutDir\icon.png"
magick $Source -resize 1024x1024 "$OutDir\adaptive-icon.png"
magick $Source -resize 32x32   "$OutDir\favicon.png"

# === Splash screen (fond bleu royal #1D4ED8 + logo centre) ===
magick -size 1284x2778 xc:"#1D4ED8" `
  ( $Source -resize 600x600 ) -gravity center -composite `
  "$OutDir\splash.png"

# === Stores (a uploader sur App Store Connect / Play Console) ===
# Apple App Store icon (1024x1024 sans transparence)
magick $Source -resize 1024x1024 -background "#FFFFFF" -alpha remove -alpha off "$OutDir\store\appstore-icon-1024.png"

# Google Play icon (512x512)
magick $Source -resize 512x512 "$OutDir\store\playstore-icon-512.png"

# Google Play Feature Graphic (1024x500)
magick -size 1024x500 xc:"#1D4ED8" `
  ( $Source -resize 280x280 ) -gravity center -geometry +0+0 -composite `
  -fill white -font Arial -pointsize 56 -gravity center -annotate +0+170 "ORIZON Haiti" `
  "$OutDir\store\playstore-feature-1024x500.png"

Write-Host "==> Termine." -ForegroundColor Green
Write-Host "Generes :" -ForegroundColor Yellow
Get-ChildItem -Recurse $OutDir -Include *.png | Select-Object FullName, Length | Format-Table -AutoSize

Write-Host ""
Write-Host "Etapes suivantes :" -ForegroundColor Cyan
Write-Host "  1. Ajouter dans react-native-app/app.json :" -ForegroundColor White
Write-Host '     "icon": "./assets/icon.png",' -ForegroundColor Gray
Write-Host '     "splash": { "image": "./assets/splash.png", "backgroundColor": "#1D4ED8" }' -ForegroundColor Gray
Write-Host "  2. Uploader assets/store/*.png sur App Store Connect et Play Console"
Write-Host "  3. Capturer screenshots sur device reel ou simulateur"
