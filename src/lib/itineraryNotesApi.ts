import { supabase } from '@/integrations/supabase/client';
import type { TripNote } from '@/components/screens/TripNotesScreen';

function isUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

/**
 * Carrega as notas de um roteiro.
 */
export async function loadItineraryNotes(itineraryId: string): Promise<TripNote[] | null> {
  if (!isUuid(itineraryId)) return null;

  const { data, error } = await supabase
    .from('itinerary_notes')
    .select('*')
    .eq('itinerary_id', itineraryId)
    .order('position', { ascending: true });

  if (error) {
    console.error('[itineraryNotesApi] load failed', error);
    return null;
  }

  return (data || []).map((row) => ({
    id: row.client_id,
    author: row.author,
    authorImage: row.author_image,
    title: row.title,
    summary: row.summary,
  }));
}

/**
 * Bulk replace: deleta as notas antigas e insere as novas para sincronizar
 * com o estado em memória.
 */
export async function saveItineraryNotes(itineraryId: string, notes: TripNote[]): Promise<void> {
  if (!isUuid(itineraryId)) return;

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return;

  const rows = notes.map((note, index) => ({
    itinerary_id: itineraryId,
    user_id: userId,
    client_id: note.id,
    author: note.author,
    author_image: note.authorImage,
    title: note.title,
    summary: note.summary,
    position: index,
  }));

  const { error: delError } = await supabase
    .from('itinerary_notes')
    .delete()
    .eq('itinerary_id', itineraryId);

  if (delError) {
    console.error('[itineraryNotesApi] delete failed', delError);
  }

  if (rows.length > 0) {
    const { error: insError } = await supabase
      .from('itinerary_notes')
      .insert(rows);

    if (insError) {
      console.error('[itineraryNotesApi] insert failed', insError);
    }
  }
}
