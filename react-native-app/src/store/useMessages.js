// Store 'messages' : compteur global des messages non-lus pour l'utilisateur courant.
// Alimente le badge rouge de l'onglet Messages (MainTabs).
// - Recharge via listConversations()
// - Realtime : subscribe aux INSERT sur `messages` de la table Supabase
import { create } from 'zustand';
import { listConversations } from '../services/messagingService';
import { supabase, isSupabaseConfigured } from '../services/supabase';

let realtimeChannel = null;

export const useMessages = create((set, get) => ({
  unreadTotal: 0,
  conversations: [],
  loading: false,

  refresh: async () => {
    set({ loading: true });
    try {
      const r = await listConversations();
      if (r.ok) {
        const convs = r.data || [];
        // On additionne le "unread" du bon role selon si on est buyer ou owner sur chaque conv.
        // Le service messagingService retourne deja unreadBuyer/unreadOwner.
        // On somme le max des deux (approximation : au moins un des deux est 0 pour l'user courant).
        const myId = (await supabase?.auth?.getUser?.())?.data?.user?.id;
        const total = convs.reduce((sum, c) => {
          if (!myId) return sum + Math.max(c.unreadBuyer || 0, c.unreadOwner || 0);
          if (c.buyerId === myId) return sum + (c.unreadBuyer || 0);
          if (c.ownerId === myId) return sum + (c.unreadOwner || 0);
          return sum;
        }, 0);
        set({ conversations: convs, unreadTotal: total });
      }
    } catch (_) {
      // ignore
    } finally {
      set({ loading: false });
    }
  },

  subscribe: () => {
    if (!isSupabaseConfigured || realtimeChannel) return;
    try {
      realtimeChannel = supabase
        .channel('unread-messages')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
          get().refresh();
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
          get().refresh();
        })
        .subscribe();
    } catch (_) {
      realtimeChannel = null;
    }
  },

  unsubscribe: () => {
    if (realtimeChannel) {
      try { supabase.removeChannel(realtimeChannel); } catch (_) {}
      realtimeChannel = null;
    }
    set({ unreadTotal: 0, conversations: [] });
  },
}));
