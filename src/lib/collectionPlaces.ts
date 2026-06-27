import { collectionsListKey, collectionsDataKey, readJSON, writeJSON } from '@/lib/userScopedStorage';

export interface AddablePlace {
  name: string;
  image?: string;
  category?: string;
  rating?: number;
  location?: string;
}

export interface ImportedVideoRecord {
  id: number;
  link?: string;
  platform: 'youtube' | 'tiktok' | 'instagram' | 'gallery' | 'other';
  title: string;
  thumbnail: string;
  sourceLabel: string;
  sourceIcon: string;
  createdAt: number;
}

/**
 * Deriva metadados de vídeo a partir do link (YouTube / TikTok / Instagram).
 */
export function buildImportedVideoFromLink(
  link: string,
  fallbackThumbnail: string,
  fallbackTitle: string,
): ImportedVideoRecord {
  const trimmed = link.trim();
  const ytMatch = trimmed.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) {
    return {
      id: Date.now(),
      link: trimmed,
      platform: 'youtube',
      title: fallbackTitle,
      thumbnail: `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`,
      sourceLabel: 'YouTube',
      sourceIcon: 'play_arrow',
      createdAt: Date.now(),
    };
  }
  if (trimmed.includes('tiktok.com')) {
    return {
      id: Date.now(),
      link: trimmed,
      platform: 'tiktok',
      title: fallbackTitle,
      thumbnail: fallbackThumbnail,
      sourceLabel: 'TikTok',
      sourceIcon: 'music_note',
      createdAt: Date.now(),
    };
  }
  if (trimmed.includes('instagram.com')) {
    return {
      id: Date.now(),
      link: trimmed,
      platform: 'instagram',
      title: fallbackTitle,
      thumbnail: fallbackThumbnail,
      sourceLabel: 'Instagram',
      sourceIcon: 'photo_camera',
      createdAt: Date.now(),
    };
  }
  return {
    id: Date.now(),
    link: trimmed,
    platform: 'other',
    title: fallbackTitle,
    thumbnail: fallbackThumbnail,
    sourceLabel: 'Vídeo',
    sourceIcon: 'videocam',
    createdAt: Date.now(),
  };
}

/**
 * Adds one or more places to a collection (by collection id), persists them
 * in localStorage and updates the collection metadata (itemCount + cover images).
 * Skips duplicates by name.
 *
 * If `sourceLink` is provided, marks each newly added place with `videoLink`
 * so the place detail can show the source video.
 */
export function addPlacesToCollection(
  collectionId: number,
  places: AddablePlace[],
  sourceLink?: string,
) {
  try {
    const dataKey = collectionsDataKey();
    const listKey = collectionsListKey();
    if (!dataKey || !listKey) return;

    const all = readJSON<Record<number, { places: any[]; folders: any[]; videos?: ImportedVideoRecord[] }>>(dataKey, {});
    const data = all[collectionId] ?? { places: [], folders: [], videos: [] };

    const norm = (s: string) => (s ?? '').trim().toLowerCase();
    const existingNames = new Set<string>(data.places.map((p: any) => norm(p.name)));

    let addedCount = 0;
    for (const place of places) {
      const key = norm(place.name);
      if (!key || existingNames.has(key)) continue;
      existingNames.add(key);
      data.places.push({
        id: Date.now() + Math.floor(Math.random() * 1000),
        name: place.name,
        rating: place.rating ?? 0,
        reviewCount: '–',
        address: place.location ?? '',
        category: place.category ?? '',
        image: place.image ?? '',
        lat: 0,
        lng: 0,
        ...(sourceLink ? { videoLink: sourceLink } : {}),
      });
      addedCount += 1;
    }

    all[collectionId] = data;
    writeJSON(dataKey, all);

    // Update collection metadata (itemCount + up to 4 cover images)
    const cols = readJSON<any[]>(listKey, []);
    const col = cols.find((c: any) => c.id === collectionId);
    if (col) {
      col.itemCount = data.places.length;
      col.images = col.images || [];
      for (const place of places) {
        if (place.image && col.images.length < 4 && !col.images.includes(place.image)) {
          col.images.push(place.image);
        }
      }
      writeJSON(listKey, cols);
    }

    const skippedCount = places.length - addedCount;

    // Notify any open CollectionDetailScreen / TripsScreen to refresh
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('collection:updated', {
        detail: { collectionId, addedCount, skippedCount },
      }));
    }

    return addedCount;
  } catch {
    return 0;
  }
}

/**
 * Anexa um vídeo importado à coleção (lista de "Referências"). Evita duplicar
 * pelo `link` (quando houver) — caso contrário, sempre acrescenta.
 */
export function addImportedVideoToCollection(
  collectionId: number,
  video: ImportedVideoRecord,
) {
  try {
    const dataKey = collectionsDataKey();
    if (!dataKey) return;
    const all = readJSON<Record<number, { places: any[]; folders: any[]; videos?: ImportedVideoRecord[] }>>(dataKey, {});
    const data = all[collectionId] ?? { places: [], folders: [], videos: [] };
    const videos = data.videos ?? [];
    const dup = video.link ? videos.some(v => v.link && v.link === video.link) : false;
    if (!dup) videos.unshift(video);
    data.videos = videos;
    all[collectionId] = data;
    writeJSON(dataKey, all);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('collection:updated', { detail: { collectionId } }));
    }
  } catch {
    // noop
  }
}
