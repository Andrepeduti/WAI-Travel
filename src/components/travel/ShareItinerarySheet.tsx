import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Copy, Search, X } from 'lucide-react';
import {
  inviteUserToItinerary,
  createShareLink,
} from '@/lib/itineraryMembersApi';

interface ShareItinerarySheetProps {
  open: boolean;
  onClose: () => void;
  itineraryId: string;
  ownerId: string;
  tripName?: string;
}

interface UserSearchResult {
  user_id: string;
  name: string;
  username?: string;
  avatar_url?: string;
  email?: string;
}

export function ShareItinerarySheet({
  open,
  onClose,
  itineraryId,
  ownerId,
}: ShareItinerarySheetProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [role, setRole] = useState<'editor' | 'viewer'>('editor');
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [sending, setSending] = useState(false);
  const [copying, setCopying] = useState(false);
  // Reset state when sheet opens
  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setRole('editor');
      setSelectedUser(null);
    }
  }, [open]);

  // Busca usuários por nome/@username
  useEffect(() => {
    if (!open || selectedUser) return;
    const q = query.trim();
    if (q.length < 2) { setResults([]); return; }
    let cancelled = false;
    setSearching(true);
    const handle = setTimeout(async () => {
      try {
        const { data } = await supabase
          .from('profiles_public')
          .select('user_id, name, username, avatar_url')
          .neq('user_id', ownerId)
          .or(`name.ilike.%${q}%,username.ilike.%${q}%`)
          .limit(10);

        if (!cancelled) setResults((data || []) as UserSearchResult[]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [query, open, ownerId, selectedUser]);

  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(query.trim());
  const canSend = !!selectedUser; // só envia para usuário existente
  const showDropdown = !selectedUser && query.trim().length >= 2;
  const showNoResults = showDropdown && !searching && results.length === 0;

  const handleSelectUser = (u: UserSearchResult) => {
    setSelectedUser(u);
    setQuery(u.name || u.username || u.email || '');
    setResults([]);
  };

  const handleClearSelection = () => {
    setSelectedUser(null);
    setQuery('');
    setResults([]);
  };

  const handleSend = async () => {
    if (!selectedUser || sending) return;
    setSending(true);
    try {
      await inviteUserToItinerary({
        itineraryId,
        inviterId: ownerId,
        inviteeUserId: selectedUser.user_id,
        role,
      });
      toast.success(`Convite enviado para ${selectedUser.name || selectedUser.username || 'usuário'}`);
      handleClearSelection();
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao enviar convite');
    } finally {
      setSending(false);
    }
  };

  const handleCopyLink = async () => {
    if (copying) return;
    setCopying(true);
    try {
      const { token } = await createShareLink({
        itineraryId,
        inviterId: ownerId,
        role,
      });
      const url = `${window.location.origin}/convite/${token}`;
      try { await navigator.clipboard.writeText(url); } catch {/* noop */}
      toast.success('Link copiado!');
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao gerar link');
    } finally {
      setCopying(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" style={{ animation: 'fadeIn 0.3s ease-out' }} />
      <div
        className="relative w-full w-full bg-background rounded-t-2xl max-h-[85vh] flex flex-col"
        style={{ animation: 'slideUpSheet 0.35s cubic-bezier(0.32, 0.72, 0, 1)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-[#E0E0E0]" />
        </div>
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-[#F2F2F2] flex items-center justify-center"
          aria-label="Fechar"
        >
          <X size={16} />
        </button>

        <div className="px-5 pt-2 pb-4">
          <h3 className="text-[18px] font-bold text-foreground">Compartilhar roteiro</h3>
        </div>

        {/* Linha: input + botão Convidar */}
        <div className="px-5 relative z-10">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              {selectedUser ? (
                <div className="w-full h-11 pl-2 pr-2 rounded-xl border border-[#E5E5E5] bg-white flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#F2F2F2] overflow-hidden flex-shrink-0">
                    {selectedUser.avatar_url ? (
                      <img src={selectedUser.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[12px] font-bold text-muted-foreground">
                        {(selectedUser.name || selectedUser.username || '?').slice(0, 1).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <span className="text-[14px] font-medium text-foreground truncate flex-1">
                    {selectedUser.name || selectedUser.username}
                  </span>
                  <button
                    onClick={handleClearSelection}
                    className="w-6 h-6 rounded-full bg-[#F2F2F2] flex items-center justify-center flex-shrink-0"
                    aria-label="Remover"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <>
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar @usuário ou e-mail"
                    autoFocus
                    className="w-full h-11 pl-9 pr-3 rounded-xl border border-[#E5E5E5] bg-white text-[16px] placeholder:text-[13px] focus:outline-none focus:border-[#9DCC36]"
                  />
                </>
              )}

              {/* Dropdown de resultados */}
              {showDropdown && (
                <div
                  className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl border border-[#E5E5E5] shadow-lg overflow-hidden max-h-[280px] overflow-y-auto z-20"
                >
                  {searching && (
                    <p className="text-[12px] text-muted-foreground px-3 py-3">Buscando…</p>
                  )}

                  {!searching && results.length > 0 && (
                    <div className="py-1">
                      {results.map((u) => (
                        <button
                          key={u.user_id}
                          onClick={() => handleSelectUser(u)}
                          className="w-full flex items-center gap-3 px-3 py-2 hover:bg-[#F9FAFB] text-left"
                        >
                          <div className="w-9 h-9 rounded-full bg-[#F2F2F2] overflow-hidden flex-shrink-0">
                            {u.avatar_url ? (
                              <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[12px] font-bold text-muted-foreground">
                                {(u.name || u.username || u.email || '?').slice(0, 1).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[14px] font-medium text-foreground truncate">{u.name || u.username}</p>
                            {u.username && (
                              <p className="text-[12px] text-muted-foreground truncate">@{u.username}</p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {showNoResults && (
                    <p className="text-[13px] text-muted-foreground px-3 py-3">
                      {isEmail
                        ? 'Nenhum usuário encontrado com esse e-mail. Use o link de convite abaixo.'
                        : 'Nenhum usuário encontrado.'}
                    </p>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={handleSend}
              disabled={!canSend || sending}
              className="h-11 px-4 rounded-xl bg-[#9DCC36] text-[#1A1C40] text-[14px] font-semibold disabled:bg-[#D1D5DB] disabled:text-[#9CA3AF] disabled:cursor-not-allowed active:opacity-80"
            >
              {sending ? 'Enviando…' : 'Convidar'}
            </button>
          </div>
        </div>

        {/* Permissão — radio sutil */}
        <div className="px-5 pt-4">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
            Permissão
          </p>
          <div className="flex items-center gap-5">
            {([
              { key: 'editor' as const, label: 'Pode editar' },
              { key: 'viewer' as const, label: 'Só visualizar' },
            ]).map((opt) => {
              const selected = role === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => setRole(opt.key)}
                  className="flex items-center gap-2 py-1 active:opacity-70"
                >
                  <div
                    className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                    style={{ borderColor: selected ? '#1A1C40' : '#D1D5DB' }}
                  >
                    {selected && <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#1A1C40' }} />}
                  </div>
                  <span className="text-[14px] font-medium text-foreground">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Copiar link de convite — inline */}
        <div className="px-5 pt-4 pb-5">
          <button
            onClick={handleCopyLink}
            disabled={copying}
            className="w-full flex items-center gap-3 py-3 px-3 rounded-xl border border-[#E5E5E5] bg-white active:opacity-80 disabled:opacity-60"
          >
            <div className="w-9 h-9 rounded-full bg-[#F2F2F2] flex items-center justify-center">
              <Copy size={16} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-[14px] font-medium text-foreground">
                {copying ? 'Gerando link…' : 'Copiar link de convite'}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Link com permissão de {role === 'editor' ? 'edição' : 'visualização'}
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
