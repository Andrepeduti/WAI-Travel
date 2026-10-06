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
export async function getVisitedCountries(userId: string): Promise<{ country_code: string, year: number | null }[]> {
  if (!userId) return [];
  const { data, error } = await supabase
    .from('visited_countries')
    .select('country_code, year')
    .eq('user_id', userId);

  if (error) {
    console.error('[passportApi] getVisitedCountries error:', error);
    return [];
  }

  return data || [];
}

/**
 * Retorna os países visitados mapeados para a interface CountryVisit.
 */
export async function getFullPassport(userId: string): Promise<CountryVisit[]> {
  const codes = await getVisitedCountries(userId);
  const visits: CountryVisit[] = [];

  codes.forEach(row => {
    const info = ALL_COUNTRIES.find(c => c.code === row.country_code);
    if (info) {
      visits.push({
        code: info.code,
        name: info.name,
        flag: info.flag,
        year: row.year || new Date().getFullYear(),
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
export async function addVisitedCountries(countries: { code: string, year: number }[]): Promise<boolean> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData?.user) return false;

  const userId = authData.user.id;
  const inserts = countries.map(c => ({ user_id: userId, country_code: c.code, year: c.year }));

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
