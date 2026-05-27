# Finaliser Resend pour les emails ORIZON

But : faire partir tous les emails Supabase (confirmation inscription, reset password, magic link, changement email) via **Resend**, avec le branding ORIZON, depuis ton domaine.

---

## Prerequis : un nom de domaine

**Resend exige un domaine verifie** (DNS). Tu ne peux PAS envoyer depuis `@gmail.com` via Resend en production.

Options :
- **A.** Tu as deja un domaine (ex : `orizon.ht`, `orizonhaiti.com`) -> on l'utilise.
- **B.** Tu n'en as pas -> achete-en un (~12 USD/an chez Namecheap, OVH, Gandi). Recommande : `orizonhaiti.com` ou `orizon.app`.
- **C.** Pour tester maintenant sans domaine : Resend te laisse envoyer **uniquement vers ta propre adresse** depuis `onboarding@resend.dev`. Utile pour valider la config, pas pour la prod.

> Pour la suite je suppose que tu utilises un domaine `orizon.ht` (remplace par le tien).

---

## Etape 1 : creer le compte Resend et ajouter le domaine

1. Va sur https://resend.com -> Sign up (gratuit, 3 000 emails/mois)
2. **Domains** -> Add Domain -> `orizon.ht`
3. Resend te montre 3 enregistrements DNS a ajouter :
   - `MX` (record)
   - `TXT` SPF
   - `TXT` DKIM
4. Va chez ton registrar (Namecheap/OVH/etc) -> zone DNS -> ajoute les 3 records exactement comme indique.
5. Reviens sur Resend et clique **Verify**. La propagation prend de 5 minutes a 24 heures.
6. Une fois verifie (badge vert), va dans **API Keys** -> Create API Key -> Permission **Sending access** -> nom `supabase-smtp`.
7. **Copie la cle** (elle commence par `re_...`). Tu ne la reverras qu'une fois.

---

## Etape 2 : configurer SMTP Resend dans Supabase

1. Dashboard Supabase -> Project Settings -> **Authentication** -> section **SMTP Settings**
2. Coche **Enable Custom SMTP**
3. Remplis :

   | Champ | Valeur |
   |---|---|
   | Host | `smtp.resend.com` |
   | Port | `465` |
   | Username | `resend` |
   | Password | `re_xxxxxxxx` (ta cle Resend) |
   | Sender email | `noreply@orizon.ht` |
   | Sender name | `ORIZON` |
   | Minimum interval | `60` secondes |

4. Clique **Save**.
5. Bouton **Send test email** -> ton adresse -> verifie reception.

---

## Etape 3 : installer les templates HTML ORIZON

Les templates sont dans [supabase/templates/](.) :

- [confirm-signup.html](confirm-signup.html) -> email de confirmation a l'inscription
- [reset-password.html](reset-password.html) -> reset mot de passe
- [magic-link.html](magic-link.html) -> connexion par lien magique
- [email-change.html](email-change.html) -> changement d'adresse email

**Pour chaque template** :

1. Dashboard Supabase -> Authentication -> **Email Templates**
2. Onglet **Confirm signup** -> efface le contenu existant -> colle le contenu de `confirm-signup.html` -> change le **Subject** en `Confirme ton email - ORIZON` -> Save
3. Onglet **Reset Password** -> colle `reset-password.html` -> Subject : `Reinitialise ton mot de passe - ORIZON` -> Save
4. Onglet **Magic Link** -> colle `magic-link.html` -> Subject : `Ton lien de connexion ORIZON` -> Save
5. Onglet **Change Email Address** -> colle `email-change.html` -> Subject : `Confirme ton nouvel email ORIZON` -> Save

---

## Etape 4 : configurer les Redirect URLs

Pour que les liens des emails renvoient au bon endroit :

1. Dashboard Supabase -> Authentication -> **URL Configuration**
2. **Site URL** : `https://orizon-pi.vercel.app`
3. **Redirect URLs** (ajoute toutes ces lignes) :
   ```
   https://orizon-pi.vercel.app
   https://orizon-pi.vercel.app/*
   https://orizon.ht
   https://orizon.ht/*
   orizon://*
   exp://*
   ```
4. Save.

---

## Etape 5 : tester en bout en bout

1. Va sur https://orizon-pi.vercel.app
2. Cree un compte avec une vraie adresse email
3. Ouvre ta boite -> tu dois recevoir l'email **ORIZON branded** (bleu roi + or) en quelques secondes
4. Clique le bouton **Confirmer mon email**
5. Tu es redirige vers le site, le compte est actif
6. Deconnecte-toi, teste **Mot de passe oublie ?** -> verifie l'email de reset

---

## Depannage

| Symptome | Solution |
|---|---|
| Email non recu | Verifier dans Resend > Logs ; si DNS pas verifie, attendre/recreer les records |
| "From address not verified" | Domaine pas encore valide cote Resend, attendre la propagation |
| Email arrive en spam | Ajouter aussi un record **DMARC** : `_dmarc.orizon.ht  TXT  "v=DMARC1; p=none; rua=mailto:kayorizoncontact@gmail.com"` |
| Lien email pointe vers `localhost` | Verifier **Site URL** dans URL Configuration |
| 429 rate limit Supabase | Augmenter "Minimum interval" a 60s ou plus |

---

## Quotas

- Resend gratuit : **3 000 emails/mois**, 100/jour
- Resend Pro (20 USD/mois) : 50 000 emails/mois
- Supabase rate limit par defaut sur signup : 30 emails/heure par projet (peut etre augmente sur plans payants)
