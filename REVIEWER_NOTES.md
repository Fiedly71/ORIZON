# ORIZON - Comptes de demonstration pour reviewers Apple/Google

A fournir dans la console App Store Connect (Test Information) et Google Play Console (App content > App access).

## Identifiants

| Role | Email | Mot de passe |
|---|---|---|
| Acheteur / Locataire | demo.acheteur@orizon.ht | Demo2026!Orizon |
| Proprietaire (KYC valide) | demo.proprio@orizon.ht | Demo2026!Orizon |
| Agence (KYC valide) | demo.agence@orizon.ht | Demo2026!Orizon |

## Setup

1. Cree les 3 users dans **Supabase Studio > Authentication > Add user**
2. Coche "Auto Confirm User" pour skipper la verification email
3. Lance `db/demo_seed.sql` dans le SQL Editor pour creer les profils + 5 annonces

## Notes pour le reviewer (a coller dans App Store Connect "Notes")

```
Pour tester ORIZON, utilisez l'un des 3 comptes demo:
- Acheteur: demo.acheteur@orizon.ht
- Proprietaire: demo.proprio@orizon.ht  (peut publier des annonces)
- Agence: demo.agence@orizon.ht         (peut publier des annonces)
Mot de passe partage: Demo2026!Orizon

Le compte "demo.proprio" a deja un KYC valide donc peut tester le flow de
publication. Le paiement de publication (20 USD ou 2500 HTG) utilise des
cartes de test Stripe (4242 4242 4242 4242 - exp 12/30 - CVC 123).

ORIZON est un service immobilier de mise en relation. Les transactions
reelles entre acheteur et vendeur se font hors application (signature
notariee), conformement a la guideline 3.1.3(e) "real-world services".
```
