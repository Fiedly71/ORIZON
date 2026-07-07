// Service de generation et partage de documents legaux PDF (offre d'achat,
// promesse de vente, mandat de visite). Utilise expo-print + expo-sharing.
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

function escapeHtml(s = '') {
  return String(s)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function pageWrapper(title, body) {
  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<style>
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; padding: 36px; color: #0F172A; }
  h1 { color: #1D4ED8; font-size: 22px; margin-bottom: 4px; letter-spacing: 1px; }
  h2 { color: #0F172A; font-size: 14px; margin: 18px 0 6px; }
  .brand { font-size: 11px; letter-spacing: 4px; color: #1D4ED8; font-weight: 700; }
  .meta { color: #64748B; font-size: 12px; margin-bottom: 18px; }
  .row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #E2E8F0; }
  .row b { color: #0F172A; font-size: 12px; }
  .row span { color: #475569; font-size: 12px; }
  p { font-size: 12px; line-height: 1.55; color: #1F2937; }
  .sign { margin-top: 36px; display: flex; justify-content: space-between; }
  .sign div { width: 45%; border-top: 1px solid #94A3B8; padding-top: 6px; font-size: 11px; color: #64748B; }
  .footer { margin-top: 32px; font-size: 10px; color: #94A3B8; text-align: center; }
</style></head>
<body>
  <div class="brand">ORIZON</div>
  <h1>${escapeHtml(title)}</h1>
  <div class="meta">Document genere le ${new Date().toLocaleDateString('fr-FR')}</div>
  ${body}
  <div class="footer">Ce document est un modele indicatif. Faites valider par un notaire avant signature.</div>
</body></html>`;
}

function rows(obj) {
  return Object.entries(obj)
    .map(([k, v]) => `<div class="row"><b>${escapeHtml(k)}</b><span>${escapeHtml(v)}</span></div>`)
    .join('');
}

export function buildPurchaseOfferHtml({ property, buyer, offerAmount, conditions }) {
  const body = `
    <h2>Bien immobilier</h2>
    ${rows({ Titre: property.title, Localisation: property.location, Type: property.type,
             Surface: `${property.area || '-'} m2`, Prix_demande: `$${(property.price || 0).toLocaleString()}` })}
    <h2>Acheteur</h2>
    ${rows({ Nom: buyer.fullName, Email: buyer.email, Telephone: buyer.phone || '-' })}
    <h2>Offre</h2>
    ${rows({ Montant_propose: `$${Number(offerAmount).toLocaleString()}`,
             Conditions: conditions || 'Aucune condition particuliere' })}
    <p>L'acheteur soumet par la presente une offre formelle pour l'acquisition du bien decrit ci-dessus, sous reserve de la vérification des titres et de l'inspection du bien.</p>
    <div class="sign"><div>Acheteur</div><div>Vendeur</div></div>
  `;
  return pageWrapper("Offre d'achat", body);
}

export function buildVisitMandateHtml({ property, visitor, scheduledAt }) {
  const body = `
    <h2>Bien</h2>
    ${rows({ Titre: property.title, Localisation: property.location })}
    <h2>Visiteur</h2>
    ${rows({ Nom: visitor.fullName, Telephone: visitor.phone || '-' })}
    <h2>Visite</h2>
    ${rows({ Date_et_heure: new Date(scheduledAt).toLocaleString('fr-FR') })}
    <p>Le visiteur s'engage a respecter les consignes de visite et a ne prendre aucune photo sans l'accord du propriétaire.</p>
    <div class="sign"><div>Visiteur</div><div>Agent / Propriétaire</div></div>
  `;
  return pageWrapper('Mandat de visite', body);
}

export async function generateAndShare(html, { fileName = 'document.pdf' } = {}) {
  const { uri } = await Print.printToFileAsync({ html });
  if (!uri) return { ok: false, error: 'Échec de generation' };
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: fileName });
  }
  return { ok: true, uri };
}
