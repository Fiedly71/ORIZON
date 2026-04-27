# ORIZON - Deploiement production

## 1. Edge Functions Supabase (Stripe + MonCash)

Pre-requis : Supabase CLI installe (`npm i -g supabase` ou `scoop install supabase`).

### Login + link projet
```powershell
supabase login
supabase link --project-ref <YOUR_PROJECT_REF>
```

### Variables d'environnement (secrets serveur)
```powershell
supabase secrets set `
  STRIPE_SECRET_KEY=sk_live_xxxxx `
  STRIPE_WEBHOOK_SECRET=whsec_xxxxx `
  MONCASH_CLIENT_ID=xxxxx `
  MONCASH_CLIENT_SECRET=xxxxx `
  MONCASH_MODE=production
```

### Deployer les 4 fonctions
```powershell
supabase functions deploy stripe-create-payment-intent
supabase functions deploy stripe-webhook --no-verify-jwt
supabase functions deploy moncash-create-order
supabase functions deploy moncash-verify
```

### Configurer le webhook Stripe
1. Stripe Dashboard > Developers > Webhooks > Add endpoint
2. URL : `https://<PROJECT_REF>.functions.supabase.co/stripe-webhook`
3. Events :
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
4. Copier le `whsec_xxx` revele apres creation et le mettre dans `STRIPE_WEBHOOK_SECRET`.

### Tester
```powershell
# Test signature webhook (Stripe CLI)
stripe listen --forward-to https://<PROJECT_REF>.functions.supabase.co/stripe-webhook
stripe trigger payment_intent.succeeded
```

## 2. Codemagic - variables d'environnement

### Group `orizon_env` (deja configure)
```
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
EXPO_PUBLIC_POSTHOG_KEY=phc_xxx
EXPO_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
EXPO_PUBLIC_COMPANY_NAME=ORIZON Haiti
EXPO_PUBLIC_COMPANY_ADDRESS=Port-au-Prince, Haiti
EXPO_PUBLIC_COMPANY_WEBSITE=https://orizon.ht
EXPO_PUBLIC_SUPPORT_EMAIL=support@orizon.ht
EXPO_PUBLIC_SUPPORT_PHONE=+50930000000
EXPO_PUBLIC_SUPPORT_WHATSAPP=+50930000000
```

### Group `orizon_keystore` (PROD Android)
```
ORIZON_UPLOAD_KEYSTORE_B64=<base64 du fichier .keystore>
ORIZON_KEYSTORE_PASS=<mdp keystore>
ORIZON_KEY_ALIAS=orizon-upload
ORIZON_KEY_PASS=<mdp cle>
```

Pour encoder le keystore en base64 (PowerShell) :
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("orizon-upload.keystore")) | Set-Clipboard
```

### Group `orizon_ios`
- Pas de variables a definir manuellement : Codemagic > Teams > Code signing identities gere les certificats Apple.
- Codemagic > Teams > Integrations > App Store Connect : ajouter une API Key (.p8).

## 3. Lancer les builds

Sur GitHub, push vers main declenche automatiquement (si configure) :
- `android-debug` : APK debug pour test interne
- `android-release` : APK release signe (test prod)
- `android-aab` : AAB Play Store (a uploader manuellement OU via Codemagic publishing)
- `ios-release` : .ipa + upload TestFlight automatique

Pour lancer manuellement : Codemagic dashboard > selectionner workflow > "Start new build".

## 4. Generation des assets (icones + splash)

Voir [scripts/generate-assets.ps1](scripts/generate-assets.ps1) - convertit un PNG source en toutes les tailles requises.

## 5. Mise en prod monitoring

### Sentry
- Creer projet React Native sur sentry.io
- Recuperer DSN : `EXPO_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx`
- Ajouter dans Codemagic env group `orizon_env`
- Verifier alerte mail si crash rate > 1%

### PostHog
- Cle publique deja dans `EXPO_PUBLIC_POSTHOG_KEY`
- Dashboard recommandes : DAU / MAU / Retention D1-D7-D30 / Funnel inscription -> publication

## 6. Backups Supabase
- Plan **Pro** ($25/mois) : daily backups + 14 jours retention + point-in-time recovery
- Sans Pro : exporter manuellement chaque semaine via `pg_dump`

## 7. Domaine custom (optionnel)
- DNS `app.orizon.ht` -> CNAME vers `<project>.supabase.co`
- Supabase Dashboard > Settings > API > Custom domains

---

**Apres tout cela** : build via Codemagic, test sur device reel, soumission stores. Voir [STORE_CHECKLIST.md](STORE_CHECKLIST.md).
