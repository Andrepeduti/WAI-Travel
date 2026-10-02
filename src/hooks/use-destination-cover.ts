import { useEffect, useState } from 'react';
import {
  resolveCoverImage,
  GENERIC_TRAVEL_PLACEHOLDER,
  type CoverImageResult,
} from '@/lib/coverImageResolver';
import { searchGooglePlacesText } from '@/lib/googlePlacesApi';
import { canCallApi, incrementApiCounter } from '@/lib/placesCache';
import { getCityByName, upsertCity } from '@/lib/citiesCache';

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
 * Prioridade otimizada para custos:
 *   1. Mapa local de imagens (cidades/países conhecidos) — gratuito
 *   2. Cache no banco de dados (tabela places) — gratuito
 *   3. Wikipedia — gratuito
 *   4. Google Places — último recurso (caro)
 */
export function useDestinationCover(destinations: string[]): CoverImageResult {
  const initial = resolveCoverImage(destinations);
  const [cover, setCover] = useState<CoverImageResult>(initial);

  useEffect(() => {
    const local = resolveCoverImage(destinations);

    // Só busca remoto se caiu no placeholder genérico e existe destino
    if (
      local.url !== GENERIC_TRAVEL_PLACEHOLDER ||
      !destinations ||
      destinations.length === 0
    ) {
      setCover(local);
      return;
    }

    // Set loading state initially for the placeholder
    setCover({ ...local, isLoading: true });

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
        // 1. Checa banco de dados primeiro (gratuito)
        try {
          const cached = await getCityByName(candidate);
          if (cached?.cover_photo_url) {
            if (ctrl.signal.aborted) return;
            setCover({ url: cached.cover_photo_url, isAutoSelected: true });
            return;
          }
        } catch {
          // continue to next source
        }

        // 2. Tenta Wikipedia (gratuito)
        const wikiImg = await fetchWikipediaImage(candidate, ctrl.signal);
        if (ctrl.signal.aborted) return;
        if (wikiImg) {
          setCover({ url: wikiImg, isAutoSelected: true });
          // Nunca armazenar foto do wikipedia no banco, apenas usar em tela.
          return;
        }

        // 3. Removido fallback do Google Places para economizar custos.
        // Se o Wikipedia não achar a foto, cai no fallback silencioso final (imagem padrão genérica).
      }
      
      // If it gets here, all attempts failed (Wikipedia didn't find anything)
      if (!ctrl.signal.aborted) {
        setCover(prev => ({ ...prev, isLoading: false }));
      }
    })();

    return () => ctrl.abort();
  }, [destinations.join('|')]);

  return cover;
}
