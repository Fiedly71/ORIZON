// @ts-nocheck
// deno-lint-ignore-file
//
// Supabase Edge Function: send-email
// Envoie des emails transactionnels ORIZON-branded via Resend (sender: noreply@kayorizon.com).
//
// Body JSON:
//   {
//     to: 'user@x.com' | ['a@x.com','b@x.com'],
//     template: 'visit-request' | 'visit-confirmed' | 'visit-cancelled'
//             | 'new-message' | 'price-drop' | 'payment-success'
//             | 'kyc-approved' | 'kyc-rejected' | 'custom',
//     data: { ...variables specifiques au template },
//     subject?: 'override subject',     // facultatif (override template default)
//     html?: '<custom html>',           // requis si template === 'custom'
//     replyTo?: 'admin@kayorizon.com'   // defaut: admin@kayorizon.com
//   }
//
// Env requis (Supabase Dashboard > Project Settings > Edge Functions > Secrets):
//   RESEND_API_KEY = re_xxxxxxxx
//
// Deploy:
//   supabase functions deploy send-email --no-verify-jwt
//
// Appel depuis app/serveur:
//   await supabase.functions.invoke('send-email', { body: { to, template, data } })

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const SENDER = 'ORIZON <noreply@kayorizon.com>';
const DEFAULT_REPLY_TO = 'ORIZON Support <admin@kayorizon.com>';
const SITE_URL = 'https://kayorizon.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================
// Layout HTML branded ORIZON (gradient bleu roi + badge or)
// ============================================================
function shell({ title, intro, ctaLabel, ctaUrl, footerNote }: {
  title: string;
  intro: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote?: string;
}): string {
  const cta = ctaLabel && ctaUrl
    ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;">
         <tr><td style="background:#F5B301;border-radius:10px;">
           <a href="${ctaUrl}" style="display:inline-block;padding:14px 32px;color:#1E3A8A;font-size:15px;font-weight:800;text-decoration:none;">${ctaLabel}</a>
         </td></tr>
       </table>`
    : '';
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0F172A;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F8FAFC;padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,.08);">
      <tr><td style="background:linear-gradient(135deg,#1D4ED8 0%,#1E3A8A 100%);padding:32px;text-align:center;">
        <div style="display:inline-block;background:#F5B301;color:#1E3A8A;font-weight:900;font-size:18px;letter-spacing:2px;padding:8px 20px;border-radius:8px;">ORIZON</div>
        <p style="margin:12px 0 0;color:#E0E7FF;font-size:13px;">L'immobilier en Haiti, simplifie.</p>
      </td></tr>
      <tr><td style="padding:32px;">
        <h1 style="margin:0 0 12px;font-size:22px;color:#0F172A;">${title}</h1>
        <div style="font-size:15px;line-height:1.6;color:#334155;">${intro}</div>
        ${cta}
        ${footerNote ? `<div style="background:#E0E7FF;border-left:3px solid #1D4ED8;padding:14px 16px;border-radius:8px;margin-top:16px;"><p style="margin:0;font-size:13px;color:#1E3A8A;line-height:1.5;">${footerNote}</p></div>` : ''}
      </td></tr>
      <tr><td style="padding:24px 32px 32px;border-top:1px solid #E2E8F0;">
        <p style="margin:0;font-size:12px;color:#64748B;">Besoin d'aide ? <a href="mailto:admin@kayorizon.com" style="color:#1D4ED8;text-decoration:none;">admin@kayorizon.com</a></p>
      </td></tr>
    </table>
    <p style="margin:16px 0 0;font-size:11px;color:#94A3B8;">(c) ORIZON 2026 &middot; <a href="${SITE_URL}" style="color:#94A3B8;text-decoration:none;">kayorizon.com</a></p>
  </td></tr>
</table></body></html>`;
}

// ============================================================
// Templates
// ============================================================
const TEMPLATES: Record<string, (data: any) => { subject: string; html: string }> = {
  'visit-request': (d) => ({
    subject: `Nouvelle demande de visite - ${d.propertyTitle ?? 'votre bien'}`,
    html: shell({
      title: 'Nouvelle demande de visite',
      intro: `<p><strong>${d.buyerName ?? 'Un acheteur'}</strong> souhaite visiter votre bien <strong>${d.propertyTitle ?? ''}</strong>.</p>
              <p>Date souhaitee : <strong>${d.requestedDate ?? 'a definir'}</strong></p>
              ${d.message ? `<p style="background:#F1F5F9;padding:12px;border-radius:8px;font-style:italic;">"${d.message}"</p>` : ''}`,
      ctaLabel: 'Voir la demande',
      ctaUrl: `${SITE_URL}/visits?id=${d.visitId ?? ''}`,
      footerNote: 'Repondez sous 24h pour maximiser vos chances de conclure.',
    }),
  }),
  'visit-confirmed': (d) => ({
    subject: `Visite confirmee - ${d.propertyTitle ?? 'ORIZON'}`,
    html: shell({
      title: 'Votre visite est confirmee',
      intro: `<p>Bonjour ${d.buyerName ?? ''}, le proprietaire a accepte votre demande de visite.</p>
              <p><strong>Bien :</strong> ${d.propertyTitle ?? ''}</p>
              <p><strong>Date :</strong> ${d.scheduledDate ?? ''}</p>
              <p><strong>Adresse :</strong> ${d.address ?? ''}</p>`,
      ctaLabel: 'Voir les details',
      ctaUrl: `${SITE_URL}/visits?id=${d.visitId ?? ''}`,
      footerNote: 'Pensez a confirmer votre presence 1h avant via l\'app.',
    }),
  }),
  'visit-cancelled': (d) => ({
    subject: `Visite annulee - ${d.propertyTitle ?? 'ORIZON'}`,
    html: shell({
      title: 'Visite annulee',
      intro: `<p>La visite prevue le <strong>${d.scheduledDate ?? ''}</strong> pour <strong>${d.propertyTitle ?? ''}</strong> a ete annulee${d.reason ? ' : ' + d.reason : '.'}</p>`,
      ctaLabel: 'Voir d\'autres biens',
      ctaUrl: `${SITE_URL}/explore`,
    }),
  }),
  'new-message': (d) => ({
    subject: `Nouveau message de ${d.senderName ?? 'un utilisateur'}`,
    html: shell({
      title: 'Vous avez un nouveau message',
      intro: `<p><strong>${d.senderName ?? ''}</strong> vous a envoye un message a propos de <strong>${d.propertyTitle ?? 'votre annonce'}</strong> :</p>
              <p style="background:#F1F5F9;padding:12px;border-radius:8px;font-style:italic;">"${d.preview ?? ''}"</p>`,
      ctaLabel: 'Repondre',
      ctaUrl: `${SITE_URL}/messages?thread=${d.threadId ?? ''}`,
    }),
  }),
  'price-drop': (d) => ({
    subject: `Baisse de prix - ${d.propertyTitle ?? 'un bien suivi'}`,
    html: shell({
      title: 'Baisse de prix sur un bien suivi',
      intro: `<p>Le bien <strong>${d.propertyTitle ?? ''}</strong> est passe de <strong>${d.oldPrice ?? ''}</strong> a <strong style="color:#16A34A;">${d.newPrice ?? ''}</strong>.</p>
              <p>Soit <strong>-${d.dropPercent ?? ''}%</strong>.</p>`,
      ctaLabel: 'Voir le bien',
      ctaUrl: `${SITE_URL}/property/${d.propertyId ?? ''}`,
    }),
  }),
  'payment-success': (d) => ({
    subject: `Paiement confirme - ORIZON`,
    html: shell({
      title: 'Paiement bien recu',
      intro: `<p>Votre paiement de <strong>${d.amount ?? ''} ${d.currency ?? 'HTG'}</strong> via <strong>${d.method ?? 'MonCash'}</strong> a ete confirme.</p>
              <p><strong>Reference :</strong> ${d.reference ?? ''}</p>
              ${d.description ? `<p>${d.description}</p>` : ''}`,
      ctaLabel: 'Voir le recu',
      ctaUrl: `${SITE_URL}/payments?id=${d.paymentId ?? ''}`,
      footerNote: 'Conservez cet email comme preuve de paiement.',
    }),
  }),
  'kyc-approved': (d) => ({
    subject: 'KYC approuve - vous pouvez publier des annonces',
    html: shell({
      title: 'Identite verifiee avec succes',
      intro: `<p>Felicitations ${d.userName ?? ''}, votre identite a ete verifiee.</p>
              <p>Vous pouvez maintenant publier des annonces, recevoir des paiements et beneficier du badge <strong style="color:#16A34A;">Verifie</strong> sur votre profil.</p>`,
      ctaLabel: 'Publier une annonce',
      ctaUrl: `${SITE_URL}/sell`,
    }),
  }),
  'kyc-rejected': (d) => ({
    subject: 'KYC a refaire - documents non valides',
    html: shell({
      title: 'Verification d\'identite a refaire',
      intro: `<p>Nous n'avons pas pu valider vos documents${d.reason ? ' : ' + d.reason : '.'}</p>
              <p>Merci de soumettre a nouveau des photos nettes (recto/verso) de votre piece d'identite.</p>`,
      ctaLabel: 'Refaire la verification',
      ctaUrl: `${SITE_URL}/profile/kyc`,
      footerNote: 'Une question ? Repondez a cet email, on est la pour vous aider.',
    }),
  }),
};

// ============================================================
// Handler
// ============================================================
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!RESEND_API_KEY) {
      return json({ error: 'RESEND_API_KEY non configure' }, 500);
    }

    const payload = await req.json();
    const { to, template, data = {}, subject: subjectOverride, html: htmlOverride, replyTo } = payload || {};

    if (!to) return json({ error: '`to` requis' }, 400);
    if (!template) return json({ error: '`template` requis' }, 400);

    let subject: string;
    let html: string;

    if (template === 'custom') {
      if (!htmlOverride || !subjectOverride) {
        return json({ error: 'template=custom requiert `html` et `subject`' }, 400);
      }
      subject = subjectOverride;
      html = htmlOverride;
    } else {
      const tpl = TEMPLATES[template];
      if (!tpl) return json({ error: `template inconnu: ${template}` }, 400);
      const rendered = tpl(data);
      subject = subjectOverride ?? rendered.subject;
      html = rendered.html;
    }

    const recipients = Array.isArray(to) ? to : [to];

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: SENDER,
        to: recipients,
        subject,
        html,
        reply_to: replyTo ?? DEFAULT_REPLY_TO,
      }),
    });

    const body = await resp.json();
    if (!resp.ok) {
      return json({ error: 'resend_error', detail: body }, resp.status);
    }

    return json({ ok: true, id: body.id, to: recipients, template, subject });
  } catch (e) {
    return json({ error: String(e?.message ?? e) }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
