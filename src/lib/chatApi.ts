import { supabase } from '@/integrations/supabase/client';

export interface ChatProfile {
  userId: string;
  name: string;
  username: string;
  avatar: string;
}

export interface ChatConversationRow {
  id: string;
  is_group: boolean;
  name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  type: string;
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ChatConversationListItem {
  id: string;
  isGroup: boolean;
  name: string;
  members: ChatProfile[];
  lastMessage: ChatMessageRow | null;
  unreadCount: number;
  updatedAt: string;
  lastReadAt: string;
}

function rowToProfile(r: {
  user_id: string;
  name: string | null;
  username: string | null;
  avatar_url: string | null;
}): ChatProfile {
  const u = (r.username || '').replace(/^@/, '');
  return {
    userId: r.user_id,
    name: r.name || r.username || 'Viajante',
    username: u ? `@${u}` : '@usuario',
    avatar: r.avatar_url || '',
  };
}

export async function fetchProfilesByIds(ids: string[]): Promise<Map<string, ChatProfile>> {
  const map = new Map<string, ChatProfile>();
  if (!ids.length) return map;
  const { data, error } = await supabase
    .from('profiles_public')
    .select('user_id, name, username, avatar_url')
    .in('user_id', ids);
  if (error) {
    console.error('[chatApi] fetchProfilesByIds', error);
    return map;
  }
  (data || []).forEach((row) => map.set(row.user_id, rowToProfile(row)));
  return map;
}

/** Lista conversas do usuário com último msg + unread. */
export async function listConversations(userId: string): Promise<ChatConversationListItem[]> {
  // 1) IDs das conversas em que sou membro + meu last_read_at
  const { data: myMemberships, error: memErr } = await supabase
    .from('chat_conversation_members')
    .select('conversation_id, last_read_at')
    .eq('user_id', userId);
  if (memErr) {
    console.error('[chatApi] listConversations memberships', memErr);
    return [];
  }
  const convIds = (myMemberships || []).map((m) => m.conversation_id);
  if (!convIds.length) return [];
  const lastReadByConv = new Map<string, string>();
  (myMemberships || []).forEach((m) => lastReadByConv.set(m.conversation_id, m.last_read_at));

  // 2) Conversas
  const { data: convs, error: convErr } = await supabase
    .from('chat_conversations')
    .select('id, is_group, name, created_by, created_at, updated_at')
    .in('id', convIds)
    .order('updated_at', { ascending: false });
  if (convErr) {
    console.error('[chatApi] listConversations convs', convErr);
    return [];
  }

  // 3) Membros das conversas
  const { data: allMembers } = await supabase
    .from('chat_conversation_members')
    .select('conversation_id, user_id')
    .in('conversation_id', convIds);
  const memberIdsByConv = new Map<string, string[]>();
  (allMembers || []).forEach((m) => {
    const arr = memberIdsByConv.get(m.conversation_id) || [];
    arr.push(m.user_id);
    memberIdsByConv.set(m.conversation_id, arr);
  });

  const allUserIds = Array.from(new Set((allMembers || []).map((m) => m.user_id)));
  const profileMap = await fetchProfilesByIds(allUserIds);

  // 4) Última mensagem de cada conversa
  const { data: msgs } = await supabase
    .from('chat_messages')
    .select('id, conversation_id, sender_id, type, content, metadata, created_at')
    .in('conversation_id', convIds)
    .order('created_at', { ascending: false });
  const lastMsgByConv = new Map<string, ChatMessageRow>();
  const allMsgsByConv = new Map<string, ChatMessageRow[]>();
  (msgs || []).forEach((m) => {
    if (!lastMsgByConv.has(m.conversation_id)) {
      lastMsgByConv.set(m.conversation_id, m as ChatMessageRow);
    }
    const arr = allMsgsByConv.get(m.conversation_id) || [];
    arr.push(m as ChatMessageRow);
    allMsgsByConv.set(m.conversation_id, arr);
  });

  return (convs || []).map((c): ChatConversationListItem => {
    const memberIds = memberIdsByConv.get(c.id) || [];
    const members = memberIds
      .map((id) => profileMap.get(id))
      .filter((p): p is ChatProfile => !!p);
    const lastReadAt = lastReadByConv.get(c.id) || new Date(0).toISOString();
    const allMsgs = allMsgsByConv.get(c.id) || [];
    const unreadCount = allMsgs.filter(
      (m) => m.sender_id !== userId && new Date(m.created_at) > new Date(lastReadAt),
    ).length;
    return {
      id: c.id,
      isGroup: c.is_group,
      name: c.name,
      members,
      lastMessage: lastMsgByConv.get(c.id) || null,
      unreadCount,
      updatedAt: c.updated_at,
      lastReadAt,
    };
  });
}

/**
 * Encontra ou cria uma conversa 1:1 entre o usuário atual e outro usuário.
 * Faz dedupe: se já existir, retorna a existente.
 */
export async function getOrCreateDirectConversation(
  userId: string,
  otherUserId: string,
): Promise<string | null> {
  if (userId === otherUserId) return null;
  const { data, error } = await supabase.rpc('get_or_create_direct_conversation', {
    other_user_id: otherUserId,
  });
  if (error) {
    console.error('[chatApi] get_or_create_direct_conversation', error);
    return null;
  }
  return (data as string) ?? null;
}

export async function createGroupConversation(
  userId: string,
  name: string,
  memberIds: string[],
): Promise<string | null> {
  const { data: newConv, error } = await supabase
    .from('chat_conversations')
    .insert({ is_group: true, name: name.trim() || 'Grupo', created_by: userId })
    .select('id')
    .single();
  if (error || !newConv) {
    console.error('[chatApi] create group', error);
    return null;
  }
  const allIds = Array.from(new Set([userId, ...memberIds]));
  const { error: memErr } = await supabase
    .from('chat_conversation_members')
    .insert(allIds.map((uid) => ({ conversation_id: newConv.id, user_id: uid })));
  if (memErr) {
    console.error('[chatApi] add group members', memErr);
    return null;
  }
  return newConv.id;
}

export async function listMessages(conversationId: string): Promise<ChatMessageRow[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('id, conversation_id, sender_id, type, content, metadata, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) {
    console.error('[chatApi] listMessages', error);
    return [];
  }
  return (data || []) as ChatMessageRow[];
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string,
  type: 'text' | 'itinerary' | 'image' = 'text',
  metadata: Record<string, unknown> = {},
): Promise<ChatMessageRow | null> {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      type,
      content,
      metadata: metadata as never,
    })
    .select('id, conversation_id, sender_id, type, content, metadata, created_at')
    .single();
  if (error) {
    console.error('[chatApi] sendMessage', error);
    return null;
  }
  return data as ChatMessageRow;
}

export async function markConversationRead(
  conversationId: string,
  userId: string,
): Promise<void> {
  await supabase
    .from('chat_conversation_members')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('user_id', userId);
}

/** Busca usuários por nome/username, excluindo o próprio. Limite default 20. */
export async function searchProfilesForChat(
  currentUserId: string,
  query: string,
  limit = 20,
): Promise<ChatProfile[]> {
  let q = supabase
    .from('profiles_public')
    .select('user_id, name, username, avatar_url')
    .neq('user_id', currentUserId)
    .limit(limit);
  const trimmed = query.trim();
  if (trimmed) {
    const like = `%${trimmed.replace(/^@/, '')}%`;
    q = q.or(`name.ilike.${like},username.ilike.${like}`);
  } else {
    q = q.order('followers_count', { ascending: false });
  }
  const { data, error } = await q;
  if (error) {
    console.error('[chatApi] searchProfilesForChat', error);
    return [];
  }
  return (data || []).map(rowToProfile);
}

/** Lista usuários que o usuário atual segue (sugestão para nova conversa). */
export async function listFollowingProfiles(currentUserId: string): Promise<ChatProfile[]> {
  const { data: follows, error } = await supabase
    .from('profile_follows')
    .select('following_id')
    .eq('follower_id', currentUserId);
  if (error || !follows?.length) return [];
  const ids = follows.map((f) => f.following_id);
  const map = await fetchProfilesByIds(ids);
  return Array.from(map.values());
}
