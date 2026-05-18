# ORIZON — Guide de mise en production (GO LIVE)

> Document maitre. Tout ce qu'il reste a faire pour publier ORIZON sur **Google Play** et **App Store**, dans l'ordre.
> Chaque etape coche une case obligatoire pour les stores. Suis-les **dans l'ordre** : certaines dependent des precedentes.

---

## Statut actuel (commit `0e792b8`)

| Element | Etat |
|---|---|
| Code RN complet (auth, KYC, paiement MonCash, annonces, alertes, visites, reviews, mortgage, i18n FR/EN/CR) | ✅ |
| OTA EAS publie sur branche `production` (group `3723e5f9-f926-4672-bf66-96e3c10c112a`) | ✅ |
| `app.json` : permissions propres, ATT plist, runtime version, EAS projectId | ✅ |
| ATT prompt iOS appele au runtime (App.js) | ✅ |
| Email verification obligatoire avant publication (SellWizard) | ✅ |
| Checkbox CGU obligatoire a l'inscription (RegisterScreen) | ✅ |
| Feature graphic SVG cree | ✅ (a convertir en PNG) |
| Data Safety form pre-rempli | ✅ (a recopier dans Play Console) |
| Codemagic workflow `android-production-aab` | ✅ (configure, a executer) |
| Scripts SQL `moncash_manual.sql` + `verification_levels.sql` | ⚠️ a executer dans Supabase |
| AAB signe pour Play Store | ❌ |
| Build TestFlight iOS | ❌ |
| Pages web `privacy` + `delete-account` | ❌ |
| Comptes Play Console + App Store Connect | ❌ a verifier |

---

## ETAPE 1 — Finaliser le backend Supabase

> Sans ces SQL, l'app crashera sur le paiement MonCash et n'aura pas les badges premium.

### 1.1 Ouvrir Supabase
- Va sur https://supabase.com/dashboard
- Selectionne le projet ORIZON
- Onglet **SQL Editor** → **New query**

### 1.2 Executer `moncash_manual.sql`
- Ouvre le fichier [react-native-app/db/moncash_manual.sql](react-native-app/db/moncash_manual.sql)
- Copie tout le contenu
- Colle dans Supabase SQL Editor
- Clique **Run** (Ctrl+Enter)
- Verifie : aucune erreur rouge en bas

### 1.3 Executer `verification_levels.sql`
- Ouvre [react-native-app/db/verification_levels.sql](react-native-app/db/verification_levels.sql)
- Meme procedure : copier → coller → Run
- Verifie dans **Table Editor → profiles** que les colonnes `verification_level`, `verified_at`, `verification_revoked_at` existent

### 1.4 Te verifier toi-meme (compte test)
Dans le SQL Editor, remplace `ton-email@example.com` par ton vrai email :
```sql
update public.profiles
   set verified = true,
       can_publish = true,
       verification_level = 'premium',
       verified_at = now()
 where id = (select id from auth.users where email = 'ton-email@example.com');
```
Recharge l'app → ton badge premium doit apparaitre.

---

## ETAPE 2 — Publier les pages web obligatoires

> Google Play **refuse l'app** si l'URL Privacy Policy n'est pas accessible publiquement.
> Idem App Store. Et depuis 2024, Play exige aussi une **URL de suppression de compte**.

### 2.1 Heberger sur GitHub Pages (gratuit) ou Netlify
**Option A — GitHub Pages (le plus simple) :**
1. Le repo `Fiedly71/ORIZON` a deja `index.html` et `orizon-moderne.html` a la racine
2. GitHub → Settings → Pages → Source : `main` / root → Save
3. URL publique : `https://fiedly71.github.io/ORIZON/`

**Option B — Domaine custom `orizon.ht` :**
- Si tu as deja achete le domaine, configure DNS CNAME vers `fiedly71.github.io`
- Sinon utilise l'URL GitHub Pages directement

### 2.2 Creer la page Privacy
Fichier a creer a la racine du repo : `privacy.html`
- Contenu : reprend le texte de l'ecran Privacy dans l'app (en/fr)
- Doit inclure : donnees collectees, finalite, partage avec Supabase/Expo/PostHog/MonCash, droits utilisateur, contact
- URL finale : `https://fiedly71.github.io/ORIZON/privacy.html`

### 2.3 Creer la page Delete Account
Fichier : `delete-account.html`
- Explique les 2 methodes : in-app (Profil → Supprimer mon compte) + email `contact@orizon.ht`
- Delai de suppression : sous 30 jours
- URL finale : `https://fiedly71.github.io/ORIZON/delete-account.html`

> Si tu veux, demande-moi : "genere privacy.html et delete-account.html" — je te les ecris.

### 2.4 Configurer email contact
- Active `contact@orizon.ht` (ou un Gmail temporaire `orizonhaiti@gmail.com`)
- Verifie que tu peux recevoir un mail dessus

---

## ETAPE 3 — Generer l'AAB Android signe (Codemagic)

### 3.1 Pre-requis
- Compte Codemagic : https://codemagic.io/signup (gratuit, lie a GitHub)
- Compte Google Play Console : https://play.google.com/console (frais unique 25 USD)
- Cle de signature Android :
  - Soit Codemagic la genere automatiquement (recommande)
  - Soit tu en as deja une (`.jks` ou `.keystore`)

### 3.2 Connecter Codemagic au repo
1. Codemagic → Add application → GitHub → ORIZON
2. Workflow type : **codemagic.yaml** (deja present dans le repo)
3. Branch : `main`

### 3.3 Lancer le workflow `android-production-aab`
1. Codemagic → projet ORIZON → onglet **Workflows**
2. Selectionne `android-production-aab`
3. Clique **Start new build**
4. Branch : `main`
5. Attendre ~15-20 min
6. Telecharge l'artefact `app-release.aab`

### 3.4 Variables d'environnement Codemagic
Dans Codemagic → Environment variables, ajoute (groupe `production`) :
- `EXPO_PUBLIC_SUPABASE_URL` → ton URL Supabase
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` → ta cle anon
- `EXPO_PUBLIC_POSTHOG_HOST` → `https://eu.posthog.com` (ou ton instance)
- `EXPO_PUBLIC_COMPANY_NAME` → `ORIZON`
- `EXPO_PUBLIC_COMPANY_ADDRESS` → `Port-au-Prince, Haïti`
- `EXPO_TOKEN` → genere un nouveau sur https://expo.dev/settings/access-tokens (revoke l'ancien `Ez1nlG...`)

### 3.5 Signature de l'AAB
Si Codemagic doit signer :
- Code signing identities → Android keystores → Generate new
- Note bien le mot de passe (a sauver dans 1Password / gestionnaire de mdp)
- Le keystore sera attache au workflow automatiquement

---

## ETAPE 4 — Publication Google Play Store

### 4.1 Creer la fiche
1. Play Console → **Create app**
2. Nom : `ORIZON — Immobilier Haïti`
3. Langue par defaut : Francais
4. Type : App
5. Gratuit
6. Accepte les declarations (Play Policy + US export laws)

### 4.2 Renseigner le contenu obligatoire (App content)
| Section | Reponse |
|---|---|
| Privacy policy | `https://fiedly71.github.io/ORIZON/privacy.html` |
| App access | Ouvert sans restriction (ou comptes test si tu veux que Google teste) |
| Ads | **Non** (pas de publicites dans ORIZON) |
| Content rating | Questionnaire IARC → "Reference / Education" → resultat PEGI 3 / Everyone |
| Target audience | 18+ |
| News app | Non |
| COVID-19 contact tracing | Non |
| Data safety | Recopie les reponses de [play-store/data-safety.md](play-store/data-safety.md) |
| Government apps | Non |
| Financial features | Oui → "Frais de service" (publication 20 USD) — **PAS de gestion bancaire** |

### 4.3 Store listing (page publique)
- **Short description** (80 chars max) : `Achète, loue et vends ton bien immobilier partout en Haïti.`
- **Full description** : copie depuis [play-store/store-listing.md](play-store/store-listing.md)
- **App icon** : 512×512 PNG (depuis `react-native-app/assets/icon.png`, redimensionne si besoin)
- **Feature graphic** 1024×500 :
  - Convertir [play-store/feature-graphic.svg](play-store/feature-graphic.svg) en PNG :
  - Methode online : https://cloudconvert.com/svg-to-png (sortie 1024×500)
  - Methode CLI : `npx svgexport play-store/feature-graphic.svg play-store/feature-graphic.png 1024:500`
- **Phone screenshots** (min 2, recommande 4-8) :
  - Lance le script `play-store/capture_screenshots.ps1` apres avoir demarre l'app dans un emulateur
  - Ou prends manuellement : Login, Map, Detail, Profile, SellWizard

### 4.4 Releases → Internal testing (premier upload)
1. Releases → **Internal testing** → Create new release
2. Upload `app-release.aab` (depuis Codemagic)
3. Release notes (FR) :
   ```
   - Première version publique d'ORIZON
   - Recherche d'annonces sur carte
   - Publication d'annonces (Propriétaires/Agences)
   - Paiement MonCash intégré
   - Vérification KYC
   - Notifications push
   ```
4. Save → Review release → Rollout to Internal testing
5. Ajoute toi-meme comme testeur dans **Testers → Email list**

### 4.5 Promote to Production
**Une fois testes en interne OK :**
1. Internal testing → Promote release → **Production**
2. Choisir % rollout : commence a 20% puis 100% apres 48h sans crash
3. Soumets pour review (Google met 3-7 jours)

---

## ETAPE 5 — Publication App Store iOS

### 5.1 Pre-requis
- **Apple Developer account** : https://developer.apple.com (99 USD/an)
- **App Store Connect** : https://appstoreconnect.apple.com
- Un Mac OU build via EAS Cloud (recommande, pas besoin de Mac)

### 5.2 Build IPA via EAS
Dans le terminal :
```powershell
cd react-native-app
$env:EXPO_TOKEN="<nouveau token>"
npx eas build --platform ios --profile production
```
- Premiere fois : EAS te demande de te login Apple → suis le prompt
- Genere automatiquement les certificats / provisioning profiles
- Attend ~20-30 min
- Telecharge l'IPA depuis le lien EAS

### 5.3 Soumettre a TestFlight
```powershell
npx eas submit --platform ios --latest
```
- Lien automatique avec App Store Connect
- L'IPA arrive dans TestFlight sous ~30 min (processing)

### 5.4 Configurer App Store Connect
1. **My Apps** → New App
2. Bundle ID : `com.fiedly.orizon` (doit matcher `app.json`)
3. SKU : `orizon-001`
4. Langue : Francais
5. Remplir :
   - **Description** : meme texte que Play Store
   - **Keywords** : `immobilier, haiti, maison, location, vente, appartement, agence`
   - **Support URL** : `https://fiedly71.github.io/ORIZON/`
   - **Privacy URL** : `https://fiedly71.github.io/ORIZON/privacy.html`
   - **App Privacy** (questionnaire) : meme reponses que Play Data Safety (voir [play-store/data-safety.md](play-store/data-safety.md))
6. **Screenshots** : 6.7" iPhone (1290×2796) — au moins 3
7. **App Review Information** :
   - Compte de test : cree un compte demo `apple-review@orizon.ht` / mdp securise
   - Notes : "Use 'apple-review@orizon.ht' / 'PWD' to test all features. Tap 'Skip onboarding' on first launch."

### 5.5 Submit for review
- App Store Connect → Build → choisis la build TestFlight processed
- Submit → Review (5-7 jours)

---

## ETAPE 6 — Audit final avant submission

Coche TOUT ca avant de cliquer Submit :

### 6.1 Conformite Google Play
- [ ] AAB signe avec keystore en lieu sur (backup keystore.jks + mdp)
- [ ] Privacy URL ouverte dans navigateur prive : repond 200 OK
- [ ] Delete account URL ouverte dans navigateur prive : repond 200 OK
- [ ] Permissions dans Play Console correspondent a `app.json` (5 max)
- [ ] Data Safety form rempli en entier (pas de section "review needed")
- [ ] Content rating obtenu (badge IARC visible)
- [ ] Target SDK >= 34 (Android 14) — Expo SDK 54 le fait par defaut
- [ ] Pas de publicite declaree (sauf si tu en ajoutes plus tard)
- [ ] Compte test fonctionnel pour les reviewers

### 6.2 Conformite Apple
- [ ] ATT prompt s'affiche bien au lancement (test sur device reel)
- [ ] Tous les `NSUsageDescription` du `app.json` sont **en francais**
- [ ] Pas de bouton "Connect with Apple" manquant si tu offres login social (sinon Apple rejette)
- [ ] Lien web vers `Privacy Policy` ET `Terms of Use` accessibles depuis l'app
- [ ] Bouton "Supprimer mon compte" present in-app (deja fait dans ProfileScreen)
- [ ] Test sur device reel iOS (Codemagic peut le build, mais test installable via TestFlight)
- [ ] Pas de mention "beta", "test" dans le nom ou description

### 6.3 Conformite legale Haiti
- [ ] CGU mentionne juridiction haitienne (article "Droit applicable")
- [ ] Mentions legales : raison sociale ORIZON (ou nom prop), adresse, contact
- [ ] Mention NIF / patente si tu es enregistre (pas obligatoire au lancement mais bon a avoir)

---

## ETAPE 7 — Apres la mise en ligne

### 7.1 Monitoring
- Active **PostHog** dashboard : suivre installs, signups, publications
- Active **Expo dashboard** : suivre crashes (https://expo.dev/accounts/fiedly71/projects/orizon-mobile)
- Configure **Supabase email alerts** : usage DB, erreurs RPC

### 7.2 Iterations OTA (pas besoin de re-soumettre)
Pour push une correction de bug JS/UI :
```powershell
cd react-native-app
$env:EXPO_TOKEN="<token>"
npx eas update --branch production --message "fix: <description>" --non-interactive
```
**Limites** :
- Marche pour : JS, styles, traductions, images, logique React
- Pas pour : nouvelles permissions, nouvelles libs natives, changement de `runtimeVersion`

### 7.3 Quand re-soumettre un build natif
Necessaire si :
- Tu changes une permission dans `app.json`
- Tu ajoutes une lib avec code natif (camera, BLE, etc.)
- Tu mets a jour `expo` (SDK)
- Tu changes l'icone ou splash

Dans ces cas : rebuild AAB + IPA via Codemagic/EAS, re-upload, nouvelle version (`1.0.1` puis `1.0.2`...).

---

## ETAPE 8 — Securite (a faire MAINTENANT)

- [ ] **Revoke le token Expo** `Ez1nlGAjyDX0T_wic5MdAqtRoitUMn_gQBtH40c3` :
  - https://expo.dev/settings/access-tokens → Revoke
  - Genere-en un nouveau, stocke-le dans Codemagic env vars uniquement (jamais en clair dans git)
- [ ] Verifie qu'aucun fichier `.env` n'est commit : `git ls-files | Select-String -Pattern "\.env$"`
- [ ] Active 2FA sur : GitHub, Supabase, Expo, Play Console, Apple ID
- [ ] Backup le keystore Android sur 2 emplacements (Google Drive chiffre + cle USB)
  - **Perdre le keystore = ne plus jamais pouvoir update l'app sur Play**

---

## Ordre de priorite recommande (chronologie)

| Jour | Action |
|---|---|
| **J1** | Etape 1 (SQL Supabase) + Etape 8 (revoke token, 2FA) |
| **J1-J2** | Etape 2 (pages web privacy + delete) |
| **J2** | Etape 3 (Codemagic AAB build) |
| **J3** | Etape 4 (Play Console setup + internal testing) |
| **J4** | Etape 5.1-5.3 (EAS iOS build + TestFlight) |
| **J5-J7** | Tests internes Android + iOS, corrections OTA |
| **J8** | Etape 4.5 (Play prod submission) + Etape 5.5 (App Store submission) |
| **J9-J15** | Attente review Google (3-7j) + Apple (5-7j) |
| **J15+** | LIVE 🚀 |

---

## Contacts utiles

- **Expo support** : https://expo.dev/contact
- **Supabase support** : https://supabase.com/support
- **Play Console help** : https://support.google.com/googleplay/android-developer
- **App Store Connect help** : https://developer.apple.com/contact/
- **Codemagic** : support@codemagic.io

---

## Si bloque

Reviens me dire :
- "genere privacy.html et delete-account.html" → je les ecris
- "aide-moi a remplir le Play Console" → je te guide section par section
- "build ios echoue avec X" → on debug ensemble
- "ajoute la feature X avant submission" → on l'integre + OTA

Bon courage, le plus dur (le code) est deja fait. ✊
