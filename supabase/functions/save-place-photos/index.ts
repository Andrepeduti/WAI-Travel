// Supabase Edge Function: save-place-photos
// Baixa fotos do Google Places (server-side) e salva no Storage (bucket place-photos),
// devolvendo URLs públicas permanentes. Evita pagar Place Photos a cada exibição.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const PHOTO_NAME_RE = /^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/;
const PLACE_ID_RE = /^[A-Za-z0-9_-]{5,200}$/;
const MAX_PHOTOS = 6;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // Chave de servidor (sem restrição de HTTP referrer, restrita apenas à Places API)
    const googleKey = Deno.env.get('GOOGLE_PLACES_SERVER_KEY');
    if (!googleKey) return json({ error: 'GOOGLE_PLACES_SERVER_KEY não configurada.' }, 500);

    const { googlePlaceId, photoNames } = await req.json();
    if (typeof googlePlaceId !== 'string' || !PLACE_ID_RE.test(googlePlaceId)) {
      return json({ error: 'googlePlaceId inválido.' }, 400);
    }
    const names: string[] = (Array.isArray(photoNames) ? photoNames : [])
      .filter((n: unknown): n is string => typeof n === 'string' && PHOTO_NAME_RE.test(n))
      .slice(0, MAX_PHOTOS);
    if (names.length === 0) return json({ urls: [] });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const results = await Promise.all(
      names.map(async (name, index) => {
        try {
          const res = await fetch(
            `https://places.googleapis.com/v1/${name}/media?maxHeightPx=1200&maxWidthPx=1200&key=${googleKey}`,
            { redirect: 'follow' },
          );
          if (!res.ok) {
            console.warn('[save-place-photos] Google photo fetch failed', res.status, name);
            return null;
          }
          const contentType = res.headers.get('content-type') || 'image/jpeg';
          const bytes = new Uint8Array(await res.arrayBuffer());
          const ext = contentType.includes('png') ? 'png' : 'jpg';
          const path = `${googlePlaceId}/${index}.${ext}`;

          const { error } = await supabase.storage
            .from('place-photos')
            .upload(path, bytes, { contentType, upsert: true });
          if (error) {
            console.warn('[save-place-photos] upload error', error.message);
            return null;
          }
          return supabase.storage.from('place-photos').getPublicUrl(path).data.publicUrl;
        } catch (e) {
          console.warn('[save-place-photos] photo error', e);
          return null;
        }
      }),
    );

    return json({ urls: results.filter((u): u is string => !!u) });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
