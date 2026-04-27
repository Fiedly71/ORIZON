# ORIZON Edge Functions

Quatre fonctions Supabase Edge (Deno/TypeScript) pour basculer du sandbox au reel.

| Fonction | Role | Verify JWT |
|---|---|---|
| `stripe-create-payment-intent` | Cree un PaymentIntent + ligne payments(pending) | oui |
| `stripe-webhook` | Confirme via RPC `confirm_payment` sur `payment_intent.succeeded` | non |
| `moncash-create-order` | Cree l'ordre MonCash + retourne `redirectUrl` | oui |
| `moncash-verify` | Verifie l'orderId apres retour, RPC `confirm_payment` si OK | oui |

## Deploiement

```powershell
# 1. Login + link
supabase login
supabase link --project-ref <PROJECT_REF>

# 2. Secrets
supabase secrets set `
  STRIPE_SECRET_KEY=sk_live_xxx `
  STRIPE_WEBHOOK_SECRET=whsec_xxx `
  MONCASH_CLIENT_ID=xxx `
  MONCASH_CLIENT_SECRET=xxx `
  MONCASH_BASE=https://moncashbutton.digicelgroup.com

# 3. Deploy
supabase functions deploy stripe-create-payment-intent
supabase functions deploy stripe-webhook --no-verify-jwt
supabase functions deploy moncash-create-order
supabase functions deploy moncash-verify
```

## Cote app

Active le mode reel via env:

```
EXPO_PUBLIC_USE_REAL_PAYMENTS=true
```

Et installe les SDK natifs (rebuild EAS requis):

```powershell
cd react-native-app
yarn add @stripe/stripe-react-native expo-web-browser
```

## Stripe Webhook

Dashboard Stripe > Developers > Webhooks > Add endpoint:
```
https://<project-ref>.functions.supabase.co/stripe-webhook
```
Events: `payment_intent.succeeded`, `payment_intent.payment_failed`.

## MonCash sandbox vs prod

- Sandbox: `MONCASH_BASE=https://sandbox.moncashbutton.digicelgroup.com`
- Prod:    `MONCASH_BASE=https://moncashbutton.digicelgroup.com`

Pour la prod, demander a Digicel les `client_id` / `client_secret` officiels (compte marchand verifie + dossier KYC entreprise).
