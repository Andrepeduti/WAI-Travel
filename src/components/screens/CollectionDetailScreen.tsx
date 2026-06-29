import { useState, useEffect } from 'react';
import { Icon } from '../ui/Icon';
import { mockPeople, ShareCollectionSheet } from '../travel/ShareCollectionSheet';
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { AddPlaceToCollectionSheet, CollectionPlaceResult } from '../travel/AddPlaceToCollectionSheet';
import { AddPlaceToCollectionSheetV2 } from '../travel/AddPlaceToCollectionSheetV2';
import { AddVideoSheet } from '../travel/AddVideoSheet';
import { AddVideoByLinkSheet } from '../travel/AddVideoByLinkSheet';
import { AddVideoFromGallerySheet } from '../travel/AddVideoFromGallerySheet';
import { CreateFolderSheet } from '../travel/CreateFolderSheet';
import { MoveFolderSheet } from '../travel/MoveFolderSheet';
import { FolderDetailScreen } from './FolderDetailScreen';
import { PlaceMapScreen } from './PlaceMapScreen';
import { CollectionMapScreen } from './CollectionMapScreen';
import { ActivityDetailSheet } from '../travel/ActivityDetailSheet';
import { AddPlaceToItinerarySheet } from '../travel/AddPlaceToItinerarySheet';
import { BackButton } from '@/components/ui/BackButton';
import { toast } from 'sonner';

interface Folder {
  id: string;
  name: string;
  placeIds: number[];
}

import { collectionsListKey, collectionsDataKey, readJSON, writeJSON } from '@/lib/userScopedStorage';

export interface ImportedVideo {
  id: number;
  link?: string;
  platform: 'youtube' | 'tiktok' | 'instagram' | 'gallery' | 'other';
  title: string;
  thumbnail: string;
  sourceLabel: string;
  sourceIcon: string;
  createdAt: number;
}

interface CollectionPayload {
  places: Place[];
  folders: Folder[];
  customTitle?: string;
  sharedWith?: string[];
  videos?: ImportedVideo[];
}

function loadCollectionData(collectionId: number): CollectionPayload {
  const all = readJSON<Record<number, CollectionPayload>>(collectionsDataKey(), {});
  return all[collectionId] ?? { places: [], folders: [], videos: [] };
}

function saveCollectionData(
  collectionId: number,
  places: Place[],
  folders: Folder[],
  customTitle?: string | null,
  sharedWith?: string[],
  videos?: ImportedVideo[],
) {
  const key = collectionsDataKey();
  if (!key) return;
  const all = readJSON<Record<number, CollectionPayload>>(key, {});
  const prev: CollectionPayload | undefined = all[collectionId];
  all[collectionId] = {
    places,
    folders,
    customTitle: customTitle || undefined,
    sharedWith: sharedWith || [],
    videos: videos ?? prev?.videos ?? [],
  };
  writeJSON(key, all);
}

/**
 * Deriva metadados de vídeo a partir do link (YouTube / TikTok / Instagram).
 * Quando o link não puder ser identificado, cai num genérico "Vídeo".
 */
function buildImportedVideoFromLink(
  link: string,
  fallbackThumbnail: string,
  fallbackTitle: string,
): ImportedVideo {
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

interface Place {
  id: number;
  name: string;
  rating: number;
  reviewCount: string;
  address: string;
  category: string;
  image: string;
  lat: number;
  lng: number;
  filter?: string;
  videoLink?: string;
}

interface Collaborator {
  id: number;
  name: string;
  avatar: string;
}

interface FilterTag {
  id: string;
  name: string;
}

interface Collection {
  id: number;
  title: string;
  country: string;
  placesCount: number;
  centerLat: number;
  centerLng: number;
  places: Place[];
  collaborators?: Collaborator[];
}

const mockCollections: Record<number, Collection> = {
  2: {
    id: 2,
    title: 'Paris',
    country: 'France',
    placesCount: 15,
    centerLat: 48.8566,
    centerLng: 2.3522,
    collaborators: [
      { id: 1, name: 'Ana', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100' },
      { id: 2, name: 'Carlos', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100' },
      { id: 3, name: 'Julia', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100' },
    ],
    places: [
      {
        id: 1,
        name: 'Musée d\'Orsay',
        rating: 4.6,
        reviewCount: '12.453',
        address: 'Saint-Germain-des-Prés',
        category: 'Museu',
        image: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=400',
        lat: 48.8600,
        lng: 2.3266,
        filter: 'museus',
      },
      {
        id: 2,
        name: 'Arco do Triunfo',
        rating: 4.6,
        reviewCount: '23.891',
        address: 'Charles de Gaulle',
        category: 'Monumento',
        image: 'https://images.unsplash.com/photo-1509439581779-6298f75bf6e5?w=400',
        lat: 48.8738,
        lng: 2.2950,
        filter: 'monumentos',
      },
      {
        id: 3,
        name: 'Panthéon',
        rating: 4.6,
        reviewCount: '3.421',
        address: 'Quartier Latin',
        category: 'Monumento',
        image: 'https://images.unsplash.com/photo-1550340499-a6c60fc8287c?w=400',
        lat: 48.8462,
        lng: 2.3464,
        filter: 'monumentos',
      },
      {
        id: 4,
        name: 'Torre Eiffel',
        rating: 4.8,
        reviewCount: '8.234',
        address: 'Champ de Mars',
        category: 'Monumento',
        image: 'https://images.unsplash.com/photo-1543349689-9a4d426bee8e?w=400',
        lat: 48.8584,
        lng: 2.2945,
        filter: 'monumentos',
      }
    ]
  },
  3: {
    id: 3,
    title: 'Rio de Janeiro',
    country: 'Brazil',
    placesCount: 8,
    centerLat: -22.9068,
    centerLng: -43.1729,
    places: [
      {
        id: 1,
        name: 'Cristo Redentor',
        rating: 4.9,
        reviewCount: '45.123',
        address: 'Corcovado',
        category: 'Monumento',
        image: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=400',
        lat: -22.9519,
        lng: -43.2105,
        filter: 'monumentos',
      },
      {
        id: 2,
        name: 'Pão de Açúcar',
        rating: 4.8,
        reviewCount: '28.456',
        address: 'Urca',
        category: 'Natureza',
        image: 'https://images.unsplash.com/photo-1516306580123-e6e52b1b7b5f?w=400',
        lat: -22.9492,
        lng: -43.1545,
        filter: 'natureza',
      },
      {
        id: 3,
        name: 'Praia de Copacabana',
        rating: 4.6,
        reviewCount: '15.789',
        address: 'Copacabana',
        category: 'Praia',
        image: 'https://images.unsplash.com/photo-1548963670-aaaa8f73a5e3?w=400',
        lat: -22.9711,
        lng: -43.1822,
        filter: 'praias',
      }
    ]
  }
};

interface CollectionDetailScreenProps {
  collectionId: number;
  collectionName?: string | null;
  sharedWithIds?: string[];
  onBack: () => void;
  onDelete?: () => void;
}

export function CollectionDetailScreen({ collectionId, collectionName, sharedWithIds = [], onBack, onDelete }: CollectionDetailScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [headerSheetOpen, setHeaderSheetOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [fabSheetOpen, setFabSheetOpen] = useState(false);
  const [newFilterSheetOpen, setNewFilterSheetOpen] = useState(false);
  const [newFilterName, setNewFilterName] = useState('');
  const [showSortSheet, setShowSortSheet] = useState(false);
  const [sortBy, setSortBy] = useState<string>('recent');
  const [showAddPlaceSheet, setShowAddPlaceSheet] = useState(false);
  const [showAddPlaceSheetV2, setShowAddPlaceSheetV2] = useState(false);
  const [addedPlaces, setAddedPlaces] = useState<Place[]>(() => loadCollectionData(collectionId).places);
  const [showVideoSheet, setShowVideoSheet] = useState(false);
  const [showVideoByLinkSheet, setShowVideoByLinkSheet] = useState(false);
  const [showVideoFromGallery, setShowVideoFromGallery] = useState(false);
  const [folders, setFolders] = useState<Folder[]>(() => loadCollectionData(collectionId).folders);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [showCreateFolderSheet, setShowCreateFolderSheet] = useState(false);
  const [showMoveFolderSheet, setShowMoveFolderSheet] = useState(false);
  const [pendingMoveAfterCreate, setPendingMoveAfterCreate] = useState(false);
  const [showRenameSheet, setShowRenameSheet] = useState(false);
  const [customTitle, setCustomTitle] = useState<string | null>(() => loadCollectionData(collectionId).customTitle || null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [detailPlace, setDetailPlace] = useState<Place | null>(null);
  const [mapPlace, setMapPlace] = useState<Place | null>(null);
  const [showCollectionMap, setShowCollectionMap] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [shareSelectedIds, setShareSelectedIds] = useState<string[]>(() => loadCollectionData(collectionId).sharedWith || sharedWithIds);
  const [importedVideos, setImportedVideos] = useState<ImportedVideo[]>(() => loadCollectionData(collectionId).videos || []);
  const [showReferencesSheet, setShowReferencesSheet] = useState(false);
  const [showAddToItinerarySheet, setShowAddToItinerarySheet] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedPlaceIds, setSelectedPlaceIds] = useState<number[]>([]);
  const [showMoveMultipleSheet, setShowMoveMultipleSheet] = useState(false);

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedPlaceIds([]);
  };

  const togglePlaceSelected = (placeId: number) => {
    setSelectedPlaceIds(prev =>
      prev.includes(placeId) ? prev.filter(id => id !== placeId) : [...prev, placeId]
    );
  };

  const handleMoveSelectedToFolder = (folderId: string) => {
    if (selectedPlaceIds.length === 0) return;
    const ids = new Set(selectedPlaceIds);
    setFolders(prev => prev.map(f => {
      const cleaned = { ...f, placeIds: safePlaceIds(f).filter(id => !ids.has(id)) };
      if (f.id === folderId) {
        return { ...cleaned, placeIds: [...cleaned.placeIds, ...selectedPlaceIds] };
      }
      return cleaned;
    }));
    const target = folders.find(f => f.id === folderId);
    toast(`${selectedPlaceIds.length} ${selectedPlaceIds.length === 1 ? 'lugar movido' : 'lugares movidos'}${target ? ` para "${target.name}"` : ''}`);
    setShowMoveMultipleSheet(false);
    exitSelectionMode();
  };

  const handleDeletePlace = (place: Place) => {
    const prevPlaces = addedPlaces;
    const prevFolders = folders;
    setAddedPlaces(p => p.filter(x => x.id !== place.id));
    setFolders(fs => fs.map(f => ({ ...f, placeIds: safePlaceIds(f).filter(id => id !== place.id) })));
    toast('Lugar removido da coleção', {
      action: {
        label: 'Desfazer',
        onClick: () => {
          setAddedPlaces(prevPlaces);
          setFolders(prevFolders);
        },
      },
      duration: 5000,
    });
  };
  // Resolve title: customTitle > collectionName prop > UserCollection from storage > fallback
  const resolvedTitle = (() => {
    if (customTitle) return customTitle;
    if (collectionName) return collectionName;
    const cols = readJSON<any[]>(collectionsListKey(), []);
    const found = cols.find((c: any) => c.id === collectionId);
    if (found?.title) return found.title;
    return 'Nova Coleção';
  })();

  const collection = mockCollections[collectionId] || {
    id: collectionId,
    title: resolvedTitle,
    country: '',
    placesCount: 0,
    centerLat: 0,
    centerLng: 0,
    places: [],
  };

  // Persist places, folders, title & imported videos to storage + sync to collection list
  useEffect(() => {
    saveCollectionData(collectionId, addedPlaces, folders, customTitle, shareSelectedIds, importedVideos);
    // Also update the UserCollection record with title & images
    const listKey = collectionsListKey();
    if (!listKey) return;
    const collections = readJSON<any[]>(listKey, []);
    const idx = collections.findIndex((c: any) => c.id === collectionId);
    if (idx !== -1) {
      if (customTitle) collections[idx].title = customTitle;
      const allImages = [...(collection.places || []), ...addedPlaces].map(p => p.image).filter(Boolean);
      if (allImages.length > 0) collections[idx].images = allImages.slice(0, 4);
      collections[idx].itemCount = [...(collection.places || []), ...addedPlaces].length;
      collections[idx].sharedWithIds = shareSelectedIds;
      writeJSON(listKey, collections);
    }
  }, [addedPlaces, folders, collectionId, customTitle, shareSelectedIds, importedVideos]);

  // Recarrega quando outra parte do app (ex: Add via vídeo global) grava nesta coleção
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { collectionId?: number; addedCount?: number; skippedCount?: number } | undefined;
      if (detail?.collectionId !== collectionId) return;
      const data = loadCollectionData(collectionId);
      setAddedPlaces(data.places || []);
      setFolders(data.folders || []);
      setImportedVideos(data.videos || []);
      const skipped = detail?.skippedCount ?? 0;
      if (skipped > 0) {
        toast(`${skipped} ${skipped === 1 ? 'lugar foi ignorado por já existir' : 'lugares foram ignorados por já existirem'} na coleção`);
      }
    };
    window.addEventListener('collection:updated', handler);
    return () => window.removeEventListener('collection:updated', handler);
  }, [collectionId]);

  const allPlaces = [...collection.places, ...addedPlaces];
  const safePlaceIds = (folder?: Folder) => Array.isArray(folder?.placeIds) ? folder.placeIds : [];

  // Vídeos importados recentemente para esta coleção (mais recentes primeiro).
  const recentImportedVideos = [...importedVideos].sort((a, b) => b.createdAt - a.createdAt);

  // Derive filter tags dynamically from place categories
  const dynamicFilters = Array.from(
    new Set(allPlaces.map(p => p.category).filter(Boolean))
  ).map(cat => ({ id: cat.toLowerCase(), name: cat }));

  const allPlaceIdsInFolders = new Set(folders.flatMap(f => safePlaceIds(f)));
  const activeFolder = folders.find(f => f.id === activeFolderId);
  const isSearching = searchQuery.trim().length > 0;
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const matchingFolders = folders.filter(f => !isSearching || (f.name ?? '').toLowerCase().includes(normalizedSearchQuery));
  const basePlaces = isSearching
    ? allPlaces // search across all places including those in folders
    : activeFolderId && activeFolder
      ? allPlaces.filter(p => safePlaceIds(activeFolder).includes(p.id))
      : allPlaces;

  const filteredPlaces = basePlaces.filter(place => {
    const matchesSearch = (place.name ?? '').toLowerCase().includes(normalizedSearchQuery) || (place.address ?? '').toLowerCase().includes(normalizedSearchQuery);
    const matchesFilter = !activeFilter || (place.category ?? '').toLowerCase() === activeFilter;
    return matchesSearch && matchesFilter;
  });

  const handleCreateFolder = (name: string) => {
    const newId = Date.now().toString();
    const newFolder = { id: newId, name, placeIds: [] as number[] };

    if (selectionMode && selectedPlaceIds.length > 0) {
      newFolder.placeIds = [...selectedPlaceIds];
      setFolders(prev => prev.map(f => ({ ...f, placeIds: safePlaceIds(f).filter(id => !selectedPlaceIds.includes(id)) })).concat(newFolder));
      toast(`${selectedPlaceIds.length} ${selectedPlaceIds.length === 1 ? 'lugar movido' : 'lugares movidos'} para "${name}"`);
      setShowMoveMultipleSheet(false);
      exitSelectionMode();
      return;
    }

    if (pendingMoveAfterCreate && selectedPlace) {
      newFolder.placeIds = [selectedPlace.id];
      setPendingMoveAfterCreate(false);
      setSheetOpen(false);
    }

    setFolders(prev => [...prev, newFolder]);
  };

  const handleMoveToFolder = (folderId: string) => {
    if (!selectedPlace) return;
    setFolders(prev => prev.map(f => {
      // Remove from other folders first
      const cleaned = { ...f, placeIds: safePlaceIds(f).filter(id => id !== selectedPlace.id) };
      if (f.id === folderId) {
        return { ...cleaned, placeIds: [...cleaned.placeIds, selectedPlace.id] };
      }
      return cleaned;
    }));
    setShowMoveFolderSheet(false);
    setSheetOpen(false);
  };

  const handleAddPlaces = (places: CollectionPlaceResult[]) => {
    const norm = (s: string) => (s ?? '').trim().toLowerCase();
    const existingNames = new Set(allPlaces.map(p => norm(p.name)));
    const newPlaces: Place[] = places
      .filter(p => {
        const key = norm(p.name);
        if (!key || existingNames.has(key)) return false;
        existingNames.add(key);
        return true;
      })
      .map((p, i) => ({
        id: Date.now() + i,
        name: p.name,
        rating: p.rating,
        reviewCount: '—',
        address: p.address,
        category: p.category,
        image: p.image,
        lat: p.lat ?? 0,
        lng: p.lng ?? 0,
      }));
    const skipped = places.length - newPlaces.length;
    if (skipped > 0) {
      toast(`${skipped} ${skipped === 1 ? 'lugar foi ignorado por já existir' : 'lugares foram ignorados por já existirem'} na coleção`);
    }
    if (newPlaces.length === 0) return;
    setAddedPlaces(prev => [...prev, ...newPlaces]);
  };

  const getFilterCount = (filterId: string) =>
    allPlaces.filter(p => p.category.toLowerCase() === filterId).length;

  const handleCreateFilter = () => {
    if (!newFilterName.trim()) return;
    setActiveFilter(newFilterName.trim().toLowerCase().replace(/\s+/g, '-'));
    setNewFilterName('');
    setNewFilterSheetOpen(false);
  };

  const handleRemoveFromFolder = (placeId: number) => {
    if (!activeFolderId) return;
    setFolders(prev => prev.map(f =>
      f.id === activeFolderId
        ? { ...f, placeIds: safePlaceIds(f).filter(id => id !== placeId) }
        : f
    ));
  };

  const handleRenameFolder = (folderId: string, newName: string) => {
    setFolders(prev => prev.map(f =>
      f.id === folderId ? { ...f, name: newName } : f
    ));
  };

  const handleDeleteFolder = (folderId: string) => {
    setFolders(prev => prev.filter(f => f.id !== folderId));
    setActiveFolderId(null);
  };

  // Render single-place map as overlay
  if (mapPlace) {
    return <PlaceMapScreen place={mapPlace} onBack={() => setMapPlace(null)} />;
  }

  // Render collection-wide map overlay
  if (showCollectionMap) {
    return (
      <CollectionMapScreen
        title={customTitle || collection.title}
        places={allPlaces.map(p => ({
          id: p.id,
          name: p.name,
          category: p.category,
          address: p.address,
          image: p.image,
          rating: p.rating,
          reviewCount: p.reviewCount,
          lat: p.lat,
          lng: p.lng,
        }))}
        onBack={() => setShowCollectionMap(false)}
      />
    );
  }

  // Render folder detail as separate page
  if (activeFolderId && activeFolder) {
    const folderPlaces = allPlaces.filter(p => safePlaceIds(activeFolder).includes(p.id));
    return (
      <FolderDetailScreen
        folderId={activeFolder.id}
        folderName={activeFolder.name}
        places={folderPlaces}
        onBack={() => setActiveFolderId(null)}
        onRemoveFromFolder={handleRemoveFromFolder}
        onRenameFolder={handleRenameFolder}
        onDeleteFolder={handleDeleteFolder}
        onAddPlace={() => setShowAddPlaceSheetV2(true)}
        onAddVideo={() => setShowVideoSheet(true)}
        onCreateFolder={() => setShowCreateFolderSheet(true)}
      />
    );
  }

  return (
    <div className="min-h-screen pb-24 bg-white relative">
      {/* Clean Header */}
      <header className="px-5 pt-5 pb-2 bg-zinc-100">
        <div className="flex items-center justify-between" style={{ paddingTop: 'calc(max(16px, env(safe-area-inset-top)) + 12px)' }}>
          <BackButton onClick={selectionMode ? exitSelectionMode : onBack} />

          <div className="flex items-center gap-2">
            {!selectionMode && (
              <button
                onClick={() => setHeaderSheetOpen(true)}
                className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm active:scale-95 active:opacity-80 transition-all flex-shrink-0"
              >
                <Icon name="more_horiz" size={22} className="text-foreground" style={{ color: '#1A1C40' }} />
              </button>
            )}
          </div>
        </div>

        {/* Title block with avatars */}
        <div className="mt-[40px] mb-1 flex items-start justify-between">
          <div>
            <h1
              className="text-[26px] font-bold leading-tight"
              style={{ color: '#1A1C40' }}
            >
              {customTitle || collection.title}
            </h1>
            <p className="text-[14px] font-medium mt-1" style={{ color: '#6B7280' }}>
              {selectionMode
                ? `${selectedPlaceIds.length} ${selectedPlaceIds.length === 1 ? 'selecionado' : 'selecionados'}`
                : `${allPlaces.length} lugares`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {allPlaces.length > 0 && (
              <button
                onClick={() => setShowCollectionMap(true)}
                className="w-9 h-9 flex items-center justify-center rounded-full active:scale-95 transition-all flex-shrink-0"
                style={{ background: '#FFFFFF' }}
                aria-label="Ver no mapa"
              >
                <Icon name="map" size={20} style={{ color: '#1A1C40' }} />
              </button>
            )}
          {/* Collaborators from mock data or shared people */}
          {(() => {
            const sharedPeople = shareSelectedIds.map(id => mockPeople.find(p => p.id === id)).filter(Boolean);
            const collabs = ('collaborators' in collection ? (collection as any).collaborators : []) || [];
            const hasAvatars = collabs.length > 0 || sharedPeople.length > 0;
            if (!hasAvatars) return null;
            return (
              <div className="flex items-center">
                <div className="flex -space-x-2.5">
                  {collabs.slice(0, 4).map((collab) => (
                    <img
                      key={collab.id}
                      src={collab.avatar}
                      alt={collab.name}
                      className="w-8 h-8 rounded-full border-[1.5px] border-white object-cover"
                    />
                  ))}
                  {sharedPeople.slice(0, collabs.length > 0 ? 4 - collabs.length : 4).map((person) => (
                    person!.photo ? (
                      <img
                        key={person!.id}
                        src={person!.photo}
                        alt={person!.name}
                        className="w-8 h-8 rounded-full border-[1.5px] border-white object-cover"
                      />
                    ) : (
                      <div
                        key={person!.id}
                        className="w-8 h-8 rounded-full border-[1.5px] border-white flex items-center justify-center text-[10px] font-bold text-white"
                        style={{ background: person!.color }}
                      >
                        {person!.initials}
                      </div>
                    )
                  ))}
                </div>
                {(collabs.length + sharedPeople.length) > 4 && (
                  <span className="text-[12px] font-medium ml-1.5" style={{ color: '#6B7280' }}>
                    +{(collabs.length + sharedPeople.length) - 4}
                  </span>
                )}
              </div>
            );
          })()}
          </div>
        </div>
      </header>

      {/* Folders section — above search, with title */}
      {!activeFolderId && folders.length > 0 && (
        <div className="px-5 pt-5">
          <h2 className="text-[15px] font-bold mb-3" style={{ color: '#1A1C40' }}>
            Pastas
          </h2>
          <div className="grid grid-cols-4 gap-x-3 gap-y-3">
            {folders.map((folder) => {
              const folderImages = allPlaces
                .filter(p => safePlaceIds(folder).includes(p.id))
                .map(p => p.image)
                .slice(0, 4);

              return (
                <button
                  key={folder.id}
                  onClick={() => setActiveFolderId(folder.id)}
                  className="flex flex-col items-start active:scale-[0.97] transition-transform"
                >
                  <div className="w-full aspect-square rounded-xl overflow-hidden mb-1.5" style={{ background: '#E8E8EE' }}>
                    {folderImages.length === 0 ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <Icon name="folder" size={20} className="text-muted-foreground" />
                      </div>
                    ) : folderImages.length === 1 ? (
                      <img src={folderImages[0]} alt={folder.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-[2px]">
                        {Array.from({ length: 4 }).map((_, i) => {
                          const img = folderImages[i];
                          return img ? (
                            <img
                              key={i}
                              src={img}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div key={i} className="w-full h-full" style={{ background: '#E8E8EE' }} />
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <h3 className="font-semibold text-[13px] leading-tight truncate w-full text-left text-foreground">
                    {folder.name}
                  </h3>
                  <p className="text-[11px] font-medium text-muted-foreground mt-0.5">
                    {safePlaceIds(folder).length} {safePlaceIds(folder).length === 1 ? 'lugar' : 'lugares'}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* "Locais extraídos" section title */}
      {!activeFolderId && allPlaces.length > 0 && (
        <div className="px-5 pt-6 pb-1 flex items-center justify-between">
          <h2 className="text-[15px] font-bold" style={{ color: '#1A1C40' }}>
            Locais extraídos
          </h2>
          {!activeFolderId && allPlaces.length > 0 && folders.length > 0 && (
            selectionMode ? (
              <button
                onClick={exitSelectionMode}
                className="text-[13px] font-semibold"
                style={{ color: '#1A1C40' }}
              >
                Cancelar
              </button>
            ) : (
              <button
                onClick={() => setSelectionMode(true)}
                className="text-[13px] font-semibold"
                style={{ color: '#1A1C40' }}
              >
                Selecionar
              </button>
            )
          )}
        </div>
      )}

      {/* Search */}
      <div className="px-5 pt-3 pb-2">
        <div className="relative">
          <Icon
            name="search"
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2"
            style={{ color: '#999' }}
          />
          <input
            type="text"
            placeholder="Buscar nessa coleção"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-[48px] pl-11 pr-10 font-medium rounded-full outline-none transition-colors text-xs"
            style={{
              background: '#F7F7F7',
              color: '#1A1C40',
              border: '1px solid #EBEBEB',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center"
              style={{ background: '#D1D1D6' }}
            >
              <Icon name="close" size={14} className="text-white" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Chips — only show when there are places */}
      {allPlaces.length > 0 && (
        <div className="flex gap-2 overflow-x-auto px-5 pt-2 pb-1 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
          <button
            onClick={() => setActiveFilter(null)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold flex-shrink-0 transition-all ${
              activeFilter === null
                ? 'text-white'
                : 'text-foreground'
            }`}
            style={{
              background: activeFilter === null ? '#1A1C40' : '#F2F2F2',
            }}
          >
            Todos
            <span className="text-[13px] opacity-70">{allPlaces.length}</span>
          </button>
          {dynamicFilters.map((filter) => {
            const count = getFilterCount(filter.id);
            return (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(activeFilter === filter.id ? null : filter.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold flex-shrink-0 transition-all ${
                  activeFilter === filter.id
                    ? 'text-white'
                    : 'text-foreground'
                }`}
                style={{
                  background: activeFilter === filter.id ? '#1A1C40' : '#F2F2F2',
                }}
              >
                {filter.name}
                <span className="text-[13px] opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
      )}



      <div className="px-5 pt-2">
        {filteredPlaces.length === 0 && folders.length === 0 && allPlaces.length === 0 && !isSearching && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: '#F2F2F2' }}>
              <Icon name="bookmark" size={24} style={{ color: '#999' }} />
            </div>
            <h3 className="text-[16px] font-bold mt-4" style={{ color: '#1A1C40' }}>
              Nenhum lugar salvo ainda
            </h3>
            <p className="text-[13px] font-medium text-center mt-1 max-w-[240px]" style={{ color: '#999' }}>
              Adicione locais manualmente ou extraia de um vídeo
            </p>
          </div>
        )}
        {isSearching && filteredPlaces.length === 0 && matchingFolders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: '#F2F2F2' }}>
              <Icon name="search" size={24} style={{ color: '#999' }} />
            </div>
            <h3 className="text-[16px] font-bold mt-4" style={{ color: '#1A1C40' }}>
              Nenhum resultado encontrado
            </h3>
            <p className="text-[13px] font-medium text-center mt-1 max-w-[240px]" style={{ color: '#999' }}>
              Tente buscar por outro nome ou lugar
            </p>
          </div>
        )}
        {filteredPlaces.map((place) => {
          const isSelected = selectedPlaceIds.includes(place.id);
          return (
          <div
            key={place.id}
            className={`flex gap-3.5 py-4 ${selectionMode ? 'cursor-pointer -mx-2 px-2 rounded-2xl transition-colors' : ''} ${selectionMode && isSelected ? 'bg-[#9DCC36]/10' : ''}`}
            onClick={selectionMode ? () => togglePlaceSelected(place.id) : undefined}
          >
            <div className="flex-shrink-0 relative">
              <img
                src={place.image}
                alt={place.name}
                className="w-[88px] h-[88px] rounded-2xl object-cover bg-muted"
              />
              {selectionMode && (
                <div
                  className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors"
                  style={{
                    background: isSelected ? '#9DCC36' : 'rgba(255,255,255,0.9)',
                    borderColor: isSelected ? '#9DCC36' : 'rgba(26,28,64,0.25)',
                  }}
                >
                  {isSelected && <Icon name="check" size={14} style={{ color: '#1A1C40' }} />}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <div className="flex items-center gap-1.5">
                <h3
                  className="font-bold text-[15px] leading-tight truncate"
                  style={{ color: '#1A1C40' }}
                >
                  {place.name}
                </h3>
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <Icon name="star" size={13} filled className="text-amber-400" />
                  <span className="text-[12px] font-semibold" style={{ color: '#1A1C40' }}>
                    {place.rating}
                  </span>
                </div>
              </div>
              <p className="text-[13px] font-medium mt-1" style={{ color: '#6B7280' }}>
                {place.address}
              </p>
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <span
                  className="inline-flex px-3 py-1 text-[11px] font-semibold rounded-full"
                  style={{ background: '#f0f0f0', color: '#555' }}
                >
                  {place.category}
                </span>
                {!activeFolderId && folders
                  .filter((f) => safePlaceIds(f).includes(place.id))
                  .map((f) => (
                    <span
                      key={f.id}
                      className="inline-flex px-3 py-1 text-[11px] font-semibold rounded-full truncate max-w-[140px]"
                      style={{ background: '#f0f0f0', color: '#555' }}
                    >
                      {f.name}
                    </span>
                  ))}
              </div>
            </div>
            {!selectionMode && (
              <div className="flex-shrink-0 self-start pt-1">
                <button
                  className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors"
                  onClick={() => { setSelectedPlace(place); setSheetOpen(true); }}
                >
                  <Icon name="more_vert" size={22} style={{ color: '#1A1C40' }} />
                </button>
              </div>
            )}
          </div>
          );
        })}
      </div>

      {/* Floating action button + contextual menu */}
      {!selectionMode && (
      <div className="fixed right-5 md:right-[calc(50%-215px+20px)] z-30" style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
        <div className="relative flex flex-col items-end gap-3">
          {fabSheetOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setFabSheetOpen(false)} />
              <div className="z-50 flex flex-col items-end gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <button
                  className="flex items-center gap-3 px-5 py-3 bg-white rounded-full hover:bg-muted/50 transition-colors"
                  style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.10)' }}
                  onClick={() => { setFabSheetOpen(false); setShowVideoSheet(true); }}
                >
                  <Icon name="videocam" size={20} style={{ color: '#1A1C40' }} />
                  <span className="text-[14px] font-medium whitespace-nowrap" style={{ color: '#1A1C40' }}>
                    Extrair de vídeo
                  </span>
                </button>
                <button
                  className="flex items-center gap-3 px-5 py-3 bg-white rounded-full hover:bg-muted/50 transition-colors"
                  style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.10)' }}
                  onClick={() => { setFabSheetOpen(false); setShowAddPlaceSheetV2(true); }}
                >
                  <Icon name="add_location" size={20} style={{ color: '#1A1C40' }} />
                  <span className="text-[14px] font-medium whitespace-nowrap" style={{ color: '#1A1C40' }}>
                    Adicionar local
                  </span>
                </button>
                <button
                  className="flex items-center gap-3 px-5 py-3 bg-white rounded-full hover:bg-muted/50 transition-colors"
                  style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.10)' }}
                  onClick={() => { setFabSheetOpen(false); setShowCreateFolderSheet(true); }}
                >
                  <Icon name="create_new_folder" size={20} style={{ color: '#1A1C40' }} />
                  <span className="text-[14px] font-medium whitespace-nowrap" style={{ color: '#1A1C40' }}>
                    Criar pasta
                  </span>
                </button>
              </div>
            </>
          )}
          <button
            onClick={() => setFabSheetOpen(!fabSheetOpen)}
            className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform z-50"
            style={{ background: fabSheetOpen ? '#1A1C40' : '#9DCC36' }}
          >
            <Icon
              name={fabSheetOpen ? 'close' : 'add'}
              size={28}
              style={{ color: fabSheetOpen ? '#FFFFFF' : '#1A1C40' }}
            />
          </button>
        </div>
      </div>
      )}

      {/* Selection action bar */}
      {selectionMode && (
        <div
          className="fixed left-0 right-0 bottom-0 z-40 flex justify-center px-4 pt-3 bg-white border-t border-[#0A0A0A]/8"
          style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))', boxShadow: '0 -6px 20px rgba(0,0,0,0.06)' }}
        >
          <div className="w-full max-w-[430px] flex items-center gap-3">
            <div className="flex-1 text-[14px] font-semibold" style={{ color: '#1A1C40' }}>
              {selectedPlaceIds.length} {selectedPlaceIds.length === 1 ? 'selecionado' : 'selecionados'}
            </div>
            <button
              onClick={() => selectedPlaceIds.length > 0 && setShowMoveMultipleSheet(true)}
              disabled={selectedPlaceIds.length === 0}
              className="h-12 px-5 rounded-full flex items-center gap-2 text-[14px] font-bold transition-all active:scale-[0.98] disabled:opacity-40"
              style={{ background: '#9DCC36', color: '#1A1C40' }}
            >
              <Icon name="folder" size={18} style={{ color: '#1A1C40' }} />
              Mover para pasta
            </button>
          </div>
        </div>
      )}

      {/* Add Place to Collection Sheets */}
      <AddPlaceToCollectionSheetV2
        open={showAddPlaceSheetV2}
        onClose={() => setShowAddPlaceSheetV2(false)}
        onSelect={handleAddPlaces}
        onAddManually={() => setShowAddPlaceSheet(true)}
      />
      <AddPlaceToCollectionSheet
        open={showAddPlaceSheet}
        onClose={() => setShowAddPlaceSheet(false)}
        onSelect={handleAddPlaces}
      />

      {/* Video Extraction Sheets */}
      <AddVideoSheet
        isOpen={showVideoSheet}
        onClose={() => setShowVideoSheet(false)}
        onOptionSelect={(optionId) => {
          setShowVideoSheet(false);
          if (optionId === 'link') {
            setShowVideoByLinkSheet(true);
          } else if (optionId === 'gallery') {
            setShowVideoFromGallery(true);
          }
        }}
      />
      <AddVideoByLinkSheet
        isOpen={showVideoByLinkSheet}
        onClose={() => setShowVideoByLinkSheet(false)}
        onBack={() => { setShowVideoByLinkSheet(false); setShowVideoSheet(true); }}
        onSubmit={(link, places) => {
          if (places && places.length > 0) {
            const newPlaces: Place[] = places.map((p, i) => ({
              id: Date.now() + i,
              name: p.name,
              rating: p.rating,
              reviewCount: '—',
              address: p.location,
              category: p.category,
              image: p.image,
              lat: 0,
              lng: 0,
              filter: p.category,
              videoLink: link,
            }));
            const fallbackThumb = newPlaces[0]?.image || '';
            const fallbackTitle = `Vídeo · ${newPlaces.length} ${newPlaces.length === 1 ? 'lugar' : 'lugares'}`;
            const newVideo = buildImportedVideoFromLink(link, fallbackThumb, fallbackTitle);
            const nextVideos = [newVideo, ...importedVideos];
            setImportedVideos(nextVideos);
            setAddedPlaces(prev => {
              const updated = [...prev, ...newPlaces];
              saveCollectionData(collectionId, updated, folders, customTitle, shareSelectedIds, nextVideos);
              return updated;
            });
          }
          setShowVideoByLinkSheet(false);
        }}
        collectionMode
      />
      <AddVideoFromGallerySheet
        isOpen={showVideoFromGallery}
        onClose={() => setShowVideoFromGallery(false)}
        onBack={() => { setShowVideoFromGallery(false); setShowVideoSheet(true); }}
        onSubmit={(file, places) => {
          if (places && places.length > 0) {
            const newPlaces: Place[] = places.map((p, i) => ({
              id: Date.now() + i,
              name: p.name,
              rating: p.rating,
              reviewCount: '—',
              address: p.location,
              category: p.category,
              image: p.image,
              lat: 0,
              lng: 0,
              filter: p.category,
              videoLink: undefined,
            }));
            const fileName = (file as any)?.name?.replace(/\.[^.]+$/, '') || 'Vídeo da galeria';
            const newVideo: ImportedVideo = {
              id: Date.now(),
              platform: 'gallery',
              title: fileName,
              thumbnail: newPlaces[0]?.image || '',
              sourceLabel: 'Galeria',
              sourceIcon: 'collections',
              createdAt: Date.now(),
            };
            const nextVideos = [newVideo, ...importedVideos];
            setImportedVideos(nextVideos);
            setAddedPlaces(prev => {
              const updated = [...prev, ...newPlaces];
              saveCollectionData(collectionId, updated, folders, customTitle, shareSelectedIds, nextVideos);
              return updated;
            });
          }
          setShowVideoFromGallery(false);
        }}
        collectionMode
      />

      <Drawer open={newFilterSheetOpen} onOpenChange={setNewFilterSheetOpen}>
        <DrawerContent className="bg-white rounded-t-3xl max-w-[430px] mx-auto">
          <div className="flex items-center justify-between px-6 pt-5 pb-4">
            <div className="w-10" />
            <h2 className="text-[16px] font-bold text-center flex-1" style={{ color: '#1A1C40' }}>
              Novo filtro
            </h2>
            <button
              onClick={() => { setNewFilterSheetOpen(false); setNewFilterName(''); }}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors"
            >
              <Icon name="close" size={22} style={{ color: '#1A1C40' }} />
            </button>
          </div>
          <div className="px-6 pb-8">
            <input
              type="text"
              value={newFilterName}
              onChange={(e) => setNewFilterName(e.target.value)}
              placeholder="Nome do filtro"
              className="w-full h-[48px] px-4 text-[14px] font-medium rounded-xl outline-none transition-colors"
              style={{ background: '#F7F7F7', color: '#1A1C40', border: '1px solid #EBEBEB' }}
              autoFocus
            />
            <button
              onClick={handleCreateFilter}
              disabled={!newFilterName.trim()}
              className="w-full h-[48px] mt-4 rounded-xl text-[15px] font-bold transition-all active:scale-[0.98]"
              style={{
                background: newFilterName.trim() ? '#9DCC36' : '#E5E5E5',
                color: newFilterName.trim() ? '#1A1C40' : '#999',
              }}
            >
              Criar filtro
            </button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Place Options Bottom Sheet */}
      <Drawer open={sheetOpen} onOpenChange={setSheetOpen}>
        <DrawerContent className="bg-white rounded-t-3xl max-w-[430px] mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-4">
            <div className="w-10" />
            <h2
              className="text-[16px] font-bold text-center flex-1 truncate"
              style={{ color: '#1A1C40' }}
            >
              {selectedPlace?.name}
            </h2>
            <button
              onClick={() => setSheetOpen(false)}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors"
            >
              <Icon name="close" size={22} style={{ color: '#1A1C40' }} />
            </button>
          </div>

          {/* Actions */}
          <div className="px-6 pb-8">
            {/* Ver detalhes */}
            <button
              className="w-full flex items-center gap-4 py-4 active:bg-muted/30 transition-colors"
              onClick={() => { setSheetOpen(false); if (selectedPlace) setDetailPlace(selectedPlace); }}
            >
              <Icon name="info" size={22} style={{ color: '#1A1C40' }} />
              <span className="flex-1 text-[15px] font-medium text-left" style={{ color: '#1A1C40' }}>
                Ver detalhes
              </span>
              <Icon name="chevron_right" size={18} style={{ color: '#C0C0C0' }} />
            </button>

            <div className="h-px" style={{ background: '#F0F0F0' }} />

            {/* Adicionar ao roteiro */}
            <button
              className="w-full flex items-center gap-4 py-4 active:bg-muted/30 transition-colors"
              onClick={() => { setSheetOpen(false); setShowAddToItinerarySheet(true); }}
            >
              <Icon name="add_circle" size={22} style={{ color: '#1A1C40' }} />
              <span className="flex-1 text-[15px] font-medium text-left" style={{ color: '#1A1C40' }}>
                Adicionar ao roteiro
              </span>
              <Icon name="chevron_right" size={18} style={{ color: '#C0C0C0' }} />
            </button>

            <div className="h-px" style={{ background: '#F0F0F0' }} />

            {/* Ver no mapa */}
            <button
              className="w-full flex items-center gap-4 py-4 active:bg-muted/30 transition-colors"
              onClick={() => { setSheetOpen(false); if (selectedPlace) setMapPlace(selectedPlace); }}
            >
              <Icon name="map" size={22} style={{ color: '#1A1C40' }} />
              <span className="flex-1 text-[15px] font-medium text-left" style={{ color: '#1A1C40' }}>
                Ver no mapa
              </span>
              <Icon name="chevron_right" size={18} style={{ color: '#C0C0C0' }} />
            </button>

            <div className="h-px" style={{ background: '#F0F0F0' }} />

            {/* Mover para pasta */}
            <button
              className="w-full flex items-center gap-4 py-4 active:bg-muted/30 transition-colors"
              onClick={() => { setSheetOpen(false); setShowMoveFolderSheet(true); }}
            >
              <Icon name="drive_file_move" size={22} style={{ color: '#1A1C40' }} />
              <span className="flex-1 text-[15px] font-medium text-left" style={{ color: '#1A1C40' }}>
                Mover para pasta
              </span>
              <Icon name="chevron_right" size={18} style={{ color: '#C0C0C0' }} />
            </button>

            <div className="h-px" style={{ background: '#F0F0F0' }} />

            {/* Excluir */}
            <button
              className="w-full flex items-center gap-4 py-4 active:bg-muted/30 transition-colors"
              onClick={() => { const p = selectedPlace; setSheetOpen(false); if (p) handleDeletePlace(p); }}
            >
              <Icon name="delete" size={22} style={{ color: '#DA501F' }} />
              <span className="flex-1 text-[15px] font-medium text-left" style={{ color: '#DA501F' }}>
                Excluir
              </span>
              <Icon name="chevron_right" size={18} style={{ color: '#C0C0C0' }} />
            </button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* References Bottom Sheet */}
      <Drawer open={showReferencesSheet} onOpenChange={setShowReferencesSheet}>
        <DrawerContent className="bg-white rounded-t-3xl max-w-[430px] mx-auto max-h-[85vh]">
          {/* Header */}
          <div className="relative px-6 pt-5 pb-2">
            <button
              onClick={() => setShowReferencesSheet(false)}
              className="absolute top-5 right-6 w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors"
            >
              <Icon name="close" size={22} style={{ color: '#1A1C40' }} />
            </button>
            <h2
              className="text-[16px] font-bold text-left pr-12"
              style={{ color: '#1A1C40' }}
            >
              Referências
            </h2>
            <p className="text-[13px] text-muted-foreground mt-0.5 pr-12">
              Vídeos e links que originaram lugares desta coleção.
            </p>
          </div>

          <div className="px-6 pb-8 overflow-y-auto">

            {importedVideos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3" style={{ background: '#F2F2F2' }}>
                  <Icon name="play_arrow" size={28} style={{ color: '#1A1C40' }} />
                </div>
                <p className="text-[14px] font-semibold" style={{ color: '#1A1C40' }}>
                  Nenhuma referência ainda
                </p>
                <p className="text-[12px] text-muted-foreground mt-1 max-w-[260px]">
                  Quando você importar lugares a partir de um vídeo, eles aparecem aqui.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {recentImportedVideos.map(video => {
                  const Wrapper: any = video.link ? 'a' : 'div';
                  const wrapperProps = video.link
                    ? { href: video.link, target: '_blank', rel: 'noopener noreferrer' }
                    : {};
                  return (
                    <Wrapper
                      key={video.id}
                      {...wrapperProps}
                      className="flex items-center gap-3 p-2 rounded-2xl active:bg-muted/40 transition-colors"
                      style={{ background: '#FAFAFA' }}
                    >
                      <div className="relative w-[64px] h-[88px] rounded-xl overflow-hidden flex-shrink-0 bg-secondary">
                        <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
                        <div className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-black/55 backdrop-blur-sm flex items-center justify-center">
                          <Icon name="play_arrow" size={12} className="text-white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Icon name={video.sourceIcon} size={12} style={{ color: '#1A1C40' }} />
                          <span className="text-[11px] font-semibold" style={{ color: '#1A1C40' }}>
                            {video.sourceLabel}
                          </span>
                        </div>
                        <p className="text-[13px] font-semibold leading-tight line-clamp-2" style={{ color: '#1A1C40' }}>
                          {video.title}
                        </p>
                        {video.link && (
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                            {video.link}
                          </p>
                        )}
                      </div>
                      {video.link && (
                        <Icon name="chevron_right" size={18} style={{ color: '#C0C0C0' }} />
                      )}
                    </Wrapper>
                  );
                })}
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      {/* Header Settings Bottom Sheet */}
      <Drawer open={headerSheetOpen} onOpenChange={setHeaderSheetOpen}>
        <DrawerContent className="bg-white rounded-t-3xl max-w-[430px] mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-4">
            <div className="w-10" />
            <h2
              className="text-[16px] font-bold text-center flex-1"
              style={{ color: '#1A1C40' }}
            >
              Configurações
            </h2>
            <button
              onClick={() => setHeaderSheetOpen(false)}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors"
            >
              <Icon name="close" size={22} style={{ color: '#1A1C40' }} />
            </button>
          </div>

          {/* Actions */}
          <div className="px-6 pb-8">
            <button
              className="w-full flex items-center gap-4 py-4 active:bg-muted/30 transition-colors"
              onClick={() => {
                setHeaderSheetOpen(false);
                setTimeout(() => setShowShareSheet(true), 300);
              }}
            >
              <Icon name="share" size={22} style={{ color: '#1A1C40' }} />
              <span className="flex-1 text-[15px] font-medium text-left" style={{ color: '#1A1C40' }}>
                Compartilhar coleção
              </span>
              <Icon name="chevron_right" size={18} style={{ color: '#C0C0C0' }} />
            </button>

            <div className="h-px" style={{ background: '#F0F0F0' }} />

            <button
              className="w-full flex items-center gap-4 py-4 active:bg-muted/30 transition-colors"
              onClick={() => {
                setHeaderSheetOpen(false);
                setTimeout(() => setShowReferencesSheet(true), 300);
              }}
            >
              <Icon name="play_arrow" size={22} style={{ color: '#1A1C40' }} />
              <span className="flex-1 text-[15px] font-medium text-left" style={{ color: '#1A1C40' }}>
                Referências
              </span>
              {importedVideos.length > 0 && (
                <span
                  className="text-[12px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: '#F2F2F2', color: '#1A1C40' }}
                >
                  {importedVideos.length}
                </span>
              )}
              <Icon name="chevron_right" size={18} style={{ color: '#C0C0C0' }} />
            </button>

            <div className="h-px" style={{ background: '#F0F0F0' }} />

            <button
              className="w-full flex items-center gap-4 py-4 active:bg-muted/30 transition-colors"
              onClick={() => { setHeaderSheetOpen(false); setShowRenameSheet(true); }}
            >
              <Icon name="edit" size={22} style={{ color: '#1A1C40' }} />
              <span className="flex-1 text-[15px] font-medium text-left" style={{ color: '#1A1C40' }}>
                Renomear
              </span>
              <Icon name="chevron_right" size={18} style={{ color: '#C0C0C0' }} />
            </button>

            <div className="h-px" style={{ background: '#F0F0F0' }} />

            <button
              className="w-full flex items-center gap-4 py-4 active:bg-muted/30 transition-colors"
              onClick={() => { setHeaderSheetOpen(false); setShowDeleteConfirm(true); }}
            >
              <Icon name="delete" size={22} style={{ color: '#DA501F' }} />
              <span className="flex-1 text-[15px] font-medium text-left" style={{ color: '#DA501F' }}>
                Excluir
              </span>
              <Icon name="chevron_right" size={18} style={{ color: '#C0C0C0' }} />
            </button>
          </div>
        </DrawerContent>
      </Drawer>
      {/* Sort Bottom Sheet */}
      {showSortSheet && (
        <div className="absolute inset-0 z-50 overflow-hidden">
          <div 
            className="absolute inset-0 bg-black/40 animate-in fade-in duration-200"
            onClick={() => setShowSortSheet(false)} 
          />
          <div className="absolute bottom-0 left-0 right-0 bg-background rounded-t-[24px] animate-in slide-in-from-bottom duration-300 pb-6">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-[#E0E0E0]" />
            </div>
            <div className="flex justify-center py-4">
              <h2 className="text-[17px] font-bold text-foreground">Ordenar por</h2>
            </div>
            <div className="flex flex-col px-6">
              {[
                { id: 'recent', label: 'Mais recentes' },
                { id: 'oldest', label: 'Mais antigos' },
                { id: 'az', label: 'Ordem alfabética (A–Z)' },
                { id: 'za', label: 'Ordem alfabética (Z–A)' },
              ].map((option, index) => (
                <button
                  key={option.id}
                  onClick={() => { setSortBy(option.id); setShowSortSheet(false); }}
                  className={`flex items-center justify-between min-h-[48px] py-4 ${
                    index < 3 ? 'border-b border-[#EAEAEA]' : ''
                  }`}
                >
                  <span className="text-[15px] font-normal text-foreground">
                    {option.label}
                  </span>
                  <div className={`w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    sortBy === option.id ? 'border-foreground' : 'border-muted-foreground/40'
                  }`}>
                    {sortBy === option.id && (
                      <div className="w-[12px] h-[12px] rounded-full bg-foreground" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Create Folder Sheet */}
      <CreateFolderSheet
        isOpen={showCreateFolderSheet}
        onClose={() => setShowCreateFolderSheet(false)}
        onSubmit={handleCreateFolder}
      />

      {/* Move to Folder Sheet */}
      <MoveFolderSheet
        isOpen={showMoveFolderSheet}
        onClose={() => setShowMoveFolderSheet(false)}
        folders={folders}
        onSelect={handleMoveToFolder}
        placeName={selectedPlace?.name}
        onCreateFolder={() => { setPendingMoveAfterCreate(true); setShowCreateFolderSheet(true); }}
      />

      <MoveFolderSheet
        isOpen={showMoveMultipleSheet}
        onClose={() => setShowMoveMultipleSheet(false)}
        folders={folders}
        onSelect={handleMoveSelectedToFolder}
        selectedCount={selectedPlaceIds.length}
        onCreateFolder={() => { setShowCreateFolderSheet(true); }}
      />

      {/* Rename Collection Sheet */}
      {showRenameSheet && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40 transition-opacity"
            onClick={() => setShowRenameSheet(false)}
          />
          <div
            className="fixed bottom-0 left-0 right-0 z-50 flex justify-center"
            style={{ fontFamily: 'var(--font-family-primary)' }}
          >
            <div className="bg-white rounded-t-[20px] w-full max-w-[430px] flex flex-col animate-in slide-in-from-bottom duration-300">
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-9 h-[4px] bg-muted-foreground/20 rounded-full" />
              </div>
              <div className="relative flex items-center justify-center px-5 py-3">
                <h2 className="text-[17px] font-bold" style={{ color: '#1A1C40' }}>
                  Renomear coleção
                </h2>
                <button
                  onClick={() => setShowRenameSheet(false)}
                  className="absolute right-5 w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted/60 transition-colors"
                >
                  <Icon name="close" size={20} style={{ color: '#999' }} />
                </button>
              </div>
              <RenameForm
                currentName={customTitle || collection.title}
                onSubmit={(name) => { setCustomTitle(name); setShowRenameSheet(false); }}
              />
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Bottom Sheet */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center" onClick={() => setShowDeleteConfirm(false)}>
          <div 
            className="absolute inset-0 bg-black/20"
            style={{ animation: 'fadeIn 0.2s ease-out' }}
          />
          <div
            className="relative w-full max-w-[430px] bg-background rounded-t-2xl"
            style={{ animation: 'slideUpSheet 0.35s cubic-bezier(0.32, 0.72, 0, 1)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-[#E0E0E0]" />
            </div>
            <div className="px-5 pt-4 pb-8 text-center">
              <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <Icon name="delete" size={26} className="text-destructive" />
              </div>
              <h3 className="text-[18px] font-bold text-foreground mb-1">Excluir coleção?</h3>
              <p className="text-[13px] text-muted-foreground mb-6 leading-relaxed">
                "{customTitle || collection.title}" será excluída permanentemente. Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-3.5 rounded-xl border border-border text-[14px] font-semibold text-foreground bg-card active:scale-[0.98] transition-transform"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    onDelete?.();
                  }}
                  className="flex-1 py-3.5 rounded-xl bg-destructive text-destructive-foreground text-[14px] font-semibold active:scale-[0.98] transition-transform"
                >
                  Sim, excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Place Detail Bottom Sheet */}
      {detailPlace && (
        <ActivityDetailSheet
          activity={{
            id: detailPlace.id,
            name: detailPlace.name,
            image: detailPlace.image,
            category: detailPlace.category,
            rating: detailPlace.rating,
            price: '',
            openHours: '',
            startTime: '',
            endTime: '',
          }}
          videoLink={detailPlace.videoLink}
          onClose={() => setDetailPlace(null)}
        />
      )}

      <ShareCollectionSheet
        isOpen={showShareSheet}
        onClose={() => setShowShareSheet(false)}
        selectedIds={shareSelectedIds}
        onToggle={(id) => setShareSelectedIds(prev =>
          prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        )}
      />

      <AddPlaceToItinerarySheet
        open={showAddToItinerarySheet}
        onClose={() => setShowAddToItinerarySheet(false)}
        place={selectedPlace}
      />
    </div>
  );
}

function RenameForm({ currentName, onSubmit }: { currentName: string; onSubmit: (name: string) => void }) {
  const [name, setName] = useState(currentName);
  const isValid = name.trim().length > 0 && name.trim() !== currentName;

  return (
    <div className="px-6 pt-5 pb-4 space-y-4">
      <div className="space-y-2">
        <label className="text-[13px] font-semibold tracking-wide" style={{ color: '#999' }}>
          Nome da coleção
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          className="w-full h-[52px] px-4 text-[16px] font-medium rounded-xl border transition-colors outline-none bg-white"
          style={{
            borderColor: name ? '#1A1C40' : '#e5e5e5',
            color: '#1A1C40',
            caretColor: '#1A1C40',
          }}
        />
      </div>
      <div style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom, 8px))' }}>
        <button
          onClick={() => isValid && onSubmit(name.trim())}
          disabled={!isValid}
          className="w-full h-[52px] rounded-2xl text-[15px] font-bold transition-all duration-200 active:scale-[0.98]"
          style={{
            background: isValid ? '#9DCC36' : '#e8e8e8',
            color: isValid ? '#1A1C40' : '#bbb',
            boxShadow: isValid ? '0 4px 16px rgba(157, 204, 54, 0.3)' : 'none',
          }}
        >
          Salvar
        </button>
      </div>
    </div>
  );
}
