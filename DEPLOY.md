# Deploiement ORIZON

## 1. Configurer Supabase

Dashboard Supabase → **Settings → API** :

```env
EXPO_PUBLIC_SUPABASE_URL=https://vghcduobhuccmsvlbokv.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...   # cle "anon public" (PAS service_role)
```

> ⚠️ Ne committe **jamais** la cle `service_role`. Elle ne sert que dans les Edge Functions.

## 2. Executer les SQL (dans l'ordre)

Dashboard Supabase → **SQL Editor** → coller chaque fichier :

1. `db/properties.sql`
2. `db/storage.sql`
3. `db/push_tokens.sql`
4. `db/visits.sql`
5. `db/payments.sql`
6. `db/kyc.sql`
7. `db/reviews.sql`
8. `db/reports.sql`
9. `db/price_history.sql`

## 3. Edge Functions paiements

Depuis `supabase/functions/` (a creer) :

- `create-payment-intent` (Stripe) : crée un PaymentIntent et renvoie le client_secret + ephemeralKey + customer.
- `moncash-create` : initie un paiement MonCash et renvoie l'URL de redirection.

```bash
supabase login
supabase link --project-ref vghcduobhuccmsvlbokv
supabase functions deploy create-payment-intent
supabase functions deploy moncash-create
supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx MONCASH_CLIENT_ID=xxx MONCASH_CLIENT_SECRET=xxx
```

## 4. Build EAS

```bash
npm i -g eas-cli
cd react-native-app
eas login
eas init                              # une seule fois
eas build --platform android --profile preview   # APK de test
eas build --platform android --profile production
eas build --platform ios --profile production    # necessite compte Apple Developer
```

## 5. Soumission stores

```bash
eas submit --platform android --latest
eas submit --platform ios --latest
```

## 6. OTA Updates (sans rebuild)

```bash
eas update --branch production --message "Hotfix: ..."
```

## 7. Variables EAS

Definir les EXPO_PUBLIC_* dans le dashboard EAS (Settings → Environment Variables) pour qu'elles soient injectees a chaque build :

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_POSTHOG_KEY` (optionnel)
