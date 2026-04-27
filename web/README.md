# ORIZON Web preview

Pages publiques generees pour partages WhatsApp / Facebook / Twitter.
Quand un user partage un bien depuis l'app, le lien `https://orizon.app/p/<id>`
ouvre cette page (avec OG image), puis tente d'ouvrir l'app si installee, sinon
redirige vers les stores.

## Generation

```powershell
$env:SUPABASE_URL  = "https://xxxxx.supabase.co"
$env:SUPABASE_KEY  = "anon-key"
$env:PUBLIC_BASE   = "https://orizon.app"
node web/generate.js
```

Sortie:
- `web/p/<id>.html` une page par bien (statut paid)
- `web/sitemap.xml`

## Deploiement Vercel

```powershell
cd web
vercel --prod
```

Le `vercel.json` reecrit `/p/<id>` -> `/p/<id>.html`.

## Note marketing

Les meta `og:image`, `og:title`, `og:description` sont rendues automatiquement par WhatsApp / Facebook quand un lien est partage dans une conversation. Le rendu est mis en cache cote Facebook ~24h - utiliser https://developers.facebook.com/tools/debug/ pour forcer le refresh apres un changement de template.
