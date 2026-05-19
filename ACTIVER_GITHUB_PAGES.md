# Activer GitHub Pages pour ORIZON (5 minutes)

Les URLs juridiques requises par Google Play et Apple App Store
(Politique de confidentialite, CGU, Support, Suppression de compte) sont deja
prepares dans ce repo a la racine :

- `privacy.html`
- `terms.html`
- `support.html`
- `delete-account.html`

Il faut juste **activer GitHub Pages** pour qu'elles soient accessibles publiquement.

## Etapes

1. Va sur https://github.com/Fiedly71/ORIZON/settings/pages
2. Section **Build and deployment** :
   - **Source** : `Deploy from a branch`
   - **Branch** : `main` / `(root)`
   - Clique **Save**
3. Attends ~1-2 minutes. Recharge la page.
4. En haut de la page, GitHub affichera :
   `Your site is live at https://fiedly71.github.io/ORIZON/`

## Verification

Ouvre dans ton navigateur :

| URL | Doit afficher |
|---|---|
| https://fiedly71.github.io/ORIZON/privacy.html | Politique de confidentialite |
| https://fiedly71.github.io/ORIZON/terms.html | Conditions d'utilisation |
| https://fiedly71.github.io/ORIZON/support.html | Page de support |
| https://fiedly71.github.io/ORIZON/delete-account.html | Procedure suppression compte |

## A coller dans Google Play Console

- **Politique de confidentialite** : https://fiedly71.github.io/ORIZON/privacy.html
- **Email support** : support@orizon.ht (deja dans `play-store/store-listing.md`)
- **URL site web** : https://fiedly71.github.io/ORIZON/

## A coller dans App Store Connect

- **Privacy Policy URL** : https://fiedly71.github.io/ORIZON/privacy.html
- **Marketing URL** : https://fiedly71.github.io/ORIZON/
- **Support URL** : https://fiedly71.github.io/ORIZON/support.html

## Domaine personnalise (optionnel, plus tard)

Quand tu auras achete `orizon.ht` ou `orizon.app` :
1. Settings > Pages > Custom domain : `www.orizon.ht`
2. Chez ton registrar : CNAME `www` -> `fiedly71.github.io`
3. Coche **Enforce HTTPS** apres validation
