// Helper Superhost: calcul du badge selon rating + reviews + verified.
export function isSuperhost(item) {
  if (!item) return false;
  const rating = Number(item.rating) || 0;
  const reviews = Number(item.reviews) || 0;
  return item.verified && rating >= 4.7 && reviews >= 5;
}
