import { supabase } from '@/integrations/supabase/client';
import { ALL_COUNTRIES } from '@/data/countriesCatalog';
import { CountryVisit } from '@/data/visitedCountries';

export const PASSPORT_CHANGED_EVENT = 'passport:changed';

export function emitPassportChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(PASSPORT_CHANGED_EVENT));
}

/**
 * Retorna a lista de códigos de países visitados por um usuário.
 */
export async function getVisitedCountries(userId: string): Promise<string[]> {
  if (!userId) return [];
  const { data, error } = await supabase
    .from('visited_countries')
    .select('country_code')
    .eq('user_id', userId);

  if (error) {
    console.error('[passportApi] getVisitedCountries error:', error);
    return [];
  }

  return data.map(d => d.country_code);
}

/**
 * Retorna os países visitados mapeados para a interface CountryVisit.
 */
export async function getFullPassport(userId: string): Promise<CountryVisit[]> {
  const codes = await getVisitedCountries(userId);
  const visits: CountryVisit[] = [];
  
  codes.forEach(code => {
    const info = ALL_COUNTRIES.find(c => c.code === code);
    if (info) {
      visits.push({
        code: info.code,
        name: info.name,
        flag: info.flag,
        year: new Date().getFullYear(),
        continent: info.continent,
        cities: [],
        days: 1,
        dateRange: '',
        lat: info.lat || 0,
        lng: info.lng || 0,
        photos: []
      });
    }
  });

  return visits;
}

/**
 * Adiciona uma lista de países ao passaporte do usuário logado.
 */
export async function addVisitedCountries(countryCodes: string[]): Promise<boolean> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData?.user) return false;

  const userId = authData.user.id;
  const inserts = countryCodes.map(code => ({ user_id: userId, country_code: code }));

  // upsert on conflict para evitar erro se o usuário já tiver o país
  const { error } = await supabase
    .from('visited_countries')
    .upsert(inserts, { onConflict: 'user_id,country_code' });

  if (error) {
    console.error('[passportApi] addVisitedCountries error:', error);
    return false;
  }

  emitPassportChanged();
  return true;
}

/**
 * Remove um país do passaporte do usuário logado.
 */
export async function removeVisitedCountry(countryCode: string): Promise<boolean> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData?.user) return false;

  const userId = authData.user.id;

  const { error } = await supabase
    .from('visited_countries')
    .delete()
    .eq('user_id', userId)
    .eq('country_code', countryCode);

  if (error) {
    console.error('[passportApi] removeVisitedCountry error:', error);
    return false;
  }

  emitPassportChanged();
  return true;
}

/**
 * Busca quais amigos (pessoas que o usuário atual segue) visitaram os países passados como argumento.
 * Retorna um objeto mapeando country_code -> lista de perfis.
 */
export async function getFriendsWhoVisited(countryCodes: string[]): Promise<Record<string, { user_id: string; avatar: string; name: string }[]>> {
  if (!countryCodes.length) return {};
  
  const { data: authData } = await supabase.auth.getUser();
  if (!authData?.user) return {};

  // 1. Pegar quem o usuário atual segue
  const { data: followsData, error: followsError } = await supabase
    .from('profile_follows')
    .select('following_id')
    .eq('follower_id', authData.user.id);
    
  if (followsError || !followsData?.length) return {};
  
  const followingIds = followsData.map(f => f.following_id);

  // 2. Pegar as visitas dessas pessoas para os países solicitados
  const { data: visitsData, error: visitsError } = await supabase
    .from('visited_countries')
    .select('country_code, user_id')
    .in('country_code', countryCodes)
    .in('user_id', followingIds);

  if (visitsError || !visitsData || visitsData.length === 0) return {};

  const userIdsWithVisits = Array.from(new Set(visitsData.map(v => v.user_id)));

  // 3. Pegar os perfis dos amigos que visitaram
  const { data: profilesData, error: profilesError } = await supabase
    .from('profiles_public')
    .select('user_id, name, username, avatar_url')
    .in('user_id', userIdsWithVisits);

  if (profilesError || !profilesData) return {};

  const profileMap: Record<string, any> = {};
  profilesData.forEach(p => {
    profileMap[p.user_id] = p;
  });

  const result: Record<string, any[]> = {};
  
  visitsData.forEach(visit => {
    if (!result[visit.country_code]) {
      result[visit.country_code] = [];
    }
    const profile = profileMap[visit.user_id];
    if (profile) {
      result[visit.country_code].push({
        user_id: visit.user_id,
        avatar: profile.avatar_url || 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=100',
        name: profile.name || profile.username || 'Viajante'
      });
    }
  });

  return result;
}
