# ORIZON - Checklist publication App Store + Play Store

## 1. Comptes developpeur (SEULS BLOQUANTS RESTANTS)
- [ ] **Apple Developer Program** (99 USD/an) — https://developer.apple.com/programs/
- [ ] **Google Play Console** (25 USD une fois) — https://play.google.com/console/
  - Verification d'identite obligatoire (passeport / CIN), 2-7 jours

## 2. Build production
- [x] **Build AAB Android via EAS Cloud** — keystore auto-genere, lance le 19/05/2026
  - Build : https://expo.dev/accounts/fiedly71/projects/orizon-mobile/builds/f03073f9-06c1-46f0-a03a-b77f643231b3
- [x] Codemagic workflow `android-production-aab` configure (relais)
- [x] Codemagic workflow `ios-eas-build` configure (delegue build+signing a EAS Cloud)
- [ ] Lancer build iOS via `eas build --platform ios` (requiert compte Apple)
- [ ] Tester l'AAB sur device physique
- [ ] Tester TestFlight sur iPhone reel

## 3. Signature Android (PROD)
- [x] **Keystore prod genere et stocke par EAS Cloud** (server-side, geree automatiquement par Expo)
- [x] EAS gere la cle d'upload + Play App Signing prend le relais cote Google
- [ ] Activer Play App Signing dans Play Console (au moment de la 1ere upload AAB)

## 4. Signature iOS (PROD)
- [ ] Creer un certificat Distribution dans Apple Developer (Certificates, IDs & Profiles)
- [ ] Creer un App ID `com.orizon.mobile` (activer Push Notifications)
- [ ] Creer un provisioning profile App Store
- [ ] Uploader cert .p12 + profile dans Codemagic > Teams > Code signing identities
- [ ] Generer une App Store Connect API Key (.p8) → Codemagic > Integrations

## 5. Assets stores
### Icones
- [x] iOS: 1024x1024 PNG sans transparence (`react-native-app/assets/icon.png`)
- [x] Android: 512x512 PNG (`play-store/icon-512.png`) + adaptive icon 1024x1024 (`adaptive-icon.png`)

### Screenshots (a faire sur device reel ou simulateur)
- [x] Script automatise pret : `play-store/auto-screenshots.ps1` (8 deeplinks valides)
- [ ] iPhone 6.7" (1290x2796) - 3 minimum, 10 max (a capturer sur simulateur)
- [ ] iPhone 6.5" (1242x2688)
- [ ] iPad 12.9" (2048x2732) - obligatoire si supportsTablet=true
- [ ] Android Phone (1080x1920 ou ratio 16:9) — lancer `auto-screenshots.ps1` avec emulateur
- [ ] Android Tablet 7" + 10"

### Feature Graphic Play Store
- [x] `play-store/feature-graphic.png` 1024x500 PNG (logo officiel + 3 features + badge 2026)

## 6. Pages legales (HEBERGER en HTTPS) — LIVE
- [x] privacy.html — https://fiedly71.github.io/ORIZON/privacy.html (HTTP 200)
- [x] terms.html — https://fiedly71.github.io/ORIZON/terms.html (HTTP 200)
- [x] support.html — https://fiedly71.github.io/ORIZON/support.html (HTTP 200)
- [x] delete-account.html — https://fiedly71.github.io/ORIZON/delete-account.html (HTTP 200)
- [ ] Migrer vers https://orizon.ht/* quand le domaine sera achete (custom domain dans Settings > Pages)

## 7. Privacy Manifest iOS
- [x] [react-native-app/ios/PrivacyInfo.xcprivacy](react-native-app/ios/PrivacyInfo.xcprivacy) cree
- [x] Toutes les permissions iOS declarees dans `app.json` infoPlist (Location, Camera, PhotoLibrary, Tracking ATT)
- [ ] Verifier inclusion bundle apres premier build iOS EAS

## 8. Fiches stores - textes a preparer

### Nom (30 car max)
`ORIZON - Immobilier Haiti`

### Sous-titre iOS (30 car max)
`Acheter, louer, vendre`

### Description courte Play (80 car max)
`L'app immobiliere n°1 en Haiti. Achetez, louez, vendez en toute confiance.`

### Description longue (4000 car max)
```
ORIZON est la premiere plateforme immobiliere 100% haitienne.

POUR LES ACHETEURS / LOCATAIRES
- Parcourez des centaines d'annonces verifiees a Port-au-Prince, Petion-Ville, Cap-Haitien, et partout en Haiti
- Filtrez par type (maison, appartement, terrain), prix, surface, nombre de chambres
- Visualisez les biens sur la carte interactive
- Sauvegardez vos favoris et recevez des alertes
- Calculez votre mensualite avec le simulateur de pret
- Reservez une visite directement depuis l'app
- Contactez le proprietaire ou l'agence en un clic (WhatsApp, telephone, email)

POUR LES PROPRIETAIRES / AGENCES
- Publiez vos annonces en quelques minutes
- Verification KYC pour rassurer les acheteurs (badge "Verifie")
- Photos haute qualite avec compression automatique
- Suivez les statistiques (vues, contacts, favoris)
- Boostez vos annonces en "Premium" pour apparaitre en top
- Tableau de bord agence avec gestion multi-utilisateurs

PAIEMENTS SECURISES
- Stripe (carte bancaire internationale)
- MonCash (Digicel) pour payer en gourdes

LANGUES
- Francais
- Kreyol
- English

SECURITE
- Verification d'identite obligatoire pour publier
- Moderation des annonces et avis 24/7
- Blocage et signalement d'utilisateurs
- Vos donnees sont chiffrees et jamais vendues

Telecharger ORIZON, c'est rejoindre la communaute immobiliere de demain en Haiti.

Support : support@orizon.ht
Confidentialite : https://orizon.ht/privacy
Conditions : https://orizon.ht/terms
```

### Mots-cles iOS (100 car, separes par virgules)
`immobilier,haiti,maison,appartement,location,achat,vente,terrain,villa,kreyol,port-au-prince,kay`

### Categorie
- Apple : Lifestyle (primary) + Business (secondary)
- Google : Maison et Loisirs

### Classification d'age
- Apple : 17+ (a cause UGC + localisation precise) OU 12+ si moderation stricte
- Google : Tous publics avec filtres UGC

## 9. App Store Connect - reponses aux questions

### App Privacy
| Categorie | Linked | Tracking |
|-----------|--------|----------|
| Email Address | OUI | NON |
| Phone Number | OUI | NON |
| Name | OUI | NON |
| Photos | OUI | NON |
| Precise Location | NON (anonyme) | NON |
| Payment Info | OUI | NON |
| Crash Data | NON | NON |
| Product Interaction | NON | NON |

### Export Compliance
- "Does your app use encryption?" → **OUI** mais standard (HTTPS uniquement)
- "Exempt from export compliance?" → **OUI** (HTTPS standard, pas de crypto custom)

### Content Rights
- "Does your app contain, show or access third-party content?" → **OUI** (annonces publiees par utilisateurs, vous avez les droits)

## 10. Play Console - Data Safety

| Categorie | Collecte | Partage | Optionnel |
|-----------|----------|---------|-----------|
| Personal info (name, email, phone) | OUI | NON | NON |
| Photos | OUI | NON | OUI |
| Location (approximate + precise) | OUI | NON | OUI |
| Financial info | OUI | NON | NON |
| App activity | OUI | NON | OUI |
| Crash logs | OUI | NON | OUI |

## 11. Reviewers - infos de connexion
Fournir dans App Store Connect Review Notes :
```
Comptes de demonstration:
1. Acheteur: demo.acheteur@orizon.ht / Demo2026!Orizon
2. Proprietaire (KYC valide): demo.proprio@orizon.ht / Demo2026!Orizon
3. Agence (KYC valide): demo.agence@orizon.ht / Demo2026!Orizon

Notes:
- Les paiements Stripe sont en mode TEST (carte 4242 4242 4242 4242)
- MonCash est en mode sandbox (PIN: 1234)
- Suppression de compte: Profil > Parametres > Supprimer mon compte
- Blocage utilisateur: fiche profil > Bloquer
```

## 12. Tests obligatoires AVANT soumission
- [ ] Inscription / connexion / deconnexion
- [ ] Verification KYC (envoi photos)
- [ ] Publication annonce + paiement Stripe (carte test 4242)
- [ ] Publication annonce + paiement MonCash (sandbox)
- [ ] Recherche + filtres + carte
- [ ] Favoris + reviews + visites
- [ ] Notifications push (envoi + reception)
- [ ] **Suppression de compte** (Apple TESTERA ce flow)
- [ ] **Blocage utilisateur** (Apple TESTERA aussi)
- [ ] Mode hors-ligne (cache)
- [ ] Permissions refusees (camera, location) → app ne crash pas

## 13. Mise en prod backend
- [ ] Stripe : passer en mode **live** (cles live dans Codemagic env)
- [ ] Stripe webhook URL : https://<projet>.supabase.co/functions/v1/stripe-webhook
- [ ] MonCash : compte marchand prod valide chez Digicel
- [ ] Supabase : verifier RLS active sur TOUTES les tables (`select tablename, rowsecurity from pg_tables where schemaname='public'`)
- [ ] Domaine personnalise pour les Edge Functions (optionnel)
- [ ] Backup auto Supabase (Pro plan, 14 jours retention)

## 14. Apres publication
- [ ] Configurer Sentry alerts (email si crash > 1%)
- [ ] Configurer PostHog dashboards (DAU, retention D7)
- [ ] Plan de mises a jour mensuelles (correctifs + nouvelle features)
- [ ] Reponses aux reviews stores sous 48h

---

**Temps estime jusqu'a publication** :
- Apple : 2-7 jours review (parfois 24h)
- Google : 1-3 jours review (parfois quelques heures)
- Si rejet : compter 1 cycle de fix + re-soumission (~3 jours)
