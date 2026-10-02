import React, { useState, useRef, useEffect, lazy, Suspense, useCallback, useMemo } from 'react';
import { MapPin, Calendar, Users, DollarSign, Clock, LayoutGrid, Heart, Eye, HandCoins, ExternalLink, Settings, MoreVertical, X, Share2, UploadCloud, Edit3, Trash2, Home, Bus, Train, Plane, Car, Plus, AlignLeft, Info, FileText, ChevronDown, ChevronUp, Sparkles, StickyNote, Footprints, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { updateItinerary } from '@/lib/itinerariesApi';
import { COUNTRY_TO_TAGS } from '@/data/countriesCatalog';
import { SuccessToast } from '@/components/travel/SuccessToast';
import { DuplicatingOverlay } from '@/components/travel/DuplicatingOverlay'; import { ItinerarySettingsSheet } from '@/components/travel/ItinerarySettingsSheet';
import { parseLocalDate } from '@/lib/localDate';
import { PublishItineraryFlow } from '@/components/travel/PublishItineraryFlow';
import { EditPublishSheet } from '@/components/travel/EditPublishSheet';
import { ManageItineraryScreen } from './ManageItineraryScreen';
import { ActivityDetailScreen } from './ActivityDetailScreen';
import { Icon } from '@/components/ui/Icon';
import { DocumentosScreen } from './DocumentosScreen';
import { BudgetScreen, Expense } from './BudgetScreen';
import { estimatedPriceFor } from '@/lib/paidAttractions';
import { detectCurrencySymbol, extractNumericPrice, formatNumericInput } from '@/lib/currency';

import { Reserva } from '@/components/travel/AddReservaSheet';
import { DocTypePickerSheet, type DocType } from '@/components/travel/DocTypePickerSheet';
import { AddDocumentoSheet } from '@/components/travel/AddDocumentoSheet';
import { TripTipsScreen } from './TripTipsScreen';
import { TripNotesScreen, TripNote } from './TripNotesScreen';
import { TripChecklistScreen } from './TripChecklistScreen';
import { AddTransporteSheet, Transporte } from '@/components/travel/AddTransporteSheet';
import { AddActionSheet } from '@/components/travel/AddActionSheet';
import { AddPlacesScreen, PlaceResult } from '@/components/travel/AddPlacesScreen';
import { AddNoteSheet } from '@/components/travel/AddNoteSheet';
import { AddTripNoteSheet } from '@/components/travel/AddTripNoteSheet';
import { AddDeslocamentoSheet, DeslocamentoData } from '@/components/travel/AddDeslocamentoSheet';
import { AddBudgetExpenseSheet } from '@/components/travel/AddBudgetExpenseSheet';
import { AddManualActivitySheet, ManualActivityData } from '@/components/travel/AddManualActivitySheet';
import { DraggableActivityList, type DragState } from '@/components/travel/DraggableActivityList';
import { ReorderActivitiesScreen } from './ReorderActivitiesScreen';
import { AiRecommendationsScreen } from './AiRecommendationsScreen';
import { Bars3BottomLeftIcon, ListBulletIcon } from '@heroicons/react/24/outline';
import { BottomSheet } from '@/components/ui/BottomSheet';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Check, Target } from 'lucide-react';

import { format, differenceInDays, differenceInCalendarDays, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ItineraryFormData } from '@/components/travel/CreateItinerarySheet';
import { ItineraryDataset, ItineraryDay as DatasetDay, ItineraryActivity as DatasetActivity, TransportBetween as DatasetTransport, ItinerarySuggestion } from '@/data/itineraries';
import { resolveCoverImage } from '@/lib/coverImageResolver';
import { useDestinationCover } from '@/hooks/use-destination-cover';
import { getPlacesForDestinations, getDestinationForDay, toSuggestions, getAllCityPlaces } from '@/data/cityRecommendations';
import { getCityCoordinates } from '@/lib/cityCoordinates';
import { toast } from 'sonner';
import { BackButton } from '@/components/ui/BackButton';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useAuth } from '@/contexts/AuthContext';
import { updateItinerary as updateItineraryRow, upsertStoreListing, publishItineraryAsCopy, leaveItinerary, createItinerary, type UserItinerary } from '@/lib/itinerariesApi';
import { loadPlannerData, savePlannerData } from '@/lib/plannerApi';
import { upsertPlace } from '@/lib/placesCache';
import { resolveCountryFromText } from '@/lib/countryResolver';
import { formatBRL } from '@/lib/utils';
import { loadItineraryDocs, saveItineraryDocs } from '@/lib/itineraryDocsApi';
import { loadItineraryNotes, saveItineraryNotes } from '@/lib/itineraryNotesApi';
import { loadBudget, saveBudget } from '@/lib/budgetApi';
import { listItineraryMembers, getMyRole, getItineraryOwnerProfile, getCachedOwnerProfile, getCachedItineraryMembers, type ItineraryMember, type ItineraryRole } from '@/lib/itineraryMembersApi';
import { ShareItinerarySheet } from '@/components/travel/ShareItinerarySheet';
import { useItineraryRealtime } from '@/hooks/use-itinerary-realtime';
import { useMyItineraries, addOptimisticItinerary, applyOptimisticPatch } from '@/hooks/use-my-itineraries';
import { PlanLimitReachedSheet } from '@/components/travel/PlanLimitReachedSheet';
import type { MapPlace } from './ItineraryMapScreen';
const LazyItineraryMapScreen = lazy(() => import('./ItineraryMapScreen').then((m) => ({ default: m.ItineraryMapScreen })));

// ─── Types ───────────────────────────────────────────────────────────────────

interface Activity {
  id: number;
  type?: 'activity' | 'note';
  startTime: string;
  endTime: string;
  category: string;
  categoryColor: string;
  name: string;
  image: string;
  openHours: string;
  rating: number;
  price: string;
  noteText?: string;
  observation?: string;
  lat?: number;
  lng?: number;
  placeId?: string;
}

interface TransportBetween {
  type: 'walk' | 'bus' | 'metro' | 'car';
  duration: string;
  cost?: string;
  distance?: string;
}

interface DayData {
  day: number;
  title: string;
  date: Date;
  activities: Activity[];
  transports: TransportBetween[];
}

/**
 * mode:
 *  - 'planner'       → roteiro privado preenchido (com dados)
 *  - 'planner_empty'  → roteiro privado vazio (empty state)
 *
 * Ambos compartilham a mesma base estrutural.
 * A diferenciação é automática: se houver dados → planner, senão → planner_empty.
 */
export type PlannerMode = 'planner' | 'planner_empty';

export interface PlannerItineraryScreenProps {
  data: ItineraryFormData;
  /** When navigating from an existing itinerary, pass its full dataset */
  itineraryDataset?: ItineraryDataset;
  /** Unique identifier for persisting activities */
  itineraryId?: string | number;
  /** When true, logistics tabs (transport, reservations, budget, checklist) start empty */
  isPurchased?: boolean;
  /** When true, renders in "creator edit" mode: hides settings + participants management,
   *  and shows a sticky "Salvar alterações" button. */
  creatorEditMode?: boolean;
  /** When true, renders in "read-only" mode where editing activities is disabled */
  readOnlyMode?: boolean;
  /** When true, opens the publish flow automatically on mount (used by creator program). */
  autoOpenPublishFlow?: boolean;
  onBack: () => void;
  onDelete?: () => void;
  onUpdate?: (data: ItineraryFormData) => void;
  onNavigateToAI?: () => void;
  onSaveCreatorEdit?: () => void;
  onNavigateToSales?: () => void;
  onOpenItinerary?: (dataset: UserItinerary) => void;
  /** Chamado após duplicar o roteiro: o pai deve levar o usuário à listagem e exibir o toast. */
  onDuplicateSuccess?: () => void;
  onUpgrade?: () => void;
  onNavigateToFAQ?: () => void;
  initialRole?: 'owner' | 'editor' | 'viewer';
}

// ─── Persistence helpers ─────────────────────────────────────────────────────
const ACTIVITIES_STORAGE_KEY = 'wai-travel-planner-activities';
const TRANSPORTS_STORAGE_KEY = 'wai-travel-planner-transports';

/**
 * Reads a versioned entry from a per-itinerary storage map.
 * Supports legacy format (raw payload at all[id]) by treating it as version 0.
 * Returns null when the persisted version is older than `currentVersion`,
 * which signals the caller to fall back to the dataset defaults.
 */
function readVersionedEntry<T>(storageKey: string, id: string, currentVersion?: number): T | null {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const all = JSON.parse(raw);
    const entry = all[id];
    if (entry == null) return null;
    // New format: { __v: number, data: T }
    if (typeof entry === 'object' && '__v' in entry && 'data' in entry) {
      const savedVersion = (entry as { __v: number }).__v ?? 0;
      if (currentVersion != null && savedVersion < currentVersion) return null;
      return (entry as { data: T }).data;
    }
    // Legacy format (no version): invalid when dataset declares a version
    if (currentVersion != null && currentVersion > 0) return null;
    return entry as T;
  } catch { return null; }
}

function writeVersionedEntry<T>(storageKey: string, id: string, data: T, currentVersion?: number) {
  try {
    const raw = localStorage.getItem(storageKey);
    const all = raw ? JSON.parse(raw) : {};
    all[id] = { __v: currentVersion ?? 0, data };
    localStorage.setItem(storageKey, JSON.stringify(all));
  } catch { /* ignore */ }
}

function loadPersistedActivities(id: string, currentVersion?: number): Record<number, Activity[]> {
  const parsed = readVersionedEntry<Record<number, Activity[]>>(ACTIVITIES_STORAGE_KEY, id, currentVersion);
  if (!parsed) return {};
  for (const day of Object.keys(parsed)) {
    // Migrate notes without times & deduplicate by id (keep last)
    const seen = new Map<number, Activity>();
    for (const a of parsed[day] as Activity[]) {
      const fixed = (a.type === 'note' && !a.startTime) ? { ...a, startTime: '11:00', endTime: '13:15' } : a;
      seen.set(fixed.id, fixed);
    }
    parsed[day] = Array.from(seen.values());
  }
  return parsed;
}

function savePersistedActivities(id: string, data: Record<number, Activity[]>, currentVersion?: number) {
  writeVersionedEntry(ACTIVITIES_STORAGE_KEY, id, data, currentVersion);
}

const NOTES_STORAGE_KEY = 'wai_planner_notes_v1';

function loadPersistedNotes(id: string, currentVersion?: number): TripNote[] {
  const parsed = readVersionedEntry<TripNote[]>(NOTES_STORAGE_KEY, id, currentVersion);
  return parsed || [];
}

function savePersistedNotes(id: string, data: TripNote[], currentVersion?: number) {
  writeVersionedEntry(NOTES_STORAGE_KEY, id, data, currentVersion);
}

function loadPersistedTransports(id: string, currentVersion?: number): Record<number, TransportBetween[]> {
  return readVersionedEntry<Record<number, TransportBetween[]>>(TRANSPORTS_STORAGE_KEY, id, currentVersion) ?? {};
}

function savePersistedTransports(id: string, data: Record<number, TransportBetween[]>, currentVersion?: number) {
  writeVersionedEntry(TRANSPORTS_STORAGE_KEY, id, data, currentVersion);
}

// ─── Mock data (planner) ─────────────────────────────────────────────────────

const activityColors = ['#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EF4444', '#EC4899'];

const mockDays: DayData[] = [
  {
    day: 1,
    title: 'Histórico',
    date: new Date(2026, 5, 14),
    activities: [
      {
        id: 1,
        startTime: '08:00',
        endTime: '10:00',
        category: 'Museu',
        categoryColor: '#6366F1',
        name: 'Museu do Louvre',
        image: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=300',
        openHours: 'Aberto das 09:00 às 18:00',
        rating: 4.8,
        price: '€17'
      },
      {
        id: 2,
        startTime: '11:30',
        endTime: '13:00',
        category: 'Restaurante',
        categoryColor: '#F59E0B',
        name: 'Café de Flore',
        image: 'https://images.unsplash.com/photo-1550340499-a6c60fc8287c?w=300',
        openHours: 'Aberto das 07:00 às 01:00',
        rating: 4.5,
        price: '€€'
      },
      {
        id: 3,
        startTime: '14:00',
        endTime: '16:00',
        category: 'Ponto Turístico',
        categoryColor: '#10B981',
        name: 'Torre Eiffel',
        image: 'https://images.unsplash.com/photo-1511739001486-6bfe10ce65f4?w=300',
        openHours: 'Aberto das 09:00 às 00:45',
        rating: 4.9,
        price: '€26'
      }],

    transports: [
      { type: 'walk', duration: '10 min' },
      { type: 'bus', duration: '20 min', cost: 'R$ 2,50' }]

  },
  {
    day: 2,
    title: 'Escultura',
    date: new Date(2026, 5, 15),
    activities: [],
    transports: []
  },
  {
    day: 3,
    title: 'Disney',
    date: new Date(2026, 0, 23),
    activities: [],
    transports: []
  },
  {
    day: 4,
    title: '',
    date: new Date(2026, 0, 24),
    activities: [],
    transports: []
  }];


const suggestions: ItinerarySuggestion[] = [
  {
    id: 1,
    name: 'Museu Anne Frank',
    rating: 4.8,
    distance: '6.5 KM',
    image: 'https://images.unsplash.com/photo-1583037189850-1921ae7c6c22?w=300',
    category: 'Museu',
    categoryColor: '#6366F1',
    duration: 90
  },
  {
    id: 2,
    name: 'Rijksmuseum Amsterdam',
    rating: 4.9,
    distance: '3.2 KM',
    image: 'https://images.unsplash.com/photo-1576924542622-772281b13aa8?w=300',
    category: 'Museu',
    categoryColor: '#6366F1',
    duration: 120
  },
  {
    id: 3,
    name: 'Van Gogh Museum',
    rating: 4.7,
    distance: '4.1 KM',
    image: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=300',
    category: 'Museu',
    categoryColor: '#6366F1',
    duration: 90
  },
  {
    id: 4,
    name: 'Vondelpark Gardens',
    rating: 4.6,
    distance: '2.8 KM',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=300',
    category: 'Parque',
    categoryColor: '#22C55E',
    duration: 60
  }];


// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Haversine distance in km between two lat/lng points */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Pick best transport mode & estimate duration based on straight-line distance */
function smartTransport(distanceKm: number): TransportBetween {
  if (distanceKm < 0.01) {
    return { type: 'walk', duration: '0 min', distance: '0 m' };
  }
  // Apply a 1.3x factor to approximate real road distance from straight-line
  const roadKm = distanceKm * 1.3;
  const distStr = roadKm < 1 ? `${Math.round(roadKm * 1000)} m` : `${roadKm.toFixed(1)} km`;

  if (roadKm <= 1.2) {
    // Walk: avg 5 km/h
    const mins = Math.max(3, Math.round((roadKm / 5) * 60));
    return { type: 'walk', duration: `${mins} min`, distance: distStr };
  }
  if (roadKm <= 5) {
    // Bus/Tram: avg 18 km/h (urban, with stops)
    const mins = Math.max(8, Math.round((roadKm / 18) * 60));
    return { type: 'bus', duration: `${mins} min`, distance: distStr };
  }
  if (roadKm <= 15) {
    // Metro: avg 30 km/h
    const mins = Math.max(10, Math.round((roadKm / 30) * 60));
    return { type: 'metro', duration: `${mins} min`, distance: distStr };
  }
  // Car/Taxi: avg 40 km/h (urban)
  const mins = Math.max(10, Math.round((roadKm / 40) * 60));
  return { type: 'car', duration: `${mins} min`, distance: distStr };
}

function getTransportIcon(type: TransportBetween['type']) {
  switch (type) {
    case 'walk': return 'directions_walk';
    case 'bus': return 'directions_bus';
    case 'metro': return 'directions_subway';
    case 'car': return 'directions_car';
  }
}

// ─── Route API cache ─────────────────────────────────────────────────────────
const routeCache = new Map<string, TransportBetween>();

async function getRouteInfo(
  lat1: number, lng1: number, lat2: number, lng2: number
): Promise<TransportBetween> {
  const key = `${lat1.toFixed(5)},${lng1.toFixed(5)}->${lat2.toFixed(5)},${lng2.toFixed(5)}`;
  const cached = routeCache.get(key);
  if (cached) return cached;

  try {
    const { data, error } = await supabase.functions.invoke('get-route', {
      body: { origin: [lng1, lat1], destination: [lng2, lat2] },
    });
    if (error || data?.duration_min == null) throw new Error(error?.message || 'no data');

    const result: TransportBetween = {
      type: (data.transport_type === 'walk' ? 'walk' : data.transport_type === 'bus' ? 'bus' : data.transport_type === 'metro' ? 'metro' : 'car') as TransportBetween['type'],
      duration: `${data.duration_min} min`,
      distance: data.distance_km != null ? `${data.distance_km} km` : (Number(data.duration_min) === 0 ? '0 m' : undefined),
    };
    routeCache.set(key, result);
    return result;
  } catch (err) {
    console.warn('Route API fallback:', err);
    const dist = haversineKm(lat1, lng1, lat2, lng2);
    const result = smartTransport(dist);
    routeCache.set(key, result);
    return result;
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PlannerItineraryScreen({ data, itineraryDataset, itineraryId, isPurchased, creatorEditMode, readOnlyMode, autoOpenPublishFlow, onBack, onDelete, onUpdate, onNavigateToAI, onSaveCreatorEdit, onNavigateToSales, onOpenItinerary, onDuplicateSuccess, onNavigateToFAQ, initialRole }: PlannerItineraryScreenProps) {
  const { user: currentUser } = useCurrentUser();
  const { session } = useAuth();
  const ownerAvatar = currentUser.avatar || '';
  const ownerName = currentUser.name || 'Você';
  // Use dataset days/suggestions when available, generate from dates, or fall back to mocks
  const daysData: DayData[] = useMemo(() => itineraryDataset ?
    itineraryDataset.days.map((d) => ({
      day: d.day,
      title: d.title,
      date: d.date,
      activities: d.activities.map((a) => ({
        id: a.id,
        startTime: a.startTime,
        endTime: a.endTime,
        category: a.category,
        categoryColor: a.categoryColor,
        name: a.name,
        image: a.image,
        openHours: a.openHours,
        rating: a.rating,
        price: a.price
      })),
      transports: d.transports.map((t) => ({
        type: t.type,
        duration: t.duration,
        cost: t.cost
      }))
    })) :
    data.isFlexible && data.durationDays ?
      Array.from({ length: data.durationDays }, (_, i) => ({
        day: i + 1,
        title: '',
        date: addDays(new Date(), i), // Fallback base date for flexible itineraries without a start date
        activities: [] as Activity[],
        transports: [] as TransportBetween[]
      })) :
      data.startDate && data.endDate ?
        Array.from({ length: differenceInDays(data.endDate, data.startDate) + 1 }, (_, i) => ({
          day: i + 1,
          title: '',
          date: addDays(data.startDate!, i),
          activities: [] as Activity[],
          transports: [] as TransportBetween[]
        })) :
        mockDays, [itineraryDataset, data.startDate, data.endDate, data.isFlexible, data.durationDays]);

  const fallbackSuggestions = itineraryDataset?.suggestions ?? suggestions;

  const [selectedDay, setSelectedDay] = useState(1);
  type RecCategory = 'all' | 'food' | 'experience' | 'attraction' | 'night' | 'event';
  const [recFilterByDay, setRecFilterByDay] = useState<Record<number, RecCategory>>({});
  const [compactView, setCompactView] = useState(false);
  const [showViewModeSheet, setShowViewModeSheet] = useState(false);
  const [showDocumentos, setShowDocumentos] = useState(false);
  const [showBudget, setShowBudget] = useState(false);
  // Inicializa tripNotes localmente primeiro
  const [tripNotes, setTripNotes] = useState<TripNote[]>(() => {
    return loadPersistedNotes(itineraryId);
  });
  const [reservas, setReservas] = useState<Reserva[]>((isPurchased || !itineraryDataset) ? [] : [
    { id: '1', tipo: 'hospedagem', nome: 'Hotel Le Marais', localizacao: 'Rue de Rivoli, Paris', checkInDate: new Date(2026, 5, 14), checkInHora: '14', checkInMinuto: '00', checkOutDate: new Date(2026, 5, 18), checkOutHora: '11', checkOutMinuto: '00', valor: '€ 480,00' },
    { id: '2', tipo: 'atividade', nome: 'Cruzeiro no Sena', localizacao: 'Port de la Bourdonnais', atividadeDate: new Date(2026, 5, 16), atividadeHora: '19', atividadeMinuto: '30', valor: '€ 35,00' }]
  );
  const [expenses, setExpenses] = useState<Expense[]>((isPurchased || !itineraryDataset) ? [] : [
    { id: '1', name: 'Hotel Le Marais', description: '4 noites', category: 'hospedagem', amountBRL: 2880, amountEUR: 480, assignedTo: ['1', '2'] },
    { id: '2', name: 'Voo ida/volta', description: 'GRU → CDG', category: 'transporte', amountBRL: 4200, amountEUR: 700, assignedTo: ['1', '2'] },
    { id: '3', name: 'Museu do Louvre', description: 'Ingresso', category: 'atividade', amountBRL: 102, amountEUR: 17, assignedTo: ['1'] },
    { id: '4', name: 'Almoço Café de Flore', description: '', category: 'alimentacao', amountBRL: 180, amountEUR: 30, assignedTo: ['1', '2'] }]
  );
  const [transportes, setTransportes] = useState<Transporte[]>((isPurchased || !itineraryDataset) ? [] : [
    { id: '1', tipo: 'voo', nome: 'LATAM LA8044', origem: 'GRU - Guarulhos', destino: 'CDG - Paris', partidaDate: new Date(2026, 5, 14), partidaHora: '22', partidaMinuto: '30', chegadaDate: new Date(2026, 5, 15), chegadaHora: '14', chegadaMinuto: '15', codigo: 'LA8044', valor: '€ 700,00' },
    { id: '2', tipo: 'trem', nome: 'Eurostar', origem: 'Gare du Nord, Paris', destino: 'St Pancras, Londres', partidaDate: new Date(2026, 5, 18), partidaHora: '09', partidaMinuto: '00', chegadaDate: new Date(2026, 5, 18), chegadaHora: '11', chegadaMinuto: '20', valor: '€ 89,00' }]
  );
  const [dayTitles, setDayTitles] = useState<Record<number, string>>({});
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [selectedActivityDay, setSelectedActivityDay] = useState<number | null>(null);
  const [activityEditMode, setActivityEditMode] = useState(false);
  const [showMapOptions, setShowMapOptions] = useState(false);
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editOriginalDuration, setEditOriginalDuration] = useState(0);
  const [editPrice, setEditPrice] = useState('');
  const [editCurrencySymbol, setEditCurrencySymbol] = useState('R$');
  const [editObservation, setEditObservation] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [showPlanLimitSheet, setShowPlanLimitSheet] = useState(false);
  const [showPublishFlow, setShowPublishFlow] = useState(!!autoOpenPublishFlow);
  const [showPublishToast, setShowPublishToast] = useState(false);
  const [showEditPublish, setShowEditPublish] = useState(false);
  const [itineraryData, setItineraryData] = useState(data);
  const [manualCover, setManualCover] = useState<string | null>(data.coverImage ?? null);
  const isFlexibleDates = itineraryData.isFlexible || itineraryData.tags?.includes('_FLEXIBLE_DATES_') || (itineraryDataset as any)?.tags?.includes('_FLEXIBLE_DATES_');
  const isFirstRender = useRef(true);

  const [isItineraryPublic, setIsItineraryPublic] = useState(data.isPublic ?? false);
  const [publishedPriceCents, setPublishedPriceCents] = useState<number | null>(data.priceCents ?? null);
  const [publishedDescription, setPublishedDescription] = useState<string>(data.description ?? '');
  const [publishedTags, setPublishedTags] = useState<string[]>(data.tags ?? []);
  const [publishedSeasons, setPublishedSeasons] = useState<string[]>(data.seasons ?? []);
  const [publishedMainTag, setPublishedMainTag] = useState<string>(data.mainTag ?? '');

  // Persist publish state to backend whenever it changes (only for user-owned itineraries)
  const persistPublishState = useCallback(async (next: boolean, extras?: {
    priceCents?: number | null;
    description?: string;
    tags?: string[];
    mainTag?: string;
    title?: string;
  }) => {
    setIsItineraryPublic(next);
    if (extras?.priceCents !== undefined) setPublishedPriceCents(extras.priceCents);
    if (extras?.description !== undefined) setPublishedDescription(extras.description);
    if (extras?.tags !== undefined) setPublishedTags(extras.tags);
    if (extras?.seasons !== undefined) setPublishedSeasons(extras.seasons);
    if (extras?.mainTag !== undefined) setPublishedMainTag(extras.mainTag);
    if (typeof itineraryId === 'string' && !itineraryId.startsWith('pending-itinerary-')) {
      await updateItineraryRow(itineraryId, {
        status: next ? 'published' : 'draft',
        ...(extras?.title !== undefined ? { title: extras.title } : {}),
      });

      if (session?.user?.id) {
        if (next) {
          await upsertStoreListing(itineraryId, {
            sellerId: session.user.id,
            listedTitle: extras?.title ?? itineraryData.tripName?.trim() ?? itineraryData.destinations[0] ?? 'Roteiro',
            listedDescription: extras?.description ?? publishedDescription,
            tags: extras?.tags ?? publishedTags,
            seasons: extras?.seasons ?? publishedSeasons,
            priceCents: extras?.priceCents ?? publishedPriceCents,
            status: 'active'
          });
        } else {
          await upsertStoreListing(itineraryId, {
            sellerId: session.user.id,
            listedTitle: extras?.title ?? itineraryData.tripName?.trim() ?? itineraryData.destinations[0] ?? 'Roteiro',
            status: 'inactive'
          });
        }
      }
    }
  }, [itineraryId, itineraryData.tripName, itineraryData.destinations, publishedDescription, publishedTags, publishedSeasons, publishedPriceCents, session?.user?.id]);



  const [showManageItinerary, setShowManageItinerary] = useState(false);

  const { itineraries: myItinerariesForLimit } = useMyItineraries();
  const FREE_PLAN_ITINERARY_LIMIT = Infinity;
  const ownCreatedCount = myItinerariesForLimit.filter(
    (it) => it.userId === session?.user?.id && it.sourceDatasetId == null
  ).length;



  // Sync changes back to parent (trips list)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    onUpdate?.(itineraryData);
  }, [itineraryData]);

  // Recompute days when itineraryData dates change (user edits dates)
  const effectiveDaysData: DayData[] = React.useMemo(() => {
    if (itineraryData.isFlexible && itineraryData.durationDays) {
      const totalDays = itineraryData.durationDays;
      return Array.from({ length: totalDays }, (_, i) => {
        const existingDay = daysData.find(d => d.day === i + 1);
        return {
          day: i + 1,
          title: existingDay?.title ?? '',
          date: addDays(new Date(), i),
          activities: existingDay?.activities ?? [],
          transports: existingDay?.transports ?? [],
        };
      });
    }

    if (itineraryData.startDate && itineraryData.endDate) {
      const totalDays = differenceInDays(itineraryData.endDate, itineraryData.startDate) + 1;
      return Array.from({ length: totalDays }, (_, i) => {
        const existingDay = daysData.find(d => d.day === i + 1);
        return {
          day: i + 1,
          title: existingDay?.title ?? '',
          date: addDays(itineraryData.startDate!, i),
          activities: existingDay?.activities ?? [],
          transports: existingDay?.transports ?? [],
        };
      });
    }
    return daysData;
  }, [itineraryData.startDate, itineraryData.endDate, itineraryData.isFlexible, itineraryData.durationDays, daysData]);
  const [isOpeningDuplicate, setIsOpeningDuplicate] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [mapFocusedPlace, setMapFocusedPlace] = useState<MapPlace | null>(null);
  const [openDays, setOpenDays] = useState<Set<number>>(new Set([1]));
  const openDaysRef = useRef<Set<number>>(openDays);
  openDaysRef.current = openDays;

  const handleDuplicate = async () => {
    if (isOpeningDuplicate || isViewer) return;
    if (!isUuidId || typeof itineraryId !== 'string') {
      toast.error('Não foi possível duplicar este roteiro.');
      return;
    }
    setIsOpeningDuplicate(true);
    try {
      const firstDestination = itineraryData.destinations[0] ?? 'Paris, França';
      const baseTitle = itineraryData.tripName?.trim() || itineraryDataset?.title || `${firstDestination.split(',')[0].trim()} trip`;

      const newItinerary = await createItinerary({
        title: `${baseTitle} (1)`,
        destinations: itineraryData.destinations.length > 0 ? [...itineraryData.destinations] : ['Paris, França'],
        startDate: itineraryData.startDate ? itineraryData.startDate.toISOString() : null,
        endDate: itineraryData.endDate ? itineraryData.endDate.toISOString() : null,
        isFlexible: itineraryData.isFlexible,
        durationDays: itineraryData.durationDays,
        travelMonth: itineraryData.travelMonth,
      });
      if (!newItinerary) throw new Error('createItinerary returned null');

      await savePlannerData(newItinerary.id, { activities: dayActivities, transports: dayTransports });
      await saveItineraryDocs(newItinerary.id, { reservas, transportes });
      await saveBudget(newItinerary.id, expenses);

      addOptimisticItinerary(newItinerary);
      setIsOpeningDuplicate(false);
      onDuplicateSuccess?.();
    } catch (e) {
      console.error('[PlannerItineraryScreen] duplicate failed', e);
      setIsOpeningDuplicate(false);
      toast.error('Erro ao duplicar roteiro.');
    }
  };

  const toggleDayAccordion = useCallback((day: number) => {
    setOpenDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      openDaysRef.current = next;
      return next;
    });
  }, []);

  const [showAddAction, setShowAddAction] = useState(false);
  const [showAddPlace, setShowAddPlace] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);
  const [noteTargetActivity, setNoteTargetActivity] = useState<Activity | null>(null);
  const [showAddTripNote, setShowAddTripNote] = useState(false);
  const [showAddDayTransport, setShowAddDayTransport] = useState(false);
  const [budgetAutoAdd, setBudgetAutoAdd] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showDocTypePicker, setShowDocTypePicker] = useState(false);
  const [showAddDocumento, setShowAddDocumento] = useState(false);
  const [documentoTypeToOpen, setDocumentoTypeToOpen] = useState<DocType>('hospedagem');
  const [showAddDeslocamento, setShowAddDeslocamento] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const [checklistChecked, setChecklistChecked] = useState(0);
  const [checklistTotal, setChecklistTotal] = useState(12);
  const [showManualActivity, setShowManualActivity] = useState(false);
  const [showReorder, setShowReorder] = useState(false);
  const [showAiPlanSheet, setShowAiPlanSheet] = useState(false);
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    activity: null,
    sourceDay: null,
    sourceIndex: null,
    targetDay: null,
    targetIndex: null,
    pointerPos: { x: 0, y: 0 },
    dragOffset: { x: 0, y: 0 },
    cardWidth: 345,
  });
  const dragStateRef = useRef(dragState);
  dragStateRef.current = dragState;
  const autoScrollRafRef = useRef<number | null>(null);
  const autoExpandTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [showAiRecommendationsScreen, setShowAiRecommendationsScreen] = useState(false);
  const [aiRecommendationsTargetDay, setAiRecommendationsTargetDay] = useState(1);
  const [isAiPlanning, setIsAiPlanning] = useState(false);
  const [aiProgress, setAiProgress] = useState({ current: 0, total: 0 });
  const [aiLoadingDays, setAiLoadingDays] = useState<Set<number>>(new Set());
  const aiAbortRef = useRef(false);

  const cancelAiPlanning = useCallback(() => {
    aiAbortRef.current = true;
    setIsAiPlanning(false);
    setAiLoadingDays(new Set());
    setShowAiPlanSheet(false);
  }, []);

  const mainCityName = useMemo(() => {
    if (itineraryData.destinations && itineraryData.destinations.length > 0) {
      return itineraryData.destinations[0].split(',')[0].trim();
    }
    return 'Lisboa';
  }, [itineraryData.destinations]);
  const [optimizingDays, setOptimizingDays] = useState<Set<number>>(new Set());
  const [optimizedFlash, setOptimizedFlash] = useState<Set<number>>(new Set());
  const [confirmOptimizeDay, setConfirmOptimizeDay] = useState<number | null>(null);
  const persistKey = String(itineraryId ?? itineraryDataset?.id ?? data.destinations[0] ?? 'default');
  const [budgetExtraPeople, setBudgetExtraPeople] = useState<{ id: string; name: string; color: string }[]>(itineraryDataset?.extraPeople ?? []);

  // Persist budgetExtraPeople to backend when it changes
  useEffect(() => {
    if (itineraryId) {
      updateItinerary(itineraryId, { extraPeople: budgetExtraPeople }).catch(e => console.error('Failed to update extraPeople', e));
    }
  }, [budgetExtraPeople, itineraryId]);
  const dataVersion = itineraryDataset?.dataVersion;
  const [dayActivities, setDayActivities] = useState<Record<number, Activity[]>>(() => loadPersistedActivities(persistKey, dataVersion));
  const [dayTransports, setDayTransports] = useState<Record<number, TransportBetween[]>>(() => loadPersistedTransports(persistKey, dataVersion));
  const [deletedUndo, setDeletedUndo] = useState<{ activity: Activity; day: number; index: number; } | null>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const stickyTabsRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [needsScroll, setNeedsScroll] = useState(false);
  const [stickyTabsHeight, setStickyTabsHeight] = useState(64);
  const stickySentinelRef = useRef<HTMLDivElement>(null);
  const safeTopBarRef = useRef<HTMLDivElement>(null);
  const [tabsStuck, setTabsStuck] = useState(false);
  const daySectionRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const isScrollingToDay = useRef(false);

  // Persist activities & transports to localStorage (cache local imediato).
  useEffect(() => {
    savePersistedActivities(persistKey, dayActivities, dataVersion);
  }, [dayActivities, persistKey, dataVersion]);

  useEffect(() => {
    savePersistedTransports(persistKey, dayTransports, dataVersion);
    savePersistedNotes(persistKey, tripNotes, dataVersion);
  }, [dayTransports, tripNotes, persistKey, dataVersion]);

  // ─── Backend sync (Lovable Cloud) ──────────────────────────────────────
  // O `localStorage` acima é cache de leitura imediata; o servidor é a
  // fonte da verdade. Stale-while-revalidate: usamos o cache no mount,
  // e ao terminar o fetch sobrescrevemos o estado se houver dados remotos.
  const isUuidId = typeof itineraryId === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(itineraryId);
  const hasHydratedRef = useRef(false);
  const lastSaveTimeRef = useRef(0);

  const reloadPlanner = useCallback(async () => {
    if (!isUuidId || typeof itineraryId !== 'string') return;

    // Ignorar eventos Realtime se salvamos há menos de 2.5s (eco do próprio save)
    // Isso evita o loop infinito de requisições de rede
    if (Date.now() - lastSaveTimeRef.current < 2500) {
      return;
    }

    const remote = await loadPlannerData(itineraryId);
    if (!remote) return;
    const hasRemoteActivities = Object.values(remote.activities).some((arr) => arr.length > 0);
    const hasRemoteTransports = Object.values(remote.transports).some((arr) => arr.length > 0);
    // Sempre que vier do realtime depois da primeira hidratação, sobrescreve
    // mesmo se vazio — para refletir deletes feitos por outro participante.
    if (hasHydratedRef.current) {
      setDayActivities(remote.activities as Record<number, Activity[]>);
      setDayTransports(remote.transports as Record<number, TransportBetween[]>);
    } else {
      if (hasRemoteActivities) {
        setDayActivities(remote.activities as Record<number, Activity[]>);
      }
      if (hasRemoteTransports) {
        setDayTransports(remote.transports as Record<number, TransportBetween[]>);
      }
      hasHydratedRef.current = true;
    }
  }, [isUuidId, itineraryId]);

  useEffect(() => {
    void reloadPlanner();
  }, [reloadPlanner]);

  // Debounced save no backend a cada mudança de activities/transports.
  useEffect(() => {
    if (!isUuidId || typeof itineraryId !== 'string') return;
    const handle = setTimeout(() => {
      // Atualiza o timer para sinalizar que os próximos eventos Realtime são nossos
      lastSaveTimeRef.current = Date.now();
      void savePlannerData(itineraryId, {
        activities: dayActivities,
        transports: dayTransports,
      });
    }, 600);
    return () => clearTimeout(handle);
  }, [isUuidId, itineraryId, dayActivities, dayTransports]);

  // ─── Membros compartilhados (Lovable Cloud) ─────────────────────────────
  const [sharedMembers, setSharedMembers] = useState<ItineraryMember[]>(() => {
    if (typeof itineraryId === 'string') {
      return getCachedItineraryMembers(itineraryId) || [];
    }
    return [];
  });
  const [myRole, setMyRole] = useState<ItineraryRole | null>(() => {
    if (initialRole) return initialRole;
    if (typeof itineraryId === 'string' && session?.user?.id) {
      if (itineraryDataset && 'myRole' in itineraryDataset && (itineraryDataset as any).myRole) {
        return (itineraryDataset as any).myRole;
      }
      if (itineraryDataset && 'userId' in itineraryDataset && (itineraryDataset as any).userId === session.user.id) {
        return 'owner';
      }
      const owner = getCachedOwnerProfile(itineraryId);
      if (owner?.userId === session.user.id) return 'owner';

      const members = getCachedItineraryMembers(itineraryId) || [];
      const me = members.find(m => m.userId === session.user.id);
      if (me) return me.role;
    }
    return null;
  });
  const [ownerProfile, setOwnerProfile] = useState<{ userId: string; name: string; avatar?: string } | null>(() => {
    if (typeof itineraryId === 'string') {
      return getCachedOwnerProfile(itineraryId);
    }
    return null;
  });
  const [loadingMembers, setLoadingMembers] = useState<boolean>(() => {
    if (typeof itineraryId === 'string' && isUuidId) {
      return getCachedOwnerProfile(itineraryId) === null;
    }
    return false;
  });
  const isViewer = useMemo(() => {
    if (readOnlyMode) return true;
    if (myRole === 'viewer') return true;
    if (myRole === 'editor' || myRole === 'owner') return false;
    // Assume viewer during initial load to prevent edit buttons from flickering to guests
    if (loadingMembers && isUuidId) return true;
    return false;
  }, [myRole, loadingMembers, isUuidId, readOnlyMode]);

  // Mantém os toasts (sonner) acima do FAB flutuante (56px, bottom 24px / 92px no modo edição).
  useEffect(() => {
    if (isViewer) return;
    const root = document.documentElement;
    const previous = root.style.getPropertyValue('--toast-bottom-offset');
    root.style.setProperty('--toast-bottom-offset', `calc(env(safe-area-inset-bottom, 0px) + ${creatorEditMode ? 148 : 80}px)`);
    return () => {
      if (previous) root.style.setProperty('--toast-bottom-offset', previous);
      else root.style.removeProperty('--toast-bottom-offset');
    };
  }, [isViewer, creatorEditMode]);

  const reloadMembers = useCallback(async () => {
    if (!isUuidId || typeof itineraryId !== 'string') {
      setLoadingMembers(false);
      return;
    }
    try {
      const [m, owner] = await Promise.all([
        listItineraryMembers(itineraryId),
        getItineraryOwnerProfile(itineraryId),
      ]);
      setSharedMembers(m);
      setOwnerProfile(owner);
    } catch {
      /* silencioso */
    } finally {
      setLoadingMembers(false);
    }
    if (session?.user?.id) {
      const role = await getMyRole(itineraryId, session.user.id);
      setMyRole(role);
    }
  }, [isUuidId, itineraryId, session?.user?.id]);

  useEffect(() => {
    reloadMembers();

    // Notes cache refresh se necessário
    if (typeof itineraryId === 'string') {
      const cachedNotes = loadPersistedNotes(itineraryId, dataVersion);
      if (cachedNotes.length > 0) {
        setTripNotes(cachedNotes);
      }
    }
  }, [reloadMembers, itineraryId, dataVersion]);


  // ─── Documentos (reservas + transportes-doc) sync com Lovable Cloud ───
  const docsHydratedRef = useRef(false);
  const skipNextDocsSaveRef = useRef(false);
  const lastDocsSaveTimeRef = useRef(0);

  const reloadDocs = useCallback(async () => {
    if (!isUuidId || typeof itineraryId !== 'string') return;
    if (Date.now() - lastDocsSaveTimeRef.current < 2500) {
      return;
    }
    const remote = await loadItineraryDocs(itineraryId);
    if (!remote) return;
    if (docsHydratedRef.current) {
      // Realtime: sempre reflete o estado do backend (mesmo vazio)
      skipNextDocsSaveRef.current = true;
      setReservas(remote.reservas);
      setTransportes(remote.transportes);
    } else {
      if (remote.reservas.length > 0 || remote.transportes.length > 0) {
        skipNextDocsSaveRef.current = true;
        if (remote.reservas.length > 0) setReservas(remote.reservas);
        if (remote.transportes.length > 0) setTransportes(remote.transportes);
      }
      docsHydratedRef.current = true;
    }
  }, [isUuidId, itineraryId]);

  useEffect(() => { void reloadDocs(); }, [reloadDocs]);

  // Debounced save (faz upload de _pendingFile antes do insert).
  useEffect(() => {
    if (!isUuidId || typeof itineraryId !== 'string') return;
    if (skipNextDocsSaveRef.current) {
      skipNextDocsSaveRef.current = false;
      return;
    }
    const handle = setTimeout(async () => {
      lastDocsSaveTimeRef.current = Date.now();
      const result = await saveItineraryDocs(itineraryId, { reservas, transportes });
      if (!result) return;
      const hasPendingResv = reservas.some((r) => r._pendingFile);
      const hasPendingTrans = transportes.some((t) => t._pendingFile);
      if (hasPendingResv || hasPendingTrans) {
        skipNextDocsSaveRef.current = true;
        if (hasPendingResv) setReservas(result.reservas);
        if (hasPendingTrans) setTransportes(result.transportes);
      }
    }, 600);
    return () => clearTimeout(handle);
  }, [isUuidId, itineraryId, reservas, transportes]);

  // ─── Notas (notes) sync com Lovable Cloud ──────────────────────────────
  const notesHydratedRef = useRef(false);
  const skipNextNotesSaveRef = useRef(false);
  const lastNotesSaveTimeRef = useRef(0);

  const reloadNotes = useCallback(async () => {
    if (!isUuidId || typeof itineraryId !== 'string') return;
    if (Date.now() - lastNotesSaveTimeRef.current < 2500) {
      return;
    }
    const remote = await loadItineraryNotes(itineraryId);
    if (!remote) return;
    skipNextNotesSaveRef.current = true;
    if (notesHydratedRef.current || remote.length > 0) {
      setTripNotes(remote);
    }
    notesHydratedRef.current = true;
  }, [itineraryId, isUuidId]);

  useEffect(() => { void reloadNotes(); }, [reloadNotes]);

  useEffect(() => {
    if (!isUuidId || isViewer) return;
    if (!notesHydratedRef.current) return;

    if (skipNextNotesSaveRef.current) {
      skipNextNotesSaveRef.current = false;
      return;
    }
    lastNotesSaveTimeRef.current = Date.now();
    void saveItineraryNotes(itineraryId, tripNotes);
  }, [tripNotes, isUuidId, itineraryId, isViewer]);

  // ─── Orçamento (expenses) sync com Lovable Cloud ──────────────────────
  const budgetHydratedRef = useRef(false);
  const skipNextBudgetSaveRef = useRef(false);
  const lastBudgetSaveTimeRef = useRef(0);

  const reloadBudget = useCallback(async () => {
    if (!isUuidId || typeof itineraryId !== 'string') return;
    if (Date.now() - lastBudgetSaveTimeRef.current < 2500) {
      return;
    }
    const remote = await loadBudget(itineraryId);
    if (!remote) return;
    if (budgetHydratedRef.current) {
      skipNextBudgetSaveRef.current = true;
      setExpenses(remote);
    } else {
      if (remote.length > 0) {
        skipNextBudgetSaveRef.current = true;
        setExpenses(remote);
      }
      budgetHydratedRef.current = true;
    }
  }, [isUuidId, itineraryId]);

  useEffect(() => { void reloadBudget(); }, [reloadBudget]);

  useEffect(() => {
    if (!isUuidId || typeof itineraryId !== 'string') return;
    if (skipNextBudgetSaveRef.current) {
      skipNextBudgetSaveRef.current = false;
      return;
    }
    const handle = setTimeout(() => {
      lastBudgetSaveTimeRef.current = Date.now();
      void saveBudget(itineraryId, expenses);
    }, 600);
    return () => clearTimeout(handle);
  }, [isUuidId, itineraryId, expenses]);

  // ─── Realtime: itinerário (capa, título, datas) ───────────────────────
  const skipNextMetaRemoteRef = useRef(false);
  const reloadItineraryMeta = useCallback(async () => {
    if (!isUuidId || typeof itineraryId !== 'string') return;
    if (skipNextMetaRemoteRef.current) {
      skipNextMetaRemoteRef.current = false;
      return;
    }
    const { data, error } = await supabase
      .from('itineraries')
      .select('title, start_date, end_date, cover_image_url, destinations')
      .eq('id', itineraryId)
      .maybeSingle();
    if (error || !data) return;
    setItineraryData((prev) => {
      const tripName = data.title ?? prev.tripName;
      const destinations = Array.isArray(data.destinations) && data.destinations.length > 0
        ? data.destinations
        : prev.destinations;
      const startDate = data.start_date ? parseLocalDate(data.start_date) : undefined;
      const endDate = data.end_date ? parseLocalDate(data.end_date) : undefined;
      const coverImage = data.cover_image_url ? data.cover_image_url : prev.coverImage;

      if (
        prev.tripName === tripName &&
        prev.startDate?.getTime() === startDate?.getTime() &&
        prev.endDate?.getTime() === endDate?.getTime() &&
        prev.coverImage === coverImage &&
        JSON.stringify(prev.destinations) === JSON.stringify(destinations)
      ) {
        return prev;
      }

      return {
        ...prev,
        tripName,
        destinations,
        startDate,
        endDate,
        coverImage,
      };
    });
    if (Array.isArray(data.images) && data.images[0]) {
      setManualCover(data.images[0]);
    }
  }, [isUuidId, itineraryId]);

  useItineraryRealtime(typeof itineraryId === 'string' ? itineraryId : null, {
    onItineraryChange: () => { void reloadItineraryMeta(); },
    onActivitiesChange: () => { void reloadPlanner(); },
    onTransportsChange: () => { void reloadPlanner(); },
    onReservationsChange: () => { void reloadDocs(); },
    onDocTransportsChange: () => { void reloadDocs(); },
    onExpensesChange: () => { void reloadBudget(); },
    onNotesChange: () => { void reloadNotes(); },
    onMembersChange: () => { void reloadMembers(); },
  });

  // Refetch on window focus to catch any realtime events missed while tab was in background
  useEffect(() => {
    if (typeof itineraryId !== 'string' || !isUuidId) return;

    const handleFocus = () => {
      if (!document.hidden) {
        void reloadItineraryMeta();
        void reloadPlanner();
        void reloadDocs();
        void reloadBudget();
        void reloadNotes();
        void reloadMembers();
      }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('visibilitychange', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('visibilitychange', handleFocus);
    };
  }, [itineraryId, isUuidId, reloadItineraryMeta, reloadPlanner, reloadDocs, reloadBudget, reloadNotes, reloadMembers]);

  const checkScrollArrows = useCallback(() => {
    if (tabsRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tabsRef.current;
      const hasOverflow = scrollWidth > clientWidth + 5;
      setNeedsScroll(prev => prev !== hasOverflow ? hasOverflow : prev);
      setCanScrollLeft(prev => prev !== (scrollLeft > 5) ? (scrollLeft > 5) : prev);
      setCanScrollRight(prev => prev !== (scrollLeft < scrollWidth - clientWidth - 5) ? (scrollLeft < scrollWidth - clientWidth - 5) : prev);
    }
  }, []);

  useEffect(() => {
    const el = tabsRef.current;
    if (!el) return;

    // Delay initial check so layout is computed
    const timer = setTimeout(checkScrollArrows, 50);

    el.addEventListener('scroll', checkScrollArrows);
    window.addEventListener('resize', checkScrollArrows);

    const ro = new ResizeObserver(checkScrollArrows);
    ro.observe(el);

    return () => {
      clearTimeout(timer);
      el.removeEventListener('scroll', checkScrollArrows);
      window.removeEventListener('resize', checkScrollArrows);
      ro.disconnect();
    };
  }, [checkScrollArrows, effectiveDaysData]);

  // Detecta quando o carrossel de dias está "grudado" no topo, para exibir a faixa
  // que cobre a área da ilha/status bar (evita padding permanente acima do carrossel).
  useEffect(() => {
    let rafId = 0;
    const check = () => {
      rafId = 0;
      const sentinel = stickySentinelRef.current;
      if (!sentinel) return;
      const stuck = sentinel.getBoundingClientRect().top <= 0;
      setTabsStuck((current) => current === stuck ? current : stuck);
    };
    const onScroll = () => { if (!rafId) rafId = window.requestAnimationFrame(check); };
    check();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  useEffect(() => {
    const el = stickyTabsRef.current;
    if (!el) return;

    let rafId = 0;
    const updateHeight = () => {
      const safeTop = safeTopBarRef.current?.offsetHeight ?? 0;
      const nextHeight = Math.round((el.getBoundingClientRect().height || 64) + safeTop);
      setStickyTabsHeight((current) => current === nextHeight ? current : nextHeight);
    };
    const scheduleUpdate = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        updateHeight();
      });
    };

    updateHeight();

    const resizeObserver = new ResizeObserver(scheduleUpdate);
    resizeObserver.observe(el);
    window.addEventListener('resize', scheduleUpdate);

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', scheduleUpdate);
    };
  }, []);

  useEffect(() => {
    let ticking = false;

    const syncSelectedDayWithScroll = () => {
      if (isScrollingToDay.current || effectiveDaysData.length === 0 || dragStateRef.current.isDragging) return;

      const activationLine = stickyTabsHeight + 28;
      let nextActiveDay = effectiveDaysData[0].day;

      for (const dayItem of effectiveDaysData) {
        const section = daySectionRefs.current[dayItem.day];
        if (!section) continue;

        const sectionTop = section.getBoundingClientRect().top;
        if (sectionTop <= activationLine) {
          nextActiveDay = dayItem.day;
          continue;
        }

        break;
      }

      setSelectedDay((current) => current === nextActiveDay ? current : nextActiveDay);
    };

    const handleScroll = () => {
      if (ticking) return;

      ticking = true;
      requestAnimationFrame(() => {
        syncSelectedDayWithScroll();
        ticking = false;
      });
    };

    const timer = window.setTimeout(syncSelectedDayWithScroll, 80);

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [effectiveDaysData, stickyTabsHeight]);

  // Auto-scroll day tab into view when selectedDay changes
  useEffect(() => {
    if (tabsRef.current) {
      const tabEl = tabsRef.current.querySelector(`[data-day-tab="${selectedDay}"]`) as HTMLElement;
      if (tabEl) {
        const container = tabsRef.current;
        const tabLeft = tabEl.offsetLeft;
        const tabWidth = tabEl.offsetWidth;
        const containerWidth = container.clientWidth;
        const scrollTarget = tabLeft - containerWidth / 2 + tabWidth / 2;
        container.scrollTo({ left: Math.max(0, scrollTarget), behavior: 'smooth' });
      }
    }
    setTimeout(checkScrollArrows, 350);
  }, [selectedDay]);

  const tripDays = itineraryData.isFlexible && itineraryData.durationDays
    ? itineraryData.durationDays
    : (itineraryData.startDate && itineraryData.endDate
      ? differenceInDays(itineraryData.endDate, itineraryData.startDate) + 1
      : (effectiveDaysData.length > 0 ? effectiveDaysData.length : 7));

  // Destination-aware recommendations: resolve per selected day
  // Sugestões dinâmicas: usa banco local + busca POIs reais (Overpass/Wikipedia) da cidade do dia.
  // IMPORTANTE: só usar a lista hardcoded (Amsterdam) como fallback quando NÃO há
  // destinos definidos pelo usuário — caso contrário, mostraríamos Amsterdam para todos.
  const hasUserDestinations =
    Array.isArray(itineraryData.destinations) && itineraryData.destinations.length > 0;

  const dayActivitiesRef = useRef(dayActivities);
  useEffect(() => { dayActivitiesRef.current = dayActivities; }, [dayActivities]);

  // Migration: backfill category/categoryColor AND lat/lng for cached activities missing them
  useEffect(() => {
    // Also get all city places for lat/lng lookup
    const allCityPlaces = getPlacesForDestinations(
      itineraryData.destinations?.length ? itineraryData.destinations : ['paris']
    );

    const patched = { ...dayActivities };
    let changed = false;
    let coordsChanged = false;

    for (const day of Object.keys(patched)) {
      patched[Number(day)] = patched[Number(day)].map(a => {
        let updated = a;
        // Backfill lat/lng
        if (!a.lat || !a.lng) {
          const placeMatch = allCityPlaces.find(p => p.name.toLowerCase() === a.name.toLowerCase());
          if (placeMatch?.lat && placeMatch?.lng) {
            coordsChanged = true;
            updated = { ...updated, lat: placeMatch.lat, lng: placeMatch.lng };
          }
        }
        return updated;
      });
    }

    if (changed || coordsChanged) {
      setDayActivities(patched);
    }

    // If coords were backfilled, clear transports to force recalculation
    if (coordsChanged) {
      setDayTransports({});
    }
  }, [dayActivities, itineraryData.destinations]);


  const timeToMin = (t?: string): number => {
    if (!t) return Infinity;
    const m = /^(\d{1,2}):(\d{2})/.exec(String(t).trim());
    if (!m) return Infinity;
    const h = Number(m[1]);
    const min = Number(m[2]);
    if (isNaN(h) || isNaN(min)) return Infinity;
    return h * 60 + min;
  };

  const sortActivitiesChronologically = (activities: Activity[]): Activity[] => {
    return activities;
  };

  const getAllActivities = useCallback((day: number): Activity[] => {
    if (dayActivities[day] !== undefined) {
      return dayActivities[day];
    }
    const raw = effectiveDaysData.find((d) => d.day === day)?.activities ?? [];
    return raw;
  }, [effectiveDaysData, dayActivities]);

  // Build mutable transports: base data overridden by mutable state
  const getAllTransports = useCallback((day: number): TransportBetween[] => {
    if (dayTransports[day] !== undefined) return dayTransports[day];
    const base = effectiveDaysData.find((d) => d.day === day);
    return base?.transports ?? [];
  }, [effectiveDaysData, dayTransports]);

  const handlePlanWithAi = useCallback(async (mode: 'all' | 'empty') => {
    aiAbortRef.current = false;

    const tripDays = effectiveDaysData.length;
    const targetDays = effectiveDaysData
      .map((d) => d.day)
      .filter((day) => {
        if (mode === 'all') return true;
        const acts = getAllActivities(day);
        return acts.length === 0;
      });

    if (targetDays.length === 0) {
      toast.info('Não há dias vazios para planejar.');
      return;
    }

    setIsAiPlanning(true);
    setAiProgress({ current: 0, total: targetDays.length });
    setAiLoadingDays(new Set(targetDays));

    const usedNames = new Set<string>();
    if (mode === 'empty') {
      Object.values(dayActivitiesRef.current ?? {}).forEach((acts) => {
        (acts as Activity[] | undefined)?.forEach((a) => {
          if (a?.name) usedNames.add(a.name.trim().toLowerCase());
        });
      });
    }

    const { fetchPlacesForCity } = await import('@/lib/placesApi');

    let completed = 0;

    for (const day of targetDays) {
      if (aiAbortRef.current) break;

      const destName = itineraryData.destinations?.length
        ? getDestinationForDay(itineraryData.destinations, day, tripDays)
        : 'Paris, França';

      let pool: any[] = [];
      try {
        pool = await fetchPlacesForCity(destName);
      } catch (e) {
        console.error('Error fetching places for AI planning:', e);
      }

      if (aiAbortRef.current) break;

      if (!pool || pool.length === 0) {
        pool = getPlacesForDestinations([destName]);
      }

      const available = pool.filter((p) => !usedNames.has(p.name.trim().toLowerCase()));
      const candidates = (available.length >= 3 ? available : pool).slice(0, 5);

      if (candidates.length > 0) {
        const slots = [
          { start: '09:30', duration: 90 },
          { start: '12:30', duration: 75 },
          { start: '15:00', duration: 90 },
          { start: '19:30', duration: 90 },
          { start: '22:00', duration: 120 },
        ];

        const generated: Activity[] = candidates.map((item: any, idx: number) => {
          usedNames.add(item.name.trim().toLowerCase());
          const slot = slots[idx % slots.length];
          const parseHHMM = (s: string) => {
            const m = /(\d{1,2}):(\d{2})/.exec(s || '');
            if (!m) return 570;
            return Math.min(23, parseInt(m[1], 10)) * 60 + Math.min(59, parseInt(m[2], 10));
          };
          const totalMins = parseHHMM(slot.start) + (item.duration || slot.duration);
          const endH = Math.floor(totalMins / 60) % 24;
          const endM = totalMins % 60;
          const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

          return {
            id: Date.now() + idx + Math.floor(Math.random() * 10000),
            type: 'activity',
            name: item.name,
            startTime: slot.start,
            endTime,
            category: item.category || 'Ponto Turístico',
            categoryColor: item.categoryColor || '#10B981',
            image: item.image || 'https://images.unsplash.com/photo-1503220317375-aaad61436b1b?w=300',
            openHours: item.openHours || '',
            rating: item.rating || 4.5,
            price: item.price || estimatedPriceFor(item.name, item.city || destName),
            lat: item.lat,
            lng: item.lng,
          };
        });

        if (aiAbortRef.current) break;

        setDayActivities((prev) => ({ ...prev, [day]: generated }));

        const needed = Math.max(0, generated.length - 1);
        const newTransports: TransportBetween[] = Array.from({ length: needed }, () => ({
          type: 'walk' as const,
          duration: '15 min',
        }));
        setDayTransports((prev) => ({ ...prev, [day]: newTransports }));
      }

      if (aiAbortRef.current) break;

      completed++;
      setAiProgress({ current: completed, total: targetDays.length });
      setAiLoadingDays((prev) => {
        const next = new Set(prev);
        next.delete(day);
        return next;
      });
    }

    if (aiAbortRef.current) {
      setIsAiPlanning(false);
      setAiLoadingDays(new Set());
      setShowAiPlanSheet(false);
      toast.info('Planejamento com IA cancelado.');
      return;
    }

    setIsAiPlanning(false);
    setAiLoadingDays(new Set());
    setShowAiPlanSheet(false);
    toast.success(
      mode === 'all'
        ? 'Roteiro inteiro planejado com sucesso pela IA!'
        : 'Dias vazios planejados com sucesso pela IA!'
    );
  }, [effectiveDaysData, itineraryData.destinations, getAllActivities]);

  // Detecta nomes de atividades repetidos em mais de um dia do roteiro
  const repeatedActivityNames = React.useMemo(() => {
    const counts = new Map<string, number>();
    const allDays = new Set<number>([
      ...effectiveDaysData.map((d) => d.day),
      ...Object.keys(dayActivities).map((k) => Number(k)),
    ]);
    allDays.forEach((day) => {
      const acts = getAllActivities(day);
      const seen = new Set<string>();
      acts.forEach((a) => {
        if (a.type === 'note') return;
        const key = a.name?.trim().toLowerCase();
        if (!key) return;
        if (seen.has(key)) return;
        seen.add(key);
        counts.set(key, (counts.get(key) ?? 0) + 1);
      });
    });
    const repeated = new Set<string>();
    counts.forEach((count, name) => {
      if (count > 1) repeated.add(name);
    });
    return repeated;
  }, [effectiveDaysData, dayActivities, getAllActivities]);

  // ─── Auto-sync: Reservas/Transportes/Atividades → Orçamento ───
  // Qualquer item com valor monetário no roteiro vira um Expense espelho (id prefixado com 'auto:').
  // Expenses manuais criados na tela de Orçamento (sem prefixo 'auto:') são preservados.
  const parseValor = useCallback((raw?: string): number => {
    if (!raw) return 0;
    // Aceita "R$ 1.250,00", "€ 480,00", "1250,00", "1250.50", etc.
    const cleaned = String(raw).replace(/[^\d,.\-]/g, '').trim();
    if (!cleaned) return 0;
    let num = 0;
    if (cleaned.includes(',')) {
      // Formato BR: pontos = milhar, vírgula = decimal
      num = parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
    } else {
      num = parseFloat(cleaned);
    }
    if (isNaN(num)) return 0;
    // Heurística: se o valor original tinha "€", converter aproximadamente para BRL
    if (/€/.test(raw)) num = num * 6;
    return num;
  }, []);

  useEffect(() => {
    const autoExpenses: Expense[] = [];

    // Transportes
    transportes.forEach((t) => {
      const amount = parseValor(t.valor);
      if (amount > 0) {
        autoExpenses.push({
          id: `auto:transporte:${t.id}`,
          name: t.nome || 'Transporte',
          description: [t.origem, t.destino].filter(Boolean).join(' → '),
          category: 'transporte',
          amountBRL: amount,
          amountEUR: amount / 6,
          assignedTo: [],
        });
      }
    });

    // Reservas (hospedagem ou atividade)
    reservas.forEach((r) => {
      const amount = parseValor(r.valor);
      if (amount > 0) {
        autoExpenses.push({
          id: `auto:reserva:${r.id}`,
          name: r.nome || (r.tipo === 'hospedagem' ? 'Hospedagem' : 'Atividade'),
          description: r.localizacao || '',
          category: r.tipo === 'hospedagem' ? 'hospedagem' : 'atividade',
          amountBRL: amount,
          amountEUR: amount / 6,
          assignedTo: [],
        });
      }
    });

    // Atividades do itinerário com valor preenchido + deslocamentos do dia
    for (let day = 1; day <= tripDays; day++) {
      const acts = getAllActivities(day);
      acts.forEach((a) => {
        const amount = parseValor((a as Activity).price);
        if (amount > 0) {
          autoExpenses.push({
            id: `auto:activity:${day}:${a.id}`,
            name: a.name || 'Atividade',
            description: `Dia ${day}${a.openHours ? ` · ${a.openHours}` : ''}`,
            category: 'atividade',
            amountBRL: amount,
            amountEUR: amount / 6,
            assignedTo: [],
          });
        }
      });

      // Deslocamentos entre atividades (transport between)
      const dayTrans = getAllTransports(day);
      dayTrans.forEach((t, idx) => {
        if (!t) return;
        const amount = parseValor(t.cost);
        if (amount > 0) {
          const fromAct = acts[idx];
          const toAct = acts[idx + 1];
          const route = [fromAct?.name, toAct?.name].filter(Boolean).join(' → ');
          autoExpenses.push({
            id: `auto:displacement:${day}:${idx}`,
            name: `Deslocamento`,
            description: route ? `Dia ${day} · ${route}` : `Dia ${day}`,
            category: 'transporte',
            amountBRL: amount,
            amountEUR: amount / 6,
            assignedTo: [],
          });
        }
      });
    }

    setExpenses((prev) => {
      const manual = prev.filter((e) => !e.id.startsWith('auto:'));
      // Preservar assignedTo previamente customizado em auto-expenses
      const merged = autoExpenses.map((ae) => {
        const existing = prev.find((e) => e.id === ae.id);
        return existing ? { ...ae, assignedTo: existing.assignedTo } : ae;
      });
      const next = [...manual, ...merged];

      const isSame = prev.length === next.length && next.every((n, i) => {
        const p = prev[i];
        return p && n.id === p.id && n.name === p.name && Math.abs(n.amountBRL - p.amountBRL) < 0.01 && JSON.stringify(n.assignedTo) === JSON.stringify(p.assignedTo);
      });

      if (isSame) {
        return prev;
      }
      return next;
    });
  }, [transportes, reservas, dayActivities, dayTransports, effectiveDaysData, tripDays, getAllActivities, getAllTransports, parseValor]);

  // Helper: add smart transport when adding an activity (async with real route API)
  const addDefaultTransport = useCallback(async (day: number, newActivityName?: string, newLat?: number, newLng?: number) => {
    const activities = getAllActivities(day);
    if (activities.length > 0) {
      const prevActivity = activities[activities.length - 1];
      if (prevActivity.type === 'note') {
        setDayTransports((prev) => {
          const existing = prev[day] ?? getAllTransports(day);
          return { ...prev, [day]: [...existing, { type: 'walk', duration: '' }] };
        });
        return;
      }
      const prevLat = prevActivity.lat;
      const prevLng = prevActivity.lng;

      let transport: TransportBetween;
      if (prevLat && prevLng && newLat && newLng) {
        transport = await getRouteInfo(prevLat, prevLng, newLat, newLng);
      } else {
        transport = { type: 'walk', duration: '' };
      }

      setDayTransports((prev) => {
        const existing = prev[day] ?? getAllTransports(day);
        return { ...prev, [day]: [...existing, transport] };
      });
    }
  }, [getAllActivities, getAllTransports]);

  const buildTransportsForActivities = useCallback(async (activities: Activity[]): Promise<TransportBetween[]> => {
    const needed = Math.max(0, activities.length - 1);

    return Promise.all(
      Array.from({ length: needed }, async (_, index) => {
        const fromActivity = activities[index];
        const toActivity = activities[index + 1];

        // Do not calculate routes when either activity is a personal note
        if (fromActivity?.type === 'note' || toActivity?.type === 'note') {
          return { type: 'walk' as const, duration: '' };
        }

        if (fromActivity?.lat && fromActivity?.lng && toActivity?.lat && toActivity?.lng) {
          return getRouteInfo(fromActivity.lat, fromActivity.lng, toActivity.lat, toActivity.lng);
        }

        return { type: 'walk' as const, duration: '' };
      })
    );
  }, []);

  const routePairsCalculatedRef = useRef<Set<string>>(new Set());

  // Auto-fill missing transports between consecutive activities using route API
  useEffect(() => {
    const activities = getAllActivities(selectedDay);
    const transports = getAllTransports(selectedDay);
    const needed = Math.max(0, activities.length - 1);
    if (needed === 0) return;

    const missingIndices: number[] = [];
    for (let i = 0; i < needed; i++) {
      const from = activities[i];
      const to = activities[i + 1];
      const pairKey = `${from?.id}->${to?.id}`;

      // Personal notes must never have auto-calculated route info
      if (from?.type === 'note' || to?.type === 'note') {
        continue;
      }

      const isPlaceholder = !transports[i] || (transports[i].duration === '0 min' && transports[i].distance === undefined) || transports[i].duration === '';
      if (isPlaceholder && from?.lat && from?.lng && to?.lat && to?.lng) {
        if (!routePairsCalculatedRef.current.has(pairKey)) {
          missingIndices.push(i);
        }
      }
    }

    if (missingIndices.length === 0) return;

    // Mark as requested to prevent infinite loops
    missingIndices.forEach((i) => {
      const from = activities[i];
      const to = activities[i + 1];
      routePairsCalculatedRef.current.add(`${from?.id}->${to?.id}`);
    });

    // Async fill
    (async () => {
      const filled = [...transports];
      while (filled.length < needed) filled.push({ type: 'walk', duration: '' });

      await Promise.all(
        missingIndices.map(async (i) => {
          const fromAct = activities[i];
          const toAct = activities[i + 1];
          if (fromAct?.type !== 'note' && toAct?.type !== 'note' && fromAct?.lat && fromAct?.lng && toAct?.lat && toAct?.lng) {
            filled[i] = await getRouteInfo(fromAct.lat, fromAct.lng, toAct.lat, toAct.lng);
          } else {
            filled[i] = { type: 'walk' as const, duration: '' };
          }
        })
      );

      setDayTransports((prev) => ({ ...prev, [selectedDay]: filled.slice(0, needed) }));
    })();
  }, [selectedDay, dayActivities]);

  const currentDayDataBase = effectiveDaysData.find((d) => d.day === selectedDay);
  const currentActivities = getAllActivities(selectedDay);
  const currentTransports = getAllTransports(selectedDay);
  const currentDayData = currentDayDataBase ? {
    ...currentDayDataBase,
    activities: currentActivities,
    transports: currentTransports
  } : undefined;
  const currentTitle = dayTitles[selectedDay] ?? currentDayDataBase?.title ?? '';

  const addMinutes = (time: string, mins: number): string => {
    const [h, m] = time.split(':').map(Number);
    const total = h * 60 + m + mins;
    const nh = Math.floor(total / 60) % 24;
    const nm = total % 60;
    return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
  };

  const getDurationMins = (start: string, end: string): number => {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    let diff = (eh * 60 + em) - (sh * 60 + sm);
    if (diff <= 0) diff += 24 * 60;
    return diff || 90;
  };

  const suggestNextTime = (day: number, durationMins: number = 90): { start: string; end: string; } => {
    const activities = getAllActivities(day);
    if (activities.length === 0) return { start: '09:00', end: addMinutes('09:00', durationMins) };
    const last = activities[activities.length - 1];
    if (last.endTime) {
      const start = addMinutes(last.endTime, 30);
      return { start, end: addMinutes(start, durationMins) };
    }
    if (last.startTime) {
      const start = addMinutes(last.startTime, 120);
      return { start, end: addMinutes(start, durationMins) };
    }
    return { start: '09:00', end: addMinutes('09:00', durationMins) };
  };

  const recalculateTimes = (activities: Activity[], _resetStart: boolean = false): Activity[] => {
    return activities;
  };

  // Drag handlers
  const handleReorder = useCallback(async (reordered: Activity[]) => {
    setDayActivities((prev) => ({
      ...prev,
      [selectedDay]: reordered
    }));
    const newTransports = await buildTransportsForActivities(reordered);
    setDayTransports((prev) => ({ ...prev, [selectedDay]: newTransports }));
  }, [selectedDay, buildTransportsForActivities]);

  const handleDeleteActivity = useCallback(async (activity: Activity, forDay?: number) => {
    const day = forDay ?? selectedDay;
    const current = getAllActivities(day);
    const index = current.findIndex((a) => a.id === activity.id);
    const savedTransports = getAllTransports(day);
    setDeletedUndo({ activity, day, index });
    const filtered = current.filter((a) => a.id !== activity.id);
    setDayActivities((prev) => ({ ...prev, [day]: filtered }));
    const needed = Math.max(0, filtered.length - 1);
    const newTransports: TransportBetween[] = await Promise.all(
      Array.from({ length: needed }, async (_, i) => {
        const fromAct = filtered[i];
        const toAct = filtered[i + 1];
        if (fromAct?.type === 'note' || toAct?.type === 'note') {
          return { type: 'walk' as const, duration: '' };
        }
        if (fromAct.lat && fromAct.lng && toAct.lat && toAct.lng) {
          return getRouteInfo(fromAct.lat, fromAct.lng, toAct.lat, toAct.lng);
        }
        return { type: 'walk' as const, duration: '' };
      })
    );
    setDayTransports((prev) => ({ ...prev, [day]: newTransports }));
    toast.success('Atividade removida', {
      action: {
        label: 'Desfazer',
        onClick: () => {
          setDayActivities((prev) => {
            const list = [...(prev[day] ?? [])];
            list.splice(index, 0, activity);
            return { ...prev, [day]: list };
          });
          setDayTransports((prev) => ({ ...prev, [day]: savedTransports }));
          setDeletedUndo(null);
        }
      },
      duration: 5000
    });
  }, [selectedDay, getAllActivities, getAllTransports]);

  const handleMoveToDay = useCallback(async (activity: Activity, targetDay: number | null, fromDay?: number) => {
    const sourceDay = fromDay ?? selectedDay;
    if (targetDay === sourceDay) return;

    const previousActivitiesSource = getAllActivities(sourceDay);
    const previousActivitiesTarget = targetDay !== null ? getAllActivities(targetDay) : [];
    const previousTransportsSource = getAllTransports(sourceDay);
    const previousTransportsTarget = targetDay !== null ? getAllTransports(targetDay) : [];

    const nextSourceActivities = previousActivitiesSource.filter((a) => a.id !== activity.id);
    const nextTargetActivities = targetDay !== null ? [...previousActivitiesTarget, activity] : [];

    setDayActivities((prev) => ({
      ...prev,
      [sourceDay]: nextSourceActivities,
      ...(targetDay !== null ? { [targetDay]: nextTargetActivities } : {}),
    }));

    const [nextSourceTransports, nextTargetTransports] = await Promise.all([
      buildTransportsForActivities(nextSourceActivities),
      targetDay !== null ? buildTransportsForActivities(nextTargetActivities) : Promise.resolve([]),
    ]);

    setDayTransports((prev) => ({
      ...prev,
      [sourceDay]: nextSourceTransports,
      ...(targetDay !== null ? { [targetDay]: nextTargetTransports } : {}),
    }));

    const dayData = targetDay !== null ? effectiveDaysData.find((d) => d.day === targetDay) : null;
    const dayLabel = targetDay === null
      ? 'Outros (a ver)'
      : dayData
        ? `Dia ${targetDay}`
        : `Dia ${targetDay}`;

    toast.success(`Movido para ${dayLabel}`, {
      action: {
        label: 'Desfazer',
        onClick: () => {
          setDayActivities((prev) => ({
            ...prev,
            [sourceDay]: previousActivitiesSource,
            ...(targetDay !== null ? { [targetDay]: previousActivitiesTarget } : {}),
          }));
          setDayTransports((prev) => ({
            ...prev,
            [sourceDay]: previousTransportsSource,
            ...(targetDay !== null ? { [targetDay]: previousTransportsTarget } : {}),
          }));
        }
      },
      duration: 5000
    });
  }, [selectedDay, getAllActivities, getAllTransports, effectiveDaysData, buildTransportsForActivities]);

  const handleStartDrag = useCallback(
    (activity: Activity, day: number, index: number, event: React.PointerEvent) => {
      // Don't start drag on interactive buttons or note triggers
      const target = event.target as HTMLElement;
      if (
        target.closest('button') ||
        target.closest('[role="menuitem"]') ||
        target.closest('[data-interactive="true"]')
      ) {
        return;
      }

      if (event.button !== 0) return;

      // Com o handle (6 pontinhos) o drag começa direto, sem long-press:
      // o scroll da tela continua livre no resto do card.
      const fromHandle = !!target.closest('[data-drag-handle]');
      const isTouch = !fromHandle && (event.pointerType === 'touch' || event.pointerType === 'pen');
      let dragTimer: NodeJS.Timeout | null = null;
      let isDragReady = !isTouch;

      if (isTouch) {
        dragTimer = setTimeout(() => {
          isDragReady = true;
          if (navigator.vibrate) navigator.vibrate(50);
        }, 500);
      }

      const startX = event.clientX;
      const startY = event.clientY;
      const cardElement = (event.currentTarget as HTMLElement).closest('[data-activity-card]') as HTMLElement;
      const rect = cardElement ? cardElement.getBoundingClientRect() : { left: startX, top: startY, width: 345 };
      const offsetX = startX - (cardElement ? rect.left : startX - 20);
      const offsetY = startY - (cardElement ? rect.top : startY - 20);

      let isDragActive = false;

      const updateTargetUnderPointer = (clientX: number, clientY: number) => {
        let foundDay: number | null = null;
        let foundIndex: number | null = null;

        for (const dayItem of effectiveDaysData) {
          const dayEl = daySectionRefs.current[dayItem.day];
          if (!dayEl) continue;
          const dayRect = dayEl.getBoundingClientRect();

          if (clientY >= dayRect.top - 30 && clientY <= dayRect.bottom + 30) {
            foundDay = dayItem.day;

            if (!openDaysRef.current.has(dayItem.day)) {
              if (!autoExpandTimerRef.current) {
                autoExpandTimerRef.current = setTimeout(() => {
                  openDaysRef.current = new Set(openDaysRef.current).add(dayItem.day);
                  setOpenDays(new Set(openDaysRef.current));
                  autoExpandTimerRef.current = null;
                }, 150);
              }
              foundIndex = 0;
              break;
            }

            const cardElements = Array.from(dayEl.querySelectorAll('[data-activity-card="true"]')) as HTMLElement[];
            if (cardElements.length === 0) {
              foundIndex = 0;
            } else {
              foundIndex = cardElements.length;
              for (let i = 0; i < cardElements.length; i++) {
                const cardRect = cardElements[i].getBoundingClientRect();
                const cardMidY = cardRect.top + cardRect.height / 2;
                if (clientY < cardMidY) {
                  foundIndex = i;
                  break;
                }
              }
            }
            break;
          }
        }

        // Fallback: If cursor is between days or slightly outside, snap to the closest day
        if (foundDay === null && effectiveDaysData.length > 0) {
          let closestDay: number = effectiveDaysData[0].day;
          let minDistance = Infinity;

          for (const dayItem of effectiveDaysData) {
            const dayEl = daySectionRefs.current[dayItem.day];
            if (!dayEl) continue;
            const dayRect = dayEl.getBoundingClientRect();
            const dayMidY = dayRect.top + dayRect.height / 2;
            const dist = Math.abs(clientY - dayMidY);
            if (dist < minDistance) {
              minDistance = dist;
              closestDay = dayItem.day;
            }
          }

          foundDay = closestDay;
          const targetDayEl = daySectionRefs.current[foundDay];
          if (targetDayEl) {
            const cardElements = Array.from(targetDayEl.querySelectorAll('[data-activity-card="true"]')) as HTMLElement[];
            if (cardElements.length === 0) {
              foundIndex = 0;
            } else {
              foundIndex = cardElements.length;
              for (let i = 0; i < cardElements.length; i++) {
                const cardRect = cardElements[i].getBoundingClientRect();
                const cardMidY = cardRect.top + cardRect.height / 2;
                if (clientY < cardMidY) {
                  foundIndex = i;
                  break;
                }
              }
            }
          }
        }

        return { foundDay, foundIndex };
      };

      const startAutoScroll = () => {
        const loop = () => {
          const current = dragStateRef.current;
          if (current.isDragging) {
            const y = current.pointerPos.y;
            const topThreshold = 180;
            const bottomThreshold = 180;
            const maxSpeed = 22;

            let scrollDelta = 0;

            if (y < topThreshold && y > 0) {
              const factor = (topThreshold - y) / topThreshold;
              scrollDelta = -Math.max(4, factor * maxSpeed);
            } else if (y > window.innerHeight - bottomThreshold && y < window.innerHeight + 100) {
              const factor = (y - (window.innerHeight - bottomThreshold)) / bottomThreshold;
              scrollDelta = Math.max(4, factor * maxSpeed);
            }

            if (scrollDelta !== 0) {
              window.scrollBy({ top: scrollDelta, behavior: 'auto' });
              if (document.documentElement) document.documentElement.scrollTop += scrollDelta;
              if (document.body) document.body.scrollTop += scrollDelta;

              // Re-check target position under pointer as page moves
              const { foundDay, foundIndex } = updateTargetUnderPointer(current.pointerPos.x, current.pointerPos.y);
              if (foundDay !== null || foundIndex !== null) {
                const updated: DragState = {
                  ...current,
                  targetDay: foundDay ?? current.targetDay,
                  targetIndex: foundIndex !== null ? foundIndex : current.targetIndex,
                };
                setDragState(updated);
                dragStateRef.current = updated;
              }
            }

            autoScrollRafRef.current = requestAnimationFrame(loop);
          }
        };

        if (autoScrollRafRef.current) {
          cancelAnimationFrame(autoScrollRafRef.current);
        }
        autoScrollRafRef.current = requestAnimationFrame(loop);
      };

      const onPointerMove = (e: PointerEvent) => {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        const dist = Math.hypot(dx, dy);

        if (!isDragActive) {
          if (!isDragReady) {
            // Se o usuário mover a tela antes do tempo, cancela a intenção de drag (é scroll)
            if (Math.abs(dy) > 10 || Math.abs(dx) > 10) {
              if (dragTimer) clearTimeout(dragTimer);
              window.removeEventListener('pointermove', onPointerMove);
              window.removeEventListener('pointerup', onPointerUp);
              window.removeEventListener('pointercancel', onPointerUp);
            }
            return;
          }

          if (dist > 5) {
            isDragActive = true;
            const initialDrag: DragState = {
              isDragging: true,
              activity,
              sourceDay: day,
              sourceIndex: index,
              targetDay: day,
              targetIndex: index,
              pointerPos: { x: e.clientX, y: e.clientY },
              dragOffset: { x: offsetX, y: offsetY },
              cardWidth: cardElement ? rect.width : 345,
            };
            setDragState(initialDrag);
            dragStateRef.current = initialDrag;
            startAutoScroll();
          } else {
            return;
          }
        }

        const current = dragStateRef.current;
        if (!current.isDragging || !current.activity) return;

        const clientX = e.clientX;
        const clientY = e.clientY;

        const { foundDay, foundIndex } = updateTargetUnderPointer(clientX, clientY);

        const updated: DragState = {
          ...current,
          pointerPos: { x: clientX, y: clientY },
          targetDay: foundDay ?? current.targetDay,
          targetIndex: foundIndex !== null ? foundIndex : current.targetIndex,
        };

        setDragState(updated);
        dragStateRef.current = updated;
      };

      const onPointerUp = async () => {
        if (dragTimer) clearTimeout(dragTimer);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerUp);

        if (autoScrollRafRef.current) {
          cancelAnimationFrame(autoScrollRafRef.current);
          autoScrollRafRef.current = null;
        }
        if (autoExpandTimerRef.current) {
          clearTimeout(autoExpandTimerRef.current);
          autoExpandTimerRef.current = null;
        }

        if (!isDragActive) {
          if (fromHandle) return; // toque no handle não abre a atividade
          // Normal quick tap: open activity sheet!
          setSelectedDay(day);
          setSelectedActivityDay(day);
          setSelectedActivity(activity);
          return;
        }

        const finalState = dragStateRef.current;
        setDragState({
          isDragging: false,
          activity: null,
          sourceDay: null,
          sourceIndex: null,
          targetDay: null,
          targetIndex: null,
          pointerPos: { x: 0, y: 0 },
          dragOffset: { x: 0, y: 0 },
          cardWidth: 345,
        });

        if (
          !finalState.activity ||
          finalState.sourceDay === null ||
          finalState.sourceIndex === null ||
          finalState.targetDay === null ||
          finalState.targetIndex === null
        ) {
          return;
        }

        const { activity: draggedAct, sourceDay, sourceIndex, targetDay, targetIndex } = finalState;

        // Same day reorder
        if (sourceDay === targetDay) {
          if (sourceIndex === targetIndex || targetIndex === sourceIndex + 1) {
            return;
          }
          const currentList = [...getAllActivities(sourceDay)];
          const [removed] = currentList.splice(sourceIndex, 1);
          const insertAt = targetIndex > sourceIndex ? targetIndex - 1 : targetIndex;
          currentList.splice(insertAt, 0, removed);

          setDayActivities((prev) => ({ ...prev, [sourceDay]: currentList }));

          const newTransports = await buildTransportsForActivities(currentList);
          setDayTransports((prev) => ({ ...prev, [sourceDay]: newTransports }));
          toast.success(`Atividades do Dia ${sourceDay} reordenadas`);
          return;
        }

        // Cross-day move
        const sourceList = [...getAllActivities(sourceDay)];
        sourceList.splice(sourceIndex, 1);
        const targetList = [...getAllActivities(targetDay)];
        targetList.splice(targetIndex, 0, draggedAct);

        setDayActivities((prev) => ({
          ...prev,
          [sourceDay]: sourceList,
          [targetDay]: targetList,
        }));

        setOpenDays((prev) => new Set(prev).add(targetDay));

        const [sourceTransports, targetTransports] = await Promise.all([
          buildTransportsForActivities(sourceList),
          buildTransportsForActivities(targetList),
        ]);

        setDayTransports((prev) => ({
          ...prev,
          [sourceDay]: sourceTransports,
          [targetDay]: targetTransports,
        }));

        toast.success(`"${draggedAct.name}" movido para o Dia ${targetDay}`);
      };

      window.addEventListener('pointermove', onPointerMove, { passive: false });
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerUp);
    },
    [effectiveDaysData, openDays, getAllActivities, recalculateTimes, buildTransportsForActivities]
  );

  const mapPlaces = useMemo(() => {
    const datasetPlaces = itineraryDataset?.places ?? [];
    const allCityPlaces = getAllCityPlaces();

    const firstDest = (itineraryData.destinations && itineraryData.destinations[0]) ? itineraryData.destinations[0] : '';
    const defaultCenter = getCityCoordinates(firstDest) || { lat: -23.5505, lng: -46.6333 };

    let globalIndex = 0;
    return effectiveDaysData.flatMap((dayItem) => {
      return getAllActivities(dayItem.day)
        .filter((activity) => activity.type !== 'note')
        .map((activity, index) => {
          globalIndex++;
          let lat = activity.lat;
          let lng = activity.lng;

          // 1. Fallback: match with dataset places by id or name
          if (typeof lat !== 'number' || typeof lng !== 'number' || (lat === 0 && lng === 0) || !Number.isFinite(lat) || !Number.isFinite(lng)) {
            const match = datasetPlaces.find(
              (p) => p.id === activity.id || p.name.toLowerCase().trim() === activity.name.toLowerCase().trim()
            );
            if (match && typeof match.lat === 'number' && typeof match.lng === 'number' && !(match.lat === 0 && match.lng === 0)) {
              lat = match.lat;
              lng = match.lng;
            }
          }

          // 2. Fallback: match with curated city places database
          if (typeof lat !== 'number' || typeof lng !== 'number' || (lat === 0 && lng === 0) || !Number.isFinite(lat) || !Number.isFinite(lng)) {
            const match = allCityPlaces.find(
              (p) => p.id === activity.id || p.name.toLowerCase().trim() === activity.name.toLowerCase().trim()
            );
            if (match && typeof match.lat === 'number' && typeof match.lng === 'number') {
              lat = match.lat;
              lng = match.lng;
            }
          }

          // 3. Fallback: default center with spiral offset so all pins are distinct
          if (typeof lat !== 'number' || typeof lng !== 'number' || (lat === 0 && lng === 0) || !Number.isFinite(lat) || !Number.isFinite(lng)) {
            const angle = (globalIndex * 137.5 * Math.PI) / 180;
            const distance = 0.005 + (globalIndex * 0.002);
            lat = defaultCenter.lat + Math.sin(angle) * distance;
            lng = defaultCenter.lng + Math.cos(angle) * distance;
          }

          return {
            id: activity.id,
            name: activity.name,
            image: activity.image,
            category: activity.category,
            rating: activity.rating ?? 0,
            lat,
            lng,
            day: dayItem.day,
            order: index + 1,
            startTime: activity.startTime,
            endTime: activity.endTime,
            openHours: activity.openHours,
            city: activity.city || firstDest.split(',')[0]?.trim() || '',
          };
        });
    });
  }, [effectiveDaysData, getAllActivities, itineraryDataset, itineraryData.destinations]);

  const handleAddPlace = async (placeOrPlaces: PlaceResult | PlaceResult[], day: number) => {
    const placesArray = Array.isArray(placeOrPlaces) ? placeOrPlaces : [placeOrPlaces];
    if (placesArray.length === 0) return;

    let nextActivities: Activity[] = [];
    setDayActivities((prev) => {
      const currentActivities = prev[day] !== undefined ? prev[day] : (effectiveDaysData.find((d) => d.day === day)?.activities ?? []);
      let workingActivities = [...currentActivities];

      // Create an async function to handle place upserts before adding to state
      const processPlaces = async () => {
        let workingActivities = [...currentActivities];

        for (let index = 0; index < placesArray.length; index++) {
          const place = placesArray[index];
          let start = '09:00';
          let end = addMinutes('09:00', 90);
          if (workingActivities.length > 0) {
            const sortedCurrent = sortActivitiesChronologically(workingActivities);
            const last = sortedCurrent[sortedCurrent.length - 1];
            if (last.endTime && timeToMin(last.endTime) !== Infinity) {
              start = addMinutes(last.endTime, 30);
              end = addMinutes(start, 90);
            } else if (last.startTime && timeToMin(last.startTime) !== Infinity) {
              start = addMinutes(last.startTime, 120);
              end = addMinutes(start, 90);
            }
          }

          const fallbackCity = itineraryData.destinations[0] ? itineraryData.destinations[0].split(',')[0].trim() : '';
          const placeCity = place.city || fallbackCity;
          const placeCountry = place.country || resolveCountryFromText(place.address || placeCity || itineraryData.destinations[0] || '');

          const savedPlace = await upsertPlace({
            name: place.name,
            google_place_id: place.googlePlaceId,
            category: place.category,
            city: placeCity,
            country: placeCountry,
            latitude: place.lat,
            longitude: place.lng,
            cover_photo_url: place.image,
            short_description: place.description,
          });

          const newActivity: Activity = {
            id: Date.now() + index + Math.floor(Math.random() * 1000000),
            type: 'activity',
            startTime: start,
            endTime: end,
            category: place.category,
            categoryColor: place.categoryColor,
            name: place.name,
            image: place.image,
            openHours: place.openHours || '',
            rating: place.rating || 0,
            price: (place as any).price || estimatedPriceFor(place.name, (place as any).city),
            lat: place.lat,
            lng: place.lng,
            placeId: savedPlace?.id,
          };

          workingActivities = sortActivitiesChronologically([...workingActivities, newActivity]);
        }

        setDayActivities((prevInner) => ({ ...prevInner, [day]: workingActivities }));

        const nextTransports = await buildTransportsForActivities(workingActivities);
        setDayTransports((prevTransports) => ({ ...prevTransports, [day]: nextTransports }));
      };

      processPlaces();

      return prev; // We will update via setDayActivities in the async closure
    });

    toast.success(
      placesArray.length === 1
        ? `Atividade adicionada ao Dia ${day}`
        : `${placesArray.length} lugares adicionados ao Dia ${day}`
    );
  };

  const handleAddNote = (data: { title: string; text: string; day: number; startTime?: string; endTime?: string; location?: string; lat?: number; lng?: number; activityId?: number; }) => {
    setOpenDays((prev) => new Set(prev).add(data.day));

    if (data.activityId) {
      setDayActivities((prev) => {
        const existing = prev[data.day] !== undefined ? prev[data.day] : (effectiveDaysData.find((d) => d.day === data.day)?.activities ?? []);
        const updated = existing.map((act) => {
          if (act.id === data.activityId) {
            if (act.type === 'note') {
              return {
                ...act,
                name: data.title || 'Anotação pessoal',
                noteText: data.text,
                personalNote: data.text,
              };
            }
            return { ...act, personalNote: data.text };
          }
          return act;
        });
        return { ...prev, [data.day]: updated };
      });
      toast.success('Anotação pessoal salva!');
      return;
    }

    const newNote: Activity = {
      id: Date.now() + Math.floor(Math.random() * 1000000),
      type: 'note',
      startTime: data.startTime || '',
      endTime: data.endTime || '',
      category: 'Anotação',
      categoryColor: '#64748B',
      name: data.title || 'Anotação pessoal',
      image: '',
      openHours: '',
      rating: 0,
      price: '',
      noteText: data.text,
      personalNote: data.text,
      observation: data.location || undefined,
      lat: data.lat,
      lng: data.lng,
    };

    setDayActivities((prev) => {
      const existing = prev[data.day] !== undefined ? prev[data.day] : (effectiveDaysData.find((d) => d.day === data.day)?.activities ?? []);
      return { ...prev, [data.day]: [...existing, newNote] };
    });
    toast.success('Anotação pessoal adicionada!');
  };

  const handleAddManualActivity = async (data: ManualActivityData) => {
    const categoryMap: Record<string, { color: string; }> = {
      'Restaurante': { color: '#F59E0B' },
      'Ponto Turístico': { color: '#10B981' },
      'Museu': { color: '#6366F1' },
      'Hotel': { color: '#3B82F6' },
      'Parque': { color: '#22C55E' },
      'Shopping': { color: '#EC4899' },
      'Bar': { color: '#8B5CF6' },
      'Outro': { color: '#64748B' }
    };
    const newActivity: Activity = {
      id: Date.now() + Math.floor(Math.random() * 1000000),
      type: 'activity',
      startTime: data.startTime,
      endTime: data.endTime,
      category: 'Atividade',
      categoryColor: '#10B981',
      name: data.name,
      image: '',
      openHours: data.location || '',
      rating: 0,
      price: data.price || ''
    };
    let updated: Activity[] = [];
    setDayActivities((prev) => {
      const existingRaw = prev[data.day] !== undefined ? prev[data.day] : (effectiveDaysData.find((d) => d.day === data.day)?.activities ?? []);
      const current = sortActivitiesChronologically(existingRaw);
      updated = sortActivitiesChronologically([...current, newActivity]);
      return { ...prev, [data.day]: updated };
    });

    // We compute the transports asynchronously and set them afterwards.
    // If the state changed in the meantime, this might overwrite it, but it's consistent with previous behavior.
    const nextTransports = await buildTransportsForActivities(updated);
    setDayTransports((prev) => ({
      ...prev,
      [data.day]: nextTransports
    }));
  };

  const autoCover = useDestinationCover(itineraryData.destinations);
  const coverImage = manualCover || itineraryDataset?.coverImage || autoCover.url;
  const isAutoCover = !manualCover && !itineraryDataset?.coverImage;

  // Se buscou uma capa via API (Places/Wiki) dinamicamente, salva no backend
  // para que a tela de listas (TripsScreen) mostre a mesma foto.
  useEffect(() => {
    if (isAutoCover && autoCover.isAutoSelected && autoCover.url && !autoCover.url.includes('unsplash.com/photo-1503220317375')) {
      if (itineraryData.coverImage !== autoCover.url) {
        setItineraryData((prev) => ({ ...prev, coverImage: autoCover.url }));
      }
    }
  }, [isAutoCover, autoCover.isAutoSelected, autoCover.url, itineraryData.coverImage]);

  /**
   * Publica o roteiro como uma cópia independente (nova linha em itineraries
   * com is_public=true). O roteiro privado original permanece inalterado e
   * desvinculado, garantindo que edições futuras em qualquer um dos lados
   * não reflitam no outro.
   */
  const handlePublishAsCopy = useCallback(async (extras: {
    priceCents: number | null;
    description: string;
    tags: string[];
    mainTag: string;
  }) => {
    if (typeof itineraryId !== 'string' || itineraryId.startsWith('pending-itinerary-')) {
      toast.error('Aguarde o roteiro terminar de salvar para publicar.');
      return;
    }
    const userId = session?.user?.id;
    if (!userId) {
      toast.error('Sessão expirada. Faça login novamente.');
      return;
    }
    const source: UserItinerary = {
      id: itineraryId,
      title: itineraryData.tripName?.trim() || itineraryDataset?.title || (itineraryData.destinations[0]?.split(',')[0] ?? 'Roteiro'),
      destinations: itineraryData.destinations,
      startDate: itineraryData.startDate ? itineraryData.startDate.toISOString() : new Date().toISOString(),
      endDate: itineraryData.endDate ? itineraryData.endDate.toISOString() : new Date().toISOString(),
      images: coverImage ? [coverImage] : [],
      participants: [],
      places: Array.from({ length: tripDays }, (_, i) => getAllActivities(i + 1).length).reduce((a, b) => a + b, 0),
      sourceDatasetId: itineraryDataset?.id ?? null,
      isPublic: false,
      priceCents: extras.priceCents,
      description: extras.description,
      tags: extras.tags,
      mainTag: extras.mainTag,
      userId,
    };
    const snapshotActivities = Array.from({ length: tripDays }, (_, i) => i + 1).reduce<Record<number, Activity[]>>((acc, day) => {
      acc[day] = getAllActivities(day).map((activity) => ({ ...activity }));
      return acc;
    }, {});
    const snapshotTransports = Array.from({ length: tripDays }, (_, i) => i + 1).reduce<Record<number, TransportBetween[]>>((acc, day) => {
      acc[day] = getAllTransports(day).map((transport) => ({ ...transport }));
      return acc;
    }, {});
    const created = await publishItineraryAsCopy(source, extras, {
      activities: snapshotActivities,
      transports: snapshotTransports,
      dataVersion,
    });
    if (!created) {
      toast.error('Não foi possível publicar o roteiro. Tente novamente.');
      return;
    }
    addOptimisticItinerary(created);
  }, [itineraryId, session?.user?.id, itineraryData, itineraryDataset, coverImage, tripDays, getAllActivities, getAllTransports, dataVersion]);

  /**
   * Derived mode — determinado automaticamente pelos dados:
   *  - Se tem transportes, reservas, expenses ou atividades → planner
   *  - Senão → planner_empty
   */
  const mode: PlannerMode =
    transportes.length > 0 || reservas.length > 0 || expenses.length > 0 ||
      effectiveDaysData.some((d) => d.activities.length > 0) ?
      'planner' :
      'planner_empty';

  const formatDateRange = () => {
    if (itineraryData.isFlexible && itineraryData.durationDays) {
      const diff = itineraryData.durationDays;
      return `${diff} ${diff === 1 ? 'dia' : 'dias'} de viagem`;
    }
    if (itineraryData.startDate && itineraryData.endDate) {
      const start = format(itineraryData.startDate, "d 'de' MMM.", { locale: ptBR });
      const end = format(itineraryData.endDate, "d 'de' MMM.", { locale: ptBR });
      return `${start} - ${end}`;
    }
    return 'Duração indefinida';
  };

  // ─── Sub-screen routing ──────────────────────────────────────────────────

  if (selectedActivity) {
    return (
      <ActivityDetailScreen
        activity={{
          id: selectedActivity.id,
          name: selectedActivity.name,
          image: selectedActivity.image,
          category: selectedActivity.category,
          rating: selectedActivity.rating,
          price: selectedActivity.price,
          lat: selectedActivity.lat,
          lng: selectedActivity.lng,
          openHours: selectedActivity.openHours,
          startTime: selectedActivity.startTime,
          endTime: selectedActivity.endTime,
        }}
        onBack={() => {
          setSelectedActivity(null);
          setSelectedActivityDay(null);
        }}
        onOpenMap={(activity) => {
          setMapFocusedPlace({
            id: activity.id,
            name: activity.name,
            lat: activity.lat ?? 0,
            lng: activity.lng ?? 0,
            category: activity.category,
            image: activity.image,
            rating: activity.rating,
            price: activity.price,
            day: selectedActivityDay,
            location: activity.location,
            city: activity.city
          });
          setShowMap(true);
          setSelectedActivity(null);
        }}
      />
    );
  }

  if (showMap) {
    const mapTitle = itineraryDataset?.title ||
      (itineraryData.destinations.length > 0 ?
        `${itineraryData.destinations[0].split(',')[0]} trip` :
        'Mapa do roteiro');
    return (
      <Suspense fallback={<div className="h-screen bg-background" />}>
        <LazyItineraryMapScreen
          title={mapTitle}
          places={mapPlaces}
          days={effectiveDaysData}
          destinations={itineraryData.destinations}
          focusedPlace={mapFocusedPlace}
          onMovePlaceToDay={(placeId, sourceDay, targetDay) => {
            const fallbackDay = sourceDay ?? mapPlaces.find((place) => place.id === placeId)?.day ?? null;
            if (fallbackDay === null) return;

            const activity = getAllActivities(fallbackDay).find((item) => item.id === placeId);
            if (!activity) return;

            void handleMoveToDay(activity, targetDay, fallbackDay);
          }}
          onBack={() => {
            setShowMap(false);
            setMapFocusedPlace(null);
          }}
          onSwitchToItinerary={() => {
            setShowMap(false);
            setMapFocusedPlace(null);
          }}
          onSelectPlaceDetails={(place) => {
            if (place.day === undefined || place.day === null) return;
            const activity = getAllActivities(place.day).find((item) => item.id === place.id);
            if (activity) {
              setSelectedActivityDay(place.day);
              setSelectedActivity(activity);
            }
          }}
        />
      </Suspense>
    );
  }

  if (showManageItinerary) {
    return (
      <ManageItineraryScreen
        onBack={() => setShowManageItinerary(false)}
        tripName={itineraryData.tripName ?? (itineraryData.destinations.length > 0 ? itineraryData.destinations[0].split(',')[0] : '')}
        coverImage={coverImage}
        isAutoCover={isAutoCover}
        startDate={itineraryData.startDate}
        endDate={itineraryData.endDate}
        isFlexible={itineraryData.isFlexible}
        durationDays={itineraryData.durationDays}
        currency={itineraryData.currency}
        destinations={itineraryData.destinations}
        onDelete={onDelete}
        onPublish={() => {
          setShowManageItinerary(false);
          setShowPublishFlow(true);
        }}
        itineraryId={typeof itineraryId === 'string' ? itineraryId : undefined}
        currentUserId={session?.user?.id}
        initialOwner={ownerProfile}
        initialMembers={sharedMembers}
        invitedFriends={(() => {
          const myUserId = session?.user?.id;
          // Membros aceitos reais (excluindo eu mesmo, que aparece como "Você"/owner na tela).
          const realMembers = sharedMembers
            .filter((m) => m.userId !== myUserId)
            .map((m) => ({
              id: `member-${m.userId}`,
              name: m.name,
              email: '',
              avatar: m.avatar,
              status: 'accepted' as const,
            }));
          // Mantém amigos legados (mock) sem duplicar membros reais.
          const legacy = (itineraryData.invitedFriends || []).filter(
            (f) => !realMembers.some((m) => m.id === f.id),
          );
          return [...realMembers, ...legacy];
        })()}
        onSave={(updated) => {
          if (updated.coverImage && updated.coverImage !== coverImage) {
            setManualCover(updated.coverImage);
          }
          setItineraryData((prev) => ({
            ...prev,
            tripName: updated.tripName?.trim() || prev.tripName,
            coverImage: updated.coverImage || prev.coverImage,
            destinations: updated.destinations && updated.destinations.length > 0
              ? updated.destinations
              : updated.tripName ? [updated.tripName] : prev.destinations,
            startDate: updated.startDate,
            endDate: updated.endDate,
            currency: updated.currency || prev.currency,
            isFlexible: updated.isFlexible !== undefined ? updated.isFlexible : prev.isFlexible,
            durationDays: updated.durationDays !== undefined ? updated.durationDays : prev.durationDays,
          }));

          if (typeof itineraryId === 'string' && !itineraryId.startsWith('pending-itinerary-')) {
            const patch: any = {
              title: updated.tripName?.trim(),
              images: updated.coverImage ? [updated.coverImage] : undefined,
              destinations: updated.destinations && updated.destinations.length > 0 ? updated.destinations : undefined,
              startDate: updated.isFlexible ? null : (updated.startDate ? updated.startDate.toISOString() : undefined),
              endDate: updated.isFlexible ? null : (updated.endDate ? updated.endDate.toISOString() : undefined),
            };

            if (updated.isFlexible !== undefined) patch.isFlexible = updated.isFlexible;
            if (updated.durationDays !== undefined) patch.durationDays = updated.durationDays;

            // Aplica instantaneamente no cache para a Home
            applyOptimisticPatch(itineraryId, patch);

            updateItineraryRow(itineraryId, patch).catch(console.error);
          }
        }}
      />
    );
  }

  if (showReorder) {
    const allDaysForReorder = effectiveDaysData.map(d => ({
      day: d.day,
      date: d.date,
      activities: getAllActivities(d.day),
    }));
    return (
      <ReorderActivitiesScreen
        allDays={allDaysForReorder}
        onBack={() => setShowReorder(false)}
        onSave={async (updatedDays) => {
          const newDayActivities: Record<number, Activity[]> = {};
          const newDayTransports: Record<number, TransportBetween[]> = {};
          for (const dayData of updatedDays) {
            const firstStart = getAllActivities(dayData.day)[0]?.startTime || '09:00';
            const final: Activity[] = [];
            for (let i = 0; i < dayData.activities.length; i++) {
              const dur = getDurationMins(dayData.activities[i].startTime, dayData.activities[i].endTime);
              if (i === 0) {
                final.push({ ...dayData.activities[i], startTime: firstStart, endTime: addMinutes(firstStart, dur) });
              } else {
                const start = addMinutes(final[i - 1].endTime, 15);
                final.push({ ...dayData.activities[i], startTime: start, endTime: addMinutes(start, dur) });
              }
            }
            newDayActivities[dayData.day] = final;
            const needed = Math.max(0, final.length - 1);
            newDayTransports[dayData.day] = await Promise.all(
              Array.from({ length: needed }, async (_, i) => {
                const fromAct = final[i];
                const toAct = final[i + 1];
                if (fromAct.lat && fromAct.lng && toAct.lat && toAct.lng) {
                  return getRouteInfo(fromAct.lat, fromAct.lng, toAct.lat, toAct.lng);
                }
                return { type: 'walk' as const, duration: '0 min' };
              })
            );
          }
          setDayActivities(prev => ({ ...prev, ...newDayActivities }));
          setDayTransports(prev => ({ ...prev, ...newDayTransports }));
          setShowReorder(false);
          toast.success('Itinerário atualizado');
        }}
      />
    );
  }

  // Build budget participants for the overlay below
  const budgetParticipants: { id: string; name: string; avatar?: string }[] = (() => {
    const friends = itineraryData.invitedFriends || [];
    const datasetParticipants = itineraryDataset?.participants || [];
    const myUserId = session?.user?.id;

    // "owner" = dono real do roteiro (não o usuário atual). Se ainda não carregou,
    // ou se eu sou o dono, uso meus próprios dados como representação.
    const ownerIsMe = !ownerProfile || (myUserId && ownerProfile.userId === myUserId);
    const ownerEntry = ownerIsMe
      ? { id: 'owner', userId: myUserId, name: ownerName, avatar: ownerAvatar }
      : { id: `owner-${ownerProfile!.userId}`, userId: ownerProfile!.userId, name: ownerProfile!.name, avatar: ownerProfile!.avatar };

    // Membros compartilhados (excluindo o dono e — se for o caso — eu mesmo,
    // pois eu já apareço como "owner" quando sou o dono).
    const sharedAsParticipants = sharedMembers
      .filter((m) => m.userId !== ownerEntry.userId)
      .map((m) => ({
        id: `member-${m.userId}`,
        userId: m.userId,
        name: m.name,
        avatar: m.avatar,
      }));

    // Se eu sou um membro convidado (não-dono), garantir que apareço também
    const meAsMember =
      !ownerIsMe && myUserId && !sharedAsParticipants.some((p) => p.userId === myUserId)
        ? [{ id: `member-${myUserId}`, userId: myUserId, name: ownerName, avatar: ownerAvatar }]
        : [];

    if (friends.length > 0 || sharedAsParticipants.length > 0 || meAsMember.length > 0) {
      const fromFriends = friends.map((f) => ({ id: f.id, userId: undefined, name: f.name, avatar: f.avatar }));
      const seenUserId = new Set<string>();
      const seenId = new Set<string>();
      const merged = [ownerEntry, ...meAsMember, ...sharedAsParticipants, ...fromFriends].filter((p) => {
        if (p.userId) {
          if (seenUserId.has(p.userId)) return false;
          seenUserId.add(p.userId);
        }
        if (seenId.has(p.id)) return false;
        seenId.add(p.id);
        return true;
      });
      return merged.map(({ id, name, avatar }) => ({ id, name, avatar }));
    }
    if (datasetParticipants.length > 1) {
      return datasetParticipants.map((url, i) => ({
        id: i === 0 ? 'owner' : `p-${i}`,
        name: i === 0 ? ownerEntry.name : `Membro ${i}`,
        avatar: i === 0 ? (ownerEntry.avatar || url) : url,
      }));
    }
    // Sempre incluir o próprio usuário, mesmo sem amigos convidados
    return [{ id: ownerEntry.id, name: ownerEntry.name, avatar: ownerEntry.avatar }];
  })();

  // Unified split people list (participants + manually-added budget extras)
  const splitPeoplePalette = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#EC4899', '#14B8A6', '#F97316'];
  const getInitialsForName = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };
  const splitPeopleList = [
    ...budgetParticipants.map((p, i) => ({
      id: p.id,
      name: p.name,
      initials: getInitialsForName(p.name),
      color: splitPeoplePalette[i % splitPeoplePalette.length],
      avatar: p.avatar,
    })),
    ...budgetExtraPeople.map(p => ({
      id: p.id,
      name: p.name,
      initials: getInitialsForName(p.name),
      color: p.color,
    })),
  ];

  const subScreenDestination = itineraryData.destinations[0]?.split(',')[0] || 'Amsterdam';

  // ActivityDetailSheet is rendered inline at the bottom of the JSX

  // ─── Optimize route ──────────────────────────────────────────────────────
  const runOptimize = async (day: number) => {
    const rawActs = getAllActivities(day);
    if (rawActs.length < 2) {
      toast.success('Adicione ao menos 2 lugares para otimizar');
      return;
    }
    const coordMap = new Map<string, { lat: number; lng: number }>();
    const addToMap = (name: any, lat: any, lng: any) => {
      if (!name || lat == null || lng == null) return;
      const key = String(name).toLowerCase().trim();
      if (!coordMap.has(key)) coordMap.set(key, { lat: Number(lat), lng: Number(lng) });
    };
    (itineraryDataset?.places ?? []).forEach((p: any) => addToMap(p.name, p.lat, p.lng));
    (itineraryDataset?.suggestions ?? []).forEach((s: any) => addToMap(s.name, s.lat, s.lng));
    const dests = itineraryData.destinations?.length ? itineraryData.destinations : ['paris'];
    getPlacesForDestinations(dests).forEach((p: any) => addToMap(p.name, p.lat, p.lng));
    const acts: Activity[] = rawActs.map((a) => {
      if (a.lat != null && a.lng != null) return a;
      const hit = coordMap.get(String(a.name || '').toLowerCase().trim());
      return hit ? { ...a, lat: hit.lat, lng: hit.lng } : a;
    });
    const withCoords = acts.filter((a) => a.lat != null && a.lng != null);
    if (withCoords.length < 2) {
      toast.success('Lugares sem localização — não foi possível otimizar');
      return;
    }
    setOptimizingDays((prev) => { const n = new Set(prev); n.add(day); return n; });
    await new Promise((r) => setTimeout(r, 700));
    const coordless = acts.filter((a) => a.lat == null || a.lng == null);
    const remaining = acts.filter((a) => a.lat != null && a.lng != null);
    const ordered: Activity[] = [remaining.shift()!];
    while (remaining.length > 0) {
      const last = ordered[ordered.length - 1];
      let bestIdx = 0;
      let bestDist = Infinity;
      remaining.forEach((cand, i) => {
        if (last.lat == null || last.lng == null || cand.lat == null || cand.lng == null) return;
        const d = haversineKm(last.lat, last.lng, cand.lat, cand.lng);
        if (d < bestDist) { bestDist = d; bestIdx = i; }
      });
      ordered.push(remaining.splice(bestIdx, 1)[0]);
    }
    ordered.push(...coordless);
    const recalculated = recalculateTimes(ordered, true);
    setDayActivities((prev) => ({ ...prev, [day]: recalculated }));
    const needed = Math.max(0, recalculated.length - 1);
    const newTransports: TransportBetween[] = await Promise.all(
      Array.from({ length: needed }, async (_, i) => {
        const fromAct = recalculated[i];
        const toAct = recalculated[i + 1];
        if (fromAct.lat && fromAct.lng && toAct.lat && toAct.lng) {
          return getRouteInfo(fromAct.lat, fromAct.lng, toAct.lat, toAct.lng);
        }
        return { type: 'walk' as const, duration: '0 min' };
      })
    );
    setDayTransports((prev) => ({ ...prev, [day]: newTransports }));
    setOptimizingDays((prev) => { const n = new Set(prev); n.delete(day); return n; });
    setOptimizedFlash((prev) => { const n = new Set(prev); n.add(day); return n; });
    setTimeout(() => {
      setOptimizedFlash((prev) => { const n = new Set(prev); n.delete(day); return n; });
    }, 700);
    toast.success('Rota otimizada');
  };

  // ─── Main render ─────────────────────────────────────────────────────────

  return (
    <>
      <div className="min-h-screen pb-8 relative bg-white" style={{ fontFamily: 'var(--font-family-primary)', background: '#FFFFFF' }}>
        {/* Floating FABs (IMAGEM 3 & 4) */}
        {/* Floating FABs (Figma: Frame 2087324981) */}
        {!isViewer && showAddAction && (
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px] animate-in fade-in duration-200"
            onClick={() => setShowAddAction(false)}
          />
        )}
        {!isViewer && (
          <div
            className="fixed right-5 z-50 pointer-events-none flex flex-col items-end"
            style={{
              bottom: creatorEditMode
                ? 'calc(env(safe-area-inset-bottom, 0px) + 92px)'
                : 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
            }}
          >
            {/* Action menu when + is open (Figma: Frame 2087324981 - width 199px, gap 16px) */}
            {showAddAction && (
              <div className="flex flex-col items-start gap-4 pointer-events-auto mb-4 animate-in slide-in-from-bottom-3 fade-in duration-200 w-[199px]">
                {/* Opção 1: Sugestões do Walter */}
                <button
                  type="button"
                  onClick={() => {
                    setShowAddAction(false);
                    setAiRecommendationsTargetDay(selectedDay || 1);
                    setShowAiRecommendationsScreen(true);
                  }}
                  className="w-full h-[51px] flex items-center gap-3 px-5 rounded-full bg-white text-[#141530] shadow-[0px_4px_20px_rgba(0,0,0,0.12)] border border-[#F0F0F0] active:scale-95 transition-all text-left"
                >
                  <Sparkles className="w-5 h-5 text-[#8B5CF6] shrink-0" />
                  <span className="text-[15px] font-bold text-[#141530] font-['Urbanist',sans-serif] whitespace-nowrap">
                    Sugestões do Walter
                  </span>
                </button>

                {/* Opção 2: Lugar */}
                <button
                  type="button"
                  onClick={() => {
                    setShowAddAction(false);
                    setShowAddPlace(true);
                  }}
                  className="w-full h-[51px] flex items-center gap-3 px-5 rounded-full bg-white text-[#141530] shadow-[0px_4px_20px_rgba(0,0,0,0.12)] border border-[#F0F0F0] active:scale-95 transition-all text-left"
                >
                  <MapPin className="w-5 h-5 text-[#141530] shrink-0" />
                  <span className="text-[15px] font-bold text-[#141530] font-['Urbanist',sans-serif] whitespace-nowrap">
                    Lugar
                  </span>
                </button>

                {/* Opção 3: Anotação pessoal */}
                <button
                  type="button"
                  onClick={() => {
                    setShowAddAction(false);
                    setNoteTargetActivity(null);
                    setShowAddNote(true);
                  }}
                  className="w-full h-[51px] flex items-center gap-3 px-5 rounded-full bg-white text-[#141530] shadow-[0px_4px_20px_rgba(0,0,0,0.12)] border border-[#F0F0F0] active:scale-95 transition-all text-left"
                >
                  <FileText className="w-5 h-5 text-[#141530] shrink-0" />
                  <span className="text-[15px] font-bold text-[#141530] font-['Urbanist',sans-serif] whitespace-nowrap">
                    Anotação pessoal
                  </span>
                </button>
              </div>
            )}

            {/* FAB Principal: + / X toggle */}
            <button
              type="button"
              onClick={() => setShowAddAction((prev) => !prev)}
              className={`w-[56px] h-[56px] rounded-full pointer-events-auto flex items-center justify-center active:scale-95 transition-all duration-200 ${showAddAction
                ? 'bg-white text-[#141530] shadow-[0px_4px_20px_rgba(0,0,0,0.15)] border border-[#F0F0F0]'
                : 'bg-[#9DCC36] text-[#141530] shadow-lg'
                }`}
              aria-label="Adicionar item ao roteiro"
            >
              {showAddAction ? (
                <X className="w-6 h-6 stroke-[2.2]" />
              ) : (
                <Plus className="w-6 h-6 stroke-[2.5]" />
              )}
            </button>
          </div>
        )}



        {/* Hero Header (Figma: Botões_Img height 244px) */}
        <div
          className="relative bg-cover bg-center flex flex-col justify-between gap-6 rounded-b-[24px] overflow-hidden"
          style={{
            minHeight: '244px',
            paddingTop: 'calc(max(16px, env(safe-area-inset-top)) + 12px)',
            paddingBottom: '32px',
            backgroundImage: `url(${coverImage})`
          }}>

          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(180deg, rgba(0, 0, 0, 0.26) 0%, rgba(0, 0, 0, 0.8) 65.98%)'
            }}
          />

          {/* Nav buttons (Figma: 40x40px white circles) */}
          <div className="relative px-6 flex items-center justify-between z-10">
            <button
              type="button"
              onClick={onBack}
              className="w-10 h-10 rounded-full bg-[#FFFFFF] flex items-center justify-center shadow-[0px_4px_20px_rgba(0,0,0,0.1)] active:scale-95 transition-transform"
            >
              <Icon name="arrow_back" size={20} className="text-[#000000]" />
            </button>
            <div className="flex items-center gap-2">
              {!isItineraryPublic && !isViewer && itineraryData.isPersonal === false && (
                <button
                  type="button"
                  onClick={() => setShowPublishFlow(true)}
                  className="h-10 px-4 rounded-full bg-[#9DCC36] text-[#141530] font-bold text-[13px] shadow-[0px_4px_20px_rgba(0,0,0,0.1)] active:scale-95 transition-transform font-['Urbanist',sans-serif]"
                >
                  Publicar
                </button>
              )}
              {!creatorEditMode && !readOnlyMode && (
                <button
                  type="button"
                  onClick={() => setShowSettings(true)}
                  className="w-10 h-10 rounded-full bg-[#FEFEFE] flex items-center justify-center shadow-[0px_3.2px_16px_rgba(0,0,0,0.1)] active:scale-95 transition-transform"
                >
                  <Icon name="more_horiz" size={20} className="text-[#141530]" />
                </button>
              )}
            </div>
          </div>

          {/* Title + metadata on image (Figma: Frame 1321316150) */}
          <div className="relative px-6 z-10 mt-auto">
            <h1 className="text-[24px] font-semibold text-[#F2F2F2] leading-[29px] mb-2 font-['Urbanist',sans-serif]">
              {itineraryData.tripName || itineraryDataset?.title || (itineraryData.destinations.length > 0 ? `${itineraryData.destinations[0].split(',')[0]} trip` : 'Paris trip')}
            </h1>

            {/* Subtitle row: 7 dias | 0 atividades (Figma: Frame 1321316362) */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[14px] font-semibold text-[#E7E7EE] font-['Urbanist',sans-serif]">
                {tripDays} {tripDays === 1 ? 'dia' : 'dias'}
              </span>
              <span className="text-[16px] font-medium text-[#FEFEFE]">|</span>
              <span className="text-[14px] font-semibold text-[#E7E7EE] font-['Urbanist',sans-serif]">
                {effectiveDaysData.reduce((sum, d) => sum + getAllActivities(d.day).length, 0)} atividades
              </span>
            </div>

            {/* Tag + Avatars row (Figma: Frame 1321316551) */}
            <div className="flex items-center gap-4">
              {/* Tag (Figma: height 24px, padding 4px 12px, border-radius 9px, bg #DADADA, text #555555) */}
              {(() => {
                if (isFlexibleDates) return null;
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const parsedStart = parseLocalDate(itineraryData.startDate);
                const parsedEnd = parseLocalDate(itineraryData.endDate);
                const start = parsedStart ? new Date(parsedStart) : (parsedEnd ? new Date(parsedEnd) : new Date(today));
                const end = parsedEnd ? new Date(parsedEnd) : (parsedStart ? new Date(parsedStart) : new Date(today));
                start.setHours(0, 0, 0, 0);
                end.setHours(0, 0, 0, 0);

                const isPast = end < today;
                const isInProgress = !isPast && today >= start && today <= end;
                const daysLeft = differenceInCalendarDays(start, today);

                let label = `Em ${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'}`;
                if (isPast || (daysLeft < 0 && !isInProgress)) label = 'Concluído';
                else if (isInProgress || daysLeft === 0) label = 'Em viagem';

                return (
                  <div className="h-[24px] px-[12px] py-[4px] rounded-[9px] bg-[#DADADA] flex items-center justify-center">
                    <span className="text-[12px] font-medium text-[#555555] leading-[14px] font-['Urbanist',sans-serif]">
                      {label}
                    </span>
                  </div>
                );
              })()}

              {/* Avatars (Figma: 27x26px, border 1px solid #FFFFFF, -space-x-[6px]) */}
              <div className={`flex -space-x-[6px] items-center transition-transform ${creatorEditMode ? '' : 'cursor-pointer active:scale-95'}`} onClick={creatorEditMode ? undefined : () => setShowManageItinerary(true)}>
                {(() => {
                  if (loadingMembers && isUuidId) {
                    return (
                      <div className="flex -space-x-[6px] items-center animate-pulse">
                        <div className="w-[27px] h-[26px] rounded-full border border-white bg-white/40" />
                        <div className="w-[27px] h-[26px] rounded-full border border-white bg-white/25" />
                      </div>
                    );
                  }
                  const friends = itineraryData.invitedFriends || [];
                  const avatarUrls = itineraryDataset?.participants;
                  if (avatarUrls && avatarUrls.length > 0) {
                    const maxVisible = 2;
                    const visible = avatarUrls.slice(0, maxVisible);
                    const remaining = avatarUrls.length - maxVisible;
                    return (
                      <>
                        {visible.map((url, i) => (
                          <div key={i} className="w-[27px] h-[26px] rounded-full border border-white overflow-hidden bg-muted">
                            <img src={url} alt="" className="w-full h-full object-cover" />
                          </div>
                        ))}
                        {remaining > 0 && (
                          <div className="w-[27px] h-[26px] rounded-full border border-white flex items-center justify-center bg-white">
                            <span className="text-[10px] font-bold text-foreground">+{remaining}</span>
                          </div>
                        )}
                      </>
                    );
                  }
                  const maxVisible = 2;
                  const myUserId = session?.user?.id;
                  const ownerIsMe = ownerProfile
                    ? (myUserId && ownerProfile.userId === myUserId)
                    : (!myUserId || (data.userId && data.userId === myUserId));
                  const ownerEntry = ownerIsMe
                    ? { id: 'owner', userId: myUserId, name: ownerName, avatar: ownerAvatar }
                    : { id: `owner-${ownerProfile!.userId}`, userId: ownerProfile!.userId, name: ownerProfile!.name, avatar: ownerProfile!.avatar };
                  const memberPeople = sharedMembers
                    .filter((m) => m.userId !== ownerEntry.userId)
                    .map((m) => ({ id: `member-${m.userId}`, userId: m.userId, name: m.name, avatar: m.avatar }));
                  const meAsMember =
                    !ownerIsMe && myUserId && !memberPeople.some((p) => p.userId === myUserId)
                      ? [{ id: `member-${myUserId}`, userId: myUserId, name: ownerName, avatar: ownerAvatar }]
                      : [];
                  const friendsLegacy = friends.map((f) => ({ id: f.id, userId: undefined, name: f.name, avatar: f.avatar }));
                  const seen = new Set<string>();
                  const allPeople = [ownerEntry, ...meAsMember, ...memberPeople, ...friendsLegacy].filter((p) => {
                    const key = p.userId ? `u:${p.userId}` : `i:${p.id}`;
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                  });
                  const visible = allPeople.slice(0, maxVisible);
                  const remaining = allPeople.length - maxVisible;
                  return (
                    <>
                      {visible.map((p) => (
                        <div key={p.id} className="w-[27px] h-[26px] rounded-full border border-white overflow-hidden bg-muted flex items-center justify-center">
                          {p.avatar ? (
                            <img src={p.avatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Icon name="person" size={14} className="text-muted-foreground" />
                          )}
                        </div>
                      ))}
                      {remaining > 0 && (
                        <div className="w-[27px] h-[26px] rounded-full border border-white flex items-center justify-center bg-white">
                          <span className="text-[10px] font-bold text-foreground">+{remaining}</span>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* Top Summary Block with #F6F6F6 background (Figma: block height 183px, bg #F6F6F6) */}
        <div className="bg-[#F6F6F6] pb-4">
          {/* Info Card - overlapping hero (Figma: Frame 1321316149 - width 349px, height 49.5px, border-radius 16px) */}
          <div className="px-5 -mt-5 relative z-20 mb-4">
            <div
              onClick={() => setShowManageItinerary(true)}
              className="bg-white rounded-[16px] px-4 py-3 flex items-center justify-start cursor-pointer active:scale-[0.98] transition-transform"
              style={{ boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.1)' }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Icon name="location_on" size={17} className="text-[#141530] flex-shrink-0" />
                <span className="text-[14px] font-medium text-[#141530] truncate font-['Urbanist',sans-serif]">
                  {(() => {
                    const destinations = (itineraryData.destinations.length > 0 ?
                      itineraryData.destinations :
                      ['Paris', 'Londres']).
                      map((d) => d.split(',')[0].trim());
                    const maxVisible = 1;
                    const visible = destinations.slice(0, maxVisible);
                    const remaining = destinations.length - maxVisible;
                    return visible.join(' · ');
                  })()}
                </span>
                {(() => {
                  const count = (itineraryData.destinations.length > 0 ? itineraryData.destinations : ['Paris', 'Londres']).length;
                  const remaining = count - 1;
                  if (remaining <= 0) return null;
                  return (
                    <span className="text-[14px] font-medium text-[#141530] flex-shrink-0 font-['Urbanist',sans-serif]">
                      • +{remaining}
                    </span>
                  );
                })()}
              </div>

              <div className="w-[1px] h-[17.5px] bg-[#E9E9E9] flex-shrink-0 mx-2" />

              <div className="flex items-center gap-2 flex-shrink-0">
                <Icon name="calendar_today" size={17} className="text-[#141530]" />
                <span className="text-[14px] text-[#141530] font-medium whitespace-nowrap font-['Urbanist',sans-serif]">
                  {formatDateRange()}
                </span>
              </div>
            </div>
          </div>

          {isViewer && (
            <div className="px-4 mb-4">
              <div className="flex flex-row items-center p-4 gap-2 bg-white rounded-[16px] w-full">
                <div className="flex flex-1 min-w-0 flex-row items-start gap-2">
                  <Target size={16} strokeWidth={2} className="text-[#141530] flex-shrink-0" />
                  <div className="flex flex-1 min-w-0 flex-col gap-1 justify-center">
                    <span className="text-[14px] font-semibold text-[#141530] font-['Urbanist',sans-serif] leading-normal">
                      {readOnlyMode ? 'Roteiro publicado!' : 'Acesso somente para visualização'}
                    </span>
                    <span className="text-[12px] font-medium text-[rgba(26,28,64,0.66)] font-['Urbanist',sans-serif] leading-normal">
                      {readOnlyMode
                        ? 'Este roteiro não pode mais ser editado, mas você pode continuar visualizando as informações.'
                        : 'Seu perfil permite consultar o roteiro. Se precisar editar, solicite acesso ao criador do roteiro'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Summary Info Cards Block (Figma: Frame 1321316348 - cards 146x102px, border-radius 16px) */}
          <div className="px-4">
            <div
              className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4"
              style={{ WebkitOverflowScrolling: 'touch', overscrollBehaviorX: 'contain' }}
            >
              {/* Card 1: Orçamento */}
              <button
                onClick={() => setShowBudget(true)}
                className="flex-shrink-0 w-[146px] h-[102px] rounded-[16px] bg-white p-4 text-left flex flex-col justify-between active:scale-[0.98] transition-transform"
              >
                <Icon name="account_balance_wallet" size={24} className="text-[#141530]" />
                <div className="flex flex-col gap-1">
                  <span className="text-[14px] font-semibold text-[#141530] font-['Urbanist',sans-serif] leading-none">Orçamento</span>
                  <span className="text-[14px] font-medium text-[#7F7F7F] font-['Urbanist',sans-serif] leading-none">
                    {expenses.length > 0
                      ? `R$ ${formatBRL(expenses.reduce((s, e) => s + e.amountBRL, 0))}`
                      : 'Nenhum'}
                  </span>
                </div>
              </button>

              {/* Card 2: Observação */}
              <button
                onClick={() => setShowTips(true)}
                className="flex-shrink-0 w-[146px] h-[102px] rounded-[16px] bg-white p-4 text-left flex flex-col justify-between active:scale-[0.98] transition-transform"
              >
                <Icon name="edit_note" size={24} className="text-[#141530]" />
                <div className="flex flex-col gap-1">
                  <span className="text-[14px] font-semibold text-[#141530] font-['Urbanist',sans-serif] leading-none">Observação</span>
                  <span className="text-[14px] font-medium text-[#7F7F7F] font-['Urbanist',sans-serif] leading-none">
                    {tripNotes.length > 0 ? `${tripNotes.length} ${tripNotes.length === 1 ? 'observação' : 'observações'}` : 'Nenhuma'}
                  </span>
                </div>
              </button>

              {/* Card 3: Reservas */}
              {!isItineraryPublic && (
                <button
                  onClick={() => setShowDocumentos(true)}
                  className="flex-shrink-0 w-[146px] h-[102px] rounded-[16px] bg-white p-4 text-left flex flex-col justify-between active:scale-[0.98] transition-transform"
                >
                  <Plane size={24} strokeWidth={1.5} className="text-[#141530]" />
                  <div className="flex flex-col gap-1">
                    <span className="text-[14px] font-semibold text-[#141530] font-['Urbanist',sans-serif] leading-none">Reservas</span>
                    <span className="text-[14px] font-medium text-[#7F7F7F] font-['Urbanist',sans-serif] leading-none">
                      {transportes.length + reservas.length > 0 ? `${transportes.length + reservas.length}` : 'Nenhuma'}
                    </span>
                  </div>
                </button>
              )}

              {/* Card 4: Checklist */}
              <button
                onClick={() => setShowChecklist(true)}
                className="flex-shrink-0 w-[146px] h-[102px] rounded-[16px] bg-white p-4 text-left flex flex-col justify-between active:scale-[0.98] transition-transform"
              >
                <Icon name="luggage" size={24} className="text-[#141530]" />
                <div className="flex flex-col gap-1">
                  <span className="text-[14px] font-semibold text-[#141530] font-['Urbanist',sans-serif] leading-none">Checklist</span>
                  <span className="text-[14px] font-medium text-[#7F7F7F] font-['Urbanist',sans-serif] leading-none">
                    {checklistChecked}/{checklistTotal}
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4">

          {/* Sentinel: top <= 0 quando o carrossel encosta abaixo da safe-area */}
          <div
            ref={stickySentinelRef}
            aria-hidden
            style={{ height: 0, position: 'relative', top: 'calc(-1 * env(safe-area-inset-top, 0px))', pointerEvents: 'none' }}
          />
          {/* Faixa que cobre a área da ilha/status bar só enquanto o carrossel está fixo */}
          <div
            ref={safeTopBarRef}
            aria-hidden
            className="fixed top-0 left-0 right-0 z-30 pointer-events-none"
            style={{
              height: 'env(safe-area-inset-top, 0px)',
              backgroundColor: '#EFEFEF',
              opacity: tabsStuck ? 1 : 0,
            }}
          />
          <div
            ref={stickyTabsRef}
            className="-mx-4 px-4 sticky z-30 pb-2 pt-2"
            style={{
              backgroundColor: '#EFEFEF',
              top: 'env(safe-area-inset-top, 0px)',
            }}
          >
            {/* Day Carousel without side arrows (Figma: 50x62px, border-radius 32px) */}
            <div
              ref={tabsRef}
              className="flex items-center gap-3 overflow-x-auto scrollbar-hide py-1 px-1"
              style={{ overscrollBehaviorX: 'contain', WebkitOverflowScrolling: 'touch', touchAction: 'pan-x' }}
            >
              {effectiveDaysData.map((tab) => {
                const isSelected = selectedDay === tab.day;
                const weekday = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][tab.date.getDay()];
                const dayNum = format(tab.date, 'dd/MM');
                const topText = itineraryData.isFlexible ? 'Dia' : weekday;
                const bottomText = itineraryData.isFlexible ? tab.day.toString() : dayNum;
                return (
                  <button
                    key={tab.day}
                    data-day-tab={tab.day}
                    onClick={() => {
                      setSelectedDay(tab.day);
                      setOpenDays((prev) => new Set(prev).add(tab.day));
                      const section = daySectionRefs.current[tab.day];
                      if (section) {
                        isScrollingToDay.current = true;
                        const offset = section.getBoundingClientRect().top + window.scrollY - stickyTabsHeight - 12;
                        window.scrollTo({ top: Math.max(0, offset), behavior: 'smooth' });
                        window.setTimeout(() => { isScrollingToDay.current = false; }, 550);
                      }
                    }}
                    className={`flex flex-col items-center justify-center flex-shrink-0 transition-all duration-200 rounded-[32px] min-w-[56px] w-auto h-[62px] px-3 py-[12px] ${isSelected
                      ? 'bg-[#080B43] text-[#FEFEFE] shadow-md'
                      : 'bg-transparent text-[#555555] hover:bg-black/5'
                      }`}
                  >
                    <span className="text-[14px] leading-none font-medium font-['Urbanist',sans-serif]">
                      {topText}
                    </span>
                    <span className="text-[16px] mt-1 leading-none font-semibold font-['Urbanist',sans-serif]">
                      {bottomText}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* View toggle [ Roteiro | Mapa ] (Figma: Frame 1321316359 / Frame 1321316461) */}
            <div className="flex items-center justify-between pt-2 pb-1">
              <h3 className="text-[16px] font-semibold text-[#141530] font-['Urbanist',sans-serif]">Itinerário</h3>
              <div className="bg-[#FFFFFF] rounded-full p-[4px] flex items-center h-[44px]">
                <button
                  type="button"
                  className="px-[27px] py-[10px] rounded-[20px] text-[14px] font-semibold bg-[#1A1C40] text-[#FEFEFE] leading-none font-['Urbanist',sans-serif]"
                >
                  Roteiro
                </button>
                <button
                  type="button"
                  onClick={() => setShowMap(true)}
                  className="px-[27px] py-[10px] rounded-[20px] text-[14px] font-semibold text-[#1A1C40] hover:bg-black/5 transition-all leading-none font-['Urbanist',sans-serif]"
                >
                  Mapa
                </button>
              </div>
            </div>

          </div>

          {/* All Days Timeline with Independent Accordions (Day 1 open by default, others closed) (IMAGEM 3 & 4) */}
          <div className="space-y-3 pt-2">
            {effectiveDaysData.map((dayItem) => {
              const dayActs = getAllActivities(dayItem.day);
              const dayTrans = getAllTransports(dayItem.day);
              const weekday = format(dayItem.date, 'EEEE', { locale: ptBR });
              const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
              const shortDate = format(dayItem.date, 'dd/MM', { locale: ptBR });
              const isOpen = openDays.has(dayItem.day);

              return (
                <div
                  key={dayItem.day}
                  ref={(el) => { daySectionRefs.current[dayItem.day] = el; }}
                  data-day={dayItem.day}
                  className="rounded-2xl bg-white"
                  style={{ scrollMarginTop: stickyTabsHeight + 16 }}
                >
                  {/* Accordion Header (Figma: Dia 1 - 24/02 text 18px #141530, Sábado text 16px #7F7F7F, 4 atividades below) */}
                  <button
                    type="button"
                    onClick={() => toggleDayAccordion(dayItem.day)}
                    className="w-full flex items-center justify-between py-3 px-1 bg-white active:scale-[0.99] transition-all text-left"
                  >
                    <div className="flex flex-col items-start gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[18px] font-semibold text-[#141530] font-['Urbanist',sans-serif]">
                          {itineraryData.isFlexible ? `Dia ${dayItem.day}` : `Dia ${dayItem.day} - ${shortDate}`}
                        </span>
                        {!itineraryData.isFlexible && (
                          <span className="text-[16px] font-medium text-[#7F7F7F] font-['Urbanist',sans-serif]">
                            {capitalizedWeekday}
                          </span>
                        )}
                      </div>

                      <span className="text-[16px] font-medium text-[#7F7F7F] font-['Urbanist',sans-serif]">
                        {dayActs.length}{' '}
                        {dayActs.length === 1 ? 'atividade' : 'atividades'}
                      </span>
                    </div>

                    <div className="text-[#141530]">
                      {isOpen ? (
                        <ChevronUp className="w-5 h-5 text-[#141530]" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-[#141530]" />
                      )}
                    </div>
                  </button>

                  {/* Accordion Content */}
                  {isOpen && (
                    <div className="pt-2 pb-2 animate-in fade-in duration-200">
                      {/* Empty state for days with no activities (Figma: Frame 1321316488) */}
                      {dayActs.length === 0 && !aiLoadingDays.has(dayItem.day) ? (
                        <div className="py-8 text-center bg-white rounded-2xl border border-dashed border-[#E5E5E7] p-6">
                          <p className="text-[14px] font-medium text-[#7F7F7F] font-['Urbanist',sans-serif]">Este dia ainda está vazio.</p>
                        </div>
                      ) : dayActs.length > 0 ? (
                        <DraggableActivityList
                          compactView={compactView}
                          itineraryCurrency={itineraryData.currency}
                          destinations={itineraryData.destinations}
                          activities={dayActs}
                          transports={dayTrans}
                          dayTabsRef={tabsRef}
                          daysData={effectiveDaysData}
                          selectedDay={dayItem.day}
                          dragState={dragState}
                          readOnlyMode={isViewer}
                          onStartDrag={handleStartDrag}
                          onReorder={async (reordered) => {
                            setDayActivities((prev) => ({ ...prev, [dayItem.day]: reordered }));
                            const newTransports = await buildTransportsForActivities(reordered);
                            setDayTransports((prev) => ({ ...prev, [dayItem.day]: newTransports }));
                          }}
                          onDelete={(activity) => handleDeleteActivity(activity, dayItem.day)}
                          onMoveToDay={(activity, targetDay) => handleMoveToDay(activity, targetDay, dayItem.day)}
                          onActivityClick={(activity) => {
                            setSelectedDay(dayItem.day);
                            setSelectedActivityDay(dayItem.day);
                            setSelectedActivity(activity);
                          }}
                          onEditNote={(activity) => {
                            setSelectedDay(dayItem.day);
                            setNoteTargetActivity(activity);
                            setShowAddNote(true);
                          }}
                          getTransportIcon={getTransportIcon}
                          onUpdateTransport={(index, data) => {
                            const currentList = [...(dayTransports[dayItem.day] ?? getAllTransports(dayItem.day))];
                            currentList[index] = { type: data.type, duration: data.duration, cost: data.cost };
                            setDayTransports((prev) => ({ ...prev, [dayItem.day]: currentList }));
                          }}
                          onDeleteTransport={(index) => {
                            const currentList = [...(dayTransports[dayItem.day] ?? getAllTransports(dayItem.day))];
                            currentList.splice(index, 1);
                            setDayTransports((prev) => ({ ...prev, [dayItem.day]: currentList }));
                            toast.success('Deslocamento excluído');
                          }}
                        />
                      ) : aiLoadingDays.has(dayItem.day) ? (
                        <div className="space-y-3 animate-pulse">
                          {[0, 1, 2].map((i) => (
                            <div key={i} className="rounded-2xl bg-white p-3.5 flex gap-3">
                              <div className="w-16 h-16 rounded-xl bg-muted shrink-0" />
                              <div className="flex-1 space-y-2 py-1">
                                <div className="h-3.5 rounded-md bg-muted w-3/4" />
                                <div className="h-3 rounded-md bg-muted w-1/2" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {isOpeningDuplicate && <DuplicatingOverlay />}

        {/* Bottom sheet Planejar com IA */}
        <Sheet open={showAiPlanSheet || isAiPlanning} onOpenChange={(open) => {
          if (!open) {
            cancelAiPlanning();
          }
        }}>
          <SheetContent side="bottom" className="rounded-t-[28px] p-0 max-h-[90vh] overflow-hidden border-t-0 shadow-2xl bg-background">
            {/* Drag handle */}
            <div className="w-9 h-[4px] bg-muted-foreground/30 rounded-full mx-auto mt-3 mb-1" />

            {/* Botão de fechar no canto superior direito */}
            <div className="absolute top-3 right-4 z-10">
              <button
                type="button"
                onClick={cancelAiPlanning}
                className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isAiPlanning ? (
              /* State 1: Loading state matching the requested image */
              <div className="px-6 pt-4 pb-8 flex flex-col items-center animate-fade-in">
                {/* Spinner com anel roxo e ícone de sparkle */}
                <div className="relative w-24 h-24 flex items-center justify-center my-3">
                  <div className="absolute inset-0 rounded-full bg-[#7C3AED]/10 animate-pulse" />
                  <div className="absolute inset-0 rounded-full border-[3.5px] border-[#7C3AED]/20 border-t-[#7C3AED] border-r-[#7C3AED]/60 animate-spin" />
                  <Icon name="auto_awesome" size={28} className="text-[#7C3AED] relative z-10" />
                </div>

                {/* Título principal */}
                <h3 className="text-[19px] font-extrabold text-foreground text-center tracking-tight mt-2">
                  A IA está preenchendo seu roteiro...
                </h3>

                {/* Subtítulo com o nome do destino */}
                <p className="text-[13px] text-muted-foreground text-center mt-2 px-2 leading-relaxed font-medium">
                  Buscando os melhores lugares, restaurantes e experiências para você em {mainCityName}.
                </p>

                {/* Cards skeleton animados */}
                <div className="w-full max-w-sm space-y-3 mt-6">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border/50"
                      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}
                    >
                      <div className="w-14 h-14 rounded-xl bg-muted animate-pulse shrink-0" />
                      <div className="flex-1 space-y-2 py-0.5">
                        <div className="h-3.5 bg-muted animate-pulse rounded-md w-3/4" />
                        <div className="h-3 bg-muted animate-pulse rounded-md w-1/2" />
                      </div>
                      <div className="w-5 h-5 rounded-full bg-[#7C3AED]/15 animate-pulse shrink-0" />
                    </div>
                  ))}
                </div>

                {/* Botão Cancelar */}
                <button
                  type="button"
                  onClick={cancelAiPlanning}
                  className="w-full max-w-sm mt-8 py-3.5 rounded-full border border-border/80 bg-background hover:bg-muted/40 active:scale-[0.98] text-[15px] font-bold text-foreground transition-all shadow-sm"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              /* State 2: Options selection */
              <div>
                <SheetHeader className="px-5 pt-3 pb-3 pr-12">
                  <SheetTitle className="text-left text-[19px] font-extrabold text-foreground tracking-tight">
                    Planejar com WAI
                  </SheetTitle>
                  <p className="text-left text-[13px] text-muted-foreground leading-relaxed mt-1">
                    Nossa IA especialista em viagens ajuda você a montar seu roteiro com recomendações de lugares para cada dia.
                  </p>
                </SheetHeader>
                <div className="px-5 pt-2 pb-8 space-y-3">
                  <button
                    type="button"
                    onClick={() => handlePlanWithAi('all')}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-card hover:bg-muted/30 active:scale-[0.98] transition-all text-left border border-border/60 shadow-sm"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-[#7C3AED]/10 flex items-center justify-center shrink-0">
                      <Icon name="auto_awesome" size={22} className="text-[#7C3AED]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[15px] font-bold text-foreground block">
                        Planejar roteiro inteiro
                      </span>
                      <span className="text-[12px] text-muted-foreground block mt-0.5">
                        Gera recomendações de lugares para todos os dias do roteiro
                      </span>
                    </div>
                    <Icon name="chevron_right" size={20} className="text-muted-foreground shrink-0" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePlanWithAi('empty')}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-card hover:bg-muted/30 active:scale-[0.98] transition-all text-left border border-border/60 shadow-sm"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 flex items-center justify-center shrink-0">
                      <Icon name="calendar_today" size={20} className="text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[15px] font-bold text-foreground block">
                        Planejar dias vazios
                      </span>
                      <span className="text-[12px] text-muted-foreground block mt-0.5">
                        Preenche apenas os dias que ainda não têm lugares
                      </span>
                    </div>
                    <Icon name="chevron_right" size={20} className="text-muted-foreground shrink-0" />
                  </button>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>

        {/* Bottom sheet para escolher modo de visualização do itinerário */}
        <Sheet open={showViewModeSheet} onOpenChange={setShowViewModeSheet}>
          <SheetContent side="bottom" className="rounded-t-2xl p-0 max-h-[60vh]">
            <SheetHeader className="px-5 pt-5 pb-3">
              <SheetTitle className="text-left text-[17px] font-bold text-foreground">
                Modo de visualização
              </SheetTitle>
            </SheetHeader>
            <div className="px-2 pb-6">
              {[
                {
                  key: 'detailed' as const,
                  active: !compactView,
                  title: 'Detalhada',
                  onSelect: () => setCompactView(false),
                },
                {
                  key: 'compact' as const,
                  active: compactView,
                  title: 'Resumida',
                  onSelect: () => setCompactView(true),
                },
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => {
                    opt.onSelect();
                    setShowViewModeSheet(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-3.5 rounded-xl text-left transition-colors hover:bg-muted/40"
                >
                  <p className="text-[14px] font-medium text-foreground">
                    {opt.title}
                  </p>
                  <span
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${opt.active ? 'border-primary' : 'border-muted-foreground/40'
                      }`}
                  >
                    {opt.active && (
                      <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                    )}
                  </span>
                </button>
              ))}
            </div>
          </SheetContent>
        </Sheet>

        {creatorEditMode && (
          <div
            className="fixed left-0 right-0 z-50 mx-auto w-full w-full px-4 pt-3 bg-white border-t border-border"
            style={{ bottom: 0, paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
          >
            <button
              onClick={() => {
                toast.success('Alterações salvas!');
                onSaveCreatorEdit?.();
              }}
              className="w-full h-12 rounded-2xl font-semibold text-[14px] flex items-center justify-center active:scale-[0.99] transition-transform shadow-lg"
              style={{ background: '#9DCC36', color: '#141530' }}
            >
              Salvar alterações
            </button>
          </div>
        )}

        <ItinerarySettingsSheet
          open={showSettings}
          onClose={() => setShowSettings(false)}
          tripName={itineraryData.tripName?.trim() || itineraryDataset?.title || (itineraryData.destinations.length > 0 ? `${itineraryData.destinations[0].split(',')[0]} trip` : 'Paris trip')}
          onManageItinerary={() => setShowManageItinerary(true)}
          isViewer={isViewer}
          onShare={isUuidId ? () => setShowShareSheet(true) : undefined}
          onDuplicate={() => {
            if (ownCreatedCount >= FREE_PLAN_ITINERARY_LIMIT) {
              setShowPlanLimitSheet(true);
            } else {
              setShowSettings(false);
              void handleDuplicate();
            }
          }}
          onDelete={onDelete ?? onBack}
          isParticipant={!!(typeof itineraryId === 'string' && session?.user?.id && ownerProfile && ownerProfile.userId !== session.user.id)}
          onLeave={async () => {
            if (typeof itineraryId !== 'string') return;
            try {
              await leaveItinerary(itineraryId);
              toast.success('Você saiu do roteiro.');
              onBack?.();
            } catch (e: any) {
              toast.error(e?.message || 'Não foi possível sair do roteiro.');
            }
          }}
          isPurchased={isPurchased}
          isPublic={isItineraryPublic}
          onTogglePublic={(v) => {
            if (v && !isItineraryPublic) {
              // Privado → público: abre o fluxo de publicação para criar uma cópia independente
              setShowPublishFlow(true);
            } else {
              persistPublishState(v);
            }
          }}
          onEditPublish={() => setShowEditPublish(true)}
          onPublish={() => setShowPublishFlow(true)}
        />

        {showAiRecommendationsScreen && (
          <AiRecommendationsScreen
            destinations={itineraryData.destinations}
            daysData={effectiveDaysData.map((d) => ({
              day: d.day,
              title: d.title,
              date: d.date,
            }))}
            initialDay={aiRecommendationsTargetDay}
            initialDestination={itineraryData.destinations[0]}
            onBack={() => setShowAiRecommendationsScreen(false)}
            onAddPlace={(day, place) => {
              const acts = getAllActivities(day);
              let start = '09:30';
              let end = '11:00';
              if (acts.length > 0) {
                const last = acts[acts.length - 1];
                const parseHHMM = (s: string) => {
                  const m = /(\d{1,2}):(\d{2})/.exec(s || '');
                  if (!m) return 570;
                  return Math.min(23, parseInt(m[1], 10)) * 60 + Math.min(59, parseInt(m[2], 10));
                };
                const startMins = parseHHMM(last.endTime || '09:30');
                const endMins = startMins + 90;
                const formatTime = (mins: number) => {
                  const h = Math.floor(mins / 60) % 24;
                  const m = mins % 60;
                  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                };
                start = formatTime(startMins);
                end = formatTime(endMins);
              }

              const newActivity: Activity = {
                id: Date.now() + Math.floor(Math.random() * 10000),
                type: 'activity',
                name: place.name,
                startTime: start,
                endTime: end,
                category: place.category || 'Ponto Turístico',
                categoryColor: place.categoryColor || '#10B981',
                image: place.image || 'https://images.unsplash.com/photo-1503220317375-aaad61436b1b?w=300',
                openHours: place.openHours || '',
                rating: place.rating || 4.5,
                price: place.price || estimatedPriceFor(place.name, place.city || itineraryData.destinations[0]),
                lat: place.lat,
                lng: place.lng,
              };

              setDayActivities((prev) => ({
                ...prev,
                [day]: [...getAllActivities(day), newActivity],
              }));
            }}
          />
        )}

        {isUuidId && typeof itineraryId === 'string' && session?.user?.id && (
          <ShareItinerarySheet
            open={showShareSheet}
            onClose={() => setShowShareSheet(false)}
            itineraryId={itineraryId}
            ownerId={session.user.id}
            tripName={itineraryData.tripName?.trim() || (itineraryData.destinations[0] ?? 'Roteiro')}
          />
        )}

        <PublishItineraryFlow
          open={showPublishFlow}
          tripName={itineraryData.tripName?.trim() || itineraryDataset?.title || (itineraryData.destinations.length > 0 ? `${itineraryData.destinations[0].split(',')[0]} trip` : 'Paris trip')}
          coverImage={coverImage}
          totalDays={tripDays}
          totalActivities={Array.from({ length: tripDays }, (_, i) => getAllActivities(i + 1).length).reduce((a, b) => a + b, 0)}
          totalCities={Math.max(1, itineraryData.destinations.length)}
          onClose={() => setShowPublishFlow(false)}
          initialDescription={publishedDescription}
          initialTags={publishedTags}
          initialSeasons={publishedSeasons}
          initialMainTag={publishedMainTag}
          onNavigateToFAQ={onNavigateToFAQ}
          destinations={itineraryData.destinations}
          isFlexible={itineraryData.isFlexible}
          durationDays={itineraryData.durationDays}
          startDate={itineraryData.startDate}
          endDate={itineraryData.endDate}
          onPublished={async (result) => {
            const currentUserId = session?.user?.id;
            if (!currentUserId || (data.userId && data.userId !== currentUserId)) {
              toast.error('Apenas o criador original do roteiro pode publicá-lo para venda.');
              return;
            }

            // Simulate loading delay for better UX
            await new Promise(resolve => setTimeout(resolve, 1500));

            let enhancedTags = [...result.tags];
            itineraryData.destinations.forEach((dest) => {
              const parts = dest.split(',').map((s) => s.trim().toLowerCase());
              const country = parts[parts.length - 1]; // e.g. "frança"
              if (country && COUNTRY_TO_TAGS[country]) {
                enhancedTags = [...enhancedTags, ...COUNTRY_TO_TAGS[country]];
              }
            });
            enhancedTags = Array.from(new Set(enhancedTags));

            const extras = {
              priceCents: Math.round((result.price || 0) * 100),
              description: result.description,
              tags: enhancedTags,
              seasons: result.seasons || [],
              mainTag: result.mainTag,
            };

            const isFlex = result.dateType === 'FLEXIBLE';
            const finalStartDate = isFlex ? null : (result.startDate ? result.startDate.toISOString() : (itineraryData.startDate ? itineraryData.startDate.toISOString() : null));
            const finalEndDate = isFlex ? null : (result.endDate ? result.endDate.toISOString() : (itineraryData.endDate ? itineraryData.endDate.toISOString() : null));
            const finalDuration = isFlex ? (result.duration || itineraryData.durationDays) : null;
            const finalMonth = isFlex ? (result.month || itineraryData.travelMonth) : null;

            try {
              const newTitle = result.name || itineraryData.tripName || itineraryData.destinations[0] || 'Roteiro';

              const listingData = {
                sellerId: currentUserId,
                listedTitle: newTitle,
                listedDescription: extras.description,
                tags: extras.tags,
                seasons: extras.seasons,
                priceCents: extras.priceCents,
                status: 'active',
                isFlexibleDates: isFlex,
                durationDays: finalDuration !== null ? finalDuration : undefined,
                travelMonth: finalMonth !== null ? finalMonth : undefined,
              };

              if (itineraryData.isPersonal !== false) {
                // Roteiro pessoal: publica uma CÓPIA independente na loja.
                // O pessoal permanece intacto; editar/excluir um não afeta o outro.
                const copy = await createItinerary({
                  title: newTitle,
                  destinations: itineraryData.destinations,
                  startDate: finalStartDate,
                  endDate: finalEndDate,
                  images: coverImage ? [coverImage] : [],
                  places: Array.from({ length: tripDays }, (_, i) => getAllActivities(i + 1).length).reduce((a, b) => a + b, 0),
                  sourceDatasetId: itineraryDataset?.id ?? null,
                  isPersonal: false,
                  isPublic: false,
                  sourceItineraryId: itineraryId as string,
                  priceCents: extras.priceCents,
                  tags: extras.tags,
                  mainTag: extras.mainTag,
                  status: 'published',
                  isFlexible: isFlex,
                  durationDays: finalDuration ?? undefined,
                  travelMonth: finalMonth ?? undefined,
                });
                if (!copy) throw new Error('Falha ao criar cópia do roteiro para a loja');

                const { cloneItineraryContent } = await import('@/lib/plannerApi');
                await cloneItineraryContent(itineraryId as string, copy.id);
                await upsertStoreListing(copy.id, listingData);
              } else {
                await updateItineraryRow(itineraryId as string, {
                  status: 'published',
                });
                await upsertStoreListing(itineraryId as string, listingData);

                setItineraryData(prev => ({
                  ...prev,
                  status: 'published',
                }));
              }

              setShowPublishToast(true);
              if (onNavigateToSales) onNavigateToSales();
            } catch (e) {
              console.error(e);
              toast.error("Erro ao publicar roteiro.");
            }
            setShowPublishFlow(false);
          }}
          onNavigateToSales={onNavigateToSales}
        />

        <EditPublishSheet
          open={showEditPublish}
          onClose={() => setShowEditPublish(false)}
          initialPriceCents={publishedPriceCents}
          initialDescription={publishedDescription}
          initialTags={publishedTags}
          initialMainTag={publishedMainTag}
          onSave={(patch) => persistPublishState(true, patch)}
          onUnpublish={() => persistPublishState(false)}
        />

        <SuccessToast
          isVisible={showPublishToast}
          onClose={() => setShowPublishToast(false)}
          title="Seu roteiro foi publicado!"
          position="bottom"
        />

        <AddPlacesScreen
          open={showAddPlace}
          onClose={() => setShowAddPlace(false)}
          onSelect={handleAddPlace}
          dayNumber={selectedDay}
          totalDays={tripDays}
          startDate={itineraryData.startDate}
          destinations={itineraryData.destinations}
          existingActivities={Object.entries(dayActivities).flatMap(([dayStr, activities]) => activities.map(a => ({ name: a.name.toLowerCase(), day: Number(dayStr) })))} />

        <AddNoteSheet
          open={showAddNote}
          onClose={() => {
            setShowAddNote(false);
            setNoteTargetActivity(null);
          }}
          onSave={handleAddNote}
          dayNumber={selectedDay}
          totalDays={tripDays}
          daysData={effectiveDaysData}
          activityId={noteTargetActivity?.id}
          activityName={noteTargetActivity && noteTargetActivity.type !== 'note' ? noteTargetActivity.name : undefined}
          initialText={noteTargetActivity?.personalNote || (noteTargetActivity?.type === 'note' ? noteTargetActivity.noteText : '') || ''}
        />

        <AddTransporteSheet
          isOpen={showAddDayTransport}
          onClose={() => setShowAddDayTransport(false)}
          onAdd={(transporte) => {
            setTransportes(prev => [...prev, transporte]);
            toast.success('Transporte adicionado');
          }}
        />

        <AddDeslocamentoSheet
          open={showAddDeslocamento}
          onClose={() => setShowAddDeslocamento(false)}
          totalDays={tripDays}
          startDate={itineraryData.startDate}
          initialDay={selectedDay}
          activitiesByDay={(day: number) => getAllActivities(day).map(a => ({ name: a.name, startTime: a.startTime }))}
          places={(itineraryDataset?.places ?? []).map(p => ({ name: p.name, lat: p.lat, lng: p.lng }))}
          onSave={(data: DeslocamentoData) => {
            const targetDay = data.day ?? selectedDay;
            const currentList = [...(dayTransports[targetDay] ?? getAllTransports(targetDay))];
            if (data.positionIndex !== undefined && data.positionIndex >= 0) {
              currentList.splice(data.positionIndex, 0, { type: data.type, duration: data.duration });
            } else {
              currentList.push({ type: data.type, duration: data.duration });
            }
            setDayTransports((prev) => ({ ...prev, [targetDay]: currentList }));
            toast.success('Deslocamento adicionado');
          }} />

        <DocTypePickerSheet
          isOpen={showDocTypePicker}
          onClose={() => setShowDocTypePicker(false)}
          onSelect={(type) => {
            setShowDocTypePicker(false);
            setDocumentoTypeToOpen(type);
            setShowAddDocumento(true);
          }}
        />

        <AddDocumentoSheet
          isOpen={showAddDocumento}
          onClose={() => setShowAddDocumento(false)}
          preSelectedType={documentoTypeToOpen}
          splitPeople={splitPeopleList}
          onAddReserva={(reserva) => {
            setReservas(prev => [...prev, reserva]);
            toast.success('Documento adicionado!');
          }}
          onAddReservas={(rs) => {
            setReservas(prev => [...prev, ...rs]);
            toast.success(`${rs.length} documentos adicionados!`);
          }}
          onAddTransporte={(transporte) => {
            setTransportes(prev => [...prev, transporte]);
            toast.success('Documento adicionado!');
          }}
          onAddTransportes={(ts) => {
            setTransportes(prev => [...prev, ...ts]);
            toast.success(`${ts.length} documentos adicionados!`);
          }}
        />

        <AddManualActivitySheet
          open={showManualActivity}
          onClose={() => setShowManualActivity(false)}
          onSave={handleAddManualActivity}
          dayNumber={selectedDay}
          totalDays={tripDays}
          startDate={itineraryData.startDate} />

        {/* Activity Action Sheet */}


        <AddBudgetExpenseSheet
          open={showAddExpense}
          onClose={() => setShowAddExpense(false)}
          onSave={(expense) => {
            setExpenses(prev => [...prev, expense]);
            toast.success('Gasto adicionado');
          }}
          people={splitPeopleList}
        />

        {/* Move to Day Sheet */}

      </div>

      {/* Overlays — sub-telas montadas sobre o Planner para preservar estado/scroll ao voltar */}
      {showDocumentos && (
        <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
          <DocumentosScreen
            onBack={() => setShowDocumentos(false)}
            transportes={transportes}
            onTransportesChange={setTransportes}
            reservas={reservas}
            onReservasChange={setReservas}
            splitPeople={splitPeopleList}
            readOnlyMode={isViewer}
          />
        </div>
      )}

      {showBudget && (
        <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
          <BudgetScreen
            itineraryId={typeof itineraryId === 'string' ? itineraryId : ''}
            ownerId={session?.user?.id || ''}
            onBack={() => { setShowBudget(false); setBudgetAutoAdd(false); }}
            expenses={expenses}
            onExpensesChange={setExpenses}
            autoOpenAdd={budgetAutoAdd}
            participants={budgetParticipants}
            extraPeople={budgetExtraPeople}
            onExtraPeopleChange={setBudgetExtraPeople}
            activities={effectiveDaysData.flatMap((d) => {
              const list = dayActivities[d.day] ?? d.activities ?? [];
              return list.map((a) => ({
                id: a.id,
                name: a.name,
                category: a.category,
                price: a.price,
                day: d.day,
                date: d.date,
              }));
            })}
            readOnlyMode={isViewer}
          />
        </div>
      )}

      {showTips && (
        <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
          <TripNotesScreen
            onBack={() => setShowTips(false)}
            destination={subScreenDestination}
            notes={tripNotes}
            onNotesChange={setTripNotes}
            readOnlyMode={isViewer}
          />
        </div>
      )}

      <AddTripNoteSheet
        open={showAddTripNote}
        onClose={() => setShowAddTripNote(false)}
        onSave={(note) => {
          try {
            const newNote: TripNote = {
              id: Date.now().toString(),
              author: currentUser.name || 'Você',
              authorImage: currentUser.avatar || '',
              title: note.title || 'Sem título',
              summary: note.content || '',
            };
            setTripNotes(prev => [newNote, ...prev]);
            toast.success('Nota adicionada!');
            setShowTips(true);
          } catch (err) {
            toast.error('Erro ao salvar a nota. Tente novamente.');
          }
          setShowAddTripNote(false);
        }}
      />

      {showChecklist && (
        <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
          <TripChecklistScreen
            onBack={() => setShowChecklist(false)}
            destination={subScreenDestination}
            onChecklistChange={(checked, total) => { setChecklistChecked(checked); setChecklistTotal(total); }}
            readOnlyMode={isViewer}
          />
        </div>
      )}
      <BottomSheet
        open={confirmOptimizeDay !== null}
        onClose={() => setConfirmOptimizeDay(null)}
        title="Otimizar rota do dia"
        maxHeight="auto"
        footer={
          <div className="flex gap-2.5 pb-1">
            <button
              type="button"
              onClick={() => setConfirmOptimizeDay(null)}
              className="flex-1 rounded-full"
              style={{ fontSize: 14, fontWeight: 700, padding: '12px 14px', background: '#FFFFFF', color: '#1A1C40', border: '1.5px solid #1A1C40' }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                const day = confirmOptimizeDay;
                setConfirmOptimizeDay(null);
                if (day !== null) runOptimize(day);
              }}
              className="flex-1 rounded-full"
              style={{ fontSize: 14, fontWeight: 700, padding: '12px 14px', background: '#9DCC36', color: '#1A1C40' }}
            >
              Otimizar agora
            </button>
          </div>
        }
      >
        <div className="pt-1 pb-3 space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-[#EFF6FF]">
            <Icon name="route" size={20} className="text-[#2563EB] mt-0.5" />
            <p className="text-[14px] leading-snug text-foreground">
              Vamos reordenar as atividades deste dia para reduzir os deslocamentos entre elas — menos tempo no trânsito e mais tempo aproveitando. Horários e transportes são recalculados automaticamente.
            </p>
          </div>
          <p className="text-[13px] text-muted-foreground">
            A ordem atual das atividades será substituída.
          </p>
        </div>
      </BottomSheet>

      <PlanLimitReachedSheet
        isOpen={showPlanLimitSheet}
        onClose={() => setShowPlanLimitSheet(false)}
        currentCount={ownCreatedCount}
        limit={FREE_PLAN_ITINERARY_LIMIT}
      />

      {/* Floating Drag Preview Clone */}
      {dragState.isDragging && dragState.activity && (
        <div
          className="fixed pointer-events-none z-[9999] transition-transform duration-75"
          style={{
            left: dragState.pointerPos.x - dragState.dragOffset.x,
            top: dragState.pointerPos.y - dragState.dragOffset.y,
            width: dragState.cardWidth || 345,
          }}
        >
          <div className="bg-white rounded-2xl p-4 border-2 border-[#1D4ED8] shadow-[0_20px_50px_rgba(0,0,0,0.28)] scale-[1.03] rotate-[1deg] opacity-95">
            {dragState.activity.type === 'note' ? (
              <div className="flex gap-3.5 items-start w-full isolate">
                <div className="relative w-[85px] h-[75px] rounded-[8px] bg-[#E8E8EB] flex items-center justify-center shrink-0">
                  <div className="absolute -top-2.5 -left-2.5 z-10 w-7 h-[34px]">
                    <svg viewBox="0 0 28 34" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M14 0C6.26801 0 0 6.26801 0 14C0 24 14 34 14 34C14 34 28 24 28 14C28 6.26801 21.732 0 14 0Z" fill="#1D4ED8" />
                      <text
                        x="14"
                        y="13.5"
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="#FFFFFF"
                        fontSize="13"
                        fontWeight="800"
                        fontFamily="'Urbanist', system-ui, -apple-system, sans-serif"
                      >
                        {(dragState.targetIndex ?? dragState.sourceIndex ?? 0) + 1}
                      </text>
                    </svg>
                  </div>
                  <MessageSquare className="w-7 h-7 text-[#141530]" strokeWidth={1.8} />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-start py-0.5">
                  <h4 className="text-[16px] font-bold text-[#141530] font-['Urbanist',sans-serif] leading-tight truncate">
                    {dragState.activity.name || 'Anotação pessoal'}
                  </h4>
                  {(dragState.activity.noteText || dragState.activity.personalNote || dragState.activity.observation) && (
                    <p className="text-[13px] font-medium text-[#7F7F7F] font-['Urbanist',sans-serif] line-clamp-2 leading-[16px] mt-1.5 break-words">
                      {dragState.activity.noteText || dragState.activity.personalNote || dragState.activity.observation}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-start gap-4 w-full">
                <div className="flex gap-3.5 items-start w-full">
                  <div className="relative w-[88px] h-[88px] rounded-2xl bg-muted shrink-0">
                    <img
                      src={dragState.activity.image}
                      alt={dragState.activity.name}
                      className="w-full h-full object-cover rounded-2xl"
                    />
                    <div className="absolute -top-2 -left-2 z-10 w-7 h-[34px]">
                      <svg viewBox="0 0 28 34" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M14 0C6.26801 0 0 6.26801 0 14C0 24 14 34 14 34C14 34 28 24 28 14C28 6.26801 21.732 0 14 0Z" fill="#1D4ED8" />
                        <text
                          x="14"
                          y="13.5"
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill="#FFFFFF"
                          fontSize="13"
                          fontWeight="800"
                          fontFamily="'Urbanist', system-ui, -apple-system, sans-serif"
                        >
                          {(dragState.targetIndex ?? dragState.sourceIndex ?? 0) + 1}
                        </text>
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-start gap-1 py-0.5">
                    <h4 className="text-[17px] font-bold text-[#141530] font-['Urbanist',sans-serif] leading-tight truncate">
                      {dragState.activity.name}
                    </h4>
                    <p className="text-[14px] font-bold text-[#141530] font-['Urbanist',sans-serif] truncate">
                      {dragState.activity.category}{dragState.activity.city ? ` | ${dragState.activity.city}` : ''}
                    </p>
                    <p className="text-[13px] text-[#737373] font-['Urbanist',sans-serif] line-clamp-2 leading-[1.35]">
                      {dragState.activity.observation || 'Ícone do destino e um dos lugares mais famosos do mundo.'}
                    </p>
                  </div>
                </div>
                {(dragState.activity.personalNote || dragState.activity.noteText) && (
                  <div className="flex items-stretch gap-2.5 w-full pl-0.5 pt-0.5">
                    <div className="w-[3.5px] rounded-full bg-[#1D4ED8] shrink-0 self-stretch min-h-[38px]" />
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-[15px] font-bold text-[#141530]">
                        <Pencil className="w-4 h-4 text-[#141530]" />
                        <span>Anotação pessoal:</span>
                      </div>
                      <p className="text-[14px] text-[#141530] truncate">
                        {dragState.activity.personalNote || dragState.activity.noteText}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>);
}