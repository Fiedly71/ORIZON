// ReviewsScreen - Voir et laisser des avis sur un vendeur
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Image, TextInput, Alert, ActivityIndicator, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C, radii, spacing } from '../theme/colors';
import { getUserReviews, getUserAverageRating, leaveReview } from '../services/reviewsService';
import { useToast } from '../components/Toast';

export default function ReviewsScreen({ route, navigation }) {
  const { userId, userName } = route.params || {};
  const toast = useToast();
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState({ avg: 0, count: 0 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ rating: 5, comment: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadReviews();
  }, [userId]);

  const loadReviews = async () => {
    if (!userId) return;
    setLoading(true);
    const [reviewsRes, ratingRes] = await Promise.all([
      getUserReviews(userId),
      getUserAverageRating(userId),
    ]);
    if (reviewsRes.ok) setReviews(reviewsRes.data || []);
    if (ratingRes.ok) setAvgRating(ratingRes.data);
    setLoading(false);
  };

  const onSubmit = async () => {
    if (!form.rating) {
      Alert.alert('Avis', 'Selectonne une note');
      return;
    }
    if (!form.comment.trim()) {
      Alert.alert('Avis', 'Ajoute un commentaire');
      return;
    }
    setSubmitting(true);
    const r = await leaveReview({
      targetUserId: userId,
      rating: form.rating,
      comment: form.comment,
    });
    setSubmitting(false);
    if (r.ok) {
      toast.show('Avis envoye pour moderation', { type: 'success' });
      setForm({ rating: 5, comment: '' });
      setShowForm(false);
      loadReviews();
    } else {
      Alert.alert('Erreur', r.error || 'Impossible de soumettre l\'avis');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={C.primary} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={C.text} />
        </Pressable>
        <Text style={styles.title}>Avis</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
        {/* Rating summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.vendorName}>{userName || 'Vendeur'}</Text>
          <View style={styles.ratingRow}>
            <Text style={styles.avgRating}>{avgRating.avg}</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Ionicons
                  key={i}
                  name={i <= Math.round(avgRating.avg) ? 'star' : 'star-outline'}
                  size={16}
                  color={C.primary}
                />
              ))}
            </View>
            <Text style={styles.countText}>({avgRating.count} avis)</Text>
          </View>
        </View>

        {/* Leave review button */}
        {!showForm && (
          <Pressable style={styles.cta} onPress={() => setShowForm(true)}>
            <Ionicons name="create-outline" size={16} color="#fff" />
            <Text style={styles.ctaTxt}>Laisser un avis</Text>
          </Pressable>
        )}

        {/* Review form */}
        {showForm && (
          <View style={styles.formCard}>
            <Text style={styles.formLabel}>MA NOTE</Text>
            <View style={styles.starsInput}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Pressable key={i} onPress={() => setForm({ ...form, rating: i })}>
                  <Ionicons
                    name={i <= form.rating ? 'star' : 'star-outline'}
                    size={32}
                    color={C.primary}
                  />
                </Pressable>
              ))}
            </View>

            <Text style={styles.formLabel}>COMMENTAIRE</Text>
            <TextInput
              style={[styles.input, { minHeight: 100 }]}
              multiline
              placeholder="Partage ton experience avec ce vendeur..."
              placeholderTextColor={C.muted}
              value={form.comment}
              onChangeText={(v) => setForm({ ...form, comment: v })}
            />

            <View style={styles.formActions}>
              <Pressable
                style={[styles.formBtn, { backgroundColor: C.border }]}
                onPress={() => setShowForm(false)}
              >
                <Text style={styles.formBtnTxt}>Annuler</Text>
              </Pressable>
              <Pressable
                style={[styles.formBtn, { backgroundColor: C.primary }]}
                onPress={onSubmit}
                disabled={submitting}
              >
                <Text style={[styles.formBtnTxt, { color: '#fff' }]}>
                  {submitting ? 'Envoi...' : 'Publier'}
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Reviews list */}
        {reviews.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="star-outline" size={40} color={C.muted} />
            <Text style={styles.emptyTxt}>Pas d'avis encore</Text>
          </View>
        ) : (
          reviews.map((rev) => (
            <View key={rev.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                {rev.reviewer?.avatarUrl ? (
                  <Image source={{ uri: rev.reviewer.avatarUrl }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>
                      {(rev.reviewer?.fullName || 'U').slice(0, 1).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.reviewerName}>{rev.reviewer?.fullName || 'Anonyme'}</Text>
                  <View style={styles.reviewStars}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Ionicons
                        key={i}
                        name={i <= rev.rating ? 'star' : 'star-outline'}
                        size={14}
                        color={C.primary}
                      />
                    ))}
                  </View>
                </View>
              </View>
              <Text style={styles.reviewComment}>{rev.comment}</Text>
              <Text style={styles.reviewDate}>
                {new Date(rev.created_at).toLocaleDateString('fr-HT')}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  title: { fontSize: 14, fontWeight: '700', color: C.text },

  summaryCard: {
    backgroundColor: '#F9FAFB',
    padding: spacing.lg,
    borderRadius: radii.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: C.border,
  },
  vendorName: { fontSize: 16, fontWeight: '600', color: C.text, marginBottom: 8 },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avgRating: { fontSize: 28, fontWeight: '800', color: C.primary },
  starsRow: { flexDirection: 'row', gap: 2 },
  countText: { fontSize: 12, color: C.muted },

  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: C.primary,
    padding: spacing.lg,
    borderRadius: radii.md,
    marginBottom: spacing.lg,
  },
  ctaTxt: { fontSize: 14, fontWeight: '600', color: '#fff' },

  formCard: {
    backgroundColor: '#F9FAFB',
    padding: spacing.lg,
    borderRadius: radii.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: C.border,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: C.muted,
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  starsInput: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  input: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: radii.md,
    padding: spacing.md,
    fontSize: 14,
    color: C.text,
    textAlignVertical: 'top',
  },
  formActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  formBtn: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formBtnTxt: { fontSize: 14, fontWeight: '600', color: C.text },

  emptyBox: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  emptyTxt: { fontSize: 14, color: C.muted },

  reviewCard: {
    backgroundColor: '#F9FAFB',
    padding: spacing.lg,
    borderRadius: radii.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: C.border,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  reviewerName: { fontSize: 13, fontWeight: '600', color: C.text, marginBottom: 4 },
  reviewStars: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewComment: {
    fontSize: 13,
    color: C.textSoft,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  reviewDate: {
    fontSize: 11,
    color: C.muted,
  },
});
