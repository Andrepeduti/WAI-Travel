import { supabase } from '@/integrations/supabase/client';
import type { CityPlace } from '@/data/cityRecommendations';
import { getPlaceByName } from './placesCache';

// Estrutura leve para salvar no perfil do usuário (evita duplicar fotos e coordenadas)
interface UserAiPlaceLight {
  name: string;
  category: string;
  bucket?: string;
  description?: string;
  price?: string;
  openHours?: string;
  suggestedTimeSlot?: string;
}

/**
 * Gets the cached AI recommendations for a specific user and city.
 * Reconstructs the full CityPlace by joining with the global `places` table!
 */
export async function getUserAiRecommendations(city: string): Promise<CityPlace[] | null> {
  const { data: session } = await supabase.auth.getSession();
  if (!session?.session?.user?.id) return null;

  try {
    const { data, error } = await supabase
      .from('user_ai_recommendations')
      .select('places_json')
      .eq('user_id', session.session.user.id)
      .eq('city', city.toLowerCase().trim())
      .maybeSingle();

    if (error || !data || !Array.isArray(data.places_json)) return null;

    const lightPlaces = data.places_json as UserAiPlaceLight[];
    
    // Reconstroi os dados pesados buscando da fonte da verdade (tabela places)
    const reconstructed: CityPlace[] = await Promise.all(
      lightPlaces.map(async (light, idx) => {
        const fullPlace = await getPlaceByName(light.name, city);
        
        return {
          id: 900000 + idx, // fallback id
          name: light.name,
          city: city,
          category: light.category || fullPlace?.category || 'Local',
          categoryColor: '#3B82F6', // O frontend remapeia isso depois
          image: fullPlace?.cover_photo_url || 'https://images.unsplash.com/photo-1503220317375-aaad61436b1b?w=600',
          rating: fullPlace?.rating || 4.8,
          price: light.price || fullPlace?.price || '',
          openHours: light.openHours || fullPlace?.opening_hours || '',
          lat: fullPlace?.latitude || 0,
          lng: fullPlace?.longitude || 0,
          description: light.description || fullPlace?.short_description || undefined,
          address: fullPlace?.formatted_address || undefined,
          bucket: light.bucket,
          suggestedTimeSlot: light.suggestedTimeSlot
        };
      })
    );

    return reconstructed;
  } catch (e) {
    console.warn('Failed to get user AI recommendations:', e);
    return null;
  }
}

/**
 * Saves the AI recommendations for a specific user and city (Lightweight normalized version).
 */
export async function saveUserAiRecommendations(city: string, places: CityPlace[]): Promise<void> {
  const { data: session } = await supabase.auth.getSession();
  if (!session?.session?.user?.id) return;

  try {
    const lightPlaces: UserAiPlaceLight[] = places.map(p => ({
      name: p.name,
      category: p.category,
      bucket: p.bucket,
      description: p.description,
      price: p.price,
      openHours: p.openHours,
      suggestedTimeSlot: p.suggestedTimeSlot
    }));

    await supabase
      .from('user_ai_recommendations')
      .upsert({
        user_id: session.session.user.id,
        city: city.toLowerCase().trim(),
        places_json: lightPlaces
      }, {
        onConflict: 'user_id, city'
      });
  } catch (e) {
    console.warn('Failed to save user AI recommendations:', e);
  }
}
