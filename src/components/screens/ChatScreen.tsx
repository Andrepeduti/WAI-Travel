import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { BackButton } from '@/components/ui/BackButton';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  ChatProfile,
  ChatConversationListItem,
  ChatMessageRow,
  createGroupConversation,
  getOrCreateDirectConversation,
  listConversations,
  listFollowingProfiles,
  listMessages,
  markConversationRead,
  searchProfilesForChat,
  sendMessage,
  fetchProfilesByIds,
} from '@/lib/chatApi';

export interface ChatItineraryContext {
  itineraryId?: number;
  title: string;
  thumbnail: string;
  destination?: string;
  price?: number;
}

interface ChatScreenProps {
  onBack: () => void;
  /** Quando definido, abre direto numa conversa com este contato. */
  initialContact?: {
    name: string;
    avatar: string;
    /** ID do usuário (auth.users.id) — necessário para conversa real. */
    userId?: string;
    /** Card de contexto do roteiro fixado no topo da conversa. */
    itineraryContext?: ChatItineraryContext;
  } | null;
  /** Tocar no card de contexto leva o usuário de volta para o roteiro. */
  onViewItinerary?: (itineraryId: number) => void;
}

type ChatView = 'inbox' | 'conversation' | 'newConversation' | 'createGroup';

export function ChatScreen({ onBack, initialContact, onViewItinerary }: ChatScreenProps) {
  const { user } = useAuth();
  const userId = user?.id || '';

  const [currentView, setCurrentView] = useState<ChatView>('inbox');
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeConversationMeta, setActiveConversationMeta] = useState<{
    name: string;
    isGroup: boolean;
    members: ChatProfile[];
  } | null>(null);
  const [activeItineraryContext, setActiveItineraryContext] = useState<ChatItineraryContext | null>(null);
  const [pendingInitialText, setPendingInitialText] = useState('');

  const [localOnlyConv, setLocalOnlyConv] = useState(false);

  // Abre conversa direta com initialContact (deep link)
  useEffect(() => {
    if (!initialContact || !userId) return;
    (async () => {
      const presetContext = initialContact.itineraryContext ?? null;
      const presetText = presetContext
        ? `Olá! Tenho uma dúvida sobre o roteiro ${presetContext.title}.`
        : '';
      const fallbackMember: ChatProfile = {
        userId: initialContact.userId || `local:${initialContact.name}`,
        name: initialContact.name,
        username: '',
        avatar: initialContact.avatar,
      };

      if (!initialContact.userId) {
        // Sem userId real — abre conversa em modo local (sem persistência)
        const localId = `local:${initialContact.name}:${presetContext?.itineraryId ?? 'general'}`;
        setActiveConversationId(localId);
        setActiveConversationMeta({
          name: initialContact.name,
          isGroup: false,
          members: [fallbackMember],
        });
        setActiveItineraryContext(presetContext);
        setPendingInitialText(presetText);
        setLocalOnlyConv(true);
        setCurrentView('conversation');
        return;
      }

      const convId = await getOrCreateDirectConversation(userId, initialContact.userId);
      if (!convId) return;
      setActiveConversationId(convId);
      setActiveConversationMeta({
        name: initialContact.name,
        isGroup: false,
        members: [fallbackMember],
      });
      setActiveItineraryContext(presetContext);
      setPendingInitialText(presetText);
      setLocalOnlyConv(false);
      setCurrentView('conversation');
    })();
  }, [initialContact, userId]);


  const openConversation = useCallback(
    (convId: string, meta: { name: string; isGroup: boolean; members: ChatProfile[] }) => {
      setActiveConversationId(convId);
      setActiveConversationMeta(meta);
      setCurrentView('conversation');
    },
    [],
  );

  if (!userId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6 text-center">
        <p className="text-sm text-muted-foreground">Entre na sua conta para usar o chat.</p>
      </div>
    );
  }

  switch (currentView) {
    case 'newConversation':
      return (
        <NewConversationView
          currentUserId={userId}
          onBack={() => setCurrentView('inbox')}
          onContactClick={async (contact) => {
            const convId = await getOrCreateDirectConversation(userId, contact.userId);
            if (!convId) return;
            openConversation(convId, {
              name: contact.name,
              isGroup: false,
              members: [contact],
            });
          }}
          onCreateGroup={() => setCurrentView('createGroup')}
        />
      );
    case 'createGroup':
      return (
        <CreateGroupView
          currentUserId={userId}
          onBack={() => setCurrentView('newConversation')}
          onGroupCreated={async (convId, name, members) => {
            openConversation(convId, { name, isGroup: true, members });
          }}
        />
      );
    case 'conversation':
      return activeConversationId && activeConversationMeta ? (
        <ConversationView
          currentUserId={userId}
          conversationId={activeConversationId}
          conversationName={activeConversationMeta.name}
          isGroup={activeConversationMeta.isGroup}
          members={activeConversationMeta.members}
          itineraryContext={activeItineraryContext}
          initialText={pendingInitialText}
          localOnly={localOnlyConv}
          onViewItinerary={onViewItinerary}
          onBack={() => {
            setActiveConversationId(null);
            setActiveConversationMeta(null);
            setActiveItineraryContext(null);
            setPendingInitialText('');
            setLocalOnlyConv(false);
            setCurrentView('inbox');
          }}
        />
      ) : null;
    default:
      return (
        <InboxView
          currentUserId={userId}
          onBack={onBack}
          onConversationClick={(item) =>
            openConversation(item.id, {
              name: conversationTitle(item, userId),
              isGroup: item.isGroup,
              members: item.members.filter((m) => m.userId !== userId),
            })
          }
          onNewConversation={() => setCurrentView('newConversation')}
        />
      );
  }
}

function conversationTitle(item: ChatConversationListItem, userId: string): string {
  if (item.isGroup) return item.name || 'Grupo';
  const other = item.members.find((m) => m.userId !== userId);
  return other?.name || 'Conversa';
}

function conversationAvatars(item: ChatConversationListItem, userId: string): string[] {
  if (item.isGroup) {
    return item.members.filter((m) => m.userId !== userId).map((m) => m.avatar).filter(Boolean);
  }
  const other = item.members.find((m) => m.userId !== userId);
  return other?.avatar ? [other.avatar] : [];
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Ontem';
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 7) {
    return ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][d.getDay()];
  }
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function formatDateLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Hoje';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ─── Inbox ──────────────────────────────────────────────
function InboxView({
  currentUserId,
  onBack,
  onConversationClick,
  onNewConversation,
}: {
  currentUserId: string;
  onBack: () => void;
  onConversationClick: (c: ChatConversationListItem) => void;
  onNewConversation: () => void;
}) {
  const [items, setItems] = useState<ChatConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const list = await listConversations(currentUserId);
      if (!cancelled) {
        setItems(list);
        setLoading(false);
      }
    };
    load();

    const channel = supabase
      .channel(`inbox:${currentUserId}:${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, () => load())
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_conversation_members' },
        () => load(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-20 bg-background px-5 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BackButton onClick={onBack} />
            <h1 className="text-xl font-bold text-foreground my-0 mt-[24px]">Mensagens</h1>
          </div>
          <button
            onClick={onNewConversation}
            className="w-10 h-10 rounded-full bg-[#9DCC36] flex items-center justify-center active:scale-95 transition-all shadow-sm"
          >
            <Icon name="edit_square" size={20} style={{ color: '#1A1C40' }} />
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Carregando…</p>
        </div>
      ) : items.length > 0 ? (
        <div className="flex-1 divide-y divide-[hsl(var(--divider))]">
          {items.map((conv) => {
            const title = conversationTitle(conv, currentUserId);
            const avatars = conversationAvatars(conv, currentUserId);
            const previewText = conv.lastMessage
              ? conv.lastMessage.type === 'itinerary'
                ? '📍 Roteiro'
                : conv.lastMessage.type === 'image'
                ? '📷 Foto'
                : conv.lastMessage.content
              : 'Conversa criada';
            return (
              <button
                key={conv.id}
                onClick={() => onConversationClick(conv)}
                className="w-full flex items-center gap-3 px-5 py-3.5 active:bg-muted/30 transition-colors text-left"
              >
                <AvatarStack avatars={avatars} isGroup={conv.isGroup} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span
                      className={`text-[15px] truncate ${
                        conv.unreadCount > 0
                          ? 'font-bold text-foreground'
                          : 'font-medium text-foreground'
                      }`}
                    >
                      {title}
                    </span>
                    <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                      {formatTimestamp(conv.updatedAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p
                      className={`text-sm truncate ${
                        conv.unreadCount > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'
                      }`}
                    >
                      {previewText}
                    </p>
                    {conv.unreadCount > 0 && (
                      <span className="flex-shrink-0 ml-2 min-w-5 h-5 px-1.5 rounded-full bg-[#141530] flex items-center justify-center">
                        <span className="text-[10px] font-bold text-white">{conv.unreadCount}</span>
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center px-10 text-center">
          <div className="w-16 h-16 rounded-full bg-muted/40 flex items-center justify-center mb-4">
            <Icon name="chat_bubble_left" size={28} className="text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-1">Nenhuma conversa ainda</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            Comece uma conversa com viajantes ou pessoas que você segue.
          </p>
          <button
            onClick={onNewConversation}
            className="px-5 h-11 rounded-full bg-primary text-[14px] font-semibold text-[#1A1C40] active:scale-95 transition-all"
          >
            Iniciar nova conversa
          </button>
        </div>
      )}
    </div>
  );
}

// ─── New Conversation ───────────────────────────────────
function NewConversationView({
  currentUserId,
  onBack,
  onContactClick,
  onCreateGroup,
}: {
  currentUserId: string;
  onBack: () => void;
  onContactClick: (contact: ChatProfile) => void;
  onCreateGroup: () => void;
}) {
  const [search, setSearch] = useState('');
  const [following, setFollowing] = useState<ChatProfile[]>([]);
  const [results, setResults] = useState<ChatProfile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    listFollowingProfiles(currentUserId).then(setFollowing);
  }, [currentUserId]);

  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true);
      const r = await searchProfilesForChat(currentUserId, search, 30);
      setResults(r);
      setLoading(false);
    }, 250);
    return () => clearTimeout(t);
  }, [search, currentUserId]);

  const showSuggestions = !search.trim();
  const list = showSuggestions
    ? following.length
      ? following
      : results
    : results;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-20 bg-background px-4 pt-4 pb-3">
        <div className="flex items-center gap-3 mb-3">
          <BackButton onClick={onBack} />
          <h1 className="text-lg font-bold text-foreground">Nova mensagem</h1>
        </div>
        <div className="relative">
          <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar pessoas…"
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-muted/30 border border-[hsl(var(--divider))] text-base text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/40"
            style={{ fontSize: 16 }}
          />
        </div>
      </header>

      <div className="flex-1">
        <button
          onClick={onCreateGroup}
          className="w-full flex items-center gap-3 px-5 py-3.5 active:bg-muted/30 transition-colors text-left"
        >
          <div className="w-12 h-12 rounded-full bg-muted/40 flex items-center justify-center">
            <Icon name="group" size={22} className="text-foreground" />
          </div>
          <span className="text-[15px] font-medium text-foreground">Criar grupo</span>
        </button>

        <div className="px-5 pt-3 pb-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {showSuggestions ? (following.length ? 'Pessoas que você segue' : 'Sugeridos') : 'Resultados'}
          </span>
        </div>

        {loading && !list.length ? (
          <p className="px-5 py-4 text-sm text-muted-foreground">Buscando…</p>
        ) : list.length === 0 ? (
          <p className="px-5 py-4 text-sm text-muted-foreground">
            {search.trim() ? 'Nenhum usuário encontrado.' : 'Você ainda não segue ninguém — pesquise pelo nome.'}
          </p>
        ) : (
          <div className="divide-y divide-[hsl(var(--divider))]">
            {list.map((contact) => (
              <button
                key={contact.userId}
                onClick={() => onContactClick(contact)}
                className="w-full flex items-center gap-3 px-5 py-3 active:bg-muted/30 transition-colors text-left"
              >
                <Avatar src={contact.avatar} name={contact.name} size={48} />
                <div className="min-w-0">
                  <p className="text-[15px] font-medium text-foreground truncate">{contact.name}</p>
                  <p className="text-xs text-muted-foreground">{contact.username}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Create Group ───────────────────────────────────────
function CreateGroupView({
  currentUserId,
  onBack,
  onGroupCreated,
}: {
  currentUserId: string;
  onBack: () => void;
  onGroupCreated: (convId: string, name: string, members: ChatProfile[]) => void;
}) {
  const [groupName, setGroupName] = useState('');
  const [selected, setSelected] = useState<Map<string, ChatProfile>>(new Map());
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<ChatProfile[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const t = setTimeout(async () => {
      const r = search.trim()
        ? await searchProfilesForChat(currentUserId, search, 30)
        : await listFollowingProfiles(currentUserId);
      setResults(r);
    }, 250);
    return () => clearTimeout(t);
  }, [search, currentUserId]);

  const toggle = (p: ChatProfile) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(p.userId)) next.delete(p.userId);
      else next.set(p.userId, p);
      return next;
    });
  };

  const handleCreate = async () => {
    if (!groupName.trim() || selected.size === 0 || creating) return;
    setCreating(true);
    const memberIds = Array.from(selected.keys());
    const convId = await createGroupConversation(currentUserId, groupName, memberIds);
    setCreating(false);
    if (convId) onGroupCreated(convId, groupName.trim(), Array.from(selected.values()));
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-20 bg-background px-4 pt-4 pb-3">
        <div className="flex items-center gap-3 mb-3">
          <BackButton onClick={onBack} />
          <h1 className="text-lg font-bold text-foreground">Criar grupo</h1>
          <div className="flex-1" />
          <button
            onClick={handleCreate}
            disabled={!groupName.trim() || selected.size === 0 || creating}
            className="text-sm font-semibold text-primary disabled:text-muted-foreground"
          >
            {creating ? 'Criando…' : 'Criar'}
          </button>
        </div>

        <input
          type="text"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          placeholder="Nome do grupo"
          className="w-full h-10 px-4 rounded-xl bg-muted/30 border border-[hsl(var(--divider))] text-base text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/40 mb-3"
          style={{ fontSize: 16 }}
        />

        {selected.size > 0 && (
          <div className="flex gap-2 flex-wrap mb-3">
            {Array.from(selected.values()).map((c) => (
              <div key={c.userId} className="flex items-center gap-1.5 bg-primary/10 rounded-full pl-1 pr-2.5 py-1">
                <Avatar src={c.avatar} name={c.name} size={24} />
                <span className="text-xs font-medium text-foreground">{c.name.split(' ')[0]}</span>
                <button onClick={() => toggle(c)}>
                  <Icon name="close" size={14} className="text-muted-foreground" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="relative">
          <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar contatos…"
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-muted/30 border border-[hsl(var(--divider))] text-base text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/40"
            style={{ fontSize: 16 }}
          />
        </div>
      </header>

      <div className="flex-1 divide-y divide-[hsl(var(--divider))]">
        {results.map((contact) => {
          const isSelected = selected.has(contact.userId);
          return (
            <button
              key={contact.userId}
              onClick={() => toggle(contact)}
              className="w-full flex items-center gap-3 px-5 py-3 active:bg-muted/30 transition-colors text-left"
            >
              <Avatar src={contact.avatar} name={contact.name} size={48} />
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-medium text-foreground truncate">{contact.name}</p>
                <p className="text-xs text-muted-foreground">{contact.username}</p>
              </div>
              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                  isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                }`}
              >
                {isSelected && <Icon name="check" size={14} className="text-white" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Conversation ───────────────────────────────────────
const STARTER_SUGGESTIONS = [
  'Oi! Adorei seu roteiro 😍',
  'Posso tirar uma dúvida sobre o roteiro?',
  'Você recomenda fazer em quantos dias?',
  'Como foi a experiência por aí?',
];

function ConversationView({
  currentUserId,
  conversationId,
  conversationName,
  isGroup,
  members,
  itineraryContext,
  initialText,
  localOnly = false,
  onViewItinerary,
  onBack,
}: {
  currentUserId: string;
  conversationId: string;
  conversationName: string;
  isGroup: boolean;
  members: ChatProfile[];
  itineraryContext?: ChatItineraryContext | null;
  initialText?: string;
  localOnly?: boolean;
  onViewItinerary?: (itineraryId: number) => void;
  onBack: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessageRow[]>([]);
  const [profileMap, setProfileMap] = useState<Map<string, ChatProfile>>(new Map());
  const [text, setText] = useState(initialText || '');
  const [sending, setSending] = useState(false);
  const [contextDismissed, setContextDismissed] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustTextareaHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const maxH = 120;
    el.style.height = Math.min(el.scrollHeight, maxH) + 'px';
  }, []);

  // Inicializa mapa de perfis com membros recebidos
  useEffect(() => {
    setProfileMap((prev) => {
      const next = new Map(prev);
      members.forEach((m) => next.set(m.userId, m));
      return next;
    });
  }, [members]);

  useEffect(() => {
    if (localOnly) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const msgs = await listMessages(conversationId);
      if (cancelled) return;
      setMessages(msgs);
      const unknown = Array.from(new Set(msgs.map((m) => m.sender_id))).filter(
        (id) => !profileMap.has(id) && id !== currentUserId,
      );
      if (unknown.length) {
        const map = await fetchProfilesByIds(unknown);
        if (!cancelled) {
          setProfileMap((prev) => {
            const next = new Map(prev);
            map.forEach((v, k) => next.set(k, v));
            return next;
          });
        }
      }
      markConversationRead(conversationId, currentUserId);
    })();

    const channel = supabase
      .channel(`conv:${conversationId}:${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const m = payload.new as ChatMessageRow;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
          if (m.sender_id !== currentUserId && !profileMap.has(m.sender_id)) {
            const map = await fetchProfilesByIds([m.sender_id]);
            setProfileMap((prev) => {
              const next = new Map(prev);
              map.forEach((v, k) => next.set(k, v));
              return next;
            });
          }
          if (m.sender_id !== currentUserId) {
            markConversationRead(conversationId, currentUserId);
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, currentUserId, localOnly]);

  const handleSend = async () => {
    const value = text.trim();
    if (!value || sending) return;
    setSending(true);
    if (localOnly) {
      const localMsg: ChatMessageRow = {
        id: `local-${Date.now()}`,
        conversation_id: conversationId,
        sender_id: currentUserId,
        content: value,
        type: 'text',
        metadata: null,
        created_at: new Date().toISOString(),
      } as ChatMessageRow;
      setMessages((prev) => [...prev, localMsg]);
      setText('');
      setSending(false);
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
      return;
    }
    const sent = await sendMessage(conversationId, currentUserId, value, 'text');
    if (sent) setMessages((prev) => (prev.some((x) => x.id === sent.id) ? prev : [...prev, sent]));
    setText('');
    setSending(false);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };



  const grouped = useMemo(() => {
    const out: { date: string; messages: ChatMessageRow[] }[] = [];
    messages.forEach((m) => {
      const label = formatDateLabel(m.created_at);
      const last = out[out.length - 1];
      if (last && last.date === label) last.messages.push(m);
      else out.push({ date: label, messages: [m] });
    });
    return out;
  }, [messages]);

  const isEmpty = messages.length === 0;
  const headerAvatars = isGroup
    ? members.map((m) => m.avatar).filter(Boolean)
    : members.length > 0
    ? [members[0].avatar].filter(Boolean)
    : [];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-20 bg-background border-b border-[hsl(var(--divider))] px-4 py-3">
        <div className="flex items-center gap-3">
          <BackButton onClick={onBack} />
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <AvatarStack avatars={headerAvatars} isGroup={isGroup} size="sm" fallbackName={conversationName} />
            <div className="flex-1 min-w-0 text-left">
              <h1 className="text-[15px] font-bold text-foreground truncate">{conversationName}</h1>
              {isGroup && (
                <p className="text-xs text-muted-foreground">{members.length} participantes</p>
              )}
            </div>
          </div>
        </div>
      </header>


      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center text-center px-2 py-8">
            <AvatarStack avatars={headerAvatars} isGroup={isGroup} size="lg" fallbackName={conversationName} />
            <h2 className="text-base font-semibold text-foreground mt-4">{conversationName}</h2>
            <p className="text-sm text-muted-foreground mt-1 mb-6">
              {itineraryContext
                ? 'Edite a mensagem abaixo e envie para começar a conversa.'
                : 'Comece a conversa enviando uma mensagem.'}
            </p>
            {!itineraryContext && (
              <div className="w-full max-w-sm space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Sugestões para começar
                </p>
                {STARTER_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setText(s)}
                    className="w-full text-left px-4 py-3 rounded-2xl bg-card border border-[hsl(var(--divider))] text-[14px] text-foreground active:scale-[0.98] transition-all hover:border-primary/40"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.date}>
              <div className="flex items-center justify-center my-4">
                <span className="text-[11px] font-medium text-muted-foreground bg-muted/40 px-3 py-1 rounded-full">
                  {group.date}
                </span>
              </div>
              {group.messages.map((msg) => {
                const isOwn = msg.sender_id === currentUserId;
                const sender = profileMap.get(msg.sender_id);
                const meta = (msg.metadata || {}) as { title?: string; thumbnail?: string };
                return (
                  <div
                    key={msg.id}
                    className={`flex items-end gap-2 mb-2 ${isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isOwn && (
                      <Avatar src={sender?.avatar || ''} name={sender?.name || '?'} size={24} />
                    )}
                    <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                      {!isOwn && isGroup && (
                        <span className="text-[11px] font-medium text-muted-foreground mb-0.5 ml-1">
                          {sender?.name || 'Usuário'}
                        </span>
                      )}
                      {msg.type === 'itinerary' && meta.title ? (
                        <div
                          className={`rounded-2xl overflow-hidden ${
                            isOwn
                              ? 'bg-primary/10'
                              : 'bg-card border border-[hsl(var(--divider))]'
                          }`}
                        >
                          {meta.thumbnail && (
                            <img src={meta.thumbnail} alt="" className="w-full h-24 object-cover" />
                          )}
                          <div className="px-3 py-2">
                            <p className="text-[13px] font-semibold text-foreground">{meta.title}</p>
                            <p className="text-[11px] font-medium mt-0.5 text-violet-darker">Ver roteiro →</p>
                          </div>
                        </div>
                      ) : (
                        <div
                          className={`px-3.5 py-2.5 rounded-2xl ${
                            isOwn
                              ? 'bg-primary/10 rounded-br-md'
                              : 'bg-card border border-[hsl(var(--divider))] rounded-bl-md'
                          }`}
                        >
                          <p className="text-[14px] text-foreground leading-relaxed whitespace-pre-wrap break-words">
                            {msg.content}
                          </p>
                        </div>
                      )}
                      <span
                        className={`text-[10px] text-muted-foreground mt-1 ${isOwn ? 'mr-1' : 'ml-1'}`}
                      >
                        {formatTimestamp(msg.created_at)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      <div
        className="sticky bottom-0 bg-background border-t border-[hsl(var(--divider))] px-4 py-3"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))' }}
      >
        {itineraryContext && !contextDismissed && (
          <div className="mb-2 flex items-center gap-3 p-2 rounded-2xl bg-card border border-[hsl(var(--divider))]">
            <button
              type="button"
              onClick={() => {
                if (itineraryContext.itineraryId != null && onViewItinerary) {
                  onViewItinerary(itineraryContext.itineraryId);
                }
              }}
              disabled={itineraryContext.itineraryId == null || !onViewItinerary}
              className="flex items-center gap-3 flex-1 min-w-0 text-left active:scale-[0.99] transition-transform disabled:active:scale-100"
              aria-label={`Ver roteiro ${itineraryContext.title}`}
            >
              <img
                src={itineraryContext.thumbnail}
                alt=""
                className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-0.5">
                  Sobre este roteiro
                </p>
                <p className="text-[13px] font-semibold text-foreground truncate leading-tight">
                  {itineraryContext.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  {itineraryContext.destination && (
                    <span className="text-[11px] text-muted-foreground truncate">
                      📍 {itineraryContext.destination}
                    </span>
                  )}
                  {itineraryContext.price != null && itineraryContext.price > 0 && (
                    <span className="text-[11px] font-semibold text-foreground">
                      R$ {itineraryContext.price.toFixed(2).replace('.', ',')}
                    </span>
                  )}
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setContextDismissed(true)}
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 active:scale-95 transition-all hover:bg-muted/40"
              aria-label="Fechar"
            >
              <Icon name="close" size={18} style={{ color: '#1A1C40' }} />
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          <div className="flex-1 bg-card border border-[hsl(var(--divider))] rounded-2xl px-3 py-2">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                adjustTextareaHeight();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Escreva uma mensagem…"
              rows={1}
              className="w-full text-base text-foreground bg-transparent outline-none placeholder:text-muted-foreground px-1 resize-none overflow-y-auto"
              style={{ fontSize: 16 }}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0 active:scale-95 transition-all disabled:opacity-40"
          >
            <Icon name="send" size={20} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers UI ─────────────────────────────────────────
function Avatar({ src, name, size = 40 }: { src: string; name: string; size?: number }) {
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  const initials = (name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
  return (
    <div
      className="rounded-full bg-muted flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size }}
    >
      <span className="text-foreground font-semibold" style={{ fontSize: size * 0.4 }}>
        {initials}
      </span>
    </div>
  );
}

function AvatarStack({
  avatars,
  isGroup,
  size,
  fallbackName,
}: {
  avatars: string[];
  isGroup: boolean;
  size: 'sm' | 'md' | 'lg';
  fallbackName?: string;
}) {
  const px = size === 'sm' ? 36 : size === 'md' ? 48 : 80;
  if (isGroup && avatars.length >= 2) {
    return (
      <div className="relative flex-shrink-0" style={{ width: px, height: px }}>
        <img
          src={avatars[0]}
          alt=""
          className="absolute top-0 left-0 rounded-full object-cover border-2 border-background"
          style={{ width: px * 0.7, height: px * 0.7 }}
        />
        <img
          src={avatars[1]}
          alt=""
          className="absolute bottom-0 right-0 rounded-full object-cover border-2 border-background"
          style={{ width: px * 0.7, height: px * 0.7 }}
        />
      </div>
    );
  }
  return <Avatar src={avatars[0] || ''} name={fallbackName || ''} size={px} />;
}
