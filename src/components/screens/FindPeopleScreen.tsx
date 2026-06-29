import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Icon } from '@/components/ui/Icon';
import { BackButton } from '@/components/ui/BackButton';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { supabase } from '@/integrations/supabase/client';
import { followProfile, getMyFollowingSet, unfollowProfile } from '@/lib/socialInteractions';

interface RealPerson {
  userId: string;
  name: string;
  username: string; // sem @
  avatar: string;
  city: string;
  bio: string;
  interests: string[];
}

interface FindPeopleScreenProps {
  onBack: () => void;
  /** Mantido por compatibilidade; navegação real é interna via /u/:username. */
  onViewProfile?: (person: { id: string; name: string; username: string; avatar: string }) => void;
}

export function FindPeopleScreen({ onBack, onViewProfile }: FindPeopleScreenProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [people, setPeople] = useState<RealPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingMe, setFollowingMe] = useState<Set<string>>(new Set());
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const myId = authUser?.id;
      let q = supabase
        .from('profiles_public')
        .select('user_id, name, username, location, avatar_url, bio, interests')
        .limit(100);
      if (myId) q = q.neq('user_id', myId);
      const { data, error } = await q;
      if (cancelled) return;
      if (error || !data) {
        setLoading(false);
        return;
      }
      const mapped: RealPerson[] = data
        .filter((r: any) => r.name || r.username)
        .map((r: any) => ({
          userId: r.user_id,
          name: r.name || r.username || 'Viajante',
          username: (r.username || '').replace(/^@/, ''),
          avatar: r.avatar_url || '',
          city: r.location || '',
          bio: r.bio || '',
          interests: Array.isArray(r.interests) ? r.interests : [],
        }));
      setPeople(mapped);
      // Quem desses eu já sigo?
      const ids = mapped.map(p => p.userId);
      const set = await getMyFollowingSet(ids);
      if (cancelled) return;
      setFollowingMe(set);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return people;
    return people.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.username.toLowerCase().includes(q),
    );
  }, [people, search]);

  const setBusy = (id: string, busy: boolean) => {
    setBusyIds(prev => {
      const next = new Set(prev);
      if (busy) next.add(id); else next.delete(id);
      return next;
    });
  };

  const toggleFollow = async (person: RealPerson) => {
    setBusy(person.userId, true);
    try {
      if (followingMe.has(person.userId)) {
        await unfollowProfile(person.userId);
        setFollowingMe(prev => {
          const next = new Set(prev);
          next.delete(person.userId);
          return next;
        });
      } else {
        await followProfile(person.userId);
        setFollowingMe(prev => new Set(prev).add(person.userId));
      }
    } catch (e: any) {
      toast.error(e?.message || 'Não foi possível atualizar');
    } finally {
      setBusy(person.userId, false);
    }
  };

  const goToProfile = (person: RealPerson) => {
    if (person.username) {
      navigate(`/u/${person.username}`, {
        state: {
          friend: {
            userId: person.userId,
            name: person.name,
            username: `@${person.username}`,
            avatar: person.avatar,
            location: person.city,
            bio: person.bio,
          },
        },
      });
      return;
    }
    onViewProfile?.({ id: person.userId, name: person.name, username: person.username, avatar: person.avatar });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-8">
      {/* Header */}
 <header className="sticky top-0 z-20 bg-background px-4 pb-3">
        <div className="flex items-center gap-3 mb-3" style={{ paddingTop: 'calc(max(16px, env(safe-area-inset-top)) + 12px)' }}>
          <BackButton onClick={onBack} />
          <h1 className="text-foreground" style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-weight-bold)' }}>
            Encontrar pessoas
          </h1>
        </div>
        <div className="relative">
          <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou @username..."
            className="w-full h-11 pl-10 pr-4 rounded-xl bg-muted/30 border border-[hsl(var(--divider))] text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/40 transition-colors"
            style={{ fontSize: 16 }}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <Icon name="close" size={16} className="text-muted-foreground" />
            </button>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1">
        {loading ? (
          <div className="px-5 py-10 text-center text-sm text-muted-foreground">Carregando…</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-14 h-14 rounded-full bg-muted/40 flex items-center justify-center mb-4">
              <Icon name="search" size={24} className="text-muted-foreground" />
            </div>
            <p className="text-foreground mb-1" style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)' }}>
              {search.trim() ? 'Nenhum resultado' : 'Sem viajantes ainda'}
            </p>
            <p className="text-muted-foreground" style={{ fontSize: 'var(--text-sm)' }}>
              {search.trim() ? 'Tente buscar por outro nome ou username.' : 'Quando outras pessoas se cadastrarem, elas aparecerão aqui.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[hsl(var(--divider))]">
            {filtered.map(person => (
              <PersonRow
                key={person.userId}
                person={person}
                isFollowing={followingMe.has(person.userId)}
                busy={busyIds.has(person.userId)}
                onToggleFollow={() => toggleFollow(person)}
                onViewProfile={() => goToProfile(person)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Person Row ─────────────────────────────────────────
function PersonRow({ person, isFollowing, busy, onToggleFollow, onViewProfile }: {
  person: RealPerson;
  isFollowing: boolean;
  busy: boolean;
  onToggleFollow: () => void;
  onViewProfile: () => void;
}) {
  const subtitle = person.username ? `@${person.username}` : (person.city || '');
  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      <button onClick={onViewProfile} className="flex-shrink-0 active:scale-95 transition-transform">
        <UserAvatar src={person.avatar} alt={person.name} size={48} />
      </button>
      <button onClick={onViewProfile} className="flex-1 min-w-0 text-left active:opacity-70 transition-opacity">
        <p className="text-foreground truncate" style={{ fontSize: 15, fontWeight: 600 }}>
          {person.name}
        </p>
        {subtitle && (
          <p className="text-muted-foreground truncate" style={{ fontSize: 12 }}>
            {subtitle}
          </p>
        )}
        {person.interests.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {person.interests.slice(0, 3).map((it, i) => (
              <span
                key={i}
                className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#F2F2F2] text-foreground"
                style={{ fontSize: 10, fontWeight: 600 }}
              >
                {it}
              </span>
            ))}
          </div>
        )}
      </button>
      <button
        onClick={onToggleFollow}
        disabled={busy}
        className="flex-shrink-0 h-[34px] px-4 rounded-xl text-[13px] font-semibold transition-all active:scale-95 disabled:opacity-60"
        style={
          isFollowing
            ? { background: '#F2F2F2', color: '#1A1C40' }
            : { background: '#1A1C40', color: '#FFFFFF' }
        }
      >
        {isFollowing ? 'Seguindo' : 'Seguir'}
      </button>
    </div>
  );
}
