import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { BackButton } from '@/components/ui/BackButton';
import { Skeleton } from '@/components/ui/skeleton';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { TravelerInterestTags } from '@/components/travel/TravelerInterestTags';
import { fetchSimilarTravelers, searchTravelersByQuery, type SimilarTraveler } from '@/lib/similarTravelers';
import { followProfile, getMyFollowingSet, unfollowProfile } from '@/lib/socialInteractions';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import doubleCheckIcon from '@/assets/home/double-check.svg';

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

interface SimilarTravelersScreenProps {
  onBack: () => void;
  onViewProfile?: (traveler: SimilarTraveler) => void;
}

export function SimilarTravelersScreen({ onBack, onViewProfile }: SimilarTravelersScreenProps) {
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
  const [travelers, setTravelers] = useState<SimilarTraveler[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const list = await fetchSimilarTravelers(8);
        if (cancelled) return;
        setTravelers(list);

        // Hidrata o estado inicial de "Seguindo" a partir do banco
        const realIds = list.filter(t => !t.isMock).map(t => t.userId);
        if (realIds.length === 0) return;
        const { data: auth } = await supabase.auth.getUser();
        const me = auth.user?.id;
        if (!me) return;
        const { data: rows } = await (supabase as any)
          .from('profile_follows')
          .select('following_id')
          .eq('follower_id', me)
          .in('following_id', realIds);
        if (cancelled || !rows) return;
        setFollowedIds(new Set(rows.map((r: any) => r.following_id as string)));
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const q = norm(search.trim()).replace(/^@/, '');
    if (!q) return travelers;
    return travelers.filter((t) => norm(t.name).includes(q) || norm(t.username).includes(q));
  }, [travelers, search]);

  // Busca no banco por pessoas que não estão na lista carregada ("Outros")
  const [others, setOthers] = useState<SimilarTraveler[]>([]);
  const [searchingOthers, setSearchingOthers] = useState(false);

  useEffect(() => {
    const term = search.trim();
    if (loading || norm(term).replace(/^@/, '').length < 2) {
      setOthers([]);
      setSearchingOthers(false);
      return;
    }
    let cancelled = false;
    setSearchingOthers(true);
    const timer = setTimeout(async () => {
      try {
        const list = await searchTravelersByQuery(term, travelers.map(t => t.userId));
        if (cancelled) return;
        setOthers(list);
        const followed = await getMyFollowingSet(list.map(t => t.userId));
        if (cancelled || followed.size === 0) return;
        setFollowedIds(prev => new Set([...prev, ...followed]));
      } catch (err) {
        if (!cancelled) setOthers([]);
        console.error('[SimilarTravelersScreen] search failed:', err);
      } finally {
        if (!cancelled) setSearchingOthers(false);
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [search, travelers, loading]);

  const toggleFollow = async (id: string, isMock?: boolean) => {
    const wasFollowing = followedIds.has(id);
    // Atualização otimista
    setFollowedIds(prev => {
      const next = new Set(prev);
      if (wasFollowing) next.delete(id);
      else next.add(id);
      return next;
    });

    if (isMock) return; // perfis mock só no estado local

    try {
      if (wasFollowing) await unfollowProfile(id);
      else await followProfile(id);
    } catch (err: any) {
      // Reverte em caso de erro
      setFollowedIds(prev => {
        const next = new Set(prev);
        if (wasFollowing) next.add(id);
        else next.delete(id);
        return next;
      });
      toast.error(err?.message || 'Não foi possível atualizar.');
    }
  };

  const renderCard = (traveler: SimilarTraveler) => {
    const isFollowing = followedIds.has(traveler.userId);
    return (
      // div clicável: o card contém o botão Seguir (<button> dentro de <button> é inválido)
      <div
        key={traveler.userId}
        role="button"
        tabIndex={0}
        onClick={() => onViewProfile?.(traveler)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onViewProfile?.(traveler);
          }
        }}
        className="bg-white rounded-[16px] p-4 flex flex-col gap-4 text-left cursor-pointer active:scale-[0.99] transition-transform"
      >
        <div className="flex items-center gap-4">
          <div className="flex-1 min-w-0 flex items-center gap-3">
            <UserAvatar src={traveler.avatar} alt={traveler.name} size={38} />
            <div className="min-w-0 flex flex-col gap-[3px]">
              <p className="text-[16px] font-semibold text-[#080B43] truncate">{traveler.name}</p>
              {traveler.username && <p className="text-[12px] text-[#646464] truncate">@{traveler.username}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); toggleFollow(traveler.userId, traveler.isMock); }}
            className={
              isFollowing
                ? 'flex-shrink-0 h-[33px] px-4 rounded-[16px] bg-[#141530] text-[#9DCC36] text-[14px] font-bold inline-flex items-center gap-2 active:scale-95 transition-transform'
                : 'flex-shrink-0 h-[33px] w-[92px] rounded-[16px] bg-[#9DCC36] text-[#141530] text-[14px] font-bold inline-flex items-center justify-center active:scale-95 transition-transform'
            }
          >
            {isFollowing ? 'Seguindo' : 'Seguir'}
            {isFollowing && <img src={doubleCheckIcon} alt="" width={16} height={16} />}
          </button>
        </div>
        <TravelerInterestTags traveler={traveler} />
      </div>
    );
  };

  return (
    <div className="min-h-[100dvh] bg-[#F3F3F3] flex flex-col pb-8">
      <header
        className="sticky top-0 z-20 bg-[#F3F3F3] px-4 pb-6 flex flex-col gap-6"
        style={{ paddingTop: 'calc(max(16px, env(safe-area-inset-top)) + 12px)' }}
      >
        <div className="flex items-center gap-4">
          <BackButton onClick={onBack} className="bg-transparent shadow-none" />
          <h1 className="text-[20px] font-bold text-[#171F2C]">Viajantes com o mesmo interesse</h1>
        </div>
        <label className="w-full flex items-center gap-2 p-4 rounded-[12px] bg-white border border-[#FEFEFE]">
          <Icon name="search" size={16} className="text-[#7F7F7F]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Busque por pessoas"
            className="flex-1 min-w-0 !bg-transparent text-[14px] font-medium text-[#141530] placeholder:text-[#7F7F7F] outline-none"
          />
          {search && (
            <button type="button" onClick={() => setSearch('')} aria-label="Limpar busca">
              <Icon name="close" size={16} className="text-[#7F7F7F]" />
            </button>
          )}
        </label>
      </header>

      <main className="px-4 flex flex-col gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="w-full h-[142px] rounded-[16px]" />)
        ) : filtered.length === 0 && others.length === 0 && !searchingOthers ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Icon name="search" size={28} className="text-[#7F7F7F] mb-3" />
            <p className="text-[16px] font-semibold text-[#141530]">Nenhuma pessoa encontrada</p>
            <p className="text-[14px] text-[#646464] mt-1">Tente buscar por outro nome.</p>
          </div>
        ) : (
          <>
            {filtered.length > 0 && (
              <>
                {(others.length > 0 || searchingOthers) && (
                  <h2 className="text-[16px] font-bold text-[#171F2C]">Viajantes com o mesmo interesse</h2>
                )}
                {filtered.map(renderCard)}
              </>
            )}
            {others.length > 0 && (
              <>
                <h2 className="text-[16px] font-bold text-[#171F2C] mt-2">Outros viajantes</h2>
                {others.map(renderCard)}
              </>
            )}
            {searchingOthers && others.length === 0 && (
              <Skeleton className="w-full h-[142px] rounded-[16px]" />
            )}
          </>
        )}
      </main>
    </div>
  );
}
