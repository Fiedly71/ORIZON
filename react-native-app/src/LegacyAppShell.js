import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import PropertyCard from './components/PropertyCard';
import {
  agentsSeed,
  appointmentsSeed,
  marketNewsSeed,
  notificationsSeed,
  onboardingSlides,
  paymentHistorySeed,
  plans,
  propertiesSeed,
  propertyAmenities,
  propertyTypes,
  servicesList,
  threadsSeed,
} from './data/mockData';
import { translations } from './i18n/translations';
import { useAuthStore } from './store/useAuthStore';
import { useFavorites } from './store/useFavorites';
import { useUI } from './store/useUI';
import { signOut as signOutUser, canPublish } from './services/authService';
import { requestVisit } from './services/visitsService';
import { shareProperty } from './services/shareService';
import { trackView, trackContact, trackShare, trackFavorite } from './services/statsService';

const C = {
  bg: '#F2F5F8',
  card: '#FFFFFF',
  primary: '#00A38D',
  accent: '#00BFA6',
  primarySoft: '#E0F7F4',
  text: '#0F172A',
  muted: '#64748B',
  success: '#10B981',
  danger: '#EF4444',
  gold: '#F59E0B',
  border: '#E2E8F0',
  surface: '#F8FAFB',
};

const emptyAuth = {
  fullName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  role: 'Acheteur / Locataire',
};

const emptyListing = {
  title: '',
  description: '',
  location: '',
  price: '',
  bedrooms: '',
  bathrooms: '',
  area: '',
  image: '',
  type: 'Maison',
  status: 'A vendre',
  amenities: [],
};

const emptyVisit = {
  propertyId: null,
  date: '2026-05-10',
  time: '10:00',
  notes: '',
};

const defaultStats = [
  { key: 'projects', value: '0' },
  { key: 'clients', value: '0' },
  { key: 'managed', value: '0' },
  { key: 'partners', value: '0' },
];

const formatMoney = (n) => `$${Number(n || 0).toLocaleString()}`;

const parseNum = (v) => Number(String(v || '').replace(/[^0-9.]/g, ''));

const monthlyPayment = ({ amount, down, rate, years }) => {
  const principal = Math.max(amount - down, 0);
  const monthlyRate = rate / 100 / 12;
  const months = years * 12;
  if (!principal || !monthlyRate || !months) return 0;
  const p = (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months));
  return Number.isFinite(p) ? p : 0;
};

const notifIconByType = {
  message: 'chatbubble-ellipses-outline',
  appointment: 'calendar-outline',
  price: 'trending-down-outline',
  new: 'home-outline',
  plan: 'ribbon-outline',
  market: 'stats-chart-outline',
};

const serviceIconById = {
  s1: 'home-outline',
  s2: 'clipboard-outline',
  s3: 'analytics-outline',
  s4: 'shield-checkmark-outline',
  s5: 'card-outline',
  s6: 'trending-up-outline',
};

export default function App() {
  const insets = useSafeAreaInsets();
  // Langue + devise viennent du store global useUI (persiste).
  const language = useUI((s) => s.language);
  const setLanguage = useUI((s) => s.setLanguage);
  const currency = useUI((s) => s.currency);
  const setCurrency = useUI((s) => s.setCurrency);
  // Auth + onboarding sont gerees par RootNavigator/AuthNavigator desormais.
  // Quand ce shell est monte, l'utilisateur est deja authentifie -> on saute direct a 'app'.
  const [stage, setStage] = useState('app');
  const [onboardingIndex, setOnboardingIndex] = useState(0);

  const [isRegister, setIsRegister] = useState(false);
  const [authForm, setAuthForm] = useState(emptyAuth);

  // Source de verite: useAuthStore (alimente par authService apres login/register).
  const authUser = useAuthStore((s) => s.user);
  const [user, setUser] = useState({
    fullName: authUser?.fullName || authUser?.email || 'Utilisateur',
    email: authUser?.email || '',
    phone: authUser?.phone || '',
    role: authUser?.role || 'Acheteur / Locataire',
    bio: '',
    memberSince: authUser?.created_at
      ? new Date(authUser.created_at).toLocaleDateString('fr-FR', { month: '2-digit', year: 'numeric' })
      : new Date().toLocaleDateString('fr-FR', { month: '2-digit', year: 'numeric' }),
  });

  // Resync local user quand le store change (login/register termine).
  useEffect(() => {
    if (!authUser) return;
    setUser((prev) => ({
      ...prev,
      fullName: authUser.fullName || authUser.email || prev.fullName,
      email: authUser.email || prev.email,
      phone: authUser.phone || prev.phone,
      role: authUser.role || prev.role,
    }));
  }, [authUser]);

  // Charge les favoris persistants une fois le user connecte.
  useEffect(() => {
    if (authUser?.id) loadFavorites();
  }, [authUser?.id, loadFavorites]);

  const [activeTab, setActiveTab] = useState('home');
  const [overlay, setOverlay] = useState({ name: null, payload: null });

  const [query, setQuery] = useState('');
  const [agentQuery, setAgentQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [filters, setFilters] = useState({
    type: 'Tous',
    minPrice: '',
    maxPrice: '',
    bedrooms: '',
    bathrooms: '',
    status: 'Tous',
  });

  const [properties, setProperties] = useState(propertiesSeed);
  const favorites = useFavorites((s) => s.ids);
  const loadFavorites = useFavorites((s) => s.load);
  const toggleFavoriteStore = useFavorites((s) => s.toggle);
  const removeFavoriteStore = useFavorites((s) => s.remove);
  const [compareIds, setCompareIds] = useState([]);

  const [threads, setThreads] = useState(threadsSeed);
  const [activeThreadId, setActiveThreadId] = useState(threadsSeed[0]?.id ?? null);
  const [composer, setComposer] = useState('');

  const [appointments, setAppointments] = useState(appointmentsSeed);
  const [currentPlan, setCurrentPlan] = useState(plans[1]);
  const [payments, setPayments] = useState(paymentHistorySeed);

  const [listingForm, setListingForm] = useState(emptyListing);
  const [editingListingId, setEditingListingId] = useState(null);

  const [profileDraft, setProfileDraft] = useState({ fullName: '', phone: '', bio: '' });
  const [notifications, setNotifications] = useState(notificationsSeed);

  const [calcInput, setCalcInput] = useState({ amount: '120000', down: '20000', rate: '7.5', years: '20' });
  const [calcResult, setCalcResult] = useState(0);

  const [visitDraft, setVisitDraft] = useState(emptyVisit);
  const [reportReason, setReportReason] = useState('illegal');
  const [reportDetails, setReportDetails] = useState('');

  const text = translations[language] || translations.fr;
  const activeThread = threads.find((t) => t.id === activeThreadId) || null;

  const featuredProperties = useMemo(
    () => properties.filter((p) => p.featured).slice(0, 4),
    [properties]
  );

  const recentProperties = useMemo(
    () => [...properties].sort((a, b) => (a.postedAt < b.postedAt ? 1 : -1)).slice(0, 8),
    [properties]
  );

  // ====== Sections marketplace ======
  const bestPriceProperties = useMemo(
    () => [...properties].filter((p) => p.price > 0).sort((a, b) => a.price - b.price).slice(0, 6),
    [properties]
  );

  const forRentProperties = useMemo(
    () => properties.filter((p) => /louer|rent/i.test(p.status || '')).slice(0, 6),
    [properties]
  );

  const forSaleProperties = useMemo(
    () => properties.filter((p) => /vendre|sale/i.test(p.status || '')).slice(0, 6),
    [properties]
  );

  const newListings = useMemo(
    () => [...properties].sort((a, b) => (a.postedAt < b.postedAt ? 1 : -1)).slice(0, 6),
    [properties]
  );

  // Top "vendeurs" = users avec le plus d'annonces actives.
  const topSellers = useMemo(() => {
    const map = new Map();
    properties.forEach((p) => {
      const key = p.ownerId || p.ownerName || 'inconnu';
      const entry = map.get(key) || { id: key, name: p.ownerName || 'Vendeur', count: 0, image: p.ownerAvatar };
      entry.count += 1;
      map.set(key, entry);
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [properties]);

  const categories = useMemo(
    () => [
      { key: 'Maison', label: 'Maison', icon: 'home-outline' },
      { key: 'Appartement', label: 'Appartement', icon: 'business-outline' },
      { key: 'Hotel', label: 'Hôtel', icon: 'bed-outline' },
      { key: 'Terrain', label: 'Terrain', icon: 'leaf-outline' },
      { key: 'Commercial', label: 'Commercial', icon: 'storefront-outline' },
    ],
    []
  );

  const filteredProperties = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = properties.filter((p) => {
      const matchQuery =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q) ||
        p.type.toLowerCase().includes(q);

      const matchType = filters.type === 'Tous' || p.type === filters.type;

      const min = Number(filters.minPrice || 0);
      const max = Number(filters.maxPrice || 0);
      const matchMin = !min || p.price >= min;
      const matchMax = !max || p.price <= max;

      const beds = Number(filters.bedrooms || 0);
      const baths = Number(filters.bathrooms || 0);
      const matchBeds = !beds || p.bedrooms >= beds;
      const matchBaths = !baths || p.bathrooms >= baths;

      const statusSale = filters.status === 'Tous' || p.status === filters.status;

      return matchQuery && matchType && matchMin && matchMax && matchBeds && matchBaths && statusSale;
    });

    if (sortBy === 'price-asc') list = [...list].sort((a, b) => a.price - b.price);
    if (sortBy === 'price-desc') list = [...list].sort((a, b) => b.price - a.price);
    if (sortBy === 'rating') list = [...list].sort((a, b) => b.rating - a.rating);
    if (sortBy === 'recent') list = [...list].sort((a, b) => (a.postedAt < b.postedAt ? 1 : -1));

    return list;
  }, [properties, query, filters, sortBy]);

  const favoriteProperties = useMemo(
    () => properties.filter((p) => favorites.includes(p.id)),
    [properties, favorites]
  );

  const compareProperties = useMemo(
    () => properties.filter((p) => compareIds.includes(p.id)),
    [properties, compareIds]
  );

  const myListings = useMemo(
    () => properties.filter((p) => p.ownerName === user.fullName),
    [properties, user.fullName]
  );

  const filteredAgents = useMemo(() => {
    const q = agentQuery.trim().toLowerCase();
    if (!q) return agentsSeed;
    return agentsSeed.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.city.toLowerCase().includes(q) ||
        a.role.toLowerCase().includes(q) ||
        a.agency.toLowerCase().includes(q)
    );
  }, [agentQuery]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const goNextOnboarding = () => {
    if (onboardingIndex >= onboardingSlides.length - 1) {
      setStage('auth');
      return;
    }
    setOnboardingIndex((p) => p + 1);
  };

  const completeAuth = () => {
    if (!authForm.email || !authForm.password || (isRegister && !authForm.fullName)) {
      Alert.alert('ORIZON', text.requiredFields);
      return;
    }

    if (isRegister && authForm.password !== authForm.confirmPassword) {
      Alert.alert('ORIZON', text.error);
      return;
    }

    setUser((prev) => ({
      ...prev,
      fullName: isRegister ? authForm.fullName : prev.fullName,
      email: authForm.email,
      phone: authForm.phone || prev.phone,
      role: authForm.role || prev.role,
    }));

    setAuthForm(emptyAuth);
    setStage('app');
  };

  const logout = () => {
    Alert.alert('ORIZON', text.logoutConfirm, [
      { text: text.cancel, style: 'cancel' },
      {
        text: text.confirm,
        style: 'destructive',
        onPress: () => {
          setStage('auth');
          setOverlay({ name: null, payload: null });
          setActiveTab('home');
        },
      },
    ]);
  };

  const openOverlay = (name, payload = null) => {
    setOverlay({ name, payload });
    if (name === 'details' && payload?.id) {
      trackView(payload.id).catch(() => {});
    }
  };
  const closeOverlay = () => setOverlay({ name: null, payload: null });

  const toggleFavorite = (id) => {
    toggleFavoriteStore(id);
    trackFavorite(id).catch(() => {});
  };

  const toggleCompare = (property) => {
    setCompareIds((prev) => {
      if (prev.includes(property.id)) {
        return prev.filter((x) => x !== property.id);
      }
      if (prev.length >= 3) {
        Alert.alert('ORIZON', text.compareLimit);
        return prev;
      }
      Alert.alert('ORIZON', text.addedCompare);
      return [...prev, property.id];
    });
  };

  const contactSeller = (property) => {
    if (property?.id) trackContact(property.id).catch(() => {});
    const existingThread = threads.find((t) => t.propertyId === property.id);
    if (existingThread) {
      setActiveThreadId(existingThread.id);
      setActiveTab('messages');
      return;
    }

    const initialMessage = `${text.contactSeller}: ${property.title}`;
    const newThread = {
      id: `t-${Date.now()}`,
      name: property.ownerName,
      role: property.ownerType,
      propertyId: property.id,
      lastMessage: initialMessage,
      unread: 0,
      messages: [{ id: `m-${Date.now()}`, from: 'me', text: initialMessage, time: 'Maintenant' }],
    };

    setThreads((prev) => [newThread, ...prev]);
    setActiveThreadId(newThread.id);
    setActiveTab('messages');
  };

  const sendMessage = () => {
    const content = composer.trim();
    if (!content || !activeThread) return;

    const message = { id: `m-${Date.now()}`, from: 'me', text: content, time: 'Maintenant' };
    setThreads((prev) =>
      prev.map((t) =>
        t.id === activeThread.id
          ? {
              ...t,
              lastMessage: content,
              messages: [...t.messages, message],
            }
          : t
      )
    );
    setComposer('');
    Alert.alert('ORIZON', text.messageSent);
  };

  const openEditListing = (listing) => {
    setEditingListingId(listing.id);
    setListingForm({
      title: listing.title,
      description: listing.description,
      location: listing.location,
      price: String(listing.price),
      bedrooms: String(listing.bedrooms || ''),
      bathrooms: String(listing.bathrooms || ''),
      area: String(listing.area || ''),
      image: listing.image || '',
      type: listing.type,
      status: listing.status,
      amenities: listing.amenities || [],
    });
    setActiveTab('sell');
  };

  const resetListingForm = () => {
    setListingForm(emptyListing);
    setEditingListingId(null);
  };

  const publishListing = () => {
    if (!listingForm.title || !listingForm.location || !listingForm.price) {
      Alert.alert('ORIZON', text.requiredFields);
      return;
    }

    const payload = {
      title: listingForm.title,
      description: listingForm.description || 'Annonce ORIZON',
      location: listingForm.location,
      price: parseNum(listingForm.price),
      bedrooms: parseNum(listingForm.bedrooms),
      bathrooms: parseNum(listingForm.bathrooms),
      area: parseNum(listingForm.area),
      status: listingForm.status,
      type: listingForm.type,
      amenities: listingForm.amenities,
      image:
        listingForm.image ||
        'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80',
      ownerName: user.fullName,
      ownerType: user.role,
      featured: false,
      verified: false,
      rating: 4.2,
      reviews: 0,
      postedAt: '2026-04-20',
      yearBuilt: 2020,
      floors: 1,
    };

    if (editingListingId) {
      setProperties((prev) => prev.map((p) => (p.id === editingListingId ? { ...p, ...payload } : p)));
      Alert.alert('ORIZON', text.listingUpdated);
      resetListingForm();
      return;
    }

    const listing = {
      ...payload,
      id: `p-${Date.now()}`,
      images: [payload.image],
      agentId: 'ag1',
    };

    setProperties((prev) => [listing, ...prev]);
    resetListingForm();
    Alert.alert('ORIZON', text.publishedOk);
  };

  const deleteListing = (id) => {
    Alert.alert('ORIZON', text.confirmDelete, [
      { text: text.cancel, style: 'cancel' },
      {
        text: text.confirm,
        style: 'destructive',
        onPress: () => {
          setProperties((prev) => prev.filter((p) => p.id !== id));
          removeFavoriteStore(id);
          setCompareIds((prev) => prev.filter((x) => x !== id));
          Alert.alert('ORIZON', text.listingDeleted);
        },
      },
    ]);
  };

  const subscribePlan = (plan) => {
    setCurrentPlan(plan);
    setPayments((prev) => [
      {
        id: `pay-${Date.now()}`,
        date: '20 avr. 2026',
        amount: plan.priceMonthly,
        status: 'Paye',
        plan: plan.name,
      },
      ...prev,
    ]);
    closeOverlay();
  };

  const openScheduleVisit = (property) => {
    setVisitDraft({ ...emptyVisit, propertyId: property.id });
    openOverlay('scheduleVisit', property);
  };

  const confirmVisit = () => {
    if (!visitDraft.propertyId || !visitDraft.date || !visitDraft.time) {
      Alert.alert('ORIZON', text.requiredFields);
      return;
    }

    const appt = {
      id: `a-${Date.now()}`,
      propertyId: visitDraft.propertyId,
      date: visitDraft.date,
      time: visitDraft.time,
      status: text.pending,
      notes: visitDraft.notes,
    };

    setAppointments((prev) => [appt, ...prev]);

    // Persiste cote backend (visits table) — non bloquant.
    try {
      const scheduledAt = new Date(`${visitDraft.date}T${visitDraft.time}:00`);
      requestVisit({
        propertyId: visitDraft.propertyId,
        scheduledAt: scheduledAt.toISOString(),
        notes: visitDraft.notes || '',
      }).catch(() => {});
    } catch (_) { /* date invalide -> on ignore, l'UI a deja confirme */ }

    closeOverlay();
    Alert.alert('ORIZON', text.visitAdded);
  };

  const cancelAppointment = (id) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: text.cancelled } : a))
    );
  };

  const saveProfile = () => {
    if (!profileDraft.fullName.trim()) {
      Alert.alert('ORIZON', text.requiredFields);
      return;
    }

    setUser((prev) => ({
      ...prev,
      fullName: profileDraft.fullName.trim(),
      phone: profileDraft.phone.trim() || prev.phone,
      bio: profileDraft.bio.trim(),
    }));
    closeOverlay();
    Alert.alert('ORIZON', text.saved);
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const runCalculator = () => {
    const amount = parseNum(calcInput.amount);
    const down = parseNum(calcInput.down);
    const rate = Number(calcInput.rate || 0);
    const years = Number(calcInput.years || 0);

    const m = monthlyPayment({ amount, down, rate, years });
    setCalcResult(m);
  };

  const toggleAmenity = (item) => {
    setListingForm((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(item)
        ? prev.amenities.filter((a) => a !== item)
        : [...prev.amenities, item],
    }));
  };

  const renderTopBar = () => (
    <View style={styles.topbar}>
      <Pressable style={styles.profileChip} onPress={() => setActiveTab('profile')}>
        <View style={styles.profileChipAvatarFallback}>
          <Text style={styles.profileChipAvatarTxt}>
            {(user.fullName || 'U').trim().charAt(0).toUpperCase()}
          </Text>
        </View>
        <View>
          <Text style={styles.profileChipName} numberOfLines={1}>
            {(user.fullName || 'Utilisateur').split(' ')[0]}
          </Text>
          <Text style={styles.profileChipRole} numberOfLines={1}>{user.role}</Text>
        </View>
      </Pressable>

      <View style={styles.topCenterLoc}>
        <Text style={styles.topCenterLbl}>Haïti</Text>
        <Text style={styles.topCenterValue}>Port-au-Prince</Text>
      </View>

      <View style={styles.topbarActions}>
        <Pressable style={styles.iconBtn} onPress={() => setActiveTab('profile')}>
          <Ionicons name="heart-outline" size={18} color={C.primary} />
        </Pressable>
        <Pressable style={styles.iconBtn} onPress={() => openOverlay('notifications')}>
          <Ionicons name="notifications-outline" size={18} color={C.primary} />
          {unreadCount > 0 && (
            <View style={styles.badgeDot}>
              <Text style={styles.badgeTxt}>{unreadCount}</Text>
            </View>
          )}
        </Pressable>
        <Pressable style={styles.iconBtn} onPress={() => setActiveTab('discover')}>
          <Ionicons name="search-outline" size={18} color={C.primary} />
        </Pressable>
      </View>
    </View>
  );

  const renderCompactPropertyCard = (item) => (
    <Pressable key={item.id} style={styles.compactCard} onPress={() => openOverlay('details', item)}>
      <View style={styles.compactImgWrap}>
        <Image source={{ uri: item.image }} style={styles.compactImg} />
        <View style={styles.compactTag}><Text style={styles.compactTagTxt}>New Price</Text></View>
        <Pressable style={styles.compactHeart} onPress={() => toggleFavorite(item.id)}>
          <Ionicons name={favorites.includes(item.id) ? 'heart' : 'heart-outline'} size={14} color={C.primary} />
        </Pressable>
      </View>
      <View style={styles.compactBody}>
        <View style={styles.sectionRow}>
          <Text style={styles.compactTitle}>{item.title}</Text>
          <Text style={styles.compactPrice}>${item.price.toLocaleString()}</Text>
        </View>
        <Text style={styles.compactLoc}>{item.location}</Text>
        <View style={styles.compactMetaRow}>
          <View style={styles.compactMetaPill}><Ionicons name="bed-outline" size={12} color={C.muted} /><Text style={styles.compactMetaTxt}>{item.bedrooms}</Text></View>
          <View style={styles.compactMetaPill}><Ionicons name="water-outline" size={12} color={C.muted} /><Text style={styles.compactMetaTxt}>{item.bathrooms}</Text></View>
          <View style={styles.compactMetaPill}><Ionicons name="resize-outline" size={12} color={C.muted} /><Text style={styles.compactMetaTxt}>{item.area} Sqft</Text></View>
        </View>
      </View>
    </Pressable>
  );

  const renderPropertyList = (list) => {
    if (!list.length) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTxt}>{text.noResults}</Text>
        </View>
      );
    }

    return list.map((item) => (
      <PropertyCard
        key={item.id}
        item={item}
        text={text}
        onContact={contactSeller}
        onFavorite={toggleFavorite}
        isFavorite={favorites.includes(item.id)}
        onOpenDetails={(p) => openOverlay('details', p)}
        onCompare={toggleCompare}
        isCompared={compareIds.includes(item.id)}
      />
    ));
  };

  const renderHorizontalCard = (item) => (
    <Pressable key={item.id} style={styles.hCard} onPress={() => openOverlay('details', item)}>
      <View style={styles.hCardImgWrap}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.hCardImg} />
        ) : (
          <View style={[styles.hCardImg, styles.hCardImgPlaceholder]}>
            <Ionicons name="image-outline" size={28} color={C.muted} />
          </View>
        )}
        <Pressable style={styles.hCardHeart} onPress={() => toggleFavorite(item.id)}>
          <Ionicons name={favorites.includes(item.id) ? 'heart' : 'heart-outline'} size={14} color={C.primary} />
        </Pressable>
      </View>
      <View style={styles.hCardBody}>
        <Text style={styles.hCardPrice}>${Number(item.price || 0).toLocaleString()}</Text>
        <Text style={styles.hCardTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.hCardLoc} numberOfLines={1}>
          <Ionicons name="location-outline" size={11} color={C.muted} /> {item.location}
        </Text>
      </View>
    </Pressable>
  );

  const renderSection = (title, list, opts = {}) => {
    if (!list || list.length === 0) return null;
    return (
      <View style={{ marginTop: 8 }}>
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Pressable onPress={() => setActiveTab('discover')}>
            <Text style={styles.linkBtn}>{text.seeAll}</Text>
          </Pressable>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 4, gap: 10 }}
        >
          {list.map((item) =>
            opts.compact ? renderHorizontalCard(item) : renderHorizontalCard(item)
          )}
        </ScrollView>
      </View>
    );
  };

  const renderEmptyMarketplace = () => (
    <View style={styles.emptyMarket}>
      <Ionicons name="home-outline" size={42} color={C.muted} />
      <Text style={styles.emptyMarketTitle}>Le marketplace démarre</Text>
      <Text style={styles.emptyMarketTxt}>
        Aucune annonce pour le moment. Sois le premier à publier ta maison, ton terrain ou ton appartement.
      </Text>
      <Pressable style={styles.primaryBtn} onPress={() => setActiveTab('sell')}>
        <Text style={styles.primaryBtnTxt}>Publier ma première annonce</Text>
      </Pressable>
    </View>
  );

  const renderHome = () => (
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      {renderTopBar()}

      {/* Search rapide */}
      <Pressable style={styles.heroSearch} onPress={() => setActiveTab('discover')}>
        <Ionicons name="search-outline" size={18} color={C.muted} />
        <Text style={styles.heroSearchTxt}>Rechercher une maison, un quartier...</Text>
      </Pressable>

      {/* Categories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.catRow}
      >
        {categories.map((c) => (
          <Pressable
            key={c.key}
            style={styles.catChip}
            onPress={() => {
              setFilters((p) => ({ ...p, type: c.key }));
              setActiveTab('discover');
            }}
          >
            <View style={styles.catIconWrap}>
              <Ionicons name={c.icon} size={20} color={C.primary} />
            </View>
            <Text style={styles.catLabel}>{c.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {properties.length === 0 ? (
        renderEmptyMarketplace()
      ) : (
        <>
          {/* Banner CTA */}
          <Pressable style={styles.ctaBanner} onPress={() => setActiveTab('sell')}>
            <View style={{ flex: 1 }}>
              <Text style={styles.ctaBannerTitle}>Tu as un bien à vendre ou louer ?</Text>
              <Text style={styles.ctaBannerSub}>Publie en 2 minutes et touche des milliers d'acheteurs.</Text>
            </View>
            <View style={styles.ctaBannerBtn}>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </View>
          </Pressable>

          {renderSection('🔥 Maisons en vedette', featuredProperties)}
          {renderSection('🆕 Nouvelles annonces', newListings)}
          {renderSection('💰 Meilleurs prix', bestPriceProperties)}
          {renderSection('🏷️ À vendre', forSaleProperties)}
          {renderSection('🔑 À louer', forRentProperties)}

          {topSellers.length > 0 && (
            <View style={{ marginTop: 12 }}>
              <View style={styles.sectionRow}>
                <Text style={styles.sectionTitle}>⭐ Meilleurs vendeurs</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 4 }}>
                {topSellers.map((s) => (
                  <View key={s.id} style={styles.sellerCard}>
                    <View style={styles.sellerAvatar}>
                      <Text style={styles.sellerAvatarTxt}>{(s.name || 'U').charAt(0).toUpperCase()}</Text>
                    </View>
                    <Text style={styles.sellerName} numberOfLines={1}>{s.name}</Text>
                    <Text style={styles.sellerCount}>{s.count} annonce{s.count > 1 ? 's' : ''}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );

  const renderDiscover = () => (
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      {renderTopBar()}

      <View style={styles.cardSoft}>
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>{text.discover}</Text>
          <Pressable style={styles.filterChip} onPress={() => openOverlay('compare')}>
            <Ionicons name="git-compare-outline" size={13} color={C.text} />
            <Text style={styles.filterChipTxt}>{text.compareNow}</Text>
          </Pressable>
        </View>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={text.search}
          style={styles.field}
          placeholderTextColor="#7B8794"
        />

        <View style={styles.rowWrap}>
          <Pressable
            style={[styles.chip, filters.type === 'Tous' && styles.chipOn]}
            onPress={() => setFilters((p) => ({ ...p, type: 'Tous' }))}
          >
            <Text style={[styles.chipTxt, filters.type === 'Tous' && styles.chipTxtOn]}>{text.allTypes}</Text>
          </Pressable>
          {propertyTypes.map((t) => (
            <Pressable
              key={t}
              style={[styles.chip, filters.type === t && styles.chipOn]}
              onPress={() => setFilters((p) => ({ ...p, type: t }))}
            >
              <Text style={[styles.chipTxt, filters.type === t && styles.chipTxtOn]}>{t}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.rowInputs}>
          <TextInput
            value={filters.minPrice}
            onChangeText={(v) => setFilters((p) => ({ ...p, minPrice: v.replace(/[^0-9]/g, '') }))}
            placeholder={text.minPrice}
            style={[styles.field, styles.half]}
            keyboardType="numeric"
            placeholderTextColor="#7B8794"
          />
          <TextInput
            value={filters.maxPrice}
            onChangeText={(v) => setFilters((p) => ({ ...p, maxPrice: v.replace(/[^0-9]/g, '') }))}
            placeholder={text.maxPrice}
            style={[styles.field, styles.half]}
            keyboardType="numeric"
            placeholderTextColor="#7B8794"
          />
        </View>

        <View style={styles.rowInputs}>
          <TextInput
            value={filters.bedrooms}
            onChangeText={(v) => setFilters((p) => ({ ...p, bedrooms: v.replace(/[^0-9]/g, '') }))}
            placeholder={text.bedrooms}
            style={[styles.field, styles.half]}
            keyboardType="numeric"
            placeholderTextColor="#7B8794"
          />
          <TextInput
            value={filters.bathrooms}
            onChangeText={(v) => setFilters((p) => ({ ...p, bathrooms: v.replace(/[^0-9]/g, '') }))}
            placeholder={text.bathrooms}
            style={[styles.field, styles.half]}
            keyboardType="numeric"
            placeholderTextColor="#7B8794"
          />
        </View>

        <View style={styles.rowWrap}>
          {['Tous', 'A vendre', 'A louer'].map((s) => (
            <Pressable
              key={s}
              style={[styles.chip, filters.status === s && styles.chipOn]}
              onPress={() => setFilters((p) => ({ ...p, status: s }))}
            >
              <Text style={[styles.chipTxt, filters.status === s && styles.chipTxtOn]}>{s}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.rowWrap}>
          {[
            { key: 'recent', label: text.sortRecent },
            { key: 'price-asc', label: text.sortPriceAsc },
            { key: 'price-desc', label: text.sortPriceDesc },
            { key: 'rating', label: text.sortRating },
          ].map((s) => (
            <Pressable
              key={s.key}
              style={[styles.chip, sortBy === s.key && styles.chipOn]}
              onPress={() => setSortBy(s.key)}
            >
              <Text style={[styles.chipTxt, sortBy === s.key && styles.chipTxtOn]}>{s.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.sectionRow}>
          <Pressable
            style={styles.softBtn}
            onPress={() =>
              setFilters({ type: 'Tous', minPrice: '', maxPrice: '', bedrooms: '', bathrooms: '', status: 'Tous' })
            }
          >
            <Text style={styles.softBtnTxt}>{text.clearFilters}</Text>
          </Pressable>
          <Pressable style={styles.softBtn} onPress={() => openOverlay('compare')}>
            <Text style={styles.softBtnTxt}>{text.compareNow}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>{text.allProperties}</Text>
        <Text style={styles.counter}>{filteredProperties.length}</Text>
      </View>

      {filteredProperties.map((item) => renderCompactPropertyCard(item))}
    </ScrollView>
  );

  const renderSell = () => {
    if (!canPublish(user?.role)) {
      return (
        <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
          {renderTopBar()}
          <View style={[styles.cardSoft, { alignItems: 'center', padding: 28, gap: 12 }]}>
            <Ionicons name="lock-closed-outline" size={42} color={colors.muted} />
            <Text style={[styles.sectionTitle, { textAlign: 'center' }]}>Publication réservée</Text>
            <Text style={[styles.sectionSub, { textAlign: 'center', lineHeight: 18 }]}>
              Seuls les Propriétaires et les Agences peuvent publier des annonces sur ORIZON.
              {'\n\n'}Coût de publication : <Text style={{ fontWeight: '800' }}>20 USD (2 500 HTG)</Text> par annonce.
            </Text>
          </View>
        </ScrollView>
      );
    }
    return (
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      {renderTopBar()}

      <View style={styles.cardSoft}>
        <Text style={styles.sectionTitle}>{editingListingId ? text.editListing : text.sellTitle}</Text>
        <Text style={styles.sectionSub}>Design studio listing form</Text>

        <TextInput
          value={listingForm.title}
          onChangeText={(v) => setListingForm((p) => ({ ...p, title: v }))}
          placeholder={text.listingTitle}
          style={styles.field}
          placeholderTextColor="#7B8794"
        />
        <TextInput
          value={listingForm.description}
          onChangeText={(v) => setListingForm((p) => ({ ...p, description: v }))}
          placeholder={text.listingDescription}
          style={[styles.field, styles.fieldLarge]}
          multiline
          placeholderTextColor="#7B8794"
        />
        <TextInput
          value={listingForm.location}
          onChangeText={(v) => setListingForm((p) => ({ ...p, location: v }))}
          placeholder={text.listingLocation}
          style={styles.field}
          placeholderTextColor="#7B8794"
        />

        <View style={styles.rowInputs}>
          <TextInput
            value={listingForm.price}
            onChangeText={(v) => setListingForm((p) => ({ ...p, price: v.replace(/[^0-9]/g, '') }))}
            placeholder={text.listingPrice}
            style={[styles.field, styles.half]}
            keyboardType="numeric"
            placeholderTextColor="#7B8794"
          />
          <TextInput
            value={listingForm.area}
            onChangeText={(v) => setListingForm((p) => ({ ...p, area: v.replace(/[^0-9]/g, '') }))}
            placeholder={text.listingArea}
            style={[styles.field, styles.half]}
            keyboardType="numeric"
            placeholderTextColor="#7B8794"
          />
        </View>

        <View style={styles.rowInputs}>
          <TextInput
            value={listingForm.bedrooms}
            onChangeText={(v) => setListingForm((p) => ({ ...p, bedrooms: v.replace(/[^0-9]/g, '') }))}
            placeholder={text.listingBedrooms}
            style={[styles.field, styles.half]}
            keyboardType="numeric"
            placeholderTextColor="#7B8794"
          />
          <TextInput
            value={listingForm.bathrooms}
            onChangeText={(v) => setListingForm((p) => ({ ...p, bathrooms: v.replace(/[^0-9]/g, '') }))}
            placeholder={text.listingBathrooms}
            style={[styles.field, styles.half]}
            keyboardType="numeric"
            placeholderTextColor="#7B8794"
          />
        </View>

        <TextInput
          value={listingForm.image}
          onChangeText={(v) => setListingForm((p) => ({ ...p, image: v }))}
          placeholder={text.listingImage}
          style={styles.field}
          placeholderTextColor="#7B8794"
        />

        <View style={styles.rowWrap}>
          {propertyTypes.map((t) => (
            <Pressable
              key={t}
              style={[styles.chip, listingForm.type === t && styles.chipOn]}
              onPress={() => setListingForm((p) => ({ ...p, type: t }))}
            >
              <Text style={[styles.chipTxt, listingForm.type === t && styles.chipTxtOn]}>{t}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.rowWrap}>
          {['A vendre', 'A louer'].map((s) => (
            <Pressable
              key={s}
              style={[styles.chip, listingForm.status === s && styles.chipOn]}
              onPress={() => setListingForm((p) => ({ ...p, status: s }))}
            >
              <Text style={[styles.chipTxt, listingForm.status === s && styles.chipTxtOn]}>{s}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>{text.listingAmenities}</Text>
        <View style={styles.rowWrap}>
          {propertyAmenities.slice(0, 12).map((a) => (
            <Pressable
              key={a}
              style={[styles.chip, listingForm.amenities.includes(a) && styles.chipOn]}
              onPress={() => toggleAmenity(a)}
            >
              <Text style={[styles.chipTxt, listingForm.amenities.includes(a) && styles.chipTxtOn]}>{a}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.sectionRow}>
          <Pressable style={styles.primaryBtn} onPress={publishListing}>
            <Text style={styles.primaryBtnTxt}>{editingListingId ? text.save : text.publish}</Text>
          </Pressable>
          {editingListingId && (
            <Pressable style={styles.ghostBtn} onPress={resetListingForm}>
              <Text style={styles.ghostBtnTxt}>{text.cancel}</Text>
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>{text.myListings}</Text>
        <Text style={styles.counter}>{myListings.length}</Text>
      </View>

      {!myListings.length && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTxt}>{text.myListingsEmpty}</Text>
        </View>
      )}

      {myListings.map((item) => (
        <View key={item.id} style={styles.listingBlock}>
          {renderCompactPropertyCard(item)}
          <View style={styles.rowWrap}>
            <Pressable style={styles.softBtn} onPress={() => openEditListing(item)}>
              <Text style={styles.softBtnTxt}>{text.editListing}</Text>
            </Pressable>
            <Pressable style={styles.softBtnDanger} onPress={() => deleteListing(item.id)}>
              <Text style={styles.softBtnDangerTxt}>{text.deleteListing}</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </ScrollView>
    );
  };

  const renderMessages = () => (
    <View style={styles.pageFill}>
      <View style={styles.chatHeaderCard}>
        <Pressable style={styles.iconBtn} onPress={() => setActiveTab('home')}>
          <Ionicons name="chevron-back" size={18} color={C.text} />
        </Pressable>
        <Text style={styles.chatHeaderName}>{activeThread?.name || 'Jhon Smith'}</Text>
        <View style={styles.chatHeaderActions}>
          <Pressable style={styles.iconBtn}><Ionicons name="call-outline" size={17} color={C.text} /></Pressable>
          <Pressable style={styles.iconBtn}><Ionicons name="videocam-outline" size={17} color={C.text} /></Pressable>
        </View>
      </View>

      {activeThread ? (
        <>
          <View style={styles.chatListingCard}>
            <Image source={{ uri: properties.find((p) => p.id === activeThread.propertyId)?.image }} style={styles.chatListingThumb} />
            <View style={styles.chatListingBody}>
              <Text style={styles.chatListingTitle}>{properties.find((p) => p.id === activeThread.propertyId)?.title || 'Unique 3 Bedroom Flat'}</Text>
              <Text style={styles.chatListingMeta}>Posted by {activeThread.name}</Text>
              <Text style={styles.chatListingRating}>4.0 Rating (32 reviews)</Text>
            </View>
          </View>

          <ScrollView style={styles.chatScroll} contentContainerStyle={styles.chatScrollContent}>
            {activeThread.messages.map((m) => (
              <View key={m.id} style={[styles.bubble, m.from === 'me' ? styles.bubbleMe : styles.bubbleOther]}>
                <Text style={styles.bubbleTxt}>{m.text}</Text>
                <Text style={styles.bubbleTime}>{m.time}</Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.composerRowModern}>
            <Pressable style={styles.plusCircle}><Ionicons name="add" size={18} color={C.accent} /></Pressable>
            <TextInput
              value={composer}
              onChangeText={setComposer}
              placeholder={text.writeMessage}
              style={styles.composerModern}
              placeholderTextColor="#7B8794"
            />
            <Pressable style={styles.sendCircle} onPress={sendMessage}>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </Pressable>
          </View>
        </>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTxt}>{text.noMessages}</Text>
        </View>
      )}
    </View>
  );

  const renderProfile = () => (
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      <View style={styles.profileTopBar}>
        <Pressable style={styles.iconBtn} onPress={() => setActiveTab('home')}>
          <Ionicons name="chevron-back" size={18} color={C.text} />
        </Pressable>
        <Text style={styles.profileTopTitle}>User Profile</Text>
        <Pressable style={styles.iconBtn}>
          <Ionicons name="ellipsis-horizontal" size={18} color={C.text} />
        </Pressable>
      </View>

      <View style={styles.profileHeroCard}>
        <View style={styles.profileAvatarBig}>
          <Text style={styles.profileAvatarTxt}>
            {(user.fullName || 'U').trim().charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.profileInfoCol}>
          <Text style={styles.profileNameBig}>{user.fullName || 'Utilisateur'}</Text>
          <View style={styles.profileBadgesRow}>
            <View style={styles.profileSmallPill}>
              <Text style={styles.profileSmallPillTxt}>{properties.filter((p) => p.ownerId === authUser?.id).length} {text.myListings}</Text>
            </View>
            <View style={styles.profileSmallPill}>
              <Ionicons name="star" size={12} color="#F59E0B" />
              <Text style={styles.profileSmallPillTxt}>—</Text>
            </View>
          </View>
          {!!user.email && <Text style={styles.profileLine}>{user.email}</Text>}
          {!!user.phone && <Text style={styles.profileLine}>{user.phone}</Text>}
          <Text style={styles.profileLine}>{user.role}</Text>
        </View>
      </View>

      <View style={styles.profileTabsRow}>
        <Pressable style={[styles.profileTabBtn, styles.profileTabOn]}><Text style={styles.profileTabOnTxt}>Feed</Text></Pressable>
        <Pressable style={styles.profileTabBtn}><Text style={styles.profileTabTxt}>Reviews</Text></Pressable>
      </View>

      <View style={styles.sectionRow}>
        <Text style={styles.sectionSub}>Total items {properties.length}</Text>
        <Text style={styles.counter}>{text.myListings}</Text>
      </View>

      {properties.slice(0, 3).map((item) => renderCompactPropertyCard(item))}

      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>{text.favoritesTitle}</Text>
        <Text style={styles.counter}>{favoriteProperties.length}</Text>
      </View>
      {!favoriteProperties.length && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTxt}>{text.noFavorites}</Text>
        </View>
      )}
      {favoriteProperties.slice(0, 3).map((item) => renderCompactPropertyCard(item))}
    </ScrollView>
  );

  const renderOverlay = () => {
    if (!overlay.name) return null;

    if (overlay.name === 'details' && overlay.payload) {
      const p = overlay.payload;
      const agent = agentsSeed.find((a) => a.id === p.agentId);
      const similar = properties.filter((x) => x.id !== p.id && x.type === p.type).slice(0, 2);

      return (
        <View style={styles.overlayWrap}>
          <ScrollView contentContainerStyle={styles.page}>
            <View style={styles.detailsHeroWrap}>
              <Image source={{ uri: p.image }} style={styles.detailsImg} />
              <Pressable style={styles.detailsTopLeft} onPress={closeOverlay}>
                <Ionicons name="chevron-back" size={18} color={C.text} />
              </Pressable>
              <View style={styles.detailsTopRightCol}>
                <Pressable style={styles.detailsCircleBtn} onPress={() => toggleFavorite(p.id)}>
                  <Ionicons name={favorites.includes(p.id) ? 'heart' : 'heart-outline'} size={16} color={C.text} />
                </Pressable>
                <Pressable style={styles.detailsCircleBtn} onPress={() => openOverlay('share', p)}>
                  <Ionicons name="share-social-outline" size={16} color={C.text} />
                </Pressable>
              </View>
              <View style={styles.detailsMetricsRow}>
                <View style={styles.detailsMetricPill}><Ionicons name="heart-outline" size={12} color={C.text} /><Text style={styles.detailsMetricTxt}>1.5k</Text></View>
                <View style={styles.detailsMetricPill}><Ionicons name="eye-outline" size={12} color={C.text} /><Text style={styles.detailsMetricTxt}>10k</Text></View>
                <View style={styles.detailsMetricPill}><Ionicons name="share-outline" size={12} color={C.text} /><Text style={styles.detailsMetricTxt}>450</Text></View>
              </View>
            </View>

            <View style={styles.cardSoft}>
              <View style={styles.sectionRow}>
                <Text style={styles.sectionTitle}>{p.title}</Text>
                <Text style={styles.compactPrice}>{formatMoney(p.price)}</Text>
              </View>
              <View style={styles.inlineInfo}><Ionicons name="location-outline" size={13} color={C.muted} /><Text style={styles.sectionSub}>{p.location}</Text></View>
              <Text style={styles.sectionSub}>{p.description}</Text>
              <View style={styles.detailsSpecGrid}>
                <View style={styles.detailsSpecCard}><Ionicons name="bed-outline" size={16} color={C.primary} /><Text style={styles.detailsSpecValue}>{p.bedrooms}</Text><Text style={styles.detailsSpecLabel}>bedrooms</Text></View>
                <View style={styles.detailsSpecCard}><Ionicons name="water-outline" size={16} color={C.primary} /><Text style={styles.detailsSpecValue}>{p.bathrooms}</Text><Text style={styles.detailsSpecLabel}>bathrooms</Text></View>
                <View style={styles.detailsSpecCard}><Ionicons name="resize-outline" size={16} color={C.primary} /><Text style={styles.detailsSpecValue}>{p.area}</Text><Text style={styles.detailsSpecLabel}>square</Text></View>
              </View>
            </View>

            {agent && (
              <View style={styles.cardSoft}>
                <Text style={styles.sectionTitle}>{text.agentLabel}</Text>
                <Text style={styles.profileLine}>{agent.name}</Text>
                <Text style={styles.profileLine}>{agent.agency}</Text>
                <Text style={styles.profileLine}>{agent.phone}</Text>
                <Pressable style={styles.softBtn} onPress={() => Alert.alert('ORIZON', `${text.contactAgent}: ${agent.phone}`)}>
                  <Text style={styles.softBtnTxt}>{text.contactAgent}</Text>
                </Pressable>
              </View>
            )}

            <View style={styles.rowWrap}>
              <Pressable style={styles.primaryBtn} onPress={() => contactSeller(p)}>
                <Text style={styles.primaryBtnTxt}>{text.contact}</Text>
              </Pressable>
              <Pressable style={styles.primaryBtn} onPress={() => openScheduleVisit(p)}>
                <Text style={styles.primaryBtnTxt}>{text.bookVisit}</Text>
              </Pressable>
            </View>

            <View style={styles.rowWrap}>
              <Pressable style={styles.softBtn} onPress={() => toggleFavorite(p.id)}>
                <Text style={styles.softBtnTxt}>
                  {favorites.includes(p.id) ? text.removeFavorite : text.addFavorite}
                </Text>
              </Pressable>
              <Pressable style={styles.softBtn} onPress={() => toggleCompare(p)}>
                <Text style={styles.softBtnTxt}>{text.compare}</Text>
              </Pressable>
              <Pressable style={styles.softBtn} onPress={() => { if (p?.id) trackShare(p.id).catch(() => {}); shareProperty(p, { language, currency, phone: p?.contact?.phone || agent?.phone }); }}>
                <Text style={styles.softBtnTxt}>{text.shareProperty}</Text>
              </Pressable>
              <Pressable style={styles.softBtn} onPress={() => openOverlay('report', p)}>
                <Text style={styles.softBtnTxt}>{text.report}</Text>
              </Pressable>
            </View>

            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>{text.similarProperties}</Text>
            </View>
            {renderPropertyList(similar)}
          </ScrollView>
        </View>
      );
    }

    if (overlay.name === 'compare') {
      return (
        <View style={styles.overlayWrap}>
          <ScrollView contentContainerStyle={styles.page}>
            <Pressable style={styles.backBtn} onPress={closeOverlay}>
              <Text style={styles.backBtnTxt}>{text.back}</Text>
            </Pressable>

            <Text style={styles.sectionTitle}>{text.compareTitle}</Text>
            {compareProperties.length < 2 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTxt}>{text.compareEmpty}</Text>
              </View>
            )}

            {compareProperties.map((p) => (
              <View key={p.id} style={styles.cardSoft}>
                <Text style={styles.sectionTitle}>{p.title}</Text>
                <Text style={styles.sectionSub}>{text.price}: {formatMoney(p.price)}</Text>
                <Text style={styles.sectionSub}>{text.location}: {p.location}</Text>
                <Text style={styles.sectionSub}>{text.area}: {p.area} m2</Text>
                <Text style={styles.sectionSub}>{text.bedrooms}: {p.bedrooms}</Text>
                <Text style={styles.sectionSub}>{text.bathrooms}: {p.bathrooms}</Text>
                <Pressable style={styles.softBtn} onPress={() => toggleCompare(p)}>
                  <Text style={styles.softBtnTxt}>{text.remove}</Text>
                </Pressable>
              </View>
            ))}
          </ScrollView>
        </View>
      );
    }

    if (overlay.name === 'appointments') {
      return (
        <View style={styles.overlayWrap}>
          <ScrollView contentContainerStyle={styles.page}>
            <Pressable style={styles.backBtn} onPress={closeOverlay}>
              <Text style={styles.backBtnTxt}>{text.back}</Text>
            </Pressable>
            <Text style={styles.sectionTitle}>{text.appointmentsTitle}</Text>

            {!appointments.length && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTxt}>{text.noAppointments}</Text>
              </View>
            )}

            {appointments.map((a) => {
              const p = properties.find((x) => x.id === a.propertyId);
              return (
                <View key={a.id} style={styles.cardSoft}>
                  <Text style={styles.sectionTitle}>{p?.title || a.propertyId}</Text>
                  <Text style={styles.sectionSub}>{a.date} - {a.time}</Text>
                  <Text style={styles.sectionSub}>{a.status}</Text>
                  <Pressable style={styles.softBtn} onPress={() => cancelAppointment(a.id)}>
                    <Text style={styles.softBtnTxt}>{text.cancelVisit}</Text>
                  </Pressable>
                </View>
              );
            })}
          </ScrollView>
        </View>
      );
    }

    if (overlay.name === 'subscription') {
      return (
        <View style={styles.overlayWrap}>
          <ScrollView contentContainerStyle={styles.page}>
            <Pressable style={styles.backBtn} onPress={closeOverlay}>
              <Text style={styles.backBtnTxt}>{text.back}</Text>
            </Pressable>
            <Text style={styles.sectionTitle}>{text.subscriptionTitle}</Text>

            {plans.map((plan) => (
              <View key={plan.id} style={styles.cardSoft}>
                <Text style={styles.sectionTitle}>{plan.name}</Text>
                <Text style={styles.sectionSub}>{formatMoney(plan.priceMonthly)}/mois</Text>
                {plan.benefits.map((b) => (
                  <Text key={b} style={styles.profileLine}>- {b}</Text>
                ))}
                <Pressable style={styles.primaryBtn} onPress={() => subscribePlan(plan)}>
                  <Text style={styles.primaryBtnTxt}>{text.subscribe}</Text>
                </Pressable>
              </View>
            ))}
          </ScrollView>
        </View>
      );
    }

    if (overlay.name === 'notifications') {
      return (
        <View style={styles.overlayWrap}>
          <ScrollView contentContainerStyle={styles.page}>
            <Pressable style={styles.backBtn} onPress={closeOverlay}>
              <Text style={styles.backBtnTxt}>{text.back}</Text>
            </Pressable>

            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>{text.notifTitle}</Text>
              <Pressable style={styles.softBtn} onPress={markAllRead}>
                <Text style={styles.softBtnTxt}>{text.markAllRead}</Text>
              </Pressable>
            </View>

            {!notifications.length && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTxt}>{text.noNotifs}</Text>
              </View>
            )}

            {notifications.map((n) => (
              <View key={n.id} style={[styles.notifItem, !n.read && styles.notifUnread]}>
                <View style={styles.notifIconWrap}>
                  <Ionicons
                    name={notifIconByType[n.type] || 'notifications-outline'}
                    size={16}
                    color={C.primary}
                  />
                </View>
                <View style={styles.notifBody}>
                  <Text style={styles.notifTitle}>{n.title}</Text>
                  <Text style={styles.notifTxt}>{n.body}</Text>
                  <Text style={styles.notifTime}>{n.time}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      );
    }

    if (overlay.name === 'agents') {
      return (
        <View style={styles.overlayWrap}>
          <ScrollView contentContainerStyle={styles.page}>
            <Pressable style={styles.backBtn} onPress={closeOverlay}>
              <Text style={styles.backBtnTxt}>{text.back}</Text>
            </Pressable>

            <Text style={styles.sectionTitle}>{text.agentsTitle}</Text>
            <TextInput
              value={agentQuery}
              onChangeText={setAgentQuery}
              placeholder={text.searchAgents}
              style={styles.field}
              placeholderTextColor="#7B8794"
            />

            {!filteredAgents.length && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTxt}>{text.noAgents}</Text>
              </View>
            )}

            {filteredAgents.map((a) => (
              <View key={a.id} style={styles.cardSoft}>
                <View style={styles.agentRow}>
                  <Image source={{ uri: a.image }} style={styles.agentAvatar} />
                  <View style={styles.agentBody}>
                    <Text style={styles.sectionTitle}>{a.name}</Text>
                    <Text style={styles.sectionSub}>{a.role}</Text>
                    <Text style={styles.sectionSub}>{a.city}</Text>
                    <Text style={styles.sectionSub}>{a.listings} {text.agentListings} · {a.sold} {text.agentSold}</Text>
                  </View>
                </View>
                <View style={styles.rowWrap}>
                  <Pressable style={styles.softBtn} onPress={() => Alert.alert('ORIZON', `${text.contactAgent}: ${a.phone}`)}>
                    <Text style={styles.softBtnTxt}>{text.contactAgent}</Text>
                  </Pressable>
                  <Pressable style={styles.softBtn} onPress={() => Alert.alert('ORIZON', a.bio)}>
                    <Text style={styles.softBtnTxt}>{text.agentProfile}</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      );
    }

    if (overlay.name === 'services') {
      return (
        <View style={styles.overlayWrap}>
          <ScrollView contentContainerStyle={styles.page}>
            <Pressable style={styles.backBtn} onPress={closeOverlay}>
              <Text style={styles.backBtnTxt}>{text.back}</Text>
            </Pressable>
            <Text style={styles.sectionTitle}>{text.servicesTitle}</Text>
            {servicesList.map((s) => (
              <View key={s.id} style={styles.cardSoft}>
                <View style={styles.serviceRow}>
                  <View style={styles.serviceIconWrap}>
                    <Ionicons name={serviceIconById[s.id] || 'apps-outline'} size={16} color={C.primary} />
                  </View>
                  <Text style={styles.sectionTitle}>{s.title}</Text>
                </View>
                <Text style={styles.sectionSub}>{s.desc}</Text>
                <Pressable style={styles.softBtn} onPress={() => Alert.alert('ORIZON', `${text.requestService}: ${s.title}`)}>
                  <Text style={styles.softBtnTxt}>{text.requestService}</Text>
                </Pressable>
              </View>
            ))}
          </ScrollView>
        </View>
      );
    }

    if (overlay.name === 'calculator') {
      const totalCredit = Math.round(calcResult * Number(calcInput.years || 0) * 12);

      return (
        <View style={styles.overlayWrap}>
          <ScrollView contentContainerStyle={styles.page}>
            <Pressable style={styles.backBtn} onPress={closeOverlay}>
              <Text style={styles.backBtnTxt}>{text.back}</Text>
            </Pressable>
            <Text style={styles.sectionTitle}>{text.calcTitle}</Text>

            <View style={styles.cardSoft}>
              <TextInput
                value={calcInput.amount}
                onChangeText={(v) => setCalcInput((p) => ({ ...p, amount: v.replace(/[^0-9]/g, '') }))}
                placeholder={text.loanAmount}
                style={styles.field}
                keyboardType="numeric"
                placeholderTextColor="#7B8794"
              />
              <TextInput
                value={calcInput.down}
                onChangeText={(v) => setCalcInput((p) => ({ ...p, down: v.replace(/[^0-9]/g, '') }))}
                placeholder={text.downPayment}
                style={styles.field}
                keyboardType="numeric"
                placeholderTextColor="#7B8794"
              />
              <TextInput
                value={calcInput.rate}
                onChangeText={(v) => setCalcInput((p) => ({ ...p, rate: v.replace(/[^0-9.]/g, '') }))}
                placeholder={text.interestRate}
                style={styles.field}
                keyboardType="numeric"
                placeholderTextColor="#7B8794"
              />
              <TextInput
                value={calcInput.years}
                onChangeText={(v) => setCalcInput((p) => ({ ...p, years: v.replace(/[^0-9]/g, '') }))}
                placeholder={text.loanTerm}
                style={styles.field}
                keyboardType="numeric"
                placeholderTextColor="#7B8794"
              />
              <Pressable style={styles.primaryBtn} onPress={runCalculator}>
                <Text style={styles.primaryBtnTxt}>{text.calculate}</Text>
              </Pressable>
            </View>

            <View style={styles.cardSoft}>
              <Text style={styles.sectionSub}>{text.monthlyPayment}</Text>
              <Text style={styles.calcMain}>{formatMoney(Math.round(calcResult))}</Text>
              <Text style={styles.sectionSub}>{text.totalCost}: {formatMoney(totalCredit)}</Text>
            </View>
          </ScrollView>
        </View>
      );
    }

    if (overlay.name === 'scheduleVisit' && overlay.payload) {
      return (
        <View style={styles.overlayWrap}>
          <ScrollView contentContainerStyle={styles.page}>
            <Pressable style={styles.backBtn} onPress={closeOverlay}>
              <Text style={styles.backBtnTxt}>{text.back}</Text>
            </Pressable>

            <View style={styles.cardSoft}>
              <Text style={styles.sectionTitle}>{text.scheduleVisit}</Text>
              <Text style={styles.sectionSub}>{overlay.payload.title}</Text>

              <TextInput
                value={visitDraft.date}
                onChangeText={(v) => setVisitDraft((p) => ({ ...p, date: v }))}
                placeholder={text.selectDate}
                style={styles.field}
                placeholderTextColor="#7B8794"
              />

              <View style={styles.rowWrap}>
                {(text.times || ['08:00', '09:00', '10:00']).map((t) => (
                  <Pressable
                    key={t}
                    style={[styles.chip, visitDraft.time === t && styles.chipOn]}
                    onPress={() => setVisitDraft((p) => ({ ...p, time: t }))}
                  >
                    <Text style={[styles.chipTxt, visitDraft.time === t && styles.chipTxtOn]}>{t}</Text>
                  </Pressable>
                ))}
              </View>

              <TextInput
                value={visitDraft.notes}
                onChangeText={(v) => setVisitDraft((p) => ({ ...p, notes: v }))}
                placeholder={text.visitNotes}
                style={[styles.field, styles.fieldLarge]}
                multiline
                placeholderTextColor="#7B8794"
              />

              <Pressable style={styles.primaryBtn} onPress={confirmVisit}>
                <Text style={styles.primaryBtnTxt}>{text.confirmVisit}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      );
    }

    if (overlay.name === 'editProfile') {
      return (
        <View style={styles.overlayWrap}>
          <ScrollView contentContainerStyle={styles.page}>
            <Pressable style={styles.backBtn} onPress={closeOverlay}>
              <Text style={styles.backBtnTxt}>{text.back}</Text>
            </Pressable>
            <View style={styles.cardSoft}>
              <Text style={styles.sectionTitle}>{text.editProfile}</Text>
              <TextInput
                value={profileDraft.fullName}
                onChangeText={(v) => setProfileDraft((p) => ({ ...p, fullName: v }))}
                placeholder={text.fullName}
                style={styles.field}
                placeholderTextColor="#7B8794"
              />
              <TextInput
                value={profileDraft.phone}
                onChangeText={(v) => setProfileDraft((p) => ({ ...p, phone: v }))}
                placeholder={text.phone}
                style={styles.field}
                placeholderTextColor="#7B8794"
              />
              <TextInput
                value={profileDraft.bio}
                onChangeText={(v) => setProfileDraft((p) => ({ ...p, bio: v }))}
                placeholder={text.bio}
                style={[styles.field, styles.fieldLarge]}
                multiline
                placeholderTextColor="#7B8794"
              />
              <Pressable style={styles.primaryBtn} onPress={saveProfile}>
                <Text style={styles.primaryBtnTxt}>{text.save}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      );
    }

    if (overlay.name === 'settings') {
      return (
        <View style={styles.overlayWrap}>
          <ScrollView contentContainerStyle={styles.page}>
            <Pressable style={styles.backBtn} onPress={closeOverlay}>
              <Text style={styles.backBtnTxt}>{text.back}</Text>
            </Pressable>
            <View style={styles.cardSoft}>
              <Text style={styles.sectionTitle}>{text.settingsTitle}</Text>
              <Text style={styles.sectionSub}>{text.language}</Text>
              <View style={styles.rowWrap}>
                <Pressable style={[styles.softBtn, language === 'fr' && { borderColor: C.primary }]} onPress={() => setLanguage('fr')}>
                  <Text style={styles.softBtnTxt}>{text.langFR}</Text>
                </Pressable>
                <Pressable style={[styles.softBtn, language === 'ht' && { borderColor: C.primary }]} onPress={() => setLanguage('ht')}>
                  <Text style={styles.softBtnTxt}>{text.langHT}</Text>
                </Pressable>
                <Pressable style={[styles.softBtn, language === 'en' && { borderColor: C.primary }]} onPress={() => setLanguage('en')}>
                  <Text style={styles.softBtnTxt}>EN</Text>
                </Pressable>
                <Pressable style={[styles.softBtn, language === 'es' && { borderColor: C.primary }]} onPress={() => setLanguage('es')}>
                  <Text style={styles.softBtnTxt}>ES</Text>
                </Pressable>
              </View>
              <Text style={[styles.sectionSub, { marginTop: 12 }]}>Devise / Lajan</Text>
              <View style={styles.rowWrap}>
                <Pressable style={[styles.softBtn, currency === 'USD' && { borderColor: C.primary }]} onPress={() => setCurrency('USD')}>
                  <Text style={styles.softBtnTxt}>USD ($)</Text>
                </Pressable>
                <Pressable style={[styles.softBtn, currency === 'HTG' && { borderColor: C.primary }]} onPress={() => setCurrency('HTG')}>
                  <Text style={styles.softBtnTxt}>HTG (Gourdes)</Text>
                </Pressable>
              </View>
              <Text style={[styles.sectionSub, { marginTop: 12 }]}>{text.notifications}: {text.notifEnabled}</Text>
            </View>
          </ScrollView>
        </View>
      );
    }

    if (overlay.name === 'help') {
      return (
        <View style={styles.overlayWrap}>
          <ScrollView contentContainerStyle={styles.page}>
            <Pressable style={styles.backBtn} onPress={closeOverlay}>
              <Text style={styles.backBtnTxt}>{text.back}</Text>
            </Pressable>
            <View style={styles.cardSoft}>
              <Text style={styles.sectionTitle}>{text.helpTitle}</Text>
              <Text style={styles.sectionSub}>- Comment publier une annonce ? Ouvrez l onglet Publier et remplissez le formulaire.</Text>
              <Text style={styles.sectionSub}>- Comment contacter un vendeur ? Bouton Contacter sur chaque fiche.</Text>
              <Text style={styles.sectionSub}>- Comment planifier une visite ? Depuis les details d un bien, cliquez Planifier une visite.</Text>
              <Text style={styles.sectionSub}>- Comment annuler un rendez-vous ? Ouvrez Rendez-vous puis Annuler.</Text>
              <Text style={styles.sectionSub}>{text.about}</Text>
              <Text style={styles.sectionSub}>{text.version}</Text>
            </View>
          </ScrollView>
        </View>
      );
    }

    if (overlay.name === 'share' && overlay.payload) {
      return (
        <View style={styles.overlayWrap}>
          <View style={styles.shareSheet}>
            <View style={styles.shareHead}>
              <Text style={styles.sectionTitle}>Share with your friends</Text>
              <Pressable style={styles.iconBtn} onPress={closeOverlay}>
                <Ionicons name="close" size={16} color={C.text} />
              </Pressable>
            </View>
            <View style={styles.shareGrid}>
              {[
                'logo-facebook',
                'logo-twitter',
                'logo-instagram',
                'chatbubble-ellipses-outline',
                'mail-outline',
                'link-outline',
              ].map((icon, i) => (
                <Pressable key={`${icon}-${i}`} style={styles.shareItem}>
                  <Ionicons name={icon} size={20} color={C.primary} />
                </Pressable>
              ))}
            </View>
            <Pressable style={styles.copyLinkBtn} onPress={closeOverlay}>
              <Ionicons name="link-outline" size={14} color={C.text} />
              <Text style={styles.copyLinkTxt}>Copy Link</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    if (overlay.name === 'report') {
      const options = [
        { key: 'illegal', label: 'This is illegal/fraudulent' },
        { key: 'spam', label: 'This ad is spam' },
        { key: 'duplicate', label: 'This ad is a duplicate' },
        { key: 'category', label: 'This ad is in the wrong category' },
        { key: 'rules', label: 'The ad goes against posting rules' },
      ];

      return (
        <View style={styles.overlayWrap}>
          <ScrollView contentContainerStyle={styles.page}>
            <View style={styles.chatHeaderCard}>
              <Pressable style={styles.iconBtn} onPress={closeOverlay}>
                <Ionicons name="chevron-back" size={18} color={C.text} />
              </Pressable>
              <Text style={styles.chatHeaderName}>Report Ad</Text>
              <View style={{ width: 38 }} />
            </View>
            <View style={styles.cardSoft}>
              {options.map((opt) => (
                <Pressable key={opt.key} style={styles.reportRow} onPress={() => setReportReason(opt.key)}>
                  <Ionicons
                    name={reportReason === opt.key ? 'radio-button-on' : 'radio-button-off'}
                    size={18}
                    color={reportReason === opt.key ? '#14B8C4' : '#94A3B8'}
                  />
                  <Text style={styles.sectionSub}>{opt.label}</Text>
                </Pressable>
              ))}
              <TextInput
                value={reportDetails}
                onChangeText={setReportDetails}
                style={[styles.field, styles.fieldLarge]}
                placeholder="Please provide more information"
                placeholderTextColor="#9AA6BD"
                multiline
              />
              <Pressable style={[styles.primaryBtn, { backgroundColor: '#14B8C4' }]} onPress={closeOverlay}>
                <Text style={styles.primaryBtnTxt}>Send Report</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      );
    }

    return null;
  };

  if (stage === 'onboarding') {
    const slide = onboardingSlides[onboardingIndex];
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" />
        <ImageBackground source={{ uri: slide.image }} style={styles.onboard}>
          <View style={styles.onboardOverlay} />
          <View style={styles.onboardContent}>
            <View style={styles.onboardTopRow}>
              <Text style={styles.appBadge}>{text.appName}</Text>
              <Pressable onPress={() => setStage('auth')}>
                <Text style={styles.skip}>{text.skip}</Text>
              </Pressable>
            </View>

            <Text style={styles.onboardTitle}>{text[slide.titleKey]}</Text>
            <Text style={styles.onboardText}>{text[slide.textKey]}</Text>

            <View style={styles.dotRow}>
              {onboardingSlides.map((s, i) => (
                <View key={s.id} style={[styles.dot, i === onboardingIndex && styles.dotOn]} />
              ))}
            </View>

            <Pressable style={styles.primaryBtn} onPress={goNextOnboarding}>
              <Text style={styles.primaryBtnTxt}>
                {onboardingIndex === onboardingSlides.length - 1 ? text.finish : text.next}
              </Text>
            </Pressable>
          </View>
        </ImageBackground>
      </SafeAreaView>
    );
  }

  if (stage === 'auth') {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" />
        <ScrollView contentContainerStyle={styles.authPage}>
          <Text style={styles.authLogo}>{text.appName}</Text>
          <Text style={styles.authTitle}>{isRegister ? text.registerTitle : text.loginTitle}</Text>

          {isRegister && (
            <TextInput
              value={authForm.fullName}
              onChangeText={(v) => setAuthForm((p) => ({ ...p, fullName: v }))}
              placeholder={text.fullName}
              style={styles.field}
              placeholderTextColor="#7B8794"
            />
          )}

          <TextInput
            value={authForm.email}
            onChangeText={(v) => setAuthForm((p) => ({ ...p, email: v }))}
            placeholder={text.email}
            style={styles.field}
            placeholderTextColor="#7B8794"
          />

          {isRegister && (
            <TextInput
              value={authForm.phone}
              onChangeText={(v) => setAuthForm((p) => ({ ...p, phone: v }))}
              placeholder={text.phone}
              style={styles.field}
              placeholderTextColor="#7B8794"
            />
          )}

          <TextInput
            value={authForm.password}
            onChangeText={(v) => setAuthForm((p) => ({ ...p, password: v }))}
            placeholder={text.password}
            secureTextEntry
            style={styles.field}
            placeholderTextColor="#7B8794"
          />

          {isRegister && (
            <TextInput
              value={authForm.confirmPassword}
              onChangeText={(v) => setAuthForm((p) => ({ ...p, confirmPassword: v }))}
              placeholder={text.confirmPassword}
              secureTextEntry
              style={styles.field}
              placeholderTextColor="#7B8794"
            />
          )}

          {isRegister && (
            <View style={styles.rowWrap}>
              {[text.roleBuyer, text.roleOwner, text.roleAgency, text.roleInvestor].map((r) => (
                <Pressable
                  key={r}
                  style={[styles.chip, authForm.role === r && styles.chipOn]}
                  onPress={() => setAuthForm((p) => ({ ...p, role: r }))}
                >
                  <Text style={[styles.chipTxt, authForm.role === r && styles.chipTxtOn]}>{r}</Text>
                </Pressable>
              ))}
            </View>
          )}

          <Pressable style={styles.primaryBtn} onPress={completeAuth}>
            <Text style={styles.primaryBtnTxt}>{isRegister ? text.register : text.login}</Text>
          </Pressable>

          <Pressable onPress={() => setIsRegister((p) => !p)}>
            <Text style={styles.authSwitch}>{isRegister ? text.switchToLogin : text.switchToRegister}</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {activeTab === 'home' && renderHome()}
      {activeTab === 'discover' && renderDiscover()}
      {activeTab === 'sell' && renderSell()}
      {activeTab === 'messages' && renderMessages()}
      {activeTab === 'profile' && renderProfile()}

      <View style={[styles.bottomNav, { bottom: Math.max(insets.bottom, 8) }]}>
        <Pressable style={[styles.tabBtn, activeTab === 'home' && styles.tabBtnOn]} onPress={() => setActiveTab('home')}>
          <Ionicons name="home-outline" size={19} color={activeTab === 'home' ? '#FFFFFF' : C.text} />
        </Pressable>
        <Pressable style={[styles.tabBtn, activeTab === 'discover' && styles.tabBtnOn]} onPress={() => setActiveTab('discover')}>
          <Ionicons name="search-outline" size={19} color={activeTab === 'discover' ? '#FFFFFF' : C.text} />
        </Pressable>

        <Pressable style={styles.centerPlusBtn} onPress={() => setActiveTab('sell')}>
          <Ionicons name="add" size={26} color="#FFFFFF" />
        </Pressable>

        <Pressable style={[styles.tabBtn, activeTab === 'messages' && styles.tabBtnOn]} onPress={() => setActiveTab('messages')}>
          <Ionicons name="chatbubble-outline" size={19} color={activeTab === 'messages' ? '#FFFFFF' : C.text} />
        </Pressable>
        <Pressable style={[styles.tabBtn, activeTab === 'profile' && styles.tabBtnOn]} onPress={() => setActiveTab('profile')}>
          <Ionicons name="person-outline" size={19} color={activeTab === 'profile' ? '#FFFFFF' : C.text} />
        </Pressable>
      </View>

      {renderOverlay()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
  },

  page: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 96,
    gap: 8,
  },
  pageFill: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 96,
    gap: 8,
  },

  topbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 4,
    gap: 8,
  },
  logo: {
    fontSize: 24,
    fontWeight: '900',
    color: C.primary,
  },
  tag: {
    fontSize: 12,
    color: C.muted,
    fontWeight: '600',
  },
  topbarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
  },
  badgeDot: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: C.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeTxt: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },

  langWrap: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: C.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    padding: 3,
  },
  langBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  langBtnOn: {
    backgroundColor: C.primary,
  },
  langTxt: {
    fontSize: 11,
    fontWeight: '700',
    color: C.text,
  },

  hero: {
    borderRadius: 16,
    overflow: 'hidden',
    minHeight: 220,
    justifyContent: 'flex-end',
  },
  heroImage: {
    borderRadius: 16,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(6,18,33,0.5)',
  },
  heroContent: {
    padding: 14,
    gap: 8,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 32,
  },
  heroAccent: {
    color: '#8EC1FF',
  },
  heroSub: {
    color: '#E5E7EB',
    fontSize: 13,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  searchBtn: {
    backgroundColor: C.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  searchBtnTxt: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },

  cardSoft: {
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: C.text,
  },
  sectionSub: {
    fontSize: 12,
    color: C.muted,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  linkBtn: {
    color: '#0FB2C2',
    fontWeight: '700',
    fontSize: 12,
  },
  counter: {
    color: C.muted,
    fontSize: 12,
    fontWeight: '700',
  },

  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickBtn: {
    backgroundColor: '#EAF2FF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#CDE0FF',
  },
  quickBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quickBtnTxt: {
    fontSize: 12,
    fontWeight: '700',
    color: C.primary,
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statItem: {
    width: '48%',
    backgroundColor: '#F1F6FF',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    padding: 10,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '900',
    color: C.primary,
  },
  statLabel: {
    fontSize: 12,
    color: C.muted,
  },

  newsCard: {
    backgroundColor: C.card,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
  },
  newsImg: {
    width: '100%',
    height: 140,
  },
  newsBody: {
    padding: 10,
    gap: 6,
  },
  newsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: C.text,
  },
  newsSummary: {
    fontSize: 12,
    color: C.muted,
  },
  newsDate: {
    fontSize: 11,
    color: '#9CA3AF',
  },

  cta: {
    backgroundColor: '#0B2E70',
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  ctaTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
  },
  ctaSub: {
    color: '#E5E7EB',
    fontSize: 13,
  },
  ctaBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  ctaBtnTxt: {
    color: C.primary,
    fontWeight: '800',
  },

  field: {
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: C.text,
  },
  fieldLarge: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 8,
  },
  half: {
    flex: 1,
  },
  label: {
    color: C.text,
    fontSize: 13,
    fontWeight: '700',
  },

  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  chipOn: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  chipTxt: {
    color: C.text,
    fontSize: 12,
    fontWeight: '700',
  },
  chipTxtOn: {
    color: '#fff',
  },

  primaryBtn: {
    backgroundColor: C.primary,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnTxt: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  ghostBtn: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  ghostBtnTxt: {
    color: C.text,
    fontSize: 13,
    fontWeight: '700',
  },

  softBtn: {
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  softBtnTxt: {
    color: C.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  softBtnDanger: {
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  softBtnDangerTxt: {
    color: C.danger,
    fontSize: 12,
    fontWeight: '800',
  },

  emptyState: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  emptyTxt: {
    color: C.muted,
    fontSize: 13,
  },

  messageWrap: {
    flex: 1,
    gap: 10,
  },
  threadPanel: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 10,
    maxHeight: 220,
    gap: 8,
  },
  threadItem: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  threadItemOn: {
    borderColor: C.primary,
    backgroundColor: '#EDF3FA',
  },
  threadName: {
    color: C.text,
    fontWeight: '800',
    fontSize: 13,
  },
  threadLast: {
    color: C.muted,
    fontSize: 12,
    marginTop: 2,
  },

  chatPanel: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 10,
    gap: 8,
  },
  chatTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: C.text,
  },
  chatScroll: {
    flex: 1,
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  },
  bubbleMe: {
    alignSelf: 'flex-end',
    backgroundColor: C.accent,
  },
  bubbleOther: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: C.border,
  },
  bubbleTxt: {
    color: '#0B1F44',
    fontSize: 12,
  },
  bubbleTime: {
    color: C.muted,
    fontSize: 9,
    marginTop: 3,
  },
  composerRow: {
    flexDirection: 'row',
    gap: 8,
  },
  composer: {
    flex: 1,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  sendBtn: {
    backgroundColor: C.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  sendBtnTxt: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },

  profileLine: {
    color: C.text,
    fontSize: 13,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingVertical: 8,
  },
  historyTxt: {
    color: C.text,
    fontSize: 12,
  },
  logoutBtn: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  logoutTxt: {
    color: C.danger,
    fontWeight: '800',
  },

  overlayWrap: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(12, 20, 35, 0.42)',
  },
  backBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  backBtnTxt: {
    color: C.primary,
    fontWeight: '800',
    fontSize: 12,
  },

  detailsImg: {
    width: '100%',
    height: 210,
    borderRadius: 12,
  },
  agentRow: {
    flexDirection: 'row',
    gap: 10,
  },
  agentAvatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
  },
  agentBody: {
    flex: 1,
    gap: 2,
  },
  notifItem: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    gap: 10,
  },
  notifUnread: {
    borderColor: '#93C5FD',
    backgroundColor: '#EFF6FF',
  },
  notifIcon: {
    fontSize: 18,
    marginTop: 2,
  },
  notifIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#EAF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  notifBody: {
    flex: 1,
    gap: 2,
  },
  notifTitle: {
    color: C.text,
    fontSize: 13,
    fontWeight: '800',
  },
  notifTxt: {
    color: C.muted,
    fontSize: 12,
  },
  notifTime: {
    color: '#94A3B8',
    fontSize: 11,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  serviceIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#EAF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  calcMain: {
    fontSize: 30,
    fontWeight: '900',
    color: C.primary,
  },

  onboard: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  onboardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7, 15, 30, 0.5)',
  },
  onboardContent: {
    padding: 16,
    gap: 14,
  },
  onboardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appBadge: {
    backgroundColor: 'rgba(255,255,255,0.88)',
    color: C.primary,
    fontWeight: '900',
    fontSize: 15,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    overflow: 'hidden',
  },
  skip: {
    color: '#fff',
    fontWeight: '700',
  },
  onboardTitle: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 36,
  },
  onboardText: {
    color: '#E5E7EB',
    fontSize: 14,
    lineHeight: 20,
  },
  dotRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  dotOn: {
    backgroundColor: C.accent,
    width: 22,
  },

  authPage: {
    padding: 18,
    gap: 10,
  },
  authLogo: {
    fontSize: 32,
    fontWeight: '900',
    color: C.primary,
    marginBottom: 8,
  },
  authTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: C.text,
    marginBottom: 6,
  },
  authSwitch: {
    color: C.primary,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },

  profileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  profileChipAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: C.accent,
  },
  profileChipAvatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileChipAvatarTxt: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  profileChipName: {
    color: C.text,
    fontWeight: '700',
    fontSize: 12,
    maxWidth: 80,
  },
  profileChipScore: {
    color: C.text,
    fontWeight: '700',
    fontSize: 11,
  },
  profileChipRole: {
    color: C.muted,
    fontSize: 10,
    maxWidth: 80,
  },
  topCenterLoc: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  topCenterLbl: {
    color: C.muted,
    fontSize: 10,
    fontWeight: '600',
  },
  topCenterValue: {
    color: C.text,
    fontSize: 11,
    fontWeight: '600',
  },

  homeFilterRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  filterChip: {
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  filterChipOn: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },
  filterChipTxt: {
    color: C.text,
    fontSize: 12,
    fontWeight: '600',
  },
  filterChipTxtOn: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  horizontalFeed: {
    paddingRight: 18,
    gap: 10,
  },
  compactCard: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    marginBottom: 8,
  },
  compactImgWrap: {
    height: 130,
    position: 'relative',
  },
  compactImg: {
    width: '100%',
    height: '100%',
  },
  compactTag: {
    position: 'absolute',
    top: 7,
    left: 7,
    backgroundColor: 'rgba(56,77,109,0.9)',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  compactTagTxt: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  compactHeart: {
    position: 'absolute',
    right: 7,
    top: 7,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  compactBody: {
    padding: 10,
    gap: 5,
  },
  compactTitle: {
    color: C.text,
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  compactPrice: {
    color: C.text,
    fontSize: 16,
    fontWeight: '800',
  },
  compactLoc: {
    color: C.muted,
    fontSize: 10,
  },
  compactMetaRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 3,
  },
  compactMetaPill: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compactMetaTxt: {
    color: C.text,
    fontSize: 10,
  },

  chatHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  chatHeaderName: {
    color: C.text,
    fontSize: 18,
    fontWeight: '700',
  },
  chatHeaderActions: {
    flexDirection: 'row',
    gap: 6,
  },
  chatListingCard: {
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: '#fff',
    padding: 8,
    flexDirection: 'row',
    gap: 8,
  },
  chatListingThumb: {
    width: 72,
    height: 72,
    borderRadius: 10,
  },
  chatListingBody: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  chatListingTitle: {
    color: C.text,
    fontWeight: '700',
    fontSize: 13,
  },
  chatListingMeta: {
    color: C.muted,
    fontSize: 11,
  },
  chatListingRating: {
    color: C.text,
    fontSize: 11,
  },
  chatScrollContent: {
    paddingVertical: 12,
    gap: 8,
  },
  composerRowModern: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  plusCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  composerModern: {
    flex: 1,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  sendCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.text,
    alignItems: 'center',
    justifyContent: 'center',
  },

  profileTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileTopTitle: {
    color: C.text,
    fontSize: 18,
    fontWeight: '700',
  },
  profileHeroCard: {
    backgroundColor: C.primarySoft,
    borderWidth: 0,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
  },
  profileAvatarBig: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarTxt: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },
  profileInfoCol: {
    flex: 1,
    gap: 4,
  },
  profileNameBig: {
    color: C.text,
    fontSize: 20,
    fontWeight: '700',
  },
  profileBadgesRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  profileSmallPill: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  profileSmallPillTxt: {
    color: C.text,
    fontSize: 11,
    fontWeight: '600',
  },
  profileTabsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  profileTabBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 999,
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  profileTabOn: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },
  profileTabTxt: {
    color: C.text,
    fontWeight: '600',
  },
  profileTabOnTxt: {
    color: '#fff',
    fontWeight: '700',
  },

  detailsHeroWrap: {
    position: 'relative',
  },
  detailsTopLeft: {
    position: 'absolute',
    left: 12,
    top: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsTopRightCol: {
    position: 'absolute',
    right: 12,
    top: 12,
    gap: 8,
  },
  detailsCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsMetricsRow: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 14,
    flexDirection: 'row',
    gap: 8,
  },
  detailsMetricPill: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailsMetricTxt: {
    color: C.text,
    fontSize: 10,
    fontWeight: '600',
  },
  inlineInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailsSpecGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  detailsSpecCard: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 2,
  },
  detailsSpecValue: {
    color: C.text,
    fontSize: 13,
    fontWeight: '700',
  },
  detailsSpecLabel: {
    color: C.muted,
    fontSize: 10,
  },
  listingBlock: {
    gap: 8,
    marginBottom: 8,
  },
  shareSheet: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    gap: 12,
  },
  shareHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shareGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  shareItem: {
    width: 46,
    height: 46,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7FBFF',
  },
  copyLinkBtn: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 999,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  copyLinkTxt: {
    color: C.text,
    fontWeight: '700',
  },
  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },

  bottomNav: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderTopWidth: 1,
    borderColor: C.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  tabBtn: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: 'transparent',
  },
  tabBtnOn: {
    backgroundColor: C.text,
  },
  centerPlusBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.accent,
    marginHorizontal: 6,
  },
  tabTxt: {
    color: C.muted,
    fontSize: 9,
    fontWeight: '700',
  },
  tabTxtOn: {
    color: '#fff',
  },

  // ====== Marketplace home ======
  heroSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: C.border,
    marginTop: 4,
  },
  heroSearchTxt: {
    color: C.muted,
    fontSize: 13,
  },
  catRow: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    gap: 12,
  },
  catChip: {
    alignItems: 'center',
    width: 70,
    gap: 4,
  },
  catIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: C.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catLabel: {
    color: C.text,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  ctaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.primary,
    borderRadius: 16,
    padding: 14,
    marginTop: 4,
    gap: 12,
  },
  ctaBannerTitle: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  ctaBannerSub: {
    color: '#E0F7F4',
    fontSize: 11,
    marginTop: 2,
  },
  ctaBannerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hCard: {
    width: 170,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  hCardImgWrap: {
    width: '100%',
    height: 110,
    position: 'relative',
  },
  hCardImg: {
    width: '100%',
    height: '100%',
  },
  hCardImgPlaceholder: {
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hCardHeart: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hCardBody: {
    padding: 8,
    gap: 2,
  },
  hCardPrice: {
    color: C.primary,
    fontWeight: '800',
    fontSize: 14,
  },
  hCardTitle: {
    color: C.text,
    fontWeight: '600',
    fontSize: 12,
  },
  hCardLoc: {
    color: C.muted,
    fontSize: 10,
  },
  emptyMarket: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    gap: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  emptyMarketTitle: {
    color: C.text,
    fontWeight: '800',
    fontSize: 16,
  },
  emptyMarketTxt: {
    color: C.muted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  sellerCard: {
    width: 90,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: C.border,
    gap: 4,
  },
  sellerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerAvatarTxt: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
  sellerName: {
    color: C.text,
    fontWeight: '700',
    fontSize: 11,
    textAlign: 'center',
  },
  sellerCount: {
    color: C.muted,
    fontSize: 10,
  },
});
