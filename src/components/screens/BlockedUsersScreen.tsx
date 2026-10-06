import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { BackButton } from '@/components/ui/BackButton';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Skeleton } from '@/components/ui/skeleton';
import { getBlockedProfiles, unblockProfile, type FollowListEntry } from '@/lib/socialInteractions';

interface BlockedUsersScreenProps {
  onBack: () => void;
}

export function BlockedUsersScreen({ onBack }: BlockedUsersScreenProps) {
  const [blocked, setBlocked] = useState<FollowListEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getBlockedProfiles().then((list) => {
      if (!active) return;
      setBlocked(list);
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const handleUnblock = async (entry: FollowListEntry) => {
    try {
      await unblockProfile(entry.userId);
      setBlocked((prev) => prev.filter((u) => u.userId !== entry.userId));
    } catch {
      toast.error('Não foi possível desbloquear. Tente novamente.');
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background pb-8">
      <div className="sticky top-0 z-20 bg-background">
        <div className="flex items-center gap-3 px-4 pb-2" style={{ paddingTop: 'calc(max(16px, env(safe-area-inset-top)) + 12px)' }}>
          <BackButton onClick={onBack} />
          <h1 className="text-foreground" style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-weight-bold)' }}>
            Usuários bloqueados
          </h1>
        </div>
      </div>

      <div className="px-5 pt-2">
        {loading ? (
          <div className="space-y-4 pt-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <Skeleton className="h-4 w-40" />
              </div>
            ))}
          </div>
        ) : blocked.length === 0 ? (
          <p className="text-muted-foreground text-center py-8" style={{ fontSize: 'var(--text-sm)' }}>
            Nenhuma pessoa bloqueada.
          </p>
        ) : (
          blocked.map((entry) => (
            <div key={entry.userId} className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid hsl(var(--divider))' }}>
              <div className="flex items-center gap-3 min-w-0">
                <UserAvatar src={entry.avatar} alt={entry.name} size={40} className="flex-shrink-0" />
                <div className="min-w-0">
                  <span className="block text-foreground truncate" style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-medium)' }}>
                    {entry.name}
                  </span>
                  <span className="block text-muted-foreground truncate" style={{ fontSize: 'var(--text-xs)' }}>
                    {entry.username}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleUnblock(entry)}
                className="text-foreground px-3 py-1.5 rounded-xl border border-border flex-shrink-0"
                style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-medium)' }}
              >
                Desbloquear
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
