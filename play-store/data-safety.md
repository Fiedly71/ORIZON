# ORIZON — Google Play Data Safety form

Réponses pré-remplies à recopier dans **Play Console → App content → Data safety**.

---

## 1. Data collection and security

| Question | Réponse |
|---|---|
| Does your app collect or share any of the required user data types? | **Yes** |
| Is all of the user data collected by your app encrypted in transit? | **Yes** (HTTPS / TLS via Supabase + Cloudflare) |
| Do you provide a way for users to request that their data be deleted? | **Yes** (in-app : Profil → Supprimer mon compte, et email contact@orizon.ht) |

---

## 2. Data types collected

### Personal info
- **Name** — Collected. Optional. Purpose : Account management, App functionality.
- **Email address** — Collected. Required. Purpose : Account management, Communications.
- **Phone number** — Collected. Optional. Purpose : Account management, App functionality (contact propriétaire ↔ acheteur).
- **User IDs** — Collected. Required. Purpose : Account management.

### Financial info
- **User payment info** — Collected. Optional. Purpose : App functionality (frais de publication MonCash / virement).
  - Note : on ne stocke **pas** les numéros de carte. On stocke le reçu / référence MonCash uniquement.

### Location
- **Approximate location** — Collected. Optional. Purpose : App functionality (filtrer biens par ville).
- **Precise location** — Collected. Optional. Purpose : App functionality (carte interactive, géolocaliser un bien à vendre).

### Messages
- *Not collected.* (Les contacts entre acheteurs et vendeurs se font hors-app via téléphone/WhatsApp.)

### Photos and videos
- **Photos** — Collected. Required pour publier. Purpose : App functionality (photos des biens immobiliers).

### Files and docs
- **Files and docs** — Collected. Optional. Purpose : App functionality (documents KYC : CIN, NIF, patente).

### App activity
- **App interactions** — Collected. Optional. Purpose : Analytics (PostHog, anonymisé après consentement ATT iOS).
- **In-app search history** — Collected. Optional. Purpose : Analytics, App functionality (suggestions).

### App info and performance
- **Crash logs** — Collected. Required. Purpose : Analytics (Expo).
- **Diagnostics** — Collected. Required. Purpose : Analytics.

### Device or other IDs
- **Device or other IDs** — Collected. Required. Purpose : Analytics, Fraud prevention (Expo push token, device fingerprint pour notifications).

---

## 3. Data sharing

> **Aucune donnée n'est vendue à des tiers.**

Données partagées avec des prestataires (sub-processors) :

| Donnée | Prestataire | Raison |
|---|---|---|
| Email, name, phone, files (KYC) | **Supabase** (hébergement EU/US) | Backend / base de données |
| Email | **Supabase Auth** | Envoi email de vérification |
| Device ID + crash logs | **Expo / EAS** | Push notifications + crash reporting |
| App interactions (anonymisées) | **PostHog** | Analytics (opt-in iOS via ATT) |
| Photos des biens | **Supabase Storage** | Hébergement images |
| Référence paiement MonCash | **MonCash (Digicel Haïti)** | Traitement paiement frais de publication |

---

## 4. Security practices

- ✅ Data is encrypted in transit (HTTPS / TLS 1.2+)
- ✅ Users can request their data be deleted (in-app)
- ✅ Independent security review : *Non* (à activer plus tard)
- ✅ Follows Families Policy : *N/A — app 18+*
- ✅ Committed to Play Families Policy : *Non*

---

## 5. Data deletion

**Méthode 1 — in-app** :
Profil → Paramètres → Supprimer mon compte
→ Suppression immédiate du profil, des annonces et photos.

**Méthode 2 — email** :
Envoyer une demande à **contact@orizon.ht**
→ Traitement sous 30 jours conformément à la loi haïtienne sur les données.

URL publique : **https://orizon.ht/delete-account** (page à publier avant submission, requise par Play depuis 2024).

---

## 6. Privacy Policy

URL : **https://orizon.ht/privacy** (à publier — version disponible dans l'app : écran Privacy)

---

## Checklist avant submission

- [ ] Page web https://orizon.ht/privacy en ligne
- [ ] Page web https://orizon.ht/delete-account en ligne
- [ ] Compte support contact@orizon.ht actif
- [ ] Toutes les cases ci-dessus cochées dans Play Console
- [ ] Screenshots téléversés (voir play-store/capture_screenshots.ps1)
- [ ] Feature graphic 1024×500 téléversé (play-store/feature-graphic.svg → exporter en PNG)
- [ ] Icon 512×512 téléversé (depuis assets/icon.png)
- [ ] AAB signé téléversé (build via Codemagic workflow `android-production-aab`)
