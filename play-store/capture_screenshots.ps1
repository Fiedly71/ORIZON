# Capture automatique de screenshots Android via ADB.
# Pre-requis :
#   1. Telephone Android branche en USB avec debogage USB active
#   2. ADB installe (Android Studio ou platform-tools)
#   3. App ORIZON ouverte sur le telephone
#
# Usage :
#   .\capture_screenshots.ps1
#
# Tu navigues manuellement entre les ecrans. A chaque "Appuie sur Entree",
# le script prend un screenshot et le sauve dans .\screenshots\
#
# Resultat : 8 PNG 1080x1920+ pretes pour Google Play Console.

$outDir = ".\screenshots"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$screens = @(
    @{ name = "01_explore"; description = "Ecran Explore avec liste de biens" },
    @{ name = "02_detail"; description = "Detail d'une propriete" },
    @{ name = "03_map"; description = "Vue carte avec marqueurs" },
    @{ name = "04_filters"; description = "Filtres de recherche" },
    @{ name = "05_publish"; description = "Wizard de publication" },
    @{ name = "06_payment"; description = "Paiement MonCash" },
    @{ name = "07_profile"; description = "Profil utilisateur" },
    @{ name = "08_admin"; description = "Tableau de bord admin" }
)

# Verifie qu'un device est connecte
$devices = & adb devices 2>&1
if ($devices -notmatch "device`$") {
    Write-Host "❌ Aucun device Android detecte. Verifie :"
    Write-Host "  - Cable USB branche"
    Write-Host "  - Debogage USB active dans les Options developpeur"
    Write-Host "  - 'adb devices' affiche bien ton telephone"
    exit 1
}
Write-Host "✓ Device Android detecte"
Write-Host ""

foreach ($s in $screens) {
    Write-Host "[$($s.name)] $($s.description)" -ForegroundColor Cyan
    Read-Host "  Navigue vers cet ecran sur ton telephone, puis appuie sur Entree"

    $remote = "/sdcard/orizon_$($s.name).png"
    $local = Join-Path $outDir "$($s.name).png"

    & adb shell screencap -p $remote
    & adb pull $remote $local 2>&1 | Out-Null
    & adb shell rm $remote

    if (Test-Path $local) {
        $size = (Get-Item $local).Length / 1KB
        Write-Host "  ✓ Sauvegarde : $local ($([Math]::Round($size, 1)) KB)" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Echec capture" -ForegroundColor Red
    }
    Write-Host ""
}

Write-Host "Termine ! Screenshots dans $outDir" -ForegroundColor Green
Write-Host "Upload-les sur Google Play Console > Store presence > Main store listing"
