import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Share2, X, Disc, Copy } from 'lucide-react';
import {
  inviteUserToItinerary,
  createShareLink,
} from '@/lib/itineraryMembersApi';
import { SuccessToast } from './SuccessToast';

interface ShareItinerarySheetProps {
  open: boolean;
  onClose: () => void;
  itineraryId: string;
  ownerId: string;
  tripName?: string;
  onSuccess?: (msg: string) => void;
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
  onSuccess,
}: ShareItinerarySheetProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [role, setRole] = useState<'editor' | 'viewer'>('editor');
  const [selectedUsers, setSelectedUsers] = useState<UserSearchResult[]>([]);
  const [sending, setSending] = useState(false);
  const [copying, setCopying] = useState(false);
  
  // Custom Toast State
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Reset state when sheet opens
  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setRole('editor');
      setSelectedUsers([]);
      setToastVisible(false);
    }
  }, [open]);

  // Evitar scroll do fundo quando aberto
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [open]);

  // Busca usuários por nome/@username
  useEffect(() => {
    if (!open) return;
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

        if (!cancelled) {
          // Filter out already selected users
          const filtered = (data || []).filter(
            (u) => !selectedUsers.some((su) => su.user_id === u.user_id)
          );
          setResults(filtered as UserSearchResult[]);
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [query, open, ownerId, selectedUsers]);

  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(query.trim());
  const canSend = selectedUsers.length > 0;
  const showDropdown = query.trim().length >= 2;
  const showNoResults = showDropdown && !searching && results.length === 0;

  const handleSelectUser = (u: UserSearchResult) => {
    setSelectedUsers([...selectedUsers, u]);
    setQuery('');
    setResults([]);
  };

  const handleRemoveUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter((u) => u.user_id !== userId));
  };

  const handleSend = async () => {
    if (!canSend || sending) return;
    setSending(true);
    let successCount = 0;
    try {
      for (const user of selectedUsers) {
        await inviteUserToItinerary({
          itineraryId,
          inviterId: ownerId,
          inviteeUserId: user.user_id,
          role,
        });
        successCount++;
      }
      const msg = successCount === 1 ? 'Convite enviado!' : `${successCount} convites enviados!`;
      setSelectedUsers([]);
      if (onSuccess) {
        onSuccess(msg);
        onClose();
      } else {
        setToastMessage(msg);
        setToastVisible(true);
        setTimeout(() => onClose(), 1500);
      }
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
      setToastMessage('Link copiado!');
      setToastVisible(true);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao gerar link');
    } finally {
      setCopying(false);
    }
  };

  const handleShare = async () => {
    if (copying) return;
    setCopying(true);
    try {
      const { token } = await createShareLink({
        itineraryId,
        inviterId: ownerId,
        role,
      });
      const url = `${window.location.origin}/convite/${token}`;
      if (navigator.share) {
        await navigator.share({
          title: 'Convite para Roteiro',
          text: `Você foi convidado para participar de um roteiro no WAI Travel Hub!`,
          url: url,
        });
      } else {
        try { await navigator.clipboard.writeText(url); } catch {/* noop */}
        setToastMessage('Link copiado!');
        setToastVisible(true);
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        toast.error(e?.message || 'Erro ao gerar link');
      }
    } finally {
      setCopying(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[120] flex items-end justify-center">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} style={{ animation: 'fadeIn 0.3s ease-out' }} />
        
        <div
          className="relative w-full bg-white flex flex-col items-start p-[16px] pb-[34px] gap-[24px]"
          style={{ 
            borderRadius: '24px 24px 0px 0px',
            animation: 'slideUpSheet 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
            fontFamily: "'Urbanist', sans-serif"
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="w-full flex flex-col items-end gap-2">
            <button onClick={onClose} className="text-[#171F2C] active:scale-95 transition-transform" aria-label="Fechar">
              <X size={24} />
            </button>
            <div className="w-full flex justify-start">
              <h2 className="text-[22px] font-semibold text-[#171F2C] leading-[26px]">
                Convidar para o roteiro
              </h2>
            </div>
          </div>

          <div className="w-full flex flex-col items-start gap-[24px]">
            {/* Frame 2087325162 (Roles + Input) */}
            <div className="w-full flex flex-col items-start gap-[16px]">
              {/* Permissão */}
              <div className="flex flex-row items-start gap-[12px]">
                <button
                  onClick={() => setRole('editor')}
                  className={`box-border flex flex-row items-center justify-center px-[16px] py-[8px] gap-[16px] w-[104px] h-[33px] rounded-[16px] transition-colors active:scale-[0.98] ${
                    role === 'editor'
                      ? 'bg-[#141530] text-[#FEFEFE]'
                      : 'bg-[#F2F2F2] text-[#949494]'
                  }`}
                >
                  <span className="font-medium text-[14px] leading-[17px] text-center font-['Urbanist']">
                    Pode editar
                  </span>
                </button>

                <button
                  onClick={() => setRole('viewer')}
                  className={`box-border flex flex-row items-center justify-center px-[16px] py-[8px] gap-[16px] w-[110px] h-[33px] rounded-[16px] transition-colors active:scale-[0.98] ${
                    role === 'viewer'
                      ? 'bg-[#141530] text-[#FEFEFE]'
                      : 'bg-[#F2F2F2] text-[#949494]'
                  }`}
                >
                  <span className="font-medium text-[14px] leading-[17px] text-center font-['Urbanist']">
                    Só visualizar
                  </span>
                </button>
              </div>

              {/* Input Multiplex */}
              <div className="relative w-full">
                <div 
                  className={`w-full bg-[#EEEEEE] rounded-[12px] p-3 flex flex-col justify-start transition-all`}
                >
                  <div className="flex items-center gap-1.5 mb-2 px-1">
                    <Disc size={16} className="text-[#141530]" strokeWidth={2.5} />
                    <span className="text-[12px] font-medium text-[#949494] leading-[16px]">
                      Usuário
                    </span>
                  </div>
                  
                  <div className="flex flex-col gap-2 flex-1 w-full">
                    {selectedUsers.map((u) => (
                      <div 
                        key={u.user_id} 
                        className="flex flex-row items-center justify-between p-2 pr-3 gap-2 h-[42px] bg-transparent border border-[#141530] rounded-[24px] w-fit"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-[26px] h-[26px] rounded-full overflow-hidden flex-shrink-0 bg-white flex items-center justify-center text-[11px] font-bold">
                            {u.avatar_url ? (
                              <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              (u.name || u.username || '?').slice(0, 1).toUpperCase()
                            )}
                          </div>
                          <span className="font-medium text-[14px] leading-[16px] text-[#141530] truncate max-w-[160px] font-['Urbanist']">
                            {u.name || u.username}
                          </span>
                        </div>
                        <button
                          onClick={() => handleRemoveUser(u.user_id)}
                          className="w-5 h-5 flex items-center justify-center text-[#141530] opacity-70 hover:opacity-100 transition-opacity ml-2"
                        >
                          <X size={14} strokeWidth={2.5} />
                        </button>
                      </div>
                    ))}

                    <div className="flex-1 w-full relative h-[36px] flex items-center">
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={selectedUsers.length === 0 ? "Buscar por um @usuário ou e-mail..." : ""}
                        className="w-full h-full bg-transparent text-[15px] text-[#141530] placeholder:text-[#949494] focus:outline-none placeholder:text-[14px] px-1 font-['Urbanist']"
                      />
                    </div>
                  </div>
                </div>

                {/* Dropdown de resultados */}
                {showDropdown && (
                  <div
                    className="absolute left-0 right-0 top-[calc(100%+8px)] bg-white rounded-xl border border-[#E5E5E5] shadow-lg overflow-hidden max-h-[200px] overflow-y-auto z-20"
                  >
                    {searching && (
                      <p className="text-[13px] text-muted-foreground px-4 py-3">Buscando…</p>
                    )}

                    {!searching && results.length > 0 && (
                      <div className="py-1">
                        {results.map((u) => (
                          <button
                            key={u.user_id}
                            onClick={() => handleSelectUser(u)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#F9FAFB] text-left transition-colors"
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
                      <p className="text-[13px] text-muted-foreground px-4 py-3">
                        {isEmail
                          ? 'Nenhum usuário encontrado. Use o link de convite.'
                          : 'Nenhum usuário encontrado.'}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ou */}
            <div className="flex flex-row items-center gap-8 w-full">
              <div className="flex-1 h-px border-t border-[#F2F2F2]"></div>
              <span className="font-medium text-[14px] text-[#141530] font-['Urbanist']">ou</span>
              <div className="flex-1 h-px border-t border-[#F2F2F2]"></div>
            </div>

            {/* Convide pelo link */}
            <div className="flex flex-col items-start p-[16px] gap-[12px] w-full bg-white border border-[#D5D5D5] rounded-[16px]">
              <span className="font-semibold text-[16px] leading-[19px] text-[#141530] font-['Urbanist']">
                Convide pelo link
              </span>
              <div className="w-full h-px border-t border-[#F2F2F2]"></div>
              <div className="flex flex-row items-center justify-between w-full h-[40px]">
                <span className="font-medium text-[14px] text-[#141530] truncate font-['Urbanist']">
                  link.com.br
                </span>
                <div className="flex flex-row items-center gap-[12px]">
                  <button
                    onClick={handleCopyLink}
                    disabled={copying}
                    className="box-border flex flex-row items-center justify-center w-[40px] h-[40px] border border-[#141530] rounded-full active:scale-95 transition-transform disabled:opacity-70"
                  >
                    <Copy className="w-4 h-4 text-[#141530]" />
                  </button>
                  <button
                    onClick={handleShare}
                    disabled={copying}
                    className="flex flex-row items-center justify-center w-[40px] h-[40px] bg-[#141530] rounded-full active:scale-95 transition-transform disabled:opacity-70"
                  >
                    <Share2 className="w-4 h-4 text-[#9DCC36]" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Main Button */}
          <div className="w-full">
            <button
              onClick={handleSend}
              disabled={!canSend || sending}
              className="group flex flex-row justify-center items-center py-[16px] px-[16px] gap-[16px] w-full h-[48px] rounded-[16px] active:scale-[0.98] transition-all disabled:active:scale-100 disabled:bg-[#B6B6B6] bg-[#9DCC36]"
            >
              <span className="font-bold text-[16px] leading-[19px] font-['Urbanist'] group-disabled:text-[#7F7F7F] text-[#141530]">
                {sending ? 'Enviando...' : 'Convidar'}
              </span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Success Snackbar */}
      <SuccessToast
        isVisible={toastVisible}
        onClose={() => setToastVisible(false)}
        title={toastMessage}
        description=""
      />
    </>
  );
}

