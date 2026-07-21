import { supabase } from '@/integrations/supabase/client';

type SocialClient = typeof supabase & { from: (table: string) => any };

const db = supabase as SocialClient;

const getAuthUserId = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user?.id ?? null;
};

export const getProfileSocialState = async (profileUserId: string) => {
  const currentUserId = await getAuthUserId();
  if (!currentUserId || currentUserId === profileUserId) {
    return { isFollowing: false, isBlocked: false };
  }

  const [{ data: follow }, { data: block }] = await Promise.all([
    db.from('profile_follows')
      .select('id')
      .eq('follower_id', currentUserId)
      .eq('following_id', profileUserId)
      .maybeSingle(),
    db.from('profile_blocks')
      .select('id')
      .eq('blocker_id', currentUserId)
      .eq('blocked_id', profileUserId)
      .maybeSingle(),
  ]);

  return { isFollowing: Boolean(follow), isBlocked: Boolean(block) };
};

export const followProfile = async (profileUserId: string) => {
  const currentUserId = await getAuthUserId();
  if (!currentUserId || currentUserId === profileUserId) throw new Error('Perfil inválido');

  const { error } = await db.from('profile_follows').upsert(
    { follower_id: currentUserId, following_id: profileUserId },
    { onConflict: 'follower_id,following_id', ignoreDuplicates: true },
  );
  if (error) throw error;
};

export const unfollowProfile = async (profileUserId: string) => {
  const currentUserId = await getAuthUserId();
  if (!currentUserId) throw new Error('Faça login para continuar');

  const { error } = await db.from('profile_follows')
    .delete()
    .eq('follower_id', currentUserId)
    .eq('following_id', profileUserId);
  if (error) throw error;
};

export const blockProfile = async (profileUserId: string) => {
  const currentUserId = await getAuthUserId();
  if (!currentUserId || currentUserId === profileUserId) throw new Error('Perfil inválido');

  const { error } = await db.from('profile_blocks').upsert(
    { blocker_id: currentUserId, blocked_id: profileUserId },
    { onConflict: 'blocker_id,blocked_id', ignoreDuplicates: true },
  );
  if (error) throw error;
};

export const unblockProfile = async (profileUserId: string) => {
  const currentUserId = await getAuthUserId();
  if (!currentUserId) throw new Error('Faça login para continuar');

  const { error } = await db.from('profile_blocks')
    .delete()
    .eq('blocker_id', currentUserId)
    .eq('blocked_id', profileUserId);
  if (error) throw error;
};

export const reportProfile = async (
  profileUserId: string,
  reason = 'Perfil denunciado',
  details = '',
) => {
  const currentUserId = await getAuthUserId();
  if (!currentUserId || currentUserId === profileUserId) throw new Error('Perfil inválido');

  const { error } = await db.from('profile_reports').upsert(
    { reporter_id: currentUserId, reported_id: profileUserId, reason, details, status: 'pending' },
    { onConflict: 'reporter_id,reported_id,status', ignoreDuplicates: true },
  );
  if (error) throw error;
};

export interface FollowListEntry {
  userId: string;
  name: string;
  username: string; // sempre com @ prefixado
  avatar: string;
  location: string;
  bio: string;
}

const profileRowToEntry = (p: any): FollowListEntry => {
  const u = (p?.username || '').replace(/^@/, '');
  return {
    userId: p?.user_id,
    name: p?.name || u || 'Viajante',
    username: u ? `@${u}` : '@usuario',
    avatar: p?.avatar_url || '',
    location: p?.location || '',
    bio: p?.bio || '',
  };
};

/** Lista pessoas que SEGUEM o usuário informado. */
export const getFollowers = async (profileUserId: string): Promise<FollowListEntry[]> => {
  if (!profileUserId) return [];
  const { data: rows, error } = await db.from('profile_follows')
    .select('follower_id')
    .eq('following_id', profileUserId)
    .order('created_at', { ascending: false });
  console.log('[DEBUG getFollowers] profile_follows rows:', rows, 'error:', error);
  if (error) { console.error('[social] getFollowers', error); return []; }
  const ids = (rows || []).map((r: any) => r.follower_id).filter(Boolean);
  console.log('[DEBUG getFollowers] Extracted ids:', ids);
  if (ids.length === 0) return [];
  const { data: profs, error: pErr } = await db.from('profiles_public')
    .select('user_id, name, username, avatar_url, location, bio')
    .in('user_id', ids);
  console.log('[DEBUG getFollowers] profiles_public rows:', profs, 'error:', pErr);
  const byId = new Map<string, any>((profs || []).map((p: any) => [p.user_id, p]));
  const final = ids.map((id: string) => byId.get(id)).filter(Boolean).map(profileRowToEntry);
  console.log('[DEBUG getFollowers] final mapped array:', final);
  return final;
};

/** Lista pessoas que o usuário informado SEGUE. */
export const getFollowing = async (profileUserId: string): Promise<FollowListEntry[]> => {
  if (!profileUserId) return [];
  const { data: rows, error } = await db.from('profile_follows')
    .select('following_id')
    .eq('follower_id', profileUserId)
    .order('created_at', { ascending: false });
  console.log('[DEBUG getFollowing] profile_follows rows:', rows, 'error:', error);
  if (error) { console.error('[social] getFollowing', error); return []; }
  const ids = (rows || []).map((r: any) => r.following_id).filter(Boolean);
  console.log('[DEBUG getFollowing] Extracted ids:', ids);
  if (ids.length === 0) return [];
  const { data: profs, error: pErr } = await db.from('profiles_public')
    .select('user_id, name, username, avatar_url, location, bio')
    .in('user_id', ids);
  console.log('[DEBUG getFollowing] profiles_public rows:', profs, 'error:', pErr);
  const byId = new Map<string, any>((profs || []).map((p: any) => [p.user_id, p]));
  const final = ids.map((id: string) => byId.get(id)).filter(Boolean).map(profileRowToEntry);
  console.log('[DEBUG getFollowing] final mapped array:', final);
  return final;
};

/**
 * Remove um seguidor do MEU perfil (só funciona se eu for o usuário sendo seguido).
 * Internamente apaga a linha onde o outro me segue.
 */
export const removeFollower = async (followerUserId: string) => {
  const currentUserId = await getAuthUserId();
  if (!currentUserId) throw new Error('Faça login para continuar');
  const { error } = await db.from('profile_follows')
    .delete()
    .eq('follower_id', followerUserId)
    .eq('following_id', currentUserId);
  if (error) throw error;
};

/** Quais dos `userIds` o usuário logado já segue. Retorna um Set com os ids. */
export const getMyFollowingSet = async (userIds: string[]): Promise<Set<string>> => {
  const me = await getAuthUserId();
  if (!me || userIds.length === 0) return new Set();
  const { data } = await db.from('profile_follows')
    .select('following_id')
    .eq('follower_id', me)
    .in('following_id', userIds);
  return new Set((data || []).map((r: any) => r.following_id));
};