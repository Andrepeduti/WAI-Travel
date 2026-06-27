import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Centralized "current user" backed by the `profiles` table in Lovable Cloud.
 * One row per authenticated user — created automatically on signup via the
 * `handle_new_user` trigger. Edits go straight to the database and are
 * synchronized across devices.
 */

export interface CurrentUser {
  name: string;
  username: string;
  location: string;
  avatar: string;
  bio: string;
  website: string;
  instagram: string;
  tiktok: string;
  youtube: string;
  email: string;
  phone: string;
  interests: string[];
  birthdate: string;
  followers: number;
  following: number;
}

const DEFAULT_USER: CurrentUser = {
  name: '',
  username: '',
  location: '',
  avatar: '',
  bio: '',
  website: '',
  instagram: '',
  tiktok: '',
  youtube: '',
  email: '',
  phone: '',
  interests: [],
  birthdate: '',
  followers: 0,
  following: 0,
};

interface ProfileRow {
  name: string;
  username: string | null;
  location: string;
  avatar_url: string;
  bio: string;
  website: string;
  instagram: string;
  tiktok: string;
  youtube: string;
  email: string;
  phone: string;
  interests: string[];
  birthdate: string;
  followers_count: number;
  following_count: number;
}

function rowToUser(row: ProfileRow): CurrentUser {
  return {
    name: row.name ?? '',
    username: row.username ?? '',
    location: row.location ?? '',
    avatar: row.avatar_url ?? '',
    bio: row.bio ?? '',
    website: row.website ?? '',
    instagram: row.instagram ?? '',
    tiktok: row.tiktok ?? '',
    youtube: row.youtube ?? '',
    email: row.email ?? '',
    phone: row.phone ?? '',
    interests: row.interests ?? [],
    birthdate: row.birthdate ?? '',
    followers: row.followers_count ?? 0,
    following: row.following_count ?? 0,
  };
}

function userToRow(patch: Partial<CurrentUser>): Partial<ProfileRow> {
  const row: Partial<ProfileRow> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.username !== undefined) row.username = patch.username;
  if (patch.location !== undefined) row.location = patch.location;
  if (patch.avatar !== undefined) row.avatar_url = patch.avatar;
  if (patch.bio !== undefined) row.bio = patch.bio;
  if (patch.website !== undefined) row.website = patch.website;
  if (patch.instagram !== undefined) row.instagram = patch.instagram;
  if (patch.tiktok !== undefined) row.tiktok = patch.tiktok;
  if (patch.youtube !== undefined) row.youtube = patch.youtube;
  if (patch.email !== undefined) row.email = patch.email;
  if (patch.phone !== undefined) row.phone = patch.phone;
  if (patch.interests !== undefined) row.interests = patch.interests;
  if (patch.birthdate !== undefined) row.birthdate = patch.birthdate;
  if (patch.followers !== undefined) row.followers_count = patch.followers;
  if (patch.following !== undefined) row.following_count = patch.following;
  return row;
}

export function useCurrentUser(): {
  user: CurrentUser;
  update: (patch: Partial<CurrentUser>) => Promise<void>;
  refresh: () => Promise<void>;
  loading: boolean;
} {
  const { user: authUser, loading: authLoading } = useAuth();
  const [user, setUser] = useState<CurrentUser>(DEFAULT_USER);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('name, username, location, avatar_url, bio, website, instagram, tiktok, youtube, email, phone, interests, birthdate, followers_count, following_count')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) {
      console.error('[useCurrentUser] fetch error:', error);
      return;
    }
    if (data) setUser(rowToUser(data as ProfileRow));
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!authUser) {
      setUser(DEFAULT_USER);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchProfile(authUser.id).finally(() => setLoading(false));

    // Realtime: keep this user in sync across tabs/devices.
    // Channel name must be unique per hook instance — multiple components may
    // mount this hook simultaneously, and Supabase rejects re-subscribing to
    // an already-subscribed channel name.
    const channel = supabase
      .channel(`profile:${authUser.id}:${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `user_id=eq.${authUser.id}` },
        (payload) => {
          if (payload.new) setUser(rowToUser(payload.new as ProfileRow));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authUser, authLoading, fetchProfile]);

  const update = useCallback(
    async (patch: Partial<CurrentUser>) => {
      if (!authUser) return;
      const row = userToRow(patch);
      // Optimistic
      setUser((prev) => ({ ...prev, ...patch }));
      const { error } = await supabase
        .from('profiles')
        .update(row)
        .eq('user_id', authUser.id);
      if (error) {
        console.error('[useCurrentUser] update error:', error);
        // Re-sync from server on failure
        fetchProfile(authUser.id);
        throw error;
      }
      // Re-fetch to ensure UI is in sync with the database (in case realtime
      // is delayed or this hook instance isn't subscribed yet).
      fetchProfile(authUser.id);
    },
    [authUser, fetchProfile]
  );

  const refresh = useCallback(async () => {
    if (!authUser) return;
    await fetchProfile(authUser.id);
  }, [authUser, fetchProfile]);

  return { user, update, refresh, loading };
}
