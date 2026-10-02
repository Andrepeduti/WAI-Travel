import { supabase } from '@/integrations/supabase/client';

/**
 * Mini descrição do destino (país) para a tela "Destinos em alta".
 * Lê do banco; se o país ainda não tiver descrição, pede à edge function
 * `destination-description`, que gera com o Gemini e salva para todos.
 * Falha na geração lança erro (não fica em cache como "sem descrição"), para que
 * a próxima abertura da tela tente de novo.
 */
export async function getDestinationDescription(country: string): Promise<string | null> {
  const name = country.trim();
  if (!name) return null;

  const { data: cached, error } = await supabase
    .from('destination_descriptions')
    .select('description')
    .eq('country', name)
    .maybeSingle();
  if (!error && cached?.description) return cached.description as string;

  const { data, error: fnError } = await supabase.functions.invoke('destination-description', {
    body: { country: name },
  });
  if (fnError) {
    console.error('[destinationDescriptions] generate failed', fnError);
    throw fnError;
  }
  return (data?.description as string | undefined) ?? null;
}
