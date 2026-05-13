# OTA Updates ORIZON (EAS Update)

## Pourquoi ?

Avec EAS Update, **tu peux pousser une mise a jour de ton app en 30 secondes** sans rebuild Codemagic, sans nouveau APK, sans re-installation manuelle.

L'app verifie au demarrage si une nouvelle version JS existe, la telecharge en arriere-plan, et l'applique au prochain lancement.

**Limites** :
- ✅ Marche pour : changements de code JS, UI, logique, textes, images locales (95% des modifs)
- ❌ Ne marche PAS pour : nouvelles permissions, nouvelles libs natives, changement d'icone/splash, modif `app.json` (besoin de vrai rebuild)

**Tarifs** : gratuit jusqu'a 1000 utilisateurs actifs/mois.

---

## Configuration initiale (a faire UNE SEULE FOIS)

### 1. Installer EAS CLI globalement
```powershell
npm install -g eas-cli
```

### 2. Connexion a Expo
```powershell
cd c:\Users\Tic Isteah\Documents\orizon\react-native-app
eas login
```
(Cree un compte gratuit sur expo.dev si besoin)

### 3. Initialiser le projet EAS
```powershell
eas init
```
Cela ajoute automatiquement `extra.eas.projectId` dans `app.json`.

### 4. Configurer EAS Update
```powershell
eas update:configure
```
Cela ajoute `updates.url` (ton endpoint OTA personnel) dans `app.json`.

### 5. Premier rebuild de l'APK
**Une seule fois** apres ces changements, tu dois rebuild via Codemagic (le runtime version doit etre integre dans le binaire).

Apres ce rebuild, **toutes les futures modifs JS = OTA** !

---

## Pousser une mise a jour OTA

### Sur la branche production (utilisateurs reels)
```powershell
cd react-native-app
eas update --branch production --message "Fix avatar preview + nouveau dashboard"
```

### Sur une branche test (preview pour toi)
```powershell
eas update --branch preview --message "Test feature X"
```

L'utilisateur verra la mise a jour au **prochain lancement** de l'app (telechargement transparent).

---

## Workflow recommande

1. Tu codes une nouvelle fonctionnalite (JS only)
2. `git commit && git push`
3. `eas update --branch production --message "ce que t'as fait"`
4. Tes utilisateurs ont la mise a jour dans 30 sec sans rien faire

**Pas besoin de** :
- Rebuild Codemagic
- Re-installer l'APK
- Renvoyer un fichier WhatsApp

---

## Cas ou tu DOIS rebuild un APK

- Ajout d'une permission Android (camera, contacts, etc.)
- Installation d'une lib avec code natif (ex: stripe SDK natif)
- Changement de l'icone, splash, package name
- Changement du `runtimeVersion` (incompatibilite)

Dans ces cas : Codemagic → workflow `android-universal` → nouveau APK.
