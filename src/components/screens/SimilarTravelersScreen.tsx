import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { BackButton } from '@/components/ui/BackButton';
import { fetchSimilarTravelers, type SimilarTraveler } from '@/lib/similarTravelers';
import { followProfile, unfollowProfile } from '@/lib/socialInteractions';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SimilarTravelersListSkeleton } from '@/components/ui/LoadingShimmers';
import { getInterestIcon } from '@/lib/interestIcons';

interface SimilarTravelersScreenProps {
  onBack: () => void;
  onViewProfile?: (traveler: SimilarTraveler) => void;
}

export function SimilarTravelersScreen({ onBack, onViewProfile }: SimilarTravelersScreenProps) {
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
  const [travelers, setTravelers] = useState<SimilarTraveler[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const list = await fetchSimilarTravelers(8);
      if (cancelled) return;
      setTravelers(list);
      setLoading(false);

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
    })();
    return () => { cancelled = true; };
  }, []);

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

  return (
    <div className="min-h-screen flex flex-col pb-8" style={{ backgroundColor: '#F2F2F2' }}>
      {/* Header */}
      <header className="sticky top-0 z-20 px-4 pt-4 pb-3" style={{ backgroundColor: '#F2F2F2' }}>
        <div className="flex items-center gap-3">
          <BackButton onClick={onBack} />
          <h1
            className="text-foreground"
            style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-weight-bold)' }}
          >
            Viajantes com mesmo interesse
          </h1>
        </div>
      </header>

      {/* List */}
      <div className="flex-1 px-4 pt-2">
        {loading ? (
          <SimilarTravelersListSkeleton count={6} />
        ) : (
        <div className="flex flex-col gap-3 pt-2">
          {travelers.map((traveler) => {
            const isFollowing = followedIds.has(traveler.userId);
            const sharedSet = new Set(traveler.sharedInterests.map(i => i.toLowerCase()));
            const orderedInterests = [
              ...traveler.sharedInterests,
              ...traveler.interests.filter(i => !sharedSet.has(i.toLowerCase())),
            ];
            return (
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
                className="rounded-2xl p-3 cursor-pointer active:scale-[0.99] transition-transform"
                style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 12px rgba(0, 0, 0, 0.05)' }}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex-shrink-0">
                    {traveler.avatar ? (
                      <img
                        src={traveler.avatar}
                        alt={traveler.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-foreground font-semibold">
                        {traveler.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-[15px] font-semibold text-foreground truncate">
                      {traveler.name}
                    </p>
                    {traveler.city && (
                      <p className="text-[12px] text-muted-foreground truncate">{traveler.city}</p>
                    )}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleFollow(traveler.userId, traveler.isMock); }}
                    className="flex-shrink-0 h-[32px] px-3.5 rounded-xl text-[12px] font-semibold transition-all active:scale-95"
                    style={
                      isFollowing
                        ? { background: '#F2F2F2', color: '#1A1C40' }
                        : { background: '#1A1C40', color: '#FFFFFF' }
                    }
                  >
                    {isFollowing ? 'Seguindo' : 'Seguir'}
                  </button>
                </div>

                {(traveler.compatibility > 0 || orderedInterests.length > 0) && (
                  <div className="flex flex-wrap gap-1.5">
                    {traveler.compatibility > 0 && (
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-semibold w-fit"
                        style={{
                          background: 'linear-gradient(135deg, #EDE4FF 0%, #E0D0FF 100%)',
                          color: '#6B21A8',
                        }}
                      >
                        <Icon name="auto_awesome" size={12} style={{ color: '#7C3AED' }} />
                        <span>{traveler.compatibility}% match</span>
                      </span>
                    )}
                    {orderedInterests.slice(0, 6).map((interest, i) => {
                      const iconName = getInterestIcon(interest);
                      return (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-[#F2F2F2] text-[11px] font-medium text-neutral-600 w-fit"
                        >
                          <Icon name={iconName} size={12} className="text-neutral-600" />
                          <span className="text-neutral-600">{interest}</span>
                        </span>
                      );
                    })}
                  </div>
                )}
                {traveler.sharedTripsCount > 0 && (
                  <p className="text-[12px] text-muted-foreground mt-2">
                    {traveler.sharedTripsCount} viagens em comum
                  </p>
                )}
              </div>
            );
          })}
        </div>
        )}
      </div>
    </div>
  );
}
