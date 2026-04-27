# ORIZON - Checklist publication App Store + Play Store

## 1. Comptes developpeur
- [ ] **Apple Developer Program** (99 USD/an) — https://developer.apple.com/programs/
- [ ] **Google Play Console** (25 USD une fois) — https://play.google.com/console/
  - Verification d'identite obligatoire (passeport / CIN), 2-7 jours

## 2. Build production
- [ ] Lancer Codemagic workflow `android-aab` → recupere `app-release.aab`
- [ ] Lancer Codemagic workflow `ios-release` → publie auto sur TestFlight
- [ ] Tester l'AAB sur device physique via `bundletool build-apks`
- [ ] Tester TestFlight sur iPhone reel

## 3. Signature Android (PROD)
- [ ] Generer keystore prod (a faire UNE seule fois, garder en lieu sur):
  ```bash
  keytool -genkeypair -v -keystore orizon-upload.keystore -alias orizon-upload \
    -keyalg RSA -keysize 2048 -validity 10000
  ```
- [ ] Encoder en base64: `base64 orizon-upload.keystore > keystore.b64`
- [ ] Ajouter dans Codemagic env group `orizon_keystore`:
  - `ORIZON_UPLOAD_KEYSTORE_B64` (contenu du fichier .b64)
  - `ORIZON_KEYSTORE_PASS`
  - `ORIZON_KEY_ALIAS` = `orizon-upload`
  - `ORIZON_KEY_PASS`
- [ ] **Activer Play App Signing** dans Play Console (Google gere la cle de signature finale)

## 4. Signature iOS (PROD)
- [ ] Creer un certificat Distribution dans Apple Developer (Certificates, IDs & Profiles)
- [ ] Creer un App ID `com.orizon.mobile` (activer Push Notifications)
- [ ] Creer un provisioning profile App Store
- [ ] Uploader cert .p12 + profile dans Codemagic > Teams > Code signing identities
- [ ] Generer une App Store Connect API Key (.p8) → Codemagic > Integrations

## 5. Assets stores
### Icones
- [ ] iOS: 1024x1024 PNG, sans transparence, sans coins arrondis (Apple les ajoute)
- [ ] Android: 512x512 PNG (Play Store) + adaptive icon dans `app.json`

### Screenshots (a faire sur device reel ou simulateur)
- [ ] iPhone 6.7" (1290x2796) - 3 minimum, 10 max
- [ ] iPhone 6.5" (1242x2688)
- [ ] iPhone 5.5" (1242x2208) - optionnel
- [ ] iPad 12.9" (2048x2732) - obligatoire si supportsTablet=true
- [ ] Android Phone (1080x1920 ou ratio 16:9)
- [ ] Android Tablet 7" + 10"

### Feature Graphic Play Store
- [ ] 1024x500 PNG/JPG

## 6. Pages legales (HEBERGER en HTTPS)
- [x] [privacy.html](privacy.html) → uploader sur https://orizon.ht/privacy
- [x] [terms.html](terms.html) → uploader sur https://orizon.ht/terms
- [x] [support.html](support.html) → uploader sur https://orizon.ht/support

## 7. Privacy Manifest iOS
- [x] [react-native-app/ios/PrivacyInfo.xcprivacy](react-native-app/ios/PrivacyInfo.xcprivacy) cree
- [ ] Verifier qu'il est inclus dans le bundle apres `expo prebuild`

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
