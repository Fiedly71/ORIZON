// Ecran legal (CGU + Confidentialite) - render dynamique selon route.params.kind.
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../theme/colors';

const TERMS_TEXT = `
ORIZON - Conditions Generales d'Utilisation
Derniere mise a jour: avril 2026

1. OBJET
ORIZON est une plateforme mobile editee par ORIZON SAS (Haiti) qui met en relation des proprietaires, agences immobilieres et acheteurs/locataires.

2. INSCRIPTION
L'inscription est gratuite. Trois roles sont disponibles: Acheteur/Locataire, Proprietaire, Agence. Les comptes Proprietaire et Agence doivent fournir une piece d'identite valide (KYC) et acceptent une verification manuelle avant de pouvoir publier.

3. PUBLICATION D'ANNONCES
La publication est payante: 20 USD ou 2 500 HTG par annonce, payable par carte bancaire (Stripe) ou MonCash. Tout contenu est susceptible de moderation. ORIZON se reserve le droit de retirer toute annonce frauduleuse, dupliquee, ou contraire a la loi haitienne sans remboursement.

4. CONTENU UTILISATEUR
Tu garantis avoir les droits sur les photos et descriptions publiees. ORIZON peut signaler aux autorites tout contenu illegal (escroquerie, blanchiment, traite, etc.).

5. PAIEMENTS
Les frais de publication ne sont pas remboursables apres validation. Les transactions reelles entre acheteur et vendeur se font hors plateforme - ORIZON n'est pas partie au contrat de vente/location.

6. RESPONSABILITE
ORIZON est un intermediaire technique. Nous ne garantissons ni la disponibilite, ni la veracite des annonces. Verifie toujours physiquement un bien et signe un contrat notarie avant tout paiement.

7. SUPPRESSION DU COMPTE
Tu peux supprimer ton compte a tout moment depuis Profil > Supprimer mon compte. Les donnees seront anonymisees immediatement et purgees sous 30 jours.

8. PROPRIETE INTELLECTUELLE
La marque ORIZON, le logo, et l'application restent la propriete d'ORIZON SAS.

9. LOI APPLICABLE
Droit haitien. Tribunal competent: Port-au-Prince.

10. CONTACT
support@orizon.ht
`;

const PRIVACY_TEXT = `
ORIZON - Politique de Confidentialite
Derniere mise a jour: avril 2026

1. DONNEES COLLECTEES
- Identite: nom, email, telephone, role
- KYC (Proprio/Agence): photo de selfie, photo recto/verso piece d'identite
- Annonces: photos, descriptions, prix, localisation
- Paiements: historique Stripe/MonCash (montant, date, reference - PAS le numero de carte)
- Technique: crash logs (Sentry), evenements analytiques (PostHog), tokens push notifications

2. UTILISATION
- Faire fonctionner l'app et la mise en relation
- Verifier l'identite des publicateurs (KYC)
- Detecter les fraudes
- Ameliorer le produit (analytics anonymises)

3. PARTAGE
- Supabase (hebergement EU)
- Stripe / MonCash (traitement paiement)
- Sentry / PostHog (technique)
Aucune vente de donnees a des tiers.

4. CONSERVATION
- Profil: tant que ton compte est actif, puis 30 jours apres suppression
- Pieces KYC: 5 ans (obligation legale lutte anti-blanchiment)
- Paiements: 10 ans (obligation comptable)

5. TES DROITS (RGPD + loi haitienne)
- Acces, rectification, suppression: depuis Profil > Modifier ou Profil > Supprimer mon compte
- Export de tes donnees: ecris a privacy@orizon.ht
- Opposition au traitement analytics: Reglages > Confidentialite > Refuser le tracking

6. PERMISSIONS APPAREIL
- Camera: pour photographier ton bien et ta piece d'identite
- Galerie photos: pour selectionner des photos existantes
- Localisation: pour afficher les biens proches (jamais en arriere-plan)
- Notifications: pour les alertes de prix, visites confirmees, messages

7. CONTACT DPO
privacy@orizon.ht
ORIZON SAS - Port-au-Prince, Haiti
`;

export default function LegalScreen({ route, navigation }) {
  const kind = route?.params?.kind || 'terms';
  const isTerms = kind === 'terms';
  const text = isTerms ? TERMS_TEXT : PRIVACY_TEXT;
  const title = isTerms ? "Conditions d'utilisation" : 'Politique de confidentialite';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={C.text} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={styles.body}>{text.trim()}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  title: { fontSize: 16, fontWeight: '800', color: C.text, flex: 1, textAlign: 'center' },
  body: { fontSize: 13, color: C.text, lineHeight: 20 },
});
