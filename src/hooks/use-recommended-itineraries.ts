/**
 * useRecommendedItineraries
 *
 * Algoritmo de recomendação personalizada para "Seu próximo destino ideal".
 *
 * Sinais usados:
 *   AFINIDADE
 *     +5  destino na lista de desejos (localStorage)
 *     +4  destino pesquisado recentemente (localStorage)
 *     +3  por interesse (tag) em comum com perfil
 *     +3  tag/criador em comum com favoritos
 *     +2  mesmo criador de um roteiro salvo
 *
 *   QUALIDADE
 *     +5  roteiro completo (descrição longa + preço + locais)
 *     +3  atualizado nos últimos 90 dias
 *     +2  criador com boa reputação (avg rating ≥ 4 e ≥ 2 roteiros)
 *
 *   POPULARIDADE (normalizado 0–N max)
 *     +5  compras
 *     +3  salvamentos
 *
 *   PENALIDADES
 *     −5  todos os destinos já visitados
 *     −3  não atualizado há mais de 1 ano
 *     −2  avaliação média < 3.0
 *
 *   DESEMPATE: score → compras → avg_rating → updated_at
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { listPublicItineraries, type PublicItinerarySearchRow } from '@/lib/itinerariesApi';
import { resolveCoverImage } from '@/lib/coverImageResolver';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RecommendedItinerary {
    /** UUID do roteiro no banco */
    itineraryId: string;
    /** ID numérico do dataset estático (pode ser null para roteiros puramente do banco) */
    sourceDatasetId: number | null;
    title: string;
    image: string;
    rating: number;
    places: number;
    /** Duração em dias derivada de start_date / end_date */
    days: number;
    author: string;
    authorImage: string;
    /** Preço em R$ (cents / 100) */
    price: number;
    category: string;
    /** Score total calculado pelo algoritmo */
    score: number;
    /** Quantas compras o roteiro tem */
    salesCount: number;
    destinations: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const norm = (s: string) => s.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/** Extrai keywords de destino para comparação */
function destKeywords(destinations: string[]): string[] {
    const kws: string[] = [];
    for (const d of destinations) {
        for (const part of d.split(',')) {
            const k = norm(part.trim());
            if (k) kws.push(k);
        }
    }
    return kws;
}

/** Lê dream trips do localStorage */
function readDreamDestinations(): string[] {
    try {
        const raw = localStorage.getItem('wai-travel-dream-trips');
        if (!raw) return [];
        const trips = JSON.parse(raw) as { destination?: string }[];
        return trips.map(t => norm(t.destination || '')).filter(Boolean);
    } catch { return []; }
}

/** Lê pesquisas recentes do localStorage */
function readRecentSearches(): string[] {
    try {
        // Tenta as duas chaves mais comuns de histórico de busca
        const raw = localStorage.getItem('wai-travel-recent-searches')
            ?? localStorage.getItem('wai-search-history');
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            return parsed.map((s: unknown) => norm(typeof s === 'string' ? s : (s as any)?.query || '')).filter(Boolean);
        }
        return [];
    } catch { return []; }
}

/** Normaliza pontuação de popularidade para intervalo 0–maxPts */
function normalizeCount(count: number, maxCount: number, maxPts: number): number {
    if (maxCount <= 0 || count <= 0) return 0;
    return Math.round((count / maxCount) * maxPts);
}

/** Calcula duração em dias a partir de datas ISO */
function calcDays(startDate: string, endDate: string): number {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diff = Math.round((end.getTime() - start.getTime()) / 86_400_000);
    return Math.max(1, diff + 1);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useRecommendedItineraries(limit = 10) {
    const [itineraries, setItineraries] = useState<RecommendedItinerary[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            setLoading(true);
            try {
                // ── 1. Dados do usuário (paralelo) ────────────────────────────────────
                const { data: { user: authUser } } = await supabase.auth.getUser();
                const userId = authUser?.id ?? null;

                const [
                    publicItineraries,
                    salesRows,
                    favoritesCountRows,
                    userFavoritesRows,
                    reviewsRows,
                    visitedCountriesRows,
                    profileRow,
                    creatorItinCountRows,
                ] = await Promise.all([
                    // Lista base de roteiros públicos (inclui updated_at via cast any)
                    listPublicItineraries(500),

                    // Contagem de vendas por roteiro
                    supabase
                        .from('itinerary_sales')
                        .select('itinerary_id')
                        .then(({ data }) => data ?? []),

                    // Contagem de salvamentos por roteiro (todos os usuários)
                    supabase
                        .from('favorites')
                        .select('itinerary_id')
                        .then(({ data }) => data ?? []),

                    // Favoritos do próprio usuário (snapshot com creator e tags)
                    userId
                        ? supabase
                            .from('favorites')
                            .select('itinerary_id, legacy_id, snapshot')
                            .eq('user_id', userId)
                            .then(({ data }) => data ?? [])
                        : Promise.resolve([]),

                    // Média de avaliação por roteiro
                    supabase
                        .from('itinerary_reviews')
                        .select('itinerary_id, rating')
                        .then(({ data }) => data ?? []),

                    // Países visitados pelo usuário
                    userId
                        ? supabase
                            .from('visited_countries')
                            .select('country_code')
                            .eq('user_id', userId)
                            .then(({ data }) => data ?? [])
                        : Promise.resolve([]),

                    // Interesses do perfil
                    userId
                        ? supabase
                            .from('profiles')
                            .select('interests')
                            .eq('user_id', userId)
                            .maybeSingle()
                            .then(({ data }) => data)
                        : Promise.resolve(null),

                    // Contagem de roteiros por criador (para reputação)
                    supabase
                        .from('itineraries')
                        .select('user_id, id')
                        .eq('is_public', true)
                        .then(({ data }) => data ?? []),
                ]);

                if (cancelled) return;

                // ── 2. Preparar mapas de lookup ──────────────────────────────────────

                // Vendas por roteiro
                const salesByItinerary = new Map<string, number>();
                for (const row of salesRows as { itinerary_id: string }[]) {
                    salesByItinerary.set(row.itinerary_id, (salesByItinerary.get(row.itinerary_id) ?? 0) + 1);
                }
                const maxSales = Math.max(0, ...salesByItinerary.values());

                // Salvamentos por roteiro
                const savesByItinerary = new Map<string, number>();
                for (const row of favoritesCountRows as { itinerary_id: string }[]) {
                    savesByItinerary.set(row.itinerary_id, (savesByItinerary.get(row.itinerary_id) ?? 0) + 1);
                }
                const maxSaves = Math.max(0, ...savesByItinerary.values());

                // Avaliação média por roteiro
                const ratingSum = new Map<string, { sum: number; count: number }>();
                for (const row of reviewsRows as { itinerary_id: string; rating: number }[]) {
                    const cur = ratingSum.get(row.itinerary_id) ?? { sum: 0, count: 0 };
                    cur.sum += row.rating;
                    cur.count += 1;
                    ratingSum.set(row.itinerary_id, cur);
                }
                const avgRatingFor = (id: string): number => {
                    const r = ratingSum.get(id);
                    return r && r.count > 0 ? r.sum / r.count : 0;
                };

                // Países visitados (conjunto de códigos)
                const visitedCodes = new Set(
                    (visitedCountriesRows as { country_code: string }[]).map(r => norm(r.country_code))
                );

                // Interesses do usuário
                const userInterests: string[] = Array.isArray(profileRow?.interests)
                    ? (profileRow!.interests as string[]).map(norm)
                    : [];

                // Creator itinerary count (para reputação: ≥ 2 roteiros publicados)
                const creatorItinCount = new Map<string, number>();
                for (const row of creatorItinCountRows as { user_id: string }[]) {
                    creatorItinCount.set(row.user_id, (creatorItinCount.get(row.user_id) ?? 0) + 1);
                }

                // Avaliação média por criador (media das avaliações de TODOS os roteiros dele)
                const creatorRatingSum = new Map<string, { sum: number; count: number }>();
                for (const row of publicItineraries) {
                    const itinRating = ratingSum.get(row.id);
                    if (itinRating && itinRating.count > 0) {
                        const cur = creatorRatingSum.get(row.userId) ?? { sum: 0, count: 0 };
                        cur.sum += itinRating.sum;
                        cur.count += itinRating.count;
                        creatorRatingSum.set(row.userId, cur);
                    }
                }
                const creatorAvgRating = (creatorId: string): number => {
                    const r = creatorRatingSum.get(creatorId);
                    return r && r.count > 0 ? r.sum / r.count : 0;
                };

                // Favoritos do usuário: creator names e tags
                const favCreators = new Set<string>();
                const favTags = new Set<string>();
                for (const fav of userFavoritesRows as { snapshot?: { creator?: string;[k: string]: unknown } }[]) {
                    const snap = fav.snapshot ?? {};
                    if (snap.creator) favCreators.add(norm(snap.creator as string));
                }

                // Sinais de localStorage
                const dreamDests = readDreamDestinations();
                const recentSearches = readRecentSearches();

                // ── 3. Scoring ───────────────────────────────────────────────────────

                const scored = publicItineraries.map(itin => {
                    const itinId = itin.id;
                    const updatedAt = itin.updatedAt ?? null;
                    const nowMs = Date.now();
                    const updatedMs = updatedAt ? new Date(updatedAt).getTime() : 0;
                    const daysSinceUpdate = updatedMs > 0 ? (nowMs - updatedMs) / 86_400_000 : Infinity;

                    const itinTags = (itin.tags ?? []).map(norm);
                    const itinDests = destKeywords(itin.destinations ?? []);
                    const itinAuthorNorm = norm(itin.authorName ?? '');
                    const avgRating = avgRatingFor(itinId);
                    const salesCount = salesByItinerary.get(itinId) ?? 0;
                    const savesCount = savesByItinerary.get(itinId) ?? 0;

                    let score = 0;

                    // ── AFINIDADE ────────────────────────────────────────────────
                    // +5 destino na lista de desejos
                    if (dreamDests.some(dd => itinDests.some(d => d.includes(dd) || dd.includes(d)))) {
                        score += 5;
                    }

                    // +4 destino pesquisado recentemente
                    if (recentSearches.some(rs => itinDests.some(d => d.includes(rs) || rs.includes(d)))) {
                        score += 4;
                    }

                    // +3 por cada interesse em comum com tag do roteiro
                    for (const interest of userInterests) {
                        if (itinTags.some(t => t.includes(interest) || interest.includes(t))) {
                            score += 3;
                        }
                    }

                    // +3 similaridade com favoritos salvos (tag ou criador em comum)
                    const hasFavCreatorMatch = favCreators.has(itinAuthorNorm);
                    const hasFavTagMatch = itinTags.some(t => favTags.has(t));
                    if (hasFavCreatorMatch || hasFavTagMatch) score += 3;

                    // +2 mesmo criador de roteiro salvo
                    if (hasFavCreatorMatch) score += 2;

                    // ── QUALIDADE ────────────────────────────────────────────────
                    // +5 roteiro completo (descrição ≥ 100 chars + tem preço + tem locais)
                    const isComplete =
                        (itin.description?.length ?? 0) >= 100 &&
                        (itin.priceCents ?? 0) > 0 &&
                        (itin.places ?? 0) > 0;
                    if (isComplete) score += 5;

                    // +3 atualizado nos últimos 90 dias
                    if (daysSinceUpdate <= 90) score += 3;

                    // +2 criador com boa reputação
                    const itinCount = creatorItinCount.get(itin.userId) ?? 0;
                    if (creatorAvgRating(itin.userId) >= 4 && itinCount >= 2) score += 2;

                    // ── POPULARIDADE ─────────────────────────────────────────────
                    score += normalizeCount(salesCount, maxSales, 5);
                    score += normalizeCount(savesCount, maxSaves, 3);

                    // ── PENALIDADES ──────────────────────────────────────────────
                    // −5 todos os destinos já visitados
                    const allVisited = itinDests.length > 0 &&
                        itinDests.every(d => visitedCodes.has(d));
                    if (allVisited) score -= 5;

                    // −3 não atualizado há mais de 1 ano
                    if (daysSinceUpdate > 365) score -= 3;

                    // −2 avaliação média < 3.0
                    if (avgRating > 0 && avgRating < 3.0) score -= 2;

                    return { itin, score, salesCount, avgRating, updatedMs };
                });

                // ── 4. Ordenação (score → compras → avg_rating → updated_at) ─────────
                scored.sort((a, b) => {
                    if (b.score !== a.score) return b.score - a.score;
                    if (b.salesCount !== a.salesCount) return b.salesCount - a.salesCount;
                    if (b.avgRating !== a.avgRating) return b.avgRating - a.avgRating;
                    return b.updatedMs - a.updatedMs;
                });

                // ── 5. Mapear para shape final ────────────────────────────────────────
                const waiLogo = '/__l5e/assets-v1/9cb2fe10-a285-4f17-bbef-f67389a96b37/wai-logo.png';

                const result: RecommendedItinerary[] = scored.slice(0, limit).map(({ itin, score, salesCount }) => {
                    const coverImage = (() => {
                        const raw = itin.images?.[0] ?? '';
                        if (!raw || raw.includes('placeholder')) return resolveCoverImage(itin.destinations).url;
                        return raw;
                    })();

                    const topTag = (itin.tags ?? []).find(t => t !== '_FLEXIBLE_DATES_') ?? '';

                    return {
                        itineraryId: itin.id,
                        sourceDatasetId: itin.sourceDatasetId ?? null,
                        title: itin.title,
                        image: coverImage,
                        rating: avgRatingFor(itin.id),
                        places: itin.places ?? 0,
                        days: calcDays(itin.startDate, itin.endDate),
                        author: itin.authorName || 'WAI',
                        authorImage: itin.authorAvatar || waiLogo,
                        price: itin.priceCents != null ? itin.priceCents / 100 : 0,
                        category: topTag,
                        score,
                        salesCount,
                        destinations: itin.destinations ?? [],
                    };
                });

                if (!cancelled) {
                    setItineraries(result);
                }
            } catch (err) {
                console.error('[useRecommendedItineraries] failed:', err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => { cancelled = true; };
    }, [limit]);

    return { itineraries, loading };
}
