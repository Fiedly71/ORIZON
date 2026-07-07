/**
 * Corrige les mots francais sans accents dans les chaines JS (screens + components).
 * Ne touche QUE les strings quotees ('...' | "..." | `...`), pas les identifiants.
 *
 * Usage : `node scripts/fix-french-accents.js`
 */
const fs = require('fs');
const path = require('path');

// Dictionnaire : accentless -> accented. Case-sensitive.
// Ordre : preserver la capitalisation en ajoutant capitalized ET lowercase.
const WORD_MAP = {
  // Bases immobilier
  'propriete': 'propriété', 'proprietes': 'propriétés',
  'Propriete': 'Propriété', 'Proprietes': 'Propriétés',
  'proprietaire': 'propriétaire', 'proprietaires': 'propriétaires',
  'Proprietaire': 'Propriétaire', 'Proprietaires': 'Propriétaires',
  'PROPRIETAIRE': 'PROPRIÉTAIRE',
  'immobiliere': 'immobilière', 'immobilieres': 'immobilières',
  'Immobiliere': 'Immobilière', 'Immobilieres': 'Immobilières',
  // Verification
  // Attention : 'verifie' seul = imperatif 'verifie' (V-e-r-i-f-i-e) OU participe 'verifie'.
  // On prend le safer default : imperatif (une seule accent), car UI utilise beaucoup imperatif.
  // Les formes plurielles/feminines 'verifies/verifiee/verifiees' restent participes accordes.
  'verifie': 'vérifie', 'verifies': 'vérifiés', 'verifiee': 'vérifiée', 'verifiees': 'vérifiées',
  'Verifie': 'Vérifie', 'Verifies': 'Vérifiés', 'Verifiee': 'Vérifiée', 'Verifiees': 'Vérifiées',
  'verifier': 'vérifier', 'Verifier': 'Vérifier',
  'verifiera': 'vérifiera', 'Verifiera': 'Vérifiera',
  'verification': 'vérification', 'Verification': 'Vérification',
  'verifiez': 'vérifiez', 'Verifiez': 'Vérifiez',
  // Creer / cree - Meme logique : 'cree' seul = imperatif 'cree' (Cree un compte).
  // Formes accordes 'crees/creee/creees' restent participes.
  'creer': 'créer', 'Creer': 'Créer',
  'cree': 'crée', 'crees': 'créés', 'creee': 'créée', 'creees': 'créées',
  'Cree': 'Crée', 'Creee': 'Créée',
  // Reference / references
  'reference': 'référence', 'references': 'références',
  'Reference': 'Référence', 'References': 'Références',
  // Detail / details
  'detail': 'détail', 'details': 'détails', 'detaillee': 'détaillée', 'detaille': 'détaillé',
  'Detail': 'Détail', 'Details': 'Détails', 'Detaillee': 'Détaillée', 'Detaille': 'Détaillé',
  // Deja / dejà
  'deja': 'déjà', 'Deja': 'Déjà',
  // Reussi
  'reussi': 'réussi', 'reussis': 'réussis', 'reussie': 'réussie',
  'Reussi': 'Réussi', 'Reussis': 'Réussis',
  // Ecran / ecrit / ecrire
  'ecran': 'écran', 'ecrans': 'écrans',
  'Ecran': 'Écran', 'Ecrans': 'Écrans',
  'ecrire': 'écrire', 'Ecrire': 'Écrire',
  'ecris': 'écris', 'Ecris': 'Écris',
  // Numero, Telephone
  'numero': 'numéro', 'numeros': 'numéros',
  'Numero': 'Numéro', 'Numeros': 'Numéros', 'NUMERO': 'NUMÉRO',
  'telephone': 'téléphone', 'telephones': 'téléphones',
  'Telephone': 'Téléphone', 'TELEPHONE': 'TÉLÉPHONE',
  // Reserve / reservation - imperatif 'reserve' commun
  'reserver': 'réserver', 'reservation': 'réservation',
  'Reserver': 'Réserver', 'Reservation': 'Réservation',
  // Confirme / annule
  'confirmee': 'confirmée', 'confirmes': 'confirmés',
  'Confirmee': 'Confirmée',
  'annule': 'annulé', 'annulee': 'annulée', 'annules': 'annulés',
  'Annule': 'Annulé', 'Annulee': 'Annulée',
  // Enregistrer
  'enregistre': 'enregistré', 'enregistree': 'enregistrée', 'enregistres': 'enregistrés',
  'Enregistre': 'Enregistré', 'Enregistree': 'Enregistrée',
  // Publie - imperatif 'publie' commun (ex : 'Publie ton annonce')
  'publiee': 'publiée', 'publies': 'publiés', 'publiees': 'publiées',
  'Publiee': 'Publiée',
  // Supprime - imperatif 'supprime' commun
  'supprimee': 'supprimée', 'supprimes': 'supprimés', 'supprimees': 'supprimées',
  'Supprimee': 'Supprimée',
  // Modifie - imperatif commun
  'modifiee': 'modifiée', 'modifies': 'modifiés', 'modifiees': 'modifiées',
  'Modifiee': 'Modifiée',
  // Envoye - garder l'imperatif 'envoie' pour compatibilite (rare en UI)
  'envoye': 'envoyé', 'envoyee': 'envoyée', 'envoyes': 'envoyés',
  'Envoye': 'Envoyé', 'Envoyee': 'Envoyée',
  // Reinitialiser
  'reinitialiser': 'réinitialiser', 'Reinitialiser': 'Réinitialiser',
  'reinitialisation': 'réinitialisation', 'Reinitialisation': 'Réinitialisation',
  // Oublie
  'oublie': 'oublié', 'Oublie': 'Oublié',
  // Recent
  'recents': 'récents', 'recentes': 'récentes',
  'Recents': 'Récents', 'Recentes': 'Récentes',
  // Actives / desactivees
  'actives': 'activées', 'Actives': 'Activées',
  'desactivees': 'désactivées', 'Desactivees': 'Désactivées',
  // Parametres
  'parametres': 'paramètres', 'Parametres': 'Paramètres',
  // Deconnexion
  'deconnecter': 'déconnecter', 'Deconnecter': 'Déconnecter',
  'deconnexion': 'déconnexion', 'Deconnexion': 'Déconnexion',
  // Selectionner
  'selectionner': 'sélectionner', 'Selectionner': 'Sélectionner',
  'selection': 'sélection', 'Selection': 'Sélection',
  // Nouveautes
  'nouveautes': 'nouveautés', 'Nouveautes': 'Nouveautés',
  // Reves
  'reves': 'rêves', 'Reves': 'Rêves',
  'reve': 'rêve', 'Reve': 'Rêve',
  // Hotel / hote
  'hotel': 'hôtel', 'hotels': 'hôtels',
  'Hotel': 'Hôtel', 'Hotels': 'Hôtels',
  'hote': 'hôte', 'Hote': 'Hôte',
  // Cout / cote
  'cout': 'coût', 'couts': 'coûts',
  'Cout': 'Coût', 'Couts': 'Coûts',
  'cote': 'côte', 'cotes': 'côtes',
  // Etage
  'etage': 'étage', 'etages': 'étages',
  'Etage': 'Étage', 'Etages': 'Étages',
  // Duree
  'duree': 'durée', 'durees': 'durées',
  'Duree': 'Durée',
  // Annee
  'annee': 'année', 'annees': 'années',
  'Annee': 'Année', 'Annees': 'Années',
  // Delai
  'delai': 'délai', 'delais': 'délais',
  'Delai': 'Délai',
  // Bientot
  'bientot': 'bientôt', 'Bientot': 'Bientôt',
  // Etape
  'etape': 'étape', 'etapes': 'étapes',
  'Etape': 'Étape', 'Etapes': 'Étapes',
  // Ete (verbe etre passe compose)
  'ete': 'été', // attention aux collisions "l'ete" mais rare dans strings JS
  // Adresse email associe
  'associe': 'associé', 'associee': 'associée', 'associes': 'associés',
  // Preferee
  'preferee': 'préférée', 'preferees': 'préférées', 'prefere': 'préféré', 'preferes': 'préférés',
  'Preferee': 'Préférée', 'Prefere': 'Préféré',
  // Souhaite
  'souhaite': 'souhaité', 'souhaitee': 'souhaitée', 'souhaites': 'souhaités',
  'Souhaite': 'Souhaité', 'Souhaitee': 'Souhaitée',
  // Planifie
  'planifie': 'planifié', 'planifiee': 'planifiée',
  'Planifie': 'Planifié', 'Planifiee': 'Planifiée',
  // Succes
  'succes': 'succès', 'Succes': 'Succès',
  // Frequents
  'frequent': 'fréquent', 'frequents': 'fréquents', 'frequente': 'fréquente', 'frequentes': 'fréquentes',
  'Frequent': 'Fréquent',
  // Reponse / repondre
  'reponse': 'réponse', 'reponses': 'réponses',
  'Reponse': 'Réponse', 'Reponses': 'Réponses',
  'repondre': 'répondre', 'Repondre': 'Répondre',
  // Renvoye
  'renvoye': 'renvoyé', 'renvoyee': 'renvoyée',
  'Renvoye': 'Renvoyé',
  // Legales
  'legal': 'légal', 'legale': 'légale', 'legaux': 'légaux', 'legales': 'légales',
  'Legal': 'Légal', 'Legale': 'Légale', 'Legales': 'Légales',
  // Politique confidentialite
  'confidentialite': 'confidentialité', 'Confidentialite': 'Confidentialité',
  // Identite
  'identite': 'identité', 'identites': 'identités',
  'Identite': 'Identité', 'IDENTITE': 'IDENTITÉ',
  // Piece
  'piece': 'pièce', 'pieces': 'pièces',
  'Piece': 'Pièce', 'Pieces': 'Pièces',
  // Fevrier / annee (dates)
  'fevrier': 'février',
  'aout': 'août', 'Aout': 'Août',
  // Verite
  'veracite': 'véracité', 'verite': 'vérité',
  // Notarie
  'notarie': 'notarié', 'notariee': 'notariée',
  // Chiffre
  'chiffre': 'chiffré', 'chiffree': 'chiffrée', 'chiffres': 'chiffrés', 'chiffrees': 'chiffrées',
  'Chiffree': 'Chiffrée',
  // Donnees
  'donnees': 'données', 'Donnees': 'Données',
  // Coordonnees
  'coordonnees': 'coordonnées', 'Coordonnees': 'Coordonnées',
  // Precis / precision
  'precision': 'précision', 'Precision': 'Précision',
  'precis': 'précis', 'precise': 'précise', 'precises': 'précises',
  // Immediat
  'immediat': 'immédiat', 'immediate': 'immédiate',
  'immediatement': 'immédiatement', 'Immediatement': 'Immédiatement',
  // Felicitations
  'felicitations': 'félicitations', 'Felicitations': 'Félicitations',
  // Beneficie
  'beneficie': 'bénéficie', 'beneficies': 'bénéficies', 'beneficier': 'bénéficier',
  'Beneficier': 'Bénéficier',
  // Anonymisee
  'anonymise': 'anonymisé', 'anonymisee': 'anonymisée', 'anonymises': 'anonymisés',
  // Archive
  'archive': 'archivé', 'archivee': 'archivée', 'archives': 'archivés', 'archivees': 'archivées',
  // Definitivement
  'definitivement': 'définitivement',
  // Irreversible
  'irreversible': 'irréversible', 'Irreversible': 'Irréversible',
  // Debloquer
  'debloquer': 'débloquer', 'Debloquer': 'Débloquer',
  // Bloque
  'bloque': 'bloqué', 'bloquee': 'bloquée', 'bloques': 'bloqués', 'bloquees': 'bloquées',
  'Bloques': 'Bloqués',
  // Meuble
  'meuble': 'meublé', 'meublee': 'meublée', 'meubles': 'meublés',
  'Meuble': 'Meublé', 'Meublee': 'Meublée',
  // Securite
  'securite': 'sécurité', 'Securite': 'Sécurité',
  'securise': 'sécurisé', 'securisee': 'sécurisée', 'securises': 'sécurisés',
  'Securise': 'Sécurisé', 'Securisee': 'Sécurisée',
  // Electricite
  'electricite': 'électricité', 'Electricite': 'Électricité',
  // Recreation
  'recreation': 'récréation', 'Recreation': 'Récréation',
  // Cuisiniere
  'cuisiniere': 'cuisinière', 'Cuisiniere': 'Cuisinière',
  // Bibliotheque
  'bibliotheque': 'bibliothèque', 'Bibliotheque': 'Bibliothèque',
  // Mensualite
  'mensualite': 'mensualité', 'Mensualite': 'Mensualité',
  // Resultat
  'resultat': 'résultat', 'resultats': 'résultats',
  'Resultat': 'Résultat', 'Resultats': 'Résultats',
  // Hypothecaire
  'hypothecaire': 'hypothécaire', 'hypotheque': 'hypothèque',
  'Hypothecaire': 'Hypothécaire', 'Hypotheque': 'Hypothèque',
  // Pret
  'pret': 'prêt', 'prets': 'prêts',
  'Pret': 'Prêt', 'Prets': 'Prêts',
  // Fran ais
  'francais': 'français', 'francaise': 'française',
  'Francais': 'Français', 'Francaise': 'Française',
  // Ecosysteme
  'ecosysteme': 'écosystème', 'Ecosysteme': 'Écosystème',
  // Caraibe / Haiti / Haitienne
  'Caraibe': 'Caraïbe', 'caraibe': 'caraïbe',
  'Haiti': 'Haïti',
  'haitienne': 'haïtienne', 'haitien': 'haïtien', 'Haitienne': 'Haïtienne', 'Haitien': 'Haïtien',
  // A -> À (majuscule seule, souvent debut de string)
  // Note : ne remplace pas 'a' -> 'à' pour eviter les faux positifs
  // Traite via une regex speciale plus bas.
  // Retire / retirer - imperatif 'retire' commun, on ne touche que formes accordees
  'retiree': 'retirée', 'retirees': 'retirées',
  // Note (participe passe)
  // 'note' est ambigue (nom OU participe), ne pas remplacer automatiquement
  // Reussi
  'reussite': 'réussite', 'Reussite': 'Réussite',
  // Serieuse
  'serieux': 'sérieux', 'serieuse': 'sérieuse', 'serieuses': 'sérieuses',
  'Serieuse': 'Sérieuse',
  // Recu (cedille)
  'recu': 'reçu', 'recus': 'reçus', 'recue': 'reçue', 'recues': 'reçues',
  'Recu': 'Reçu',
  // Coeur -> cœur
  'coeur': 'cœur', 'Coeur': 'Cœur',
  // Non payees
  'payees': 'payées', 'payee': 'payée', 'paye': 'payé', 'payes': 'payés',
  // Complete
  'complete': 'complète', 'completes': 'complètes',
  // Superieur
  'superieur': 'supérieur', 'superieure': 'supérieure', 'superieurs': 'supérieurs',
  'Superieur': 'Supérieur',
  // Visibilite
  'visibilite': 'visibilité', 'Visibilite': 'Visibilité',
  // Localite
  'localite': 'localité', 'localites': 'localités',
  'Localite': 'Localité',
  // Commodites
  'commodite': 'commodité', 'commodites': 'commodités',
  'Commodite': 'Commodité', 'Commodites': 'Commodités',
  // Trouve (participe) - PAS de mapping 'trouve' seul car imperatif/present 'trouve' est courant
  // (ex : 'Trouve la propriete de tes reves'). On ne touche qu'aux formes clairement accordees.
  'trouvee': 'trouvée', 'trouves': 'trouvés', 'trouvees': 'trouvées',
  // Reessaie
  'reessaie': 'réessaie', 'reessayer': 'réessayer',
  'Reessaie': 'Réessaie', 'Reessayer': 'Réessayer', 'Reessaye': 'Réessaye',
  // Probleme
  'probleme': 'problème', 'problemes': 'problèmes',
  'Probleme': 'Problème', 'Problemes': 'Problèmes',
  // Erreur (deja OK) / Echec
  'echec': 'échec', 'Echec': 'Échec',
  // Boite
  'boite': 'boîte', 'boites': 'boîtes',
  'Boite': 'Boîte',
  // Note (participe adjectif) - traiter comme rare
  'notes': 'notés', // dans "Mieux notes" -> "Mieux notés"
  // Depot / depot
  'depot': 'dépôt', 'depots': 'dépôts',
  'Depot': 'Dépôt',
  // Georeferencees
  'georefencees': 'géoréférencées', 'georeference': 'géoréférence',
  // Genereales
  'generale': 'générale', 'generales': 'générales', 'general': 'général', 'generaux': 'généraux',
  'Generale': 'Générale', 'Generales': 'Générales', 'General': 'Général',
  // Editee
  'editee': 'éditée', 'edite': 'édité', 'editer': 'éditer',
  // Intermediaire
  'intermediaire': 'intermédiaire', 'Intermediaire': 'Intermédiaire',
  // Anrejistre -- non
  // Personnalise
  'personnalise': 'personnalisé', 'personnalisee': 'personnalisée',
  // Chaine deja OK sinon
  // Cle
  'cle': 'clé', 'cles': 'clés',
  // Ete (participe etre) - handle above
  // Epure
  'epure': 'épuré', 'epuree': 'épurée',
  // Approuvee
  'approuve': 'approuvé', 'approuvee': 'approuvée', 'approuves': 'approuvés',
  'Approuve': 'Approuvé', 'Approuvee': 'Approuvée',
  // Inapproprie
  'inappropriee': 'inappropriée', 'inappropriees': 'inappropriées', 'inapproprie': 'inapproprié',
  // A propos / A vendre  --> Ces "A" isoles seront traites par une regex speciale
  // Creneau
  'creneau': 'créneau', 'creneaux': 'créneaux',
  'Creneau': 'Créneau', 'Creneaux': 'Créneaux',
  // Modere / moderation
  'modere': 'modéré', 'moderee': 'modérée', 'moderes': 'modérés',
  'moderation': 'modération', 'Moderation': 'Modération',
};

function replaceInString(content) {
  // Pour chaque mot du dictionnaire, on fait un remplacement avec boundaries.
  let out = content;
  for (const [from, to] of Object.entries(WORD_MAP)) {
    const re = new RegExp(`(?<![A-Za-zÀ-ÿ0-9_])${escapeRegex(from)}(?![A-Za-zÀ-ÿ0-9_])`, 'g');
    out = out.replace(re, to);
  }
  return out;
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Mini-tokenizer JS : marche a travers le fichier en gerant proprement code,
// commentaires (// et /* */), strings simples/doubles/template. On ne
// transforme que le contenu des strings. Cela evite qu'une apostrophe dans
// un commentaire (ex : "messages d'erreur") avale du vrai code.
function transformSource(src) {
  let out = '';
  let i = 0;
  const n = src.length;
  let modifiedCount = 0;

  while (i < n) {
    const c = src[i];
    const next = src[i + 1];

    // Commentaire ligne
    if (c === '/' && next === '/') {
      const end = src.indexOf('\n', i);
      const stop = end === -1 ? n : end;
      out += src.slice(i, stop);
      i = stop;
      continue;
    }
    // Commentaire bloc
    if (c === '/' && next === '*') {
      const end = src.indexOf('*/', i + 2);
      const stop = end === -1 ? n : end + 2;
      out += src.slice(i, stop);
      i = stop;
      continue;
    }
    // String simple/double
    if (c === "'" || c === '"') {
      const quote = c;
      let j = i + 1;
      while (j < n) {
        const ch = src[j];
        if (ch === '\\') { j += 2; continue; }
        if (ch === quote) break;
        if (ch === '\n') break; // string non fermee, on abandonne
        j++;
      }
      if (j >= n || src[j] !== quote) {
        // Pas de fermeture propre : on emet tel quel et avance d'un char.
        out += c;
        i++;
        continue;
      }
      const body = src.slice(i + 1, j);
      const fixed = replaceInString(body);
      if (fixed !== body) modifiedCount++;
      out += quote + fixed + quote;
      i = j + 1;
      continue;
    }
    // Template literal (backtick) : gerer ${ ... } imbrique
    if (c === '`') {
      let j = i + 1;
      let bodyParts = [];
      let plainStart = j;
      let changed = false;
      while (j < n) {
        const ch = src[j];
        if (ch === '\\') { j += 2; continue; }
        if (ch === '`') break;
        if (ch === '$' && src[j + 1] === '{') {
          // segment texte avant l'expression
          const seg = src.slice(plainStart, j);
          const fixedSeg = replaceInString(seg);
          if (fixedSeg !== seg) changed = true;
          bodyParts.push(fixedSeg);
          // scanner l'expression avec balance d'accolades
          let depth = 1;
          let k = j + 2;
          while (k < n && depth > 0) {
            const kc = src[k];
            if (kc === '{') depth++;
            else if (kc === '}') depth--;
            else if (kc === "'" || kc === '"') {
              // sauter la string
              const q = kc;
              k++;
              while (k < n && src[k] !== q) {
                if (src[k] === '\\') k++;
                k++;
              }
            } else if (kc === '`') {
              // sauter template imbrique (naif)
              k++;
              while (k < n && src[k] !== '`') {
                if (src[k] === '\\') k++;
                k++;
              }
            }
            if (depth > 0) k++;
          }
          bodyParts.push(src.slice(j, k + 1));
          j = k + 1;
          plainStart = j;
          continue;
        }
        j++;
      }
      if (j >= n || src[j] !== '`') {
        out += c;
        i++;
        continue;
      }
      const seg = src.slice(plainStart, j);
      const fixedSeg = replaceInString(seg);
      if (fixedSeg !== seg) changed = true;
      bodyParts.push(fixedSeg);
      if (changed) modifiedCount++;
      out += '`' + bodyParts.join('') + '`';
      i = j + 1;
      continue;
    }

    out += c;
    i++;
  }
  return { out, modifiedCount };
}

function processFile(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');
  const { out, modifiedCount } = transformSource(src);
  if (out !== src) {
    fs.writeFileSync(filePath, out, 'utf8');
    return modifiedCount;
  }
  return 0;
}

function walk(dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.expo') continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, results);
    else if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) results.push(p);
  }
  return results;
}

function main() {
  const root = path.resolve(__dirname, '..', 'src');
  const files = walk(root);
  let totalFilesModified = 0;
  let totalReplacements = 0;
  for (const f of files) {
    const n = processFile(f);
    if (n > 0) {
      totalFilesModified++;
      totalReplacements += n;
      console.log(`  ${path.relative(path.dirname(__dirname), f)} : ${n} strings modifiees`);
    }
  }
  console.log(`\n[fix-french-accents] ${totalFilesModified} fichiers, ${totalReplacements} strings corrigees.`);
}

if (require.main === module) main();
