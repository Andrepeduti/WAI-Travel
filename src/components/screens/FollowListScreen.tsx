import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Icon } from '@/components/ui/Icon';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { BackButton } from '@/components/ui/BackButton';
import { useAuth } from '@/contexts/AuthContext';
import {
  FollowListEntry,
  blockProfile,
  followProfile,
  getFollowers,
  getFollowing,
  getMyFollowingSet,
  removeFollower,
  reportProfile,
  unfollowProfile,
} from '@/lib/socialInteractions';

type Tab = 'followers' | 'following';

interface FollowListScreenProps {
  /** userId do dono do perfil que está sendo visualizado. */
  profileUserId: string;
  /** nome para exibir no header (ex.: '@joao' ou 'João'). */
  profileLabel: string;
  /** Aba inicial. */
  initialTab: Tab;
  onBack: () => void;
}

type FollowSheet =
  | { kind: 'remove-follower'; entry: FollowListEntry } // dono do perfil removendo um seguidor
  | { kind: 'unfollow'; entry: FollowListEntry } // eu deixando de seguir alguém
  | null;

type ModerateSheet =
  | { kind: 'moderate'; entry: FollowListEntry }
  | { kind: 'confirm-block'; entry: FollowListEntry }
  | { kind: 'confirm-report'; entry: FollowListEntry }
  | null;

export function FollowListScreen({ profileUserId, profileLabel, initialTab, onBack }: FollowListScreenProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const myId = user?.id || null;
  const isMyProfile = myId === profileUserId;

  const [tab, setTab] = useState<Tab>(initialTab);
  const [followers, setFollowers] = useState<FollowListEntry[]>([]);
  const [following, setFollowing] = useState<FollowListEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [followingMe, setFollowingMe] = useState<Set<string>>(new Set());
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [followSheet, setFollowSheet] = useState<FollowSheet>(null);
  const [moderateSheet, setModerateSheet] = useState<ModerateSheet>(null);

  // long-press control
  const longPressTimer = useRef<number | null>(null);
  const longPressFired = useRef(false);

  // Carrega listas
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [fwers, fwing] = await Promise.all([
        getFollowers(profileUserId),
        getFollowing(profileUserId),
      ]);
      if (cancelled) return;
      setFollowers(fwers);
      setFollowing(fwing);
      const allIds = Array.from(new Set([...fwers, ...fwing].map(e => e.userId).filter(id => id && id !== myId)));
      const set = await getMyFollowingSet(allIds);
      if (cancelled) return;
      setFollowingMe(set);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [profileUserId, myId]);

  const list = tab === 'followers' ? followers : following;
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const visible = list.filter(e => !removedIds.has(e.userId));
    if (!q) return visible;
    return visible.filter(e =>
      e.name.toLowerCase().includes(q) ||
      e.username.toLowerCase().includes(q),
    );
  }, [list, search, removedIds]);

  const setBusy = (id: string, busy: boolean) => {
    setBusyIds(prev => {
      const next = new Set(prev);
      if (busy) next.add(id); else next.delete(id);
      return next;
    });
  };

  // ===== Ações =====

  const doFollow = async (entry: FollowListEntry) => {
    if (!myId) { toast.error('Faça login para continuar'); return; }
    setBusy(entry.userId, true);
    try {
      await followProfile(entry.userId);
      setFollowingMe(prev => new Set(prev).add(entry.userId));
    } catch (e: any) {
      toast.error(e?.message || 'Não foi possível seguir');
    } finally {
      setBusy(entry.userId, false);
    }
  };

  const doUnfollow = async (entry: FollowListEntry) => {
    setBusy(entry.userId, true);
    try {
      await unfollowProfile(entry.userId);
      setFollowingMe(prev => {
        const next = new Set(prev);
        next.delete(entry.userId);
        return next;
      });
      // Se estou na MINHA aba "Seguindo", a pessoa some da lista
      if (isMyProfile && tab === 'following') {
        setRemovedIds(prev => new Set(prev).add(entry.userId));
      }
      toast.success('Você deixou de seguir');
    } catch (e: any) {
      toast.error(e?.message || 'Não foi possível deixar de seguir');
    } finally {
      setBusy(entry.userId, false);
      setFollowSheet(null);
    }
  };

  const doRemoveFollower = async (entry: FollowListEntry) => {
    setBusy(entry.userId, true);
    try {
      await removeFollower(entry.userId);
      setRemovedIds(prev => new Set(prev).add(entry.userId));
      toast.success('Seguidor removido');
    } catch (e: any) {
      toast.error(e?.message || 'Não foi possível remover');
    } finally {
      setBusy(entry.userId, false);
      setFollowSheet(null);
    }
  };

  const doBlock = async (entry: FollowListEntry) => {
    setBusy(entry.userId, true);
    try {
      await blockProfile(entry.userId);
      setRemovedIds(prev => new Set(prev).add(entry.userId));
      setFollowingMe(prev => {
        const next = new Set(prev);
        next.delete(entry.userId);
        return next;
      });
      toast.success('Perfil bloqueado');
    } catch (e: any) {
      toast.error(e?.message || 'Não foi possível bloquear');
    } finally {
      setBusy(entry.userId, false);
      setModerateSheet(null);
    }
  };

  const doReport = async (entry: FollowListEntry) => {
    setBusy(entry.userId, true);
    try {
      await reportProfile(entry.userId);
      toast.success('Denúncia enviada');
    } catch (e: any) {
      toast.error(e?.message || 'Não foi possível denunciar');
    } finally {
      setBusy(entry.userId, false);
      setModerateSheet(null);
    }
  };

  // ===== Botão principal de cada linha =====

  const handleFollowButton = (entry: FollowListEntry) => {
    if (!myId) { toast.error('Faça login para continuar'); return; }
    const iFollow = followingMe.has(entry.userId);
    // Já sigo → confirma "Deixar de seguir"
    if (iFollow) {
      setFollowSheet({ kind: 'unfollow', entry });
      return;
    }
    // Não sigo → seguir de volta direto
    doFollow(entry);
  };

  // ===== Long press =====

  const startLongPress = (entry: FollowListEntry) => {
    if (entry.userId === myId) return;
    longPressFired.current = false;
    if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
    longPressTimer.current = window.setTimeout(() => {
      longPressFired.current = true;
      try { (navigator as any)?.vibrate?.(20); } catch {}
      setModerateSheet({ kind: 'moderate', entry });
    }, 500);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const goToProfile = (entry: FollowListEntry) => {
    if (longPressFired.current) { longPressFired.current = false; return; }
    const handle = entry.username.replace(/^@/, '');
    if (handle) navigate(`/u/${handle}`, { state: { friend: { userId: entry.userId, name: entry.name, username: entry.username, avatar: entry.avatar, location: entry.location, bio: entry.bio } } });
  };

  return (
    <div className="min-h-screen bg-muted flex items-start justify-center">
      <div className="w-full max-w-[430px] bg-background min-h-screen shadow-2xl flex flex-col" style={{ minHeight: '100dvh' }}>
        {/* Header */}
        <div className="sticky top-0 z-20 bg-background border-b border-border px-4 py-3 flex items-center gap-3">
          <BackButton onClick={onBack} />
          <div className="flex-1 min-w-0">
            <p className="text-foreground truncate" style={{ fontSize: 15, fontWeight: 700 }}>{profileLabel}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border bg-background sticky top-[57px] z-10">
          {(['followers', 'following'] as Tab[]).map(t => {
            const active = tab === t;
            const count = t === 'followers' ? followers.length : following.length;
            const label = t === 'followers' ? 'Seguidores' : 'Seguindo';
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="flex-1 py-3 text-center relative active:opacity-70"
                style={{ fontSize: 14, fontWeight: 600, color: active ? '#1A1C40' : '#8E8E93' }}
              >
                {count} {label}
                {active && (
                  <span className="absolute left-0 right-0 bottom-0 h-[2px]" style={{ background: '#1A1C40' }} />
                )}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 rounded-full px-3 h-10" style={{ background: '#F2F2F7' }}>
            <Icon name="search" size={16} style={{ color: '#8E8E93' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar"
              className="flex-1 bg-transparent outline-none"
              style={{ fontSize: 16, color: '#1A1C40' }}
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 px-2 pb-8">
          {loading ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">Carregando…</div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-10 flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: '#F2F2F2' }}>
                <Icon name="group" size={22} className="text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-center" style={{ fontSize: 14 }}>
                {tab === 'followers' ? 'Sem seguidores ainda' : 'Não está seguindo ninguém ainda'}
              </p>
            </div>
          ) : (
            <ul className="flex flex-col">
              {filtered.map(entry => {
                const isMe = entry.userId === myId;
                const iFollow = followingMe.has(entry.userId);
                const busy = busyIds.has(entry.userId);

                // Texto/estilo do botão principal: Seguir / Seguindo
                const btnLabel = iFollow ? 'Seguindo' : 'Seguir';
                const btnBg = iFollow ? '#F2F2F7' : '#1A1C40';
                const btnColor = iFollow ? '#1A1C40' : '#FFFFFF';

                return (
                  <li key={entry.userId} className="flex items-center gap-3 px-3 py-2.5">
                    <button
                      onClick={() => goToProfile(entry)}
                      onPointerDown={() => startLongPress(entry)}
                      onPointerUp={cancelLongPress}
                      onPointerLeave={cancelLongPress}
                      onPointerCancel={cancelLongPress}
                      onContextMenu={(e) => { e.preventDefault(); if (!isMe) setModerateSheet({ kind: 'moderate', entry }); }}
                      className="flex items-center gap-3 flex-1 min-w-0 text-left active:opacity-70 select-none"
                      style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
                    >
                      <UserAvatar src={entry.avatar} alt={entry.name} size={44} />
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-foreground" style={{ fontSize: 14, fontWeight: 600 }}>{entry.name}</p>
                        <p className="truncate text-muted-foreground" style={{ fontSize: 12 }}>{entry.username}</p>
                      </div>
                    </button>

                    {!isMe && (
                      <button
                        disabled={busy}
                        onClick={() => handleFollowButton(entry)}
                        className="rounded-full px-3 h-8 active:opacity-70 flex-shrink-0"
                        style={{ fontSize: 12, fontWeight: 700, background: btnBg, color: btnColor }}
                      >
                        {btnLabel}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Bottom sheet: ações de follow (remover seguidor / deixar de seguir) */}
        {followSheet && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setFollowSheet(null)}>
            <div className="w-full max-w-[430px] bg-background rounded-t-2xl p-5 pb-7" onClick={e => e.stopPropagation()}>
              <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-4" />
              <div className="flex items-center gap-3 mb-4">
                <UserAvatar src={followSheet.entry.avatar} alt={followSheet.entry.name} size={48} />
                <div className="min-w-0">
                  <p className="truncate" style={{ fontSize: 15, fontWeight: 700, color: '#1A1C40' }}>{followSheet.entry.name}</p>
                  <p className="truncate text-muted-foreground" style={{ fontSize: 12 }}>{followSheet.entry.username}</p>
                </div>
              </div>
              {followSheet.kind === 'remove-follower' ? (
                <>
                  <p style={{ fontSize: 16, fontWeight: 700, color: '#1A1C40' }}>Remover seguidor?</p>
                  <p className="mt-1 text-muted-foreground" style={{ fontSize: 13 }}>
                    {followSheet.entry.name} não verá mais suas atualizações no feed e deixará de te seguir.
                  </p>
                  <div className="mt-4 flex gap-2">
                    <button onClick={() => setFollowSheet(null)} className="flex-1 rounded-full h-11" style={{ background: '#F2F2F7', color: '#1A1C40', fontSize: 14, fontWeight: 700 }}>Cancelar</button>
                    <button onClick={() => doRemoveFollower(followSheet.entry)} className="flex-1 rounded-full h-11" style={{ background: '#EF4444', color: '#FFFFFF', fontSize: 14, fontWeight: 700 }}>Remover</button>
                  </div>
                </>
              ) : (
                <>
                  <p style={{ fontSize: 16, fontWeight: 700, color: '#1A1C40' }}>Deixar de seguir?</p>
                  <p className="mt-1 text-muted-foreground" style={{ fontSize: 13 }}>
                    Você não verá mais as atualizações de {followSheet.entry.name} no seu feed.
                  </p>
                  <div className="mt-4 flex gap-2">
                    <button onClick={() => setFollowSheet(null)} className="flex-1 rounded-full h-11" style={{ background: '#F2F2F7', color: '#1A1C40', fontSize: 14, fontWeight: 700 }}>Cancelar</button>
                    <button onClick={() => doUnfollow(followSheet.entry)} className="flex-1 rounded-full h-11" style={{ background: '#1A1C40', color: '#FFFFFF', fontSize: 14, fontWeight: 700 }}>Deixar de seguir</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Bottom sheet: moderação (long press) — Denunciar / Bloquear */}
        {moderateSheet && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setModerateSheet(null)}>
            <div className="w-full max-w-[430px] bg-background rounded-t-2xl p-5 pb-7" onClick={e => e.stopPropagation()}>
              <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-4" />
              <div className="flex items-center gap-3 mb-4">
                <UserAvatar src={moderateSheet.entry.avatar} alt={moderateSheet.entry.name} size={48} />
                <div className="min-w-0">
                  <p className="truncate" style={{ fontSize: 15, fontWeight: 700, color: '#1A1C40' }}>{moderateSheet.entry.name}</p>
                  <p className="truncate text-muted-foreground" style={{ fontSize: 12 }}>{moderateSheet.entry.username}</p>
                </div>
              </div>

              {moderateSheet.kind === 'moderate' && (
                <div className="flex flex-col">
                  <button
                    onClick={() => setModerateSheet({ kind: 'confirm-report', entry: moderateSheet.entry })}
                    className="flex items-center gap-3 py-3 active:opacity-70"
                    style={{ fontSize: 15, fontWeight: 600, color: '#1A1C40' }}
                  >
                    <span className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#F2F2F7' }}>
                      <Icon name="flag" size={18} style={{ color: '#1A1C40' }} />
                    </span>
                    Denunciar
                  </button>
                  <button
                    onClick={() => setModerateSheet({ kind: 'confirm-block', entry: moderateSheet.entry })}
                    className="flex items-center gap-3 py-3 active:opacity-70"
                    style={{ fontSize: 15, fontWeight: 600, color: '#EF4444' }}
                  >
                    <span className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#FEE2E2' }}>
                      <Icon name="block" size={18} style={{ color: '#EF4444' }} />
                    </span>
                    Bloquear
                  </button>
                </div>
              )}

              {moderateSheet.kind === 'confirm-block' && (
                <>
                  <p style={{ fontSize: 16, fontWeight: 700, color: '#1A1C40' }}>Bloquear {moderateSheet.entry.name}?</p>
                  <p className="mt-1 text-muted-foreground" style={{ fontSize: 13 }}>
                    Vocês deixarão de se seguir e essa pessoa não poderá ver seu perfil ou interagir com você.
                  </p>
                  <div className="mt-4 flex gap-2">
                    <button onClick={() => setModerateSheet({ kind: 'moderate', entry: moderateSheet.entry })} className="flex-1 rounded-full h-11" style={{ background: '#F2F2F7', color: '#1A1C40', fontSize: 14, fontWeight: 700 }}>Cancelar</button>
                    <button onClick={() => doBlock(moderateSheet.entry)} className="flex-1 rounded-full h-11" style={{ background: '#EF4444', color: '#FFFFFF', fontSize: 14, fontWeight: 700 }}>Bloquear</button>
                  </div>
                </>
              )}

              {moderateSheet.kind === 'confirm-report' && (
                <>
                  <p style={{ fontSize: 16, fontWeight: 700, color: '#1A1C40' }}>Denunciar perfil?</p>
                  <p className="mt-1 text-muted-foreground" style={{ fontSize: 13 }}>
                    Nossa equipe vai revisar o perfil de {moderateSheet.entry.name}.
                  </p>
                  <div className="mt-4 flex gap-2">
                    <button onClick={() => setModerateSheet({ kind: 'moderate', entry: moderateSheet.entry })} className="flex-1 rounded-full h-11" style={{ background: '#F2F2F7', color: '#1A1C40', fontSize: 14, fontWeight: 700 }}>Cancelar</button>
                    <button onClick={() => doReport(moderateSheet.entry)} className="flex-1 rounded-full h-11" style={{ background: '#1A1C40', color: '#FFFFFF', fontSize: 14, fontWeight: 700 }}>Denunciar</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default FollowListScreen;
