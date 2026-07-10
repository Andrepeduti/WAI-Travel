import { useEffect, useState } from 'react';
import {
  resolveCoverImage,
  GENERIC_TRAVEL_PLACEHOLDER,
  type CoverImageResult,
} from '@/lib/coverImageResolver';
import { searchGooglePlacesText } from '@/lib/googlePlacesApi';

const wikiCache = new Map<string, string>();

/**
 * Busca uma imagem representativa da cidade/país via Wikipedia REST API.
 * Funciona para qualquer destino do mundo.
 */
async function fetchWikipediaImage(query: string, signal: AbortSignal): Promise<string | null> {
  const cacheKey = query.toLowerCase().trim();
  if (wikiCache.has(cacheKey)) return wikiCache.get(cacheKey)!;

  // Tenta primeiro PT, depois EN
  const langs = ['pt', 'en'];
  for (const lang of langs) {
    try {
      const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
      const res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
      if (!res.ok) continue;
      const data = await res.json();
      const img: string | undefined =
        data?.originalimage?.source || data?.thumbnail?.source;
      if (img) {
        wikiCache.set(cacheKey, img);
        return img;
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return null;
    }
  }
  return null;
}

/**
 * Hook que resolve a capa do roteiro com base nos destinos.
 * - Usa primeiro o mapa local de imagens (cidades/países conhecidos).
 * - Se cair no placeholder genérico, busca dinamicamente na Wikipedia
 *   a imagem da cidade escolhida (qualquer cidade do mundo).
 */
export function useDestinationCover(destinations: string[]): CoverImageResult {
  const initial = resolveCoverImage(destinations);
  const [cover, setCover] = useState<CoverImageResult>(initial);

  useEffect(() => {
    const local = resolveCoverImage(destinations);
    setCover(local);

    // Só busca remoto se caiu no placeholder genérico e existe destino
    if (
      local.url !== GENERIC_TRAVEL_PLACEHOLDER ||
      !destinations ||
      destinations.length === 0
    ) {
      return;
    }

    const ctrl = new AbortController();
    const first = destinations[0];
    const [cityRaw, countryRaw] = first.split(',').map((s) => s.trim());

    (async () => {
      // Tenta cidade (mais específico) e depois "Cidade, País"
      const candidates = [
        cityRaw,
        countryRaw ? `${cityRaw}, ${countryRaw}` : null,
        countryRaw,
      ].filter(Boolean) as string[];

      for (const candidate of candidates) {
        // Tenta Google Places primeiro para fotos mais turísticas e bonitas
        try {
          const places = await searchGooglePlacesText(`${candidate} tourist destination`);
          if (places && places.length > 0 && places[0].photoUrl) {
            if (ctrl.signal.aborted) return;
            setCover({ url: places[0].photoUrl, isAutoSelected: true });
            return;
          }
        } catch (err) {
          // Fallback silencioso
        }

        // Fallback para Wikipedia se Google Places falhar
        const img = await fetchWikipediaImage(candidate, ctrl.signal);
        if (ctrl.signal.aborted) return;
        if (img) {
          setCover({ url: img, isAutoSelected: true });
          return;
        }
      }
    })();

    return () => ctrl.abort();
  }, [destinations.join('|')]);

  return cover;
}
