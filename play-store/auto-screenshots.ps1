# auto-screenshots.ps1
# Capture automatique des 8 screenshots officiels ORIZON via deeplinks.
# Pre-requis :
#   - ADB dans le PATH (Android SDK platform-tools)
#   - Un emulateur Android lance OU un telephone Android branche en USB (debug actif)
#   - L'APK debug ou preview ORIZON installe : adb install <chemin>.apk
#   - Etre deja connecte dans l'app avec un compte demo (demo.proprio@orizon.ht)
#
# Usage : .\play-store\auto-screenshots.ps1
# Resultat : 8 PNG dans play-store\screenshots\

$ErrorActionPreference = "Stop"
$outDir = Join-Path $PSScriptRoot "screenshots"
New-Item -ItemType Directory -Path $outDir -Force | Out-Null

# Verifier qu'au moins 1 device est connecte
$devices = (& adb devices) -split "`n" | Where-Object { $_ -match "device$" -and $_ -notmatch "List of" }
if ($devices.Count -lt 1) {
    Write-Host "Aucun device Android detecte. Lance un emulateur ou branche un telephone." -ForegroundColor Red
    exit 1
}
Write-Host "Device detecte : $($devices[0])" -ForegroundColor Green

$pkg = "com.orizon.mobile"

# Verifier que l'app est installee
$installed = & adb shell pm list packages $pkg
if (-not $installed) {
    Write-Host "App $pkg pas installee. Installe d'abord l'APK debug/preview." -ForegroundColor Red
    exit 1
}

# Liste des ecrans a capturer : route deeplink + delai + nom de fichier
$screens = @(
    @{ name = "01_onboarding";    deeplink = "orizon://onboarding";        wait = 4 ; desc = "Page d'accueil onboarding" },
    @{ name = "02_login";         deeplink = "orizon://login";             wait = 3 ; desc = "Connexion" },
    @{ name = "03_home_search";   deeplink = "orizon://(tabs)";            wait = 5 ; desc = "Recherche / liste de biens" },
    @{ name = "04_property";      deeplink = "orizon://property/1";        wait = 5 ; desc = "Fiche detaillee bien" },
    @{ name = "05_map";           deeplink = "orizon://map";               wait = 6 ; desc = "Carte interactive" },
    @{ name = "06_mortgage";      deeplink = "orizon://mortgage";          wait = 3 ; desc = "Simulateur de pret" },
    @{ name = "07_my_listings";   deeplink = "orizon://my-listings";       wait = 3 ; desc = "Mes annonces (proprio)" },
    @{ name = "08_profile";       deeplink = "orizon://profile";           wait = 3 ; desc = "Profil utilisateur" }
)

foreach ($s in $screens) {
    Write-Host ""
    Write-Host "[$($s.name)] $($s.desc)" -ForegroundColor Cyan
    Write-Host "  -> Ouverture deeplink : $($s.deeplink)"

    # Ouvre l'app sur le deeplink
    & adb shell am start -W -a android.intent.action.VIEW -d $s.deeplink $pkg | Out-Null

    # Attendre que l'ecran soit charge (animations, fetch data, images)
    Write-Host "  -> Attente $($s.wait)s pour le rendu..."
    Start-Sleep -Seconds $s.wait

    # Capture
    $remote = "/sdcard/orizon_$($s.name).png"
    $local = Join-Path $outDir "$($s.name).png"
    & adb shell screencap -p $remote 2>&1 | Out-Null
    & adb pull $remote $local 2>&1 | Out-Null
    & adb shell rm $remote 2>&1 | Out-Null

    if (Test-Path $local) {
        $size = [Math]::Round((Get-Item $local).Length / 1KB, 1)
        Write-Host "  OK Sauvegarde : $local ($size KB)" -ForegroundColor Green
    } else {
        Write-Host "  ECHEC capture" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== Termine ===" -ForegroundColor Green
Write-Host "Dossier : $outDir"
Write-Host ""
Write-Host "Note : si certains deeplinks ne marchent pas (route inexistante)," -ForegroundColor Yellow
Write-Host "utilise plutot le script semi-manuel : .\play-store\capture_screenshots.ps1" -ForegroundColor Yellow
Write-Host ""
Write-Host "Etape suivante : Google Play Console > Store presence > Main store listing > Screenshots phone"
