# Finaliser Resend pour les emails ORIZON (kayorizon.com)

But : faire partir tous les emails Supabase (confirmation inscription, reset password, magic link, changement email) via **Resend**, avec le branding ORIZON, depuis le domaine pro **kayorizon.com**.

> Email pro officiel : `admin@kayorizon.com`
> Sender transactionnel : `noreply@kayorizon.com`
> Domaine : `kayorizon.com`

---

## Etape 1 : ajouter kayorizon.com dans Resend

1. Va sur https://resend.com -> Sign up (gratuit, 3 000 emails/mois) ou Sign in.
2. **Domains** -> **Add Domain** -> `kayorizon.com` -> Region `North Virginia (us-east-1)`.
3. Resend affiche 4-5 enregistrements DNS a creer chez le registrar (Vercel/Cloudflare/Namecheap/etc) :
   - `MX` `send.kayorizon.com` -> `feedback-smtp.us-east-1.amazonses.com` (priorite 10)
   - `TXT` `send.kayorizon.com` -> `"v=spf1 include:amazonses.com ~all"`
   - `TXT` `resend._domainkey.kayorizon.com` -> longue cle DKIM
   - (optionnel mais recommande) `TXT` `_dmarc.kayorizon.com` -> `"v=DMARC1; p=none; rua=mailto:admin@kayorizon.com"`
4. **Cote DNS** :
   - Si tu utilises **Vercel DNS** (probable car le site est sur Vercel) : Vercel Dashboard -> Domains -> kayorizon.com -> DNS Records -> Add chaque record.
   - Sinon va chez ton registrar et ajoute les 3 records exactement comme indique.
5. Reviens sur Resend et clique **Verify DNS Records**. Propagation : 5 min a 24 h (souvent < 1 h).
6. Une fois le domaine en **Verified** (badge vert) : Resend -> **API Keys** -> Create API Key -> Permission **Sending access** -> Domain `kayorizon.com` -> nom `supabase-smtp`.
7. **Copie la cle** (commence par `re_...`). Tu ne la reverras qu'une fois -> stocke-la dans un gestionnaire de mots de passe.

---

## Etape 2 : configurer SMTP Resend dans Supabase

1. Dashboard Supabase (`vghcduobhuccmsvlbokv`) -> **Project Settings** -> **Authentication** -> section **SMTP Settings**
2. Coche **Enable Custom SMTP**
3. Remplis :

   | Champ | Valeur |
   |---|---|
   | Host | `smtp.resend.com` |
   | Port | `465` |
   | Username | `resend` |
   | Password | `re_xxxxxxxx` (ta cle Resend creee a l'etape 1) |
   | Sender email | `noreply@kayorizon.com` |
   | Sender name | `ORIZON` |
   | Minimum interval | `60` secondes |

4. Clique **Save**.
5. Bouton **Send test email** -> mets `admin@kayorizon.com` -> verifie la reception (boite admin Gmail si tu rediriges, ou directement dans la boite hebergee).

---

## Etape 3 : installer les templates HTML ORIZON

Les templates ORIZON-branded (banner gradient bleu roi -> badge or "ORIZON" -> CTA bleu) sont dans [supabase/templates/](.) :

- [confirm-signup.html](confirm-signup.html) -> email de confirmation a l'inscription
- [reset-password.html](reset-password.html) -> reset mot de passe
- [magic-link.html](magic-link.html) -> connexion par lien magique
- [email-change.html](email-change.html) -> changement d'adresse email

**Pour chaque template** :

1. Dashboard Supabase -> Authentication -> **Email Templates**
2. Onglet **Confirm signup** -> efface le contenu existant -> colle le contenu de `confirm-signup.html` -> Subject : `Confirme ton email - ORIZON` -> Save
3. Onglet **Reset Password** -> colle `reset-password.html` -> Subject : `Reinitialise ton mot de passe - ORIZON` -> Save
4. Onglet **Magic Link** -> colle `magic-link.html` -> Subject : `Ton lien de connexion ORIZON` -> Save
5. Onglet **Change Email Address** -> colle `email-change.html` -> Subject : `Confirme ton nouvel email ORIZON` -> Save

> **Rappel** : les templates ne sont **pas** synchronises automatiquement via git. A chaque update de fichier `.html` dans `supabase/templates/`, il faut re-coller manuellement dans le dashboard.

---

## Etape 4 : configurer les Redirect URLs

Pour que les liens des emails renvoient sur kayorizon.com :

1. Dashboard Supabase -> Authentication -> **URL Configuration**
2. **Site URL** : `https://kayorizon.com`
3. **Redirect URLs** (ajoute toutes ces lignes) :
   ```
   https://kayorizon.com
   https://kayorizon.com/*
   https://orizon-pi.vercel.app
   https://orizon-pi.vercel.app/*
   orizon://*
   exp://*
   ```
4. Save.

---

## Etape 5 : tester en bout en bout

1. Va sur https://kayorizon.com
2. Cree un compte avec une vraie adresse email (different de admin@kayorizon.com)
3. Ouvre ta boite -> tu dois recevoir l'email **ORIZON branded** (bleu roi + or) en quelques secondes
   - Sender visible : `ORIZON <noreply@kayorizon.com>`
4. Clique le bouton **Confirmer mon email** -> redirige vers kayorizon.com, compte actif
5. Deconnecte-toi, teste **Mot de passe oublie ?** -> verifie l'email de reset
6. Va dans **Profil -> Modifier l'email** -> change l'adresse -> verifie email-change

---

## Etape 6 : monitoring

- Dashboard Resend -> **Logs** : suis chaque envoi (Sent / Delivered / Bounced / Complaint)
- Si **bounce rate > 5 %** ou **complaint rate > 0.1 %**, Resend suspend le sending -> nettoyer la liste
- Webhook Resend (optionnel) : POST sur une Edge Function `/functions/v1/resend-webhook` pour tracker bounces dans la table `email_events`

---

## Depannage

| Symptome | Solution |
|---|---|
| Email non recu | Verifier dans Resend > Logs ; si DNS pas verifie, attendre la propagation ou recreer les records |
| "From address not verified" | Domaine pas encore valide cote Resend, refresh apres 30 min |
| Email arrive en spam | Verifie que **DMARC** est bien present : `_dmarc.kayorizon.com  TXT  "v=DMARC1; p=none; rua=mailto:admin@kayorizon.com"`. Apres 1 semaine de bons envois, passe a `p=quarantine`. |
| Lien email pointe vers `localhost` | Site URL = `https://kayorizon.com` dans URL Configuration |
| 429 rate limit Supabase | Augmenter "Minimum interval" a 60s ou plus, ou passer Supabase Pro |
| Domaine cote Vercel ne montre pas les TXT | Vercel Dashboard -> kayorizon.com -> DNS Records -> verifier que TTL n'est pas trop long (3600 ok) |

---

## Quotas

- Resend gratuit : **3 000 emails/mois**, 100/jour
- Resend Pro (20 USD/mois) : 50 000 emails/mois
- Supabase rate limit par defaut sur signup : 30 emails/heure par projet (augmente sur Pro)

---

## Adresses emails ORIZON officielles

| Usage | Adresse | Type |
|---|---|---|
| Contact pro / support / legal / DPO | `admin@kayorizon.com` | Mailbox reelle (hebergee) |
| Sender transactionnel (signup, reset, magic link) | `noreply@kayorizon.com` | Sender Resend (pas de mailbox) |
| Reply-To des emails transactionnels (optionnel) | `admin@kayorizon.com` | Redirige les reponses vers admin |

> Pour activer le **Reply-To**, ajoute dans le code Edge Function ou template Supabase :
> ```
> Reply-To: ORIZON Support <admin@kayorizon.com>
> ```
