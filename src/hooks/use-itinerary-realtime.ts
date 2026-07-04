import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Handlers {
  onItineraryChange?: (payload: any) => void;
  onActivitiesChange?: (payload: any) => void;
  onTransportsChange?: (payload: any) => void;
  onReservationsChange?: (payload: any) => void;
  onDocTransportsChange?: (payload: any) => void;
  onMembersChange?: (payload: any) => void;
  onExpensesChange?: (payload: any) => void;
  onNotesChange?: (payload: any) => void;
}

const isUuid = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

/**
 * Abre um único canal Realtime para um roteiro e dispara callbacks
 * quando qualquer participante altera dados em tabelas relacionadas.
 *
 * Usa um ref para os handlers de forma que mudanças em closures não
 * recriem o canal a cada render.
 */
export function useItineraryRealtime(
  itineraryId: string | null | undefined,
  handlers: Handlers,
) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!itineraryId || typeof itineraryId !== 'string' || !isUuid(itineraryId)) return;

    const filter = `itinerary_id=eq.${itineraryId}`;
    const channel = supabase
      .channel(`itinerary:${itineraryId}:${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'itineraries', filter: `id=eq.${itineraryId}` },
        (p) => handlersRef.current.onItineraryChange?.(p),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'itinerary_activities', filter },
        (p) => handlersRef.current.onActivitiesChange?.(p),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'itinerary_transports', filter },
        (p) => handlersRef.current.onTransportsChange?.(p),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'itinerary_reservations', filter },
        (p) => handlersRef.current.onReservationsChange?.(p),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'itinerary_doc_transports', filter },
        (p) => handlersRef.current.onDocTransportsChange?.(p),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'itinerary_members', filter },
        (p) => handlersRef.current.onMembersChange?.(p),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'itinerary_expenses', filter },
        (p) => handlersRef.current.onExpensesChange?.(p),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'itinerary_notes', filter },
        (p) => handlersRef.current.onNotesChange?.(p),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [itineraryId]);
}
