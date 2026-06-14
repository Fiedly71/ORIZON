# Edge Function : `send-email`

Envoie des emails transactionnels ORIZON-branded via **Resend** (sender `noreply@kayorizon.com`, reply-to `admin@kayorizon.com`).

---

## 1. Deployer

```powershell
cd C:\Users\Tic Isteah\Documents\orizon
supabase functions deploy send-email --no-verify-jwt
```

> `--no-verify-jwt` permet d'appeler la fonction depuis un trigger DB ou un client non-authentifie. Si tu veux restreindre aux utilisateurs connectes uniquement, retire le flag.

---

## 2. Configurer le secret Resend

Dashboard Supabase -> **Project Settings** -> **Edge Functions** -> **Secrets** -> Add new secret :

| Key | Value |
|---|---|
| `RESEND_API_KEY` | `re_xxxxxxxx` (cle creee dans Resend) |

Puis redeploy la fonction pour qu'elle prenne le nouveau secret.

---

## 3. Templates disponibles

| Template | Donnees attendues | Usage |
|---|---|---|
| `visit-request` | `propertyTitle`, `buyerName`, `requestedDate`, `message?`, `visitId` | Acheteur demande une visite -> notif au proprietaire |
| `visit-confirmed` | `propertyTitle`, `buyerName`, `scheduledDate`, `address`, `visitId` | Proprietaire accepte -> notif acheteur |
| `visit-cancelled` | `propertyTitle`, `scheduledDate`, `reason?` | Annulation |
| `new-message` | `senderName`, `propertyTitle`, `preview`, `threadId` | Nouveau message in-app |
| `price-drop` | `propertyTitle`, `oldPrice`, `newPrice`, `dropPercent`, `propertyId` | Baisse de prix sur bien favori |
| `payment-success` | `amount`, `currency`, `method`, `reference`, `description?`, `paymentId` | Confirmation paiement MonCash/Stripe |
| `kyc-approved` | `userName` | KYC valide |
| `kyc-rejected` | `reason?` | KYC refuse |
| `custom` | requiert `subject` + `html` dans le body racine | Email custom complet |

---

## 4. Appel depuis l'app

```js
import { supabase } from '../services/supabase';

await supabase.functions.invoke('send-email', {
  body: {
    to: 'proprio@example.com',
    template: 'visit-request',
    data: {
      propertyTitle: 'Villa Cap-Haitien 4ch',
      buyerName: 'Marie Dupont',
      requestedDate: '20 juin 2026 a 14h',
      message: 'Bonjour, je suis interesse par votre bien.',
      visitId: '550e8400-e29b-41d4-a716-446655440000',
    },
  },
});
```

## 5. Appel depuis un trigger DB (recommande pour `visit-request`)

```sql
-- supabase/functions/send-email/trigger-visits.sql
create or replace function public.notify_visit_request()
returns trigger
language plpgsql
security definer
as $$
declare
  v_owner_email text;
  v_buyer_name  text;
  v_title       text;
begin
  -- recupere email du proprietaire + titre du bien + nom acheteur
  select p.owner_email, p.title, coalesce(u.full_name, u.email)
    into v_owner_email, v_title, v_buyer_name
  from public.properties p
  left join public.profiles u on u.user_id = new.buyer_id
  where p.id = new.property_id;

  if v_owner_email is null then return new; end if;

  -- appel async de l'Edge Function
  perform net.http_post(
    url     := current_setting('app.settings.supabase_url') || '/functions/v1/send-email',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body    := jsonb_build_object(
      'to',       v_owner_email,
      'template', 'visit-request',
      'data', jsonb_build_object(
        'propertyTitle',   v_title,
        'buyerName',       v_buyer_name,
        'requestedDate',   to_char(new.requested_at, 'DD/MM/YYYY HH24:MI'),
        'message',         new.message,
        'visitId',         new.id
      )
    )
  );
  return new;
end;
$$;

drop trigger if exists trg_notify_visit_request on public.visits;
create trigger trg_notify_visit_request
  after insert on public.visits
  for each row execute procedure public.notify_visit_request();
```

> Requiert l'extension `pg_net` : `create extension if not exists pg_net;`
> Et les settings : `alter database postgres set "app.settings.supabase_url" = 'https://vghcduobhuccmsvlbokv.supabase.co'; alter database postgres set "app.settings.service_role_key" = '<service_role_key>';`

---

## 6. Test rapide en local

```powershell
$body = @{
  to       = 'admin@kayorizon.com'
  template = 'visit-request'
  data     = @{ propertyTitle='Villa test'; buyerName='Test User'; requestedDate='demain 14h'; visitId='test-123' }
} | ConvertTo-Json -Depth 5

curl -X POST "https://vghcduobhuccmsvlbokv.supabase.co/functions/v1/send-email" `
  -H "Content-Type: application/json" `
  -H "apikey: $env:SUPABASE_ANON_KEY" `
  -d $body
```

Reponse OK :
```json
{ "ok": true, "id": "abc123-resend-id", "to":["admin@kayorizon.com"], "template":"visit-request", "subject":"..." }
```

---

## 7. Monitoring

- Dashboard Resend > **Logs** : voir chaque envoi (status, ouverture, click si tracking active)
- Dashboard Supabase > **Edge Functions** > `send-email` > Logs : voir les erreurs cote function
