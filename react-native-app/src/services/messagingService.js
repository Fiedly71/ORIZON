// messagingService - Conversations et messages avec Supabase + realtime.
import { supabase, isSupabaseConfigured } from './supabase';
import { useAuthStore } from '../store/useAuthStore';

const mock = { conversations: [], messages: {} };

function fromConv(r) {
  if (!r) return null;
  return {
    id: r.id,
    propertyId: r.property_id,
    buyerId: r.buyer_id,
    ownerId: r.owner_id,
    lastMessage: r.last_message || '',
    lastSenderId: r.last_sender_id,
    lastMessageAt: r.last_message_at,
    unreadBuyer: r.unread_buyer || 0,
    unreadOwner: r.unread_owner || 0,
    createdAt: r.created_at,
  };
}
function fromMsg(r) {
  if (!r) return null;
  return {
    id: r.id,
    conversationId: r.conversation_id,
    senderId: r.sender_id,
    body: r.body,
    createdAt: r.created_at,
  };
}

// Cree ou recupere la conversation entre buyer et owner pour une property
export async function openConversation({ propertyId, ownerId }) {
  const buyerId = useAuthStore.getState().user?.id || null;
  if (!buyerId) return { ok: false, error: 'Connecte-toi pour envoyer un message.' };
  if (!ownerId || ownerId === buyerId) {
    return { ok: false, error: 'Impossible de demarrer cette conversation.' };
  }

  if (!isSupabaseConfigured) {
    let conv = mock.conversations.find(
      (c) => c.property_id === propertyId && c.buyer_id === buyerId && c.owner_id === ownerId
    );
    if (!conv) {
      conv = {
        id: 'conv-' + Date.now(),
        property_id: propertyId,
        buyer_id: buyerId,
        owner_id: ownerId,
        created_at: new Date().toISOString(),
      };
      mock.conversations.unshift(conv);
      mock.messages[conv.id] = [];
    }
    return { ok: true, data: fromConv(conv), mock: true };
  }

  // upsert by unique key
  const { data: existing } = await supabase
    .from('conversations')
    .select('*')
    .eq('property_id', propertyId)
    .eq('buyer_id', buyerId)
    .eq('owner_id', ownerId)
    .maybeSingle();
  if (existing) return { ok: true, data: fromConv(existing) };

  const { data, error } = await supabase
    .from('conversations')
    .insert({ property_id: propertyId, buyer_id: buyerId, owner_id: ownerId })
    .select('*')
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: fromConv(data) };
}

export async function listConversations() {
  const uid = useAuthStore.getState().user?.id || null;
  if (!uid) return { ok: true, data: [] };
  if (!isSupabaseConfigured) {
    const items = mock.conversations.filter((c) => c.buyer_id === uid || c.owner_id === uid);
    return { ok: true, data: items.map(fromConv), mock: true };
  }
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .or(`buyer_id.eq.${uid},owner_id.eq.${uid}`)
    .order('last_message_at', { ascending: false, nullsFirst: false });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: (data || []).map(fromConv) };
}

export async function listMessages(conversationId) {
  if (!isSupabaseConfigured) {
    return { ok: true, data: (mock.messages[conversationId] || []).map(fromMsg), mock: true };
  }
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: (data || []).map(fromMsg) };
}

export async function sendMessage(conversationId, body) {
  const uid = useAuthStore.getState().user?.id || null;
  if (!uid) return { ok: false, error: 'Non connecte' };
  const text = String(body || '').trim();
  if (!text) return { ok: false, error: 'Message vide' };

  if (!isSupabaseConfigured) {
    const msg = {
      id: 'm-' + Date.now(),
      conversation_id: conversationId,
      sender_id: uid,
      body: text,
      created_at: new Date().toISOString(),
    };
    mock.messages[conversationId] = [...(mock.messages[conversationId] || []), msg];
    const conv = mock.conversations.find((c) => c.id === conversationId);
    if (conv) {
      conv.last_message = text;
      conv.last_sender_id = uid;
      conv.last_message_at = msg.created_at;
    }
    return { ok: true, data: fromMsg(msg), mock: true };
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: uid, body: text })
    .select('*')
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: fromMsg(data) };
}

// Subscribe to new messages for a conversation. Returns unsubscribe fn.
export function subscribeMessages(conversationId, onMessage) {
  if (!isSupabaseConfigured) return () => {};
  const channel = supabase
    .channel(`msg:${conversationId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
      (payload) => onMessage?.(fromMsg(payload.new))
    )
    .subscribe();
  return () => { try { supabase.removeChannel(channel); } catch {} };
}

export async function markRead(conversationId, role) {
  // role: 'buyer' | 'owner'
  if (!isSupabaseConfigured) return { ok: true, mock: true };
  const patch = role === 'owner' ? { unread_owner: 0 } : { unread_buyer: 0 };
  const { error } = await supabase.from('conversations').update(patch).eq('id', conversationId);
  return { ok: !error, error: error?.message };
}
