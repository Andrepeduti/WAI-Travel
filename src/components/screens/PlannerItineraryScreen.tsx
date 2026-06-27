import React, { useState, useRef, useEffect, lazy, Suspense, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SuccessToast } from '@/components/travel/SuccessToast';
import { ItinerarySettingsSheet } from '@/components/travel/ItinerarySettingsSheet';
import { downloadItineraryPdf } from '@/lib/itineraryPdf';
import { parseLocalDate } from '@/lib/localDate';
import { PublishItineraryFlow } from '@/components/travel/PublishItineraryFlow';
import { EditPublishSheet } from '@/components/travel/EditPublishSheet';
import { ActivityDetailSheet } from '@/components/travel/ActivityDetailSheet';
import { ManageItineraryScreen } from './ManageItineraryScreen';
import { ParticipantsSheet } from '@/components/travel/ParticipantsSheet';
import { Icon } from '@/components/ui/Icon';
import { DocumentosScreen } from './DocumentosScreen';
import { BudgetScreen, Expense } from './BudgetScreen';
import { estimatedPriceFor } from '@/lib/paidAttractions';

import { AddReservaSheet, Reserva } from '@/components/travel/AddReservaSheet';
import { TripTipsScreen } from './TripTipsScreen';
import { TripNotesScreen, TripNote } from './TripNotesScreen';
import { TripChecklistScreen } from './TripChecklistScreen';
import { AddTransporteSheet, Transporte } from '@/components/travel/AddTransporteSheet';
import { AddActionSheet } from '@/components/travel/AddActionSheet';
import { AddPlaceSheet, PlaceResult } from '@/components/travel/AddPlaceSheet';
import { AddNoteSheet } from '@/components/travel/AddNoteSheet';
import { AddDeslocamentoSheet, DeslocamentoData } from '@/components/travel/AddDeslocamentoSheet';
import { AddBudgetExpenseSheet } from '@/components/travel/AddBudgetExpenseSheet';
import { AddManualActivitySheet, ManualActivityData } from '@/components/travel/AddManualActivitySheet';
import { EditTripInfoSheet } from '@/components/travel/EditTripInfoSheet';
import { DraggableActivityList } from '@/components/travel/DraggableActivityList';
import { ReorderActivitiesScreen } from './ReorderActivitiesScreen';
import { Bars3BottomLeftIcon, ListBulletIcon } from '@heroicons/react/24/outline';
import { BottomSheet } from '@/components/ui/BottomSheet';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Check } from 'lucide-react';
import { Plane, MapPin } from 'lucide-react';
import { format, differenceInDays, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ItineraryFormData } from '@/components/travel/CreateItinerarySheet';
import { ItineraryDataset, ItineraryDay as DatasetDay, ItineraryActivity as DatasetActivity, TransportBetween as DatasetTransport, ItinerarySuggestion } from '@/data/itineraries';
import { resolveCoverImage } from '@/lib/coverImageResolver';
import { useDestinationCover } from '@/hooks/use-destination-cover';
import { getPlacesForDestinations, getDestinationForDay, toSuggestions } from '@/data/cityRecommendations';
import { useDaySuggestions } from '@/hooks/use-day-suggestions';
import { toast } from 'sonner';
import { BackButton } from '@/components/ui/BackButton';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useAuth } from '@/contexts/AuthContext';
import { updateItinerary as updateItineraryRow, publishItineraryAsCopy, leaveItinerary, type UserItinerary } from '@/lib/itinerariesApi';
import { loadPlannerData, savePlannerData } from '@/lib/plannerApi';
import { formatBRL } from '@/lib/utils';
import { loadItineraryDocs, saveItineraryDocs } from '@/lib/itineraryDocsApi';
import { loadBudget, saveBudget } from '@/lib/budgetApi';
import { listItineraryMembers, getMyRole, getItineraryOwnerProfile, type ItineraryMember, type ItineraryRole } from '@/lib/itineraryMembersApi';
import { ShareItinerarySheet } from '@/components/travel/ShareItinerarySheet';
import { useItineraryRealtime } from '@/hooks/use-itinerary-realtime';
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
  /** When true, opens the publish flow automatically on mount (used by creator program). */
  autoOpenPublishFlow?: boolean;
  onBack: () => void;
  onDelete?: () => void;
  onUpdate?: (data: ItineraryFormData) => void;
  onNavigateToAI?: () => void;
  onSaveCreatorEdit?: () => void;
  onNavigateToSales?: () => void;
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
  // Apply a 1.3x factor to approximate real road distance from straight-line
  const roadKm = distanceKm * 1.3;

  if (roadKm <= 1.2) {
    // Walk: avg 5 km/h
    const mins = Math.max(5, Math.round((roadKm / 5) * 60));
    return { type: 'walk', duration: `${mins} min` };
  }
  if (roadKm <= 5) {
    // Bus/Tram: avg 18 km/h (urban, with stops)
    const mins = Math.max(8, Math.round((roadKm / 18) * 60));
    return { type: 'bus', duration: `${mins} min` };
  }
  if (roadKm <= 15) {
    // Metro: avg 30 km/h
    const mins = Math.max(10, Math.round((roadKm / 30) * 60));
    return { type: 'metro', duration: `${mins} min` };
  }
  // Car/Taxi: avg 40 km/h (urban)
  const mins = Math.max(10, Math.round((roadKm / 40) * 60));
  return { type: 'car', duration: `${mins} min` };
}

function getTransportIcon(type: TransportBetween['type']) {
  switch (type) {
    case 'walk':return 'directions_walk';
    case 'bus':return 'directions_bus';
    case 'metro':return 'directions_subway';
    case 'car':return 'directions_car';
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
    if (error || !data?.duration_min) throw new Error(error?.message || 'no data');

    const result: TransportBetween = {
      type: (data.transport_type === 'walk' ? 'walk' : data.transport_type === 'bus' ? 'bus' : data.transport_type === 'metro' ? 'metro' : 'car') as TransportBetween['type'],
      duration: `${data.duration_min} min`,
      distance: data.distance_km ? `${data.distance_km} km` : undefined,
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

export function PlannerItineraryScreen({ data, itineraryDataset, itineraryId, isPurchased, creatorEditMode, autoOpenPublishFlow, onBack, onDelete, onUpdate, onNavigateToAI, onSaveCreatorEdit, onNavigateToSales }: PlannerItineraryScreenProps) {
  const { user: currentUser } = useCurrentUser();
  const { session } = useAuth();
  const ownerAvatar = currentUser.avatar || '';
  const ownerName = currentUser.name || 'Você';
  // Use dataset days/suggestions when available, generate from dates, or fall back to mocks
  const daysData: DayData[] = itineraryDataset ?
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
  data.startDate && data.endDate ?
  Array.from({ length: differenceInDays(data.endDate, data.startDate) + 1 }, (_, i) => ({
    day: i + 1,
    title: '',
    date: addDays(data.startDate!, i),
    activities: [] as Activity[],
    transports: [] as TransportBetween[]
  })) :
  mockDays;

  const fallbackSuggestions = itineraryDataset?.suggestions ?? suggestions;

  const [selectedDay, setSelectedDay] = useState(1);
  type RecCategory = 'all' | 'food' | 'experience' | 'attraction' | 'night' | 'event';
  const [recFilterByDay, setRecFilterByDay] = useState<Record<number, RecCategory>>({});
  const [compactView, setCompactView] = useState(false);
  const [showViewModeSheet, setShowViewModeSheet] = useState(false);
  const [showDocumentos, setShowDocumentos] = useState(false);
  const [showBudget, setShowBudget] = useState(false);
  const [tripNotes, setTripNotes] = useState<TripNote[]>([]);
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
  const [activityActionTarget, setActivityActionTarget] = useState<Activity | null>(null);
  const [activityEditMode, setActivityEditMode] = useState(false);
  const [showMapOptions, setShowMapOptions] = useState(false);
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editOriginalDuration, setEditOriginalDuration] = useState(0);
  const [editPrice, setEditPrice] = useState('');
  const [editObservation, setEditObservation] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [showPublishFlow, setShowPublishFlow] = useState(!!autoOpenPublishFlow);
  const [showEditPublish, setShowEditPublish] = useState(false);
  const [isItineraryPublic, setIsItineraryPublic] = useState(data.isPublic ?? false);
  const [publishedPriceCents, setPublishedPriceCents] = useState<number | null>(data.priceCents ?? null);
  const [publishedDescription, setPublishedDescription] = useState<string>(data.description ?? '');
  const [publishedTags, setPublishedTags] = useState<string[]>(data.tags ?? []);
  const [publishedMainTag, setPublishedMainTag] = useState<string>(data.mainTag ?? '');

  // Persist publish state to backend whenever it changes (only for user-owned itineraries)
  const persistPublishState = useCallback((next: boolean, extras?: {
    priceCents?: number | null;
    description?: string;
    tags?: string[];
    mainTag?: string;
  }) => {
    setIsItineraryPublic(next);
    if (extras?.priceCents !== undefined) setPublishedPriceCents(extras.priceCents);
    if (extras?.description !== undefined) setPublishedDescription(extras.description);
    if (extras?.tags !== undefined) setPublishedTags(extras.tags);
    if (extras?.mainTag !== undefined) setPublishedMainTag(extras.mainTag);
    if (typeof itineraryId === 'string' && !itineraryId.startsWith('pending-itinerary-')) {
      void updateItineraryRow(itineraryId, {
        isPublic: next,
        ...(extras?.priceCents !== undefined ? { priceCents: extras.priceCents } : {}),
        ...(extras?.description !== undefined ? { description: extras.description } : {}),
        ...(extras?.tags !== undefined ? { tags: extras.tags } : {}),
        ...(extras?.mainTag !== undefined ? { mainTag: extras.mainTag } : {}),
      });
    }
  }, [itineraryId]);



  const [showManageItinerary, setShowManageItinerary] = useState(false);
  const [showParticipantsSheet, setShowParticipantsSheet] = useState(false);
  const [itineraryData, setItineraryData] = useState(data);
  const [manualCover, setManualCover] = useState<string | null>(data.coverImage ?? null);
  const isFirstRender = useRef(true);

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
  }, [itineraryData.startDate, itineraryData.endDate, daysData]);
  const [duplicateToast, setDuplicateToast] = useState(false);
  const [isOpeningDuplicate, setIsOpeningDuplicate] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showAddAction, setShowAddAction] = useState(false);
  const [showAddPlace, setShowAddPlace] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);
  const [showAddDayTransport, setShowAddDayTransport] = useState(false);
  const [budgetAutoAdd, setBudgetAutoAdd] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddReservation, setShowAddReservation] = useState(false);
  const [showAddDeslocamento, setShowAddDeslocamento] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const [checklistChecked, setChecklistChecked] = useState(0);
  const [checklistTotal, setChecklistTotal] = useState(12);
  const [showManualActivity, setShowManualActivity] = useState(false);
  const [showEditTripInfo, setShowEditTripInfo] = useState(false);
  const [showReorder, setShowReorder] = useState(false);
  const [aiLoadingDays, setAiLoadingDays] = useState<Set<number>>(new Set());
  const [optimizingDays, setOptimizingDays] = useState<Set<number>>(new Set());
  const [optimizedFlash, setOptimizedFlash] = useState<Set<number>>(new Set());
  const [confirmOptimizeDay, setConfirmOptimizeDay] = useState<number | null>(null);
  const persistKey = String(itineraryId ?? itineraryDataset?.id ?? data.destinations[0] ?? 'default');
  const budgetExtraPeopleKey = `wai-budget-extra-people-${persistKey}`;
  const [budgetExtraPeople, setBudgetExtraPeople] = useState<{ id: string; name: string; color: string }[]>(() => {
    try {
      const raw = localStorage.getItem(budgetExtraPeopleKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    try { localStorage.setItem(budgetExtraPeopleKey, JSON.stringify(budgetExtraPeople)); } catch {}
  }, [budgetExtraPeopleKey, budgetExtraPeople]);
  const dataVersion = itineraryDataset?.dataVersion;
  const [dayActivities, setDayActivities] = useState<Record<number, Activity[]>>(() => loadPersistedActivities(persistKey, dataVersion));
  const [dayTransports, setDayTransports] = useState<Record<number, TransportBetween[]>>(() => loadPersistedTransports(persistKey, dataVersion));
  const [deletedUndo, setDeletedUndo] = useState<{activity: Activity;day: number;index: number;} | null>(null);
  const [moveToDayTarget, setMoveToDayTarget] = useState<Activity | null>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const stickyTabsRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [needsScroll, setNeedsScroll] = useState(false);
  const [stickyTabsHeight, setStickyTabsHeight] = useState(64);
  const daySectionRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const isScrollingToDay = useRef(false);

  // Persist activities & transports to localStorage (cache local imediato).
  useEffect(() => {
    savePersistedActivities(persistKey, dayActivities, dataVersion);
  }, [dayActivities, persistKey, dataVersion]);

  useEffect(() => {
    savePersistedTransports(persistKey, dayTransports, dataVersion);
  }, [dayTransports, persistKey, dataVersion]);

  // ─── Backend sync (Lovable Cloud) ──────────────────────────────────────
  // O `localStorage` acima é cache de leitura imediata; o servidor é a
  // fonte da verdade. Stale-while-revalidate: usamos o cache no mount,
  // e ao terminar o fetch sobrescrevemos o estado se houver dados remotos.
  const isUuidId = typeof itineraryId === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(itineraryId);
  const hasHydratedRef = useRef(false);
  const skipNextPlannerRemoteRef = useRef(false);

  const reloadPlanner = useCallback(async () => {
    if (!isUuidId || typeof itineraryId !== 'string') return;
    if (skipNextPlannerRemoteRef.current) {
      skipNextPlannerRemoteRef.current = false;
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
      // Sinaliza que o próximo evento Realtime foi causado pelo próprio user
      skipNextPlannerRemoteRef.current = true;
      void savePlannerData(itineraryId, {
        activities: dayActivities,
        transports: dayTransports,
      });
    }, 600);
    return () => clearTimeout(handle);
  }, [isUuidId, itineraryId, dayActivities, dayTransports]);

  // ─── Membros compartilhados (Lovable Cloud) ─────────────────────────────
  const [sharedMembers, setSharedMembers] = useState<ItineraryMember[]>([]);
  const [myRole, setMyRole] = useState<ItineraryRole | null>(null);
  const [ownerProfile, setOwnerProfile] = useState<{ userId: string; name: string; avatar?: string } | null>(null);
  const isViewer = myRole === 'viewer';
  useEffect(() => {
    if (!isUuidId || typeof itineraryId !== 'string') return;
    let cancelled = false;
    (async () => {
      try {
        const m = await listItineraryMembers(itineraryId);
        if (!cancelled) setSharedMembers(m);
      } catch {
        /* silencioso: usuário pode não ser dono/membro */
      }
      try {
        const owner = await getItineraryOwnerProfile(itineraryId);
        if (!cancelled) setOwnerProfile(owner);
      } catch {
        /* silencioso */
      }
      if (session?.user?.id) {
        const role = await getMyRole(itineraryId, session.user.id);
        if (!cancelled) setMyRole(role);
      }
    })();
    return () => { cancelled = true; };
  }, [isUuidId, itineraryId, session?.user?.id]);


  // ─── Documentos (reservas + transportes-doc) sync com Lovable Cloud ───
  const docsHydratedRef = useRef(false);
  const skipNextDocsSaveRef = useRef(false);
  const skipNextDocsRemoteRef = useRef(false);

  const reloadDocs = useCallback(async () => {
    if (!isUuidId || typeof itineraryId !== 'string') return;
    if (skipNextDocsRemoteRef.current) {
      skipNextDocsRemoteRef.current = false;
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
      skipNextDocsRemoteRef.current = true;
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

  // ─── Orçamento (expenses) sync com Lovable Cloud ──────────────────────
  const budgetHydratedRef = useRef(false);
  const skipNextBudgetSaveRef = useRef(false);
  const skipNextBudgetRemoteRef = useRef(false);

  const reloadBudget = useCallback(async () => {
    if (!isUuidId || typeof itineraryId !== 'string') return;
    if (skipNextBudgetRemoteRef.current) {
      skipNextBudgetRemoteRef.current = false;
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
      skipNextBudgetRemoteRef.current = true;
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
      .select('title, start_date, end_date, images, destinations')
      .eq('id', itineraryId)
      .maybeSingle();
    if (error || !data) return;
    setItineraryData((prev) => ({
      ...prev,
      tripName: data.title ?? prev.tripName,
      destinations: Array.isArray(data.destinations) && data.destinations.length > 0
        ? data.destinations
        : prev.destinations,
      startDate: data.start_date ? parseLocalDate(data.start_date) : prev.startDate,
      endDate: data.end_date ? parseLocalDate(data.end_date) : prev.endDate,
      coverImage: Array.isArray(data.images) && data.images[0] ? data.images[0] : prev.coverImage,
    }));
    if (Array.isArray(data.images) && data.images[0]) {
      setManualCover(data.images[0]);
    }
  }, [isUuidId, itineraryId]);

  // Plug realtime: refaz cada loader quando outro participante muda algo
  useItineraryRealtime(typeof itineraryId === 'string' ? itineraryId : null, {
    onItineraryChange: () => { void reloadItineraryMeta(); },
    onActivitiesChange: () => { void reloadPlanner(); },
    onTransportsChange: () => { void reloadPlanner(); },
    onReservationsChange: () => { void reloadDocs(); },
    onDocTransportsChange: () => { void reloadDocs(); },
    onExpensesChange: () => { void reloadBudget(); },
    onMembersChange: () => {
      if (!isUuidId || typeof itineraryId !== 'string') return;
      void (async () => {
        try {
          const m = await listItineraryMembers(itineraryId);
          setSharedMembers(m);
        } catch { /* silencioso */ }
      })();
    },
  });




  const checkScrollArrows = useCallback(() => {
    if (tabsRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tabsRef.current;
      const hasOverflow = scrollWidth > clientWidth + 5;
      setNeedsScroll(hasOverflow);
      setCanScrollLeft(scrollLeft > 5);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
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

  useEffect(() => {
    const el = stickyTabsRef.current;
    if (!el) return;

    let rafId = 0;
    const updateHeight = () => {
      const nextHeight = Math.round(el.getBoundingClientRect().height || 64);
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
      if (isScrollingToDay.current || effectiveDaysData.length === 0) return;

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

  const tripDays = itineraryData.startDate && itineraryData.endDate ?
  differenceInDays(itineraryData.endDate, itineraryData.startDate) + 1 :
  7;

  // Destination-aware recommendations: resolve per selected day
  // Sugestões dinâmicas: usa banco local + busca POIs reais (Overpass/Wikipedia) da cidade do dia.
  // IMPORTANTE: só usar a lista hardcoded (Amsterdam) como fallback quando NÃO há
  // destinos definidos pelo usuário — caso contrário, mostraríamos Amsterdam para todos.
  const hasUserDestinations =
    Array.isArray(itineraryData.destinations) && itineraryData.destinations.length > 0;
  const {
    suggestionsByDay,
    isLoadingByDay,
    hasFetchedByDay,
  } = useDaySuggestions(
    itineraryData.destinations,
    tripDays,
    hasUserDestinations ? [] : fallbackSuggestions,
  );

  const suggestionsData = React.useMemo(() => {
    // Se há suggestions explícitas do dataset (marketplace), priorizá-las
    if (fallbackSuggestions && fallbackSuggestions.length > 0 && itineraryDataset?.suggestions) {
      return fallbackSuggestions;
    }
    return suggestionsByDay[selectedDay] ?? [];
  }, [fallbackSuggestions, itineraryDataset?.suggestions, selectedDay, suggestionsByDay]);

  // Sugestões dinâmicas por dia:
  // 1) Excluem QUALQUER lugar já presente no roteiro (em qualquer dia).
  // 2) Distribuem itens diferentes entre dias da mesma cidade (fatia rotativa).
  const dynamicSuggestionsByDay = React.useMemo<Record<number, ItinerarySuggestion[]>>(() => {
    const result: Record<number, ItinerarySuggestion[]> = {};
    // Não interferir quando o roteiro vem do marketplace com suggestions próprias
    if (itineraryDataset?.suggestions) return result;

    // Conjunto global de nomes já adicionados (todos os dias)
    const usedNames = new Set<string>();
    Object.values(dayActivities).forEach((acts) => {
      acts?.forEach((a) => {
        if (a?.name) usedNames.add(a.name.trim().toLowerCase());
      });
    });

    // Agrupar dias por cidade (usa o mesmo getDestinationForDay do hook)
    const daysByCity = new Map<string, number[]>();
    for (let day = 1; day <= Math.max(tripDays, 1); day++) {
      const dest = itineraryData.destinations?.length
        ? getDestinationForDay(itineraryData.destinations, day, tripDays)
        : '';
      const cityKey = dest.split(',')[0].trim().toLowerCase();
      const list = daysByCity.get(cityKey) ?? [];
      list.push(day);
      daysByCity.set(cityKey, list);
    }

    const bucketOfCat = (cat: string): string => {
      const c = (cat || '').toLowerCase();
      if (c.includes('restaurante') || c.includes('cafeteria') || c.includes('mercado')) return 'food';
      if (c.includes('experiência') || c.includes('experiencia')) return 'experience';
      if (c.includes('vida noturna') || c.includes('bar') || c.includes('pub') || c.includes('balada')) return 'night';
      if (c.includes('evento')) return 'event';
      return 'attraction';
    };

    daysByCity.forEach((daysOfCity) => {
      const base = (suggestionsByDay[daysOfCity[0]] ?? []).filter(
        (s) => !usedNames.has(s.name.trim().toLowerCase()),
      );
      const N = daysOfCity.length;
      if (base.length === 0 || N === 0) {
        daysOfCity.forEach((d) => { result[d] = []; });
        return;
      }
      // Particiona por bucket e tenta garantir 3+ opções por chip em cada dia.
      // Quando há volume suficiente, não repete entre dias; se faltar, rotaciona
      // o pool para não deixar chips vazios.
      const byBucket = new Map<string, ItinerarySuggestion[]>();
      base.forEach((item) => {
        const b = bucketOfCat(item.category || '');
        const arr = byBucket.get(b) ?? [];
        arr.push(item);
        byBucket.set(b, arr);
      });

      const perDay: ItinerarySuggestion[][] = daysOfCity.map(() => []);
      const MIN_PER_CHIP = 3;
      byBucket.forEach((items) => {
        if (items.length >= N * MIN_PER_CHIP) {
          daysOfCity.forEach((_, dayIdx) => {
            const start = dayIdx * MIN_PER_CHIP;
            perDay[dayIdx].push(...items.slice(start, start + MIN_PER_CHIP));
          });
          items.slice(N * MIN_PER_CHIP).forEach((it, i) => {
            perDay[i % N].push(it);
          });
          return;
        }

        daysOfCity.forEach((_, dayIdx) => {
          const already = new Set(perDay[dayIdx].map((it) => it.name.toLowerCase().trim()));
          for (let offset = 0; offset < Math.min(MIN_PER_CHIP, items.length); offset++) {
            const it = items[(dayIdx * MIN_PER_CHIP + offset) % items.length];
            const key = it.name.toLowerCase().trim();
            if (!already.has(key)) {
              perDay[dayIdx].push(it);
              already.add(key);
            }
          }
        });
      });

      daysOfCity.forEach((d, idx) => {
        result[d] = perDay[idx];
      });
    });

    return result;
  }, [dayActivities, itineraryData.destinations, itineraryDataset?.suggestions, suggestionsByDay, tripDays]);

  // Refs espelhando estados — usados pelo "Preencher com IA" para acessar valores
  // atuais dentro de awaits/timeouts sem ficar preso à closure inicial.
  const suggestionsByDayRef = useRef(suggestionsByDay);
  const dynamicSuggestionsByDayRef = useRef(dynamicSuggestionsByDay);
  const hasFetchedByDayRef = useRef(hasFetchedByDay);
  const dayActivitiesRef = useRef(dayActivities);
  useEffect(() => { suggestionsByDayRef.current = suggestionsByDay; }, [suggestionsByDay]);
  useEffect(() => { dynamicSuggestionsByDayRef.current = dynamicSuggestionsByDay; }, [dynamicSuggestionsByDay]);
  useEffect(() => { hasFetchedByDayRef.current = hasFetchedByDay; }, [hasFetchedByDay]);
  useEffect(() => { dayActivitiesRef.current = dayActivities; }, [dayActivities]);


  // Migration: backfill category/categoryColor AND lat/lng for cached activities missing them
  useEffect(() => {
    // Also get all city places for lat/lng lookup
    const allCityPlaces = getPlacesForDestinations(
      itineraryData.destinations?.length ? itineraryData.destinations : ['paris']
    );

    setDayActivities(prev => {
      const patched = { ...prev };
      let changed = false;
      let coordsChanged = false;
      for (const day of Object.keys(patched)) {
        patched[Number(day)] = patched[Number(day)].map(a => {
          let updated = a;
          // Backfill category
          if (!a.category) {
            const match = suggestionsData.find(s => s.name.toLowerCase() === a.name.toLowerCase());
            if (match?.category) {
              changed = true;
              updated = { ...updated, category: match.category, categoryColor: match.categoryColor || a.categoryColor };
            }
          }
          // Backfill lat/lng
          if (!a.lat || !a.lng) {
            const placeMatch = allCityPlaces.find(p => p.name.toLowerCase() === a.name.toLowerCase());
            if (placeMatch?.lat && placeMatch?.lng) {
              coordsChanged = true;
              updated = { ...updated, lat: placeMatch.lat, lng: placeMatch.lng };
            } else {
              // Try in suggestions
              const sugMatch = suggestionsData.find(s => s.name.toLowerCase() === a.name.toLowerCase());
              if (sugMatch && (sugMatch as any).lat && (sugMatch as any).lng) {
                coordsChanged = true;
                updated = { ...updated, lat: (sugMatch as any).lat, lng: (sugMatch as any).lng };
              }
            }
          }
          return updated;
        });
      }
      // If coords were backfilled, clear transports to force recalculation
      if (coordsChanged) {
        setDayTransports({});
      }
      return (changed || coordsChanged) ? patched : prev;
    });
  }, [suggestionsData, itineraryData.destinations]);


  const getAllActivities = useCallback((day: number): Activity[] => {
    if (dayActivities[day] !== undefined) return dayActivities[day];
    const base = effectiveDaysData.find((d) => d.day === day);
    return base?.activities ?? [];
  }, [effectiveDaysData, dayActivities]);

  // Build mutable transports: base data overridden by mutable state
  const getAllTransports = useCallback((day: number): TransportBetween[] => {
    if (dayTransports[day] !== undefined) return dayTransports[day];
    const base = effectiveDaysData.find((d) => d.day === day);
    return base?.transports ?? [];
  }, [effectiveDaysData, dayTransports]);

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
      return [...manual, ...merged];
    });
  }, [transportes, reservas, dayActivities, dayTransports, effectiveDaysData, tripDays, getAllActivities, getAllTransports, parseValor]);

  // Helper: add smart transport when adding an activity (async with real route API)
  const addDefaultTransport = useCallback(async (day: number, newActivityName?: string, newLat?: number, newLng?: number) => {
    const activities = getAllActivities(day);
    if (activities.length > 0) {
      const prevActivity = activities[activities.length - 1];
      const prevLat = prevActivity.lat;
      const prevLng = prevActivity.lng;

      let transport: TransportBetween;
      if (prevLat && prevLng && newLat && newLng) {
        transport = await getRouteInfo(prevLat, prevLng, newLat, newLng);
      } else {
        transport = { type: 'walk', duration: '0 min' };
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

        if (fromActivity?.lat && fromActivity?.lng && toActivity?.lat && toActivity?.lng) {
          return getRouteInfo(fromActivity.lat, fromActivity.lng, toActivity.lat, toActivity.lng);
        }

        return { type: 'walk' as const, duration: '0 min' };
      })
    );
  }, []);

  // Auto-fill missing transports between consecutive activities using route API
  useEffect(() => {
    const activities = getAllActivities(selectedDay);
    const transports = getAllTransports(selectedDay);
    const needed = Math.max(0, activities.length - 1);
    if (needed === 0) return;

    const missingIndices: number[] = [];
    for (let i = 0; i < needed; i++) {
      if (!transports[i] || transports[i].duration === '0 min') {
        const from = activities[i];
        const to = activities[i + 1];
        if (from?.lat && from?.lng && to?.lat && to?.lng) {
          missingIndices.push(i);
        }
      }
    }
    if (missingIndices.length === 0) return;

    // Async fill
    (async () => {
      const filled = [...transports];
      // Ensure array is long enough
      while (filled.length < needed) filled.push(undefined as any);

      await Promise.all(missingIndices.map(async (i) => {
        const fromAct = activities[i];
        const toAct = activities[i + 1];
        if (fromAct.lat && fromAct.lng && toAct.lat && toAct.lng) {
          filled[i] = await getRouteInfo(fromAct.lat, fromAct.lng, toAct.lat, toAct.lng);
        } else {
          filled[i] = { type: 'walk' as const, duration: '0 min' };
        }
      }));

      setDayTransports(prev => ({ ...prev, [selectedDay]: filled.slice(0, needed) }));
    })();
  }, [selectedDay, dayActivities, getAllActivities, getAllTransports]);

  const currentDayDataBase = effectiveDaysData.find((d) => d.day === selectedDay);
  const currentActivities = getAllActivities(selectedDay);
  const currentTransports = getAllTransports(selectedDay);
  const currentDayData = currentDayDataBase ? {
    ...currentDayDataBase,
    activities: currentActivities,
    transports: currentTransports
  } : undefined;
  const currentTitle = dayTitles[selectedDay] ?? currentDayDataBase?.title ?? '';

  // Drag handlers
  const handleReorder = useCallback(async (reordered: Activity[]) => {
    const recalculated = recalculateTimes(reordered);
    setDayActivities((prev) => ({
      ...prev,
      [selectedDay]: recalculated
    }));
    // Regenerate transports with real route data
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
    setDayTransports((prev) => ({ ...prev, [selectedDay]: newTransports }));
  }, [selectedDay]);

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
        if (fromAct.lat && fromAct.lng && toAct.lat && toAct.lng) {
          return getRouteInfo(fromAct.lat, fromAct.lng, toAct.lat, toAct.lng);
        }
        return { type: 'walk' as const, duration: '0 min' };
      })
    );
    setDayTransports((prev) => ({ ...prev, [day]: newTransports }));
    toast('Atividade removida', {
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

    toast(`Movido para ${dayLabel}`, {
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

  const mapPlaces = useMemo(() => {
    const datasetPlaces = itineraryDataset?.places ?? [];
    return effectiveDaysData.flatMap((dayItem) => {
      return getAllActivities(dayItem.day)
        .filter((activity) => activity.type !== 'note')
        .map((activity, index) => {
          let lat = activity.lat;
          let lng = activity.lng;
          // Fallback: match with dataset places by id or name
          if (typeof lat !== 'number' || typeof lng !== 'number') {
            const match = datasetPlaces.find(
              (p) => p.id === activity.id || p.name.toLowerCase() === activity.name.toLowerCase()
            );
            if (match) {
              lat = match.lat;
              lng = match.lng;
            }
          }
          if (typeof lat !== 'number' || typeof lng !== 'number') return null;
          return {
            id: activity.id,
            name: activity.name,
            image: activity.image,
            category: activity.category,
            rating: activity.rating,
            lat,
            lng,
            day: dayItem.day,
            order: index + 1,
            startTime: activity.startTime,
            endTime: activity.endTime,
            openHours: activity.openHours,
          };
        })
        .filter(Boolean) as any[];
    });
  }, [effectiveDaysData, getAllActivities, itineraryDataset]);

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

  const suggestNextTime = (day: number, durationMins: number = 90): {start: string;end: string;} => {
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

  const recalculateTimes = (activities: Activity[]): Activity[] => {
    if (activities.length === 0) return activities;
    return activities.map((act, i) => {
      if (i === 0) {
        const start = act.startTime || '09:00';
        const end = act.endTime || addMinutes(start, 90);
        return { ...act, startTime: start, endTime: end };
      }
      const prev = activities[i - 1];
      const prevEnd = prev.endTime || addMinutes(prev.startTime || '09:00', 90);
      const start = addMinutes(prevEnd, 30);
      const end = addMinutes(start, 90);
      return { ...act, startTime: start, endTime: end };
    });
  };

  const handleAddPlace = (place: PlaceResult, day: number) => {
    addDefaultTransport(day, place.name, place.lat, place.lng);
    setDayActivities((prev) => {
      const base = effectiveDaysData.find((d) => d.day === day);
      const currentActivities = prev[day] !== undefined ? prev[day] : (base?.activities ?? []);
      
      // Calculate next time based on current (latest) state
      let start = '09:00';
      let end = addMinutes('09:00', 90);
      if (currentActivities.length > 0) {
        const last = currentActivities[currentActivities.length - 1];
        if (last.endTime) {
          start = addMinutes(last.endTime, 30);
          end = addMinutes(start, 90);
        } else if (last.startTime) {
          start = addMinutes(last.startTime, 120);
          end = addMinutes(start, 90);
        }
      }

      const newActivity: Activity = {
        id: Date.now() + Math.random(),
        type: 'activity',
        startTime: start,
        endTime: end,
        category: place.category,
        categoryColor: place.categoryColor,
        name: place.name,
        image: place.image,
        openHours: place.openHours,
        rating: place.rating,
        price: (place as any).price || estimatedPriceFor(place.name, (place as any).city),
        lat: place.lat,
        lng: place.lng,
      };
      return { ...prev, [day]: [...currentActivities, newActivity] };
    });
  };

  const handleAddNote = (data: {title: string;text: string;day: number;startTime?: string;endTime?: string;location?: string;lat?: number;lng?: number;}) => {
    const newNote: Activity = {
      id: Date.now(),
      type: 'note',
      startTime: data.startTime || '',
      endTime: data.endTime || '',
      category: 'Tempo livre',
      categoryColor: '#64748B',
      name: data.title || 'Tempo livre',
      image: '',
      openHours: '',
      rating: 0,
      price: '',
      noteText: data.text,
      // Quando o usuário informa onde estará, guardamos lat/lng para que o
      // motor de rotas calcule automaticamente o trecho até o próximo ponto.
      observation: data.location || undefined,
      lat: data.lat,
      lng: data.lng,
    };
    addDefaultTransport(data.day, data.title, data.lat, data.lng);

    const timeToMin = (t: string) => {
      if (!t) return -1;
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };

    setDayActivities((prev) => {
      const existing = [...getAllActivities(data.day)];
      const noteStart = timeToMin(newNote.startTime);
      const noteEnd = timeToMin(newNote.endTime);

      if (noteStart < 0) {
        // No time set — just append
        return { ...prev, [data.day]: [...existing, newNote] };
      }

      // Find insertion index based on startTime
      let insertIdx = existing.length;
      for (let i = 0; i < existing.length; i++) {
        const actStart = timeToMin(existing[i].startTime);
        if (actStart >= 0 && noteStart <= actStart) {
          insertIdx = i;
          break;
        }
      }

      // Insert the note
      const updated = [...existing.slice(0, insertIdx), newNote, ...existing.slice(insertIdx)];

      // Push down any activities that overlap with the note
      if (noteEnd > 0) {
        let cursor = noteEnd + 15; // 15 min gap after the note
        for (let i = insertIdx + 1; i < updated.length; i++) {
          const actStart = timeToMin(updated[i].startTime);
          if (actStart >= 0 && actStart < cursor) {
            const dur = getDurationMins(updated[i].startTime, updated[i].endTime);
            updated[i] = {
              ...updated[i],
              startTime: addMinutes('00:00', cursor),
              endTime: addMinutes('00:00', cursor + dur),
            };
            cursor = cursor + dur + 15;
          } else {
            break; // No more overlaps
          }
        }
      }

      return { ...prev, [data.day]: updated };
    });
  };

  const handleAddManualActivity = (data: ManualActivityData) => {
    const categoryMap: Record<string, {color: string;}> = {
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
      id: Date.now(),
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
    addDefaultTransport(data.day, data.name);
    setDayActivities((prev) => ({
      ...prev,
      [data.day]: [...getAllActivities(data.day), newActivity]
    }));
  };

  const autoCover = useDestinationCover(itineraryData.destinations);
  const coverImage = manualCover || itineraryDataset?.coverImage || autoCover.url;
  const isAutoCover = !manualCover && !itineraryDataset?.coverImage;

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
    toast.success('Roteiro publicado no marketplace! A versão à venda é independente do seu roteiro privado.');
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
    if (itineraryData.startDate && itineraryData.endDate) {
      const start = format(itineraryData.startDate, "d 'de' MMM.", { locale: ptBR });
      const end = format(itineraryData.endDate, "d 'de' MMM.", { locale: ptBR });
      return `${start} - ${end}`;
    }
    return '14 de jun. - 21 de jun.';
  };

  // ─── Sub-screen routing ──────────────────────────────────────────────────

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
          onMovePlaceToDay={(placeId, sourceDay, targetDay) => {
            const fallbackDay = sourceDay ?? mapPlaces.find((place) => place.id === placeId)?.day ?? null;
            if (fallbackDay === null) return;

            const activity = getAllActivities(fallbackDay).find((item) => item.id === placeId);
            if (!activity) return;

            void handleMoveToDay(activity, targetDay, fallbackDay);
          }}
          onBack={() => setShowMap(false)} />
        
      </Suspense>);

  }

  // Sub-telas (Reservas/Documentos, Orçamento, Notas, Checklist) são renderizadas
  // como overlays no final do componente para preservar o estado e o scroll do
  // Planner enquanto estão abertas. Veja o bloco de overlays antes do fechamento.

  if (showManageItinerary) {
    return (
      <ManageItineraryScreen
        onBack={() => setShowManageItinerary(false)}
        tripName={itineraryData.tripName ?? (itineraryData.destinations.length > 0 ? itineraryData.destinations[0].split(',')[0] : '')}
        coverImage={coverImage}
        isAutoCover={isAutoCover}
        startDate={itineraryData.startDate}
        endDate={itineraryData.endDate}
        destinations={itineraryData.destinations}
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
          }));
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
          toast('Itinerário atualizado');
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
      toast('Adicione ao menos 2 lugares para otimizar');
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
    (suggestionsData ?? []).forEach((s: any) => addToMap(s.name, s.lat, s.lng));
    const acts: Activity[] = rawActs.map((a) => {
      if (a.lat != null && a.lng != null) return a;
      const hit = coordMap.get(String(a.name || '').toLowerCase().trim());
      return hit ? { ...a, lat: hit.lat, lng: hit.lng } : a;
    });
    const withCoords = acts.filter((a) => a.lat != null && a.lng != null);
    if (withCoords.length < 2) {
      toast('Lugares sem localização — não foi possível otimizar');
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
    const recalculated = recalculateTimes(ordered);
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
    <div className="min-h-screen pb-8 relative" style={{ fontFamily: 'var(--font-family-primary)', background: '#F2F2F2' }}>
      {/* Floating FABs (ocultos para viewers) */}
      {!isViewer && showAddAction &&
      <div className="fixed inset-0 z-40 bg-black/25 animate-fade-in" onClick={() => setShowAddAction(false)} />
      }
      {!isViewer && (
      <div className="fixed right-0 left-0 z-50 pointer-events-none" style={{ bottom: creatorEditMode ? 'calc(env(safe-area-inset-bottom, 0px) + 92px)' : 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}>
        <div className="max-w-[430px] mx-auto relative">
          <div className="absolute right-5 bottom-0 flex items-end gap-3 pointer-events-auto">
            {/* Expanded action buttons - stacked vertically, beside the FAB column */}
            {showAddAction &&
            <div className="flex flex-col gap-2 animate-fade-in mb-1">
                <button
                onClick={() => {setShowAddAction(false);setShowAddPlace(true);}}
                className="flex items-center gap-2 h-12 px-5 rounded-full bg-card shadow-lg active:scale-95 transition-transform">
                
                  <Icon name="location_on" size={20} className="text-foreground" />
                  <span className="text-[14px] font-semibold text-foreground">Lugar</span>
                </button>
                





              
                <button
                onClick={() => {setShowAddAction(false);setShowAddNote(true);}}
                className="flex items-center gap-2 h-12 px-5 rounded-full bg-card shadow-lg active:scale-95 transition-transform">
                
                  <Icon name="free_cancellation" size={20} className="text-foreground" />
                  <span className="text-[14px] font-semibold text-foreground">Tempo livre</span>
                </button>
                {/* Deslocamento button hidden for now */}
                <button
                onClick={() => {setShowAddAction(false);setShowAddExpense(true);}}
                className="flex items-center gap-2 h-12 px-5 rounded-full bg-card shadow-lg active:scale-95 transition-transform">
                
                  <Icon name="attach_money" size={20} className="text-foreground" />
                  <span className="text-[14px] font-semibold text-foreground">Gasto</span>
                </button>
                <button
                onClick={() => {setShowAddAction(false);setShowAddReservation(true);}}
                className="flex items-center gap-2 h-12 px-5 rounded-full bg-card shadow-lg active:scale-95 transition-transform">
                  <div className="flex items-center -space-x-1">
                    <Icon name="hotel" size={18} className="text-foreground" />
                    <Icon name="directions_bus" size={18} className="text-foreground" />
                  </div>
                  <span className="text-[14px] font-semibold text-foreground">Reserva</span>
                </button>
                <button
                onClick={() => {setShowAddAction(false);setShowTips(true);}}
                className="flex items-center gap-2 h-12 px-5 rounded-full bg-card shadow-lg active:scale-95 transition-transform">
                
                  <Icon name="edit_note" size={20} className="text-foreground" />
                  <span className="text-[14px] font-semibold text-foreground">Notas</span>
                </button>
              </div>
            }

            {/* FAB column: Map + Main button stacked */}
            <div className="flex flex-col items-center gap-3">
              {/* AI Chat and Map FABs removed — now available in the itinerary toolbar */}

              {/* Main FAB: + / X toggle */}
              <button
                onClick={() => setShowAddAction((prev) => !prev)}
                className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-all duration-200 ${showAddAction ? 'bg-muted rotate-0' : 'bg-primary'}`}>
                
                <Icon
                  name={showAddAction ? 'close' : 'add'}
                  size={24}
                  className={showAddAction ? 'text-foreground' : 'text-primary-foreground'} />
                
              </button>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Aviso visual para viewer */}
      {isViewer && (
        <div className="fixed top-0 left-0 right-0 z-[60] pointer-events-none flex justify-center" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
          <div className="mt-2 px-3 py-1 rounded-full bg-black/60 text-white text-[11px] font-medium">
            Modo visualização
          </div>
        </div>
      )}

      {/* Hero Header */}
      <div
        className="relative bg-cover bg-center"
        style={{
          height: '26vh',
          minHeight: '200px',
          maxHeight: '260px',
          backgroundImage: `url(${coverImage})`
        }}>
        
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/70" />

        {/* Nav buttons */}
        <div className="absolute top-5 left-0 right-0 px-4 flex items-center justify-between z-10">
          <BackButton onClick={onBack} />
          {!creatorEditMode && (
            <button onClick={() => setShowSettings(true)} className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm">
              <Icon name="more_horiz" size={20} className="text-foreground" />
            </button>
          )}
        </div>

        {/* Title + metadata on image */}
        <div className="absolute bottom-20 left-4 right-4 z-10">
          <h1 className="text-[24px] font-bold text-white leading-tight mb-2">
            {itineraryData.tripName || itineraryDataset?.title || (itineraryData.destinations.length > 0 ? `${itineraryData.destinations[0].split(',')[0]} trip` : 'Paris trip')}
          </h1>
          {isPurchased && itineraryDataset?.author && (
            <div className="flex items-center gap-2 mb-2">
              {itineraryDataset.authorImage && (
                <img
                  src={itineraryDataset.authorImage}
                  alt={itineraryDataset.author}
                  className="w-6 h-6 rounded-full object-cover border border-white/60"
                />
              )}
              <span className="text-[13px] text-white/90">
                Criado por <span className="font-semibold text-white">{itineraryDataset.author}</span>
              </span>
            </div>
          )}
          <div className="flex items-center flex-wrap gap-x-2.5 gap-y-1.5">
            <div className="flex items-center gap-1">
              <Icon name="location_on" size={14} className="text-white/90" />
              <span className="text-[13px] font-bold text-white">{effectiveDaysData.reduce((sum, d) => sum + getAllActivities(d.day).filter(a => a.type !== 'note').length, 0)} locais</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[13px] font-bold text-white">{tripDays} dias</span>
            </div>
            {(() => {
              const daysLeft = Math.max(0, differenceInDays(itineraryData.startDate ?? new Date(), new Date()));
              const isClose = daysLeft <= 7;
              return (
                <div className={`h-7 inline-flex items-center px-3 rounded-2xl ${isClose ? 'bg-[#9DCC36] text-[#1A1C40]' : 'bg-[#F2F2F2] text-[#8E8E93]'}`}>
                  <span className="text-[12px] font-medium">
                    Em {daysLeft} {daysLeft === 1 ? 'dia' : 'dias'}
                  </span>
                </div>);
            })()}
            <div className={`ml-auto flex -space-x-1.5 transition-transform ${creatorEditMode ? '' : 'cursor-pointer active:scale-95'}`} onClick={creatorEditMode ? undefined : () => setShowParticipantsSheet(true)}>
              {(() => {
                const friends = itineraryData.invitedFriends || [];
                // If dataset has participants (marketplace itinerary), use those; otherwise use invited friends
                const avatarUrls = itineraryDataset?.participants;
                if (avatarUrls && avatarUrls.length > 0) {
                  const maxVisible = 3;
                  const visible = avatarUrls.slice(0, maxVisible);
                  const remaining = avatarUrls.length - maxVisible;
                  return (
                    <>
                      {visible.map((url, i) => (
                        <div key={i} className="w-7 h-7 rounded-full border-[1.5px] border-white overflow-hidden">
                          <img src={url} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                      {remaining > 0 && (
                        <div className="w-7 h-7 rounded-full border-[1.5px] border-white flex items-center justify-center bg-white">
                          <span className="text-[10px] font-bold text-foreground">+{remaining}</span>
                        </div>
                      )}
                    </>
                  );
                }
                // User-created itinerary: show owner + accepted members + (legacy) invited friends
                const maxVisible = 3;
                const myUserId = session?.user?.id;
                const ownerIsMe = !ownerProfile || (myUserId && ownerProfile.userId === myUserId);
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
                      <div key={p.id} className="w-7 h-7 rounded-full border-[1.5px] border-white overflow-hidden bg-muted flex items-center justify-center">
                        {p.avatar ? (
                          <img src={p.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Icon name="person" size={14} className="text-muted-foreground" />
                        )}
                      </div>
                    ))}
                    {remaining > 0 && (
                      <div className="w-7 h-7 rounded-full border-[1.5px] border-white flex items-center justify-center bg-white">
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

      {/* Info Card - overlapping hero */}
      <div className="px-4 -mt-5 relative z-20 mb-5">
        <div onClick={() => { if (!isViewer) setShowEditTripInfo(true); }} className="bg-card rounded-2xl overflow-hidden px-4 py-4 flex items-center gap-2.5 cursor-pointer active:scale-[0.98] transition-transform" style={{ boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)' }}>
          <div className="flex items-center gap-1.5 min-w-0 shrink">
            <Icon name="map" size={15} className="text-muted-foreground flex-shrink-0" />
            <span className="text-[14px] font-medium text-foreground truncate">
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
                <span className="text-[14px] font-medium text-muted-foreground flex-shrink-0">
                  · +{remaining}
                </span>
              );
            })()}
          </div>
          <div className="w-px h-4 bg-border flex-shrink-0" />
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Icon name="calendar_today" size={13} className="text-muted-foreground" />
            <span className="text-[14px] text-foreground font-medium whitespace-nowrap">{formatDateRange()}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4">
        {/* Management Carousel */}
        <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-2 mb-8" style={{ WebkitOverflowScrolling: 'touch', overscrollBehaviorX: 'contain' }} onWheel={(e) => {if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {const el = e.currentTarget; el.style.overflowX = 'hidden'; requestAnimationFrame(() => { if (el) el.style.overflowX = 'auto'; });}}}>
          {/* Documentos — escondida quando o roteiro está à venda (versão pública) */}
          {!isItineraryPublic && (
            <button
              onClick={() => setShowDocumentos(true)}
              className="flex-shrink-0 w-[136px] rounded-2xl bg-card p-3 text-left"
              style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
              
              <div className="w-8 h-8 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: 'hsl(var(--primary) / 0.12)' }}>
                <Plane size={18} strokeWidth={1.5} style={{ color: 'hsl(var(--primary))' }} />
              </div>
              <span className="text-[13px] font-semibold text-foreground block">Reservas</span>
              <span className="text-[12px] text-muted-foreground mt-0.5 block">
                {transportes.length + reservas.length > 0 ? `${transportes.length + reservas.length}` : 'Nenhum'}
              </span>
            </button>
          )}

          {/* Orçamento */}
          <button
            onClick={() => setShowBudget(true)}
            className="flex-shrink-0 w-[136px] rounded-2xl bg-card p-3 text-left"
            style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
            
            <div className="w-8 h-8 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: 'hsl(142 71% 45% / 0.12)' }}>
              <Icon name="account_balance_wallet" size={18} className="text-emerald-600" />
            </div>
            <span className="text-[13px] font-semibold text-foreground block">Orçamento</span>
            <span className="text-[12px] text-muted-foreground mt-0.5 block">
              {expenses.length > 0
                ? `R$ ${formatBRL(expenses.reduce((s, e) => s + e.amountBRL, 0))}`
                : 'Sem gastos'}
            </span>
          </button>

          {/* Notas */}
          <button
            onClick={() => setShowTips(true)}
            className="flex-shrink-0 w-[136px] rounded-2xl bg-card p-3 text-left"
            style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
            
            <div className="w-8 h-8 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: 'hsl(38 92% 50% / 0.12)' }}>
              <Icon name="edit_note" size={18} className="text-amber-500" />
            </div>
            <span className="text-[13px] font-semibold text-foreground block">Notas</span>
            <span className="text-[12px] text-muted-foreground mt-0.5 block">
              {tripNotes.length > 0 ? `${tripNotes.length} ${tripNotes.length === 1 ? 'nota' : 'notas'}` : 'Nenhuma'}
            </span>
          </button>

          {/* Checklist */}
          <button
            onClick={() => setShowChecklist(true)}
            className="flex-shrink-0 w-[136px] rounded-2xl bg-card p-3 text-left"
            style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
            
            <div className="w-8 h-8 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: 'hsl(262 83% 58% / 0.12)' }}>
              <Icon name="luggage" size={18} className="text-violet-500" />
            </div>
            <span className="text-[13px] font-semibold text-foreground block">Checklist</span>
            <span className="text-[12px] text-muted-foreground mt-0.5 block">{checklistChecked}/{checklistTotal}</span>
          </button>
        </div>

        <div
          ref={stickyTabsRef}
          className="-mx-4 px-4 sticky top-0 z-30"
          style={{ backgroundColor: '#ECECEC' }}
        >
        <div
          className="flex items-center gap-1 relative py-1"
          style={{ minHeight: 64 }}
        >
          <button
            onClick={() => {
              if (tabsRef.current) {
                const newPos = tabsRef.current.scrollLeft - 120;
                if (newPos <= 10) {
                  tabsRef.current.scrollTo({ left: 0, behavior: 'smooth' });
                } else {
                  tabsRef.current.scrollBy({ left: -120, behavior: 'smooth' });
                }
                setTimeout(checkScrollArrows, 300);
              }
            }}
            disabled={!canScrollLeft}
            className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              canScrollLeft ? 'text-muted-foreground hover:text-foreground' : 'text-muted-foreground/30 pointer-events-none'
            }`}>
            <Icon name="chevron_left" size={20} />
          </button>
          <div
            ref={tabsRef}
            className={`flex items-center min-w-0 scrollbar-hide flex-1 ${
              needsScroll ? 'overflow-x-auto gap-3 justify-start' : 'overflow-x-hidden gap-1 justify-around'
            }`}
            style={needsScroll ? { overscrollBehaviorX: 'contain', WebkitOverflowScrolling: 'touch', touchAction: 'pan-x' } : undefined}
          >
          {effectiveDaysData.map((tab) => {
              const isSelected = selectedDay === tab.day;
              const weekday = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][tab.date.getDay()];
              const dayNum = format(tab.date, 'd');
              return (
                <button
                  key={tab.day}
                  data-day-tab={tab.day}
                  onClick={() => {
                    setSelectedDay(tab.day);
                    const section = daySectionRefs.current[tab.day];
                    if (section) {
                      isScrollingToDay.current = true;
                      const offset = section.getBoundingClientRect().top + window.scrollY - stickyTabsHeight - 12;
                      window.scrollTo({ top: Math.max(0, offset), behavior: 'smooth' });
                      window.setTimeout(() => { isScrollingToDay.current = false; }, 550);
                    }
                  }}
                  className={`flex flex-col items-center justify-center flex-shrink-0 transition-all duration-200 rounded-[22px] ${
                  isSelected ?
                  'px-3.5 py-2 bg-foreground' :
                  'px-2 py-2'}`
                  }
                >
                  
                <span className={`text-[12px] leading-tight ${
                  isSelected ? 'font-medium text-white' : 'font-normal text-muted-foreground'}`
                  }>
                  {weekday}
                </span>
                <span className={`text-[16px] mt-0.5 leading-tight ${
                  isSelected ? 'font-semibold text-white' : 'font-semibold text-muted-foreground'}`
                  }>
                  {dayNum}
                </span>
              </button>);

            })}
          </div>
          <button
            onClick={() => {
              if (tabsRef.current) {
                tabsRef.current.scrollBy({ left: 120, behavior: 'smooth' });
                setTimeout(checkScrollArrows, 300);
              }
            }}
            disabled={!canScrollRight}
            className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              canScrollRight ? 'text-muted-foreground hover:text-foreground' : 'text-muted-foreground/30 pointer-events-none'
            }`}>
            <Icon name="chevron_right" size={20} />
          </button>
        </div>

        {/* View toggle */}
        <div className="flex items-center justify-between pt-1 pb-3">
          <h3 className="text-[15px] font-semibold text-foreground">Itinerário</h3>
          <div className="flex items-center gap-1.5">
            {!isViewer && effectiveDaysData.some(d => getAllActivities(d.day).length > 0) && (
              <button
                type="button"
                aria-label="Reordenar atividades"
                onClick={() => setShowReorder(true)}
                className="h-9 w-9 rounded-lg flex items-center justify-center text-[#1A1C40] hover:bg-muted/30 transition-all touch-manipulation"
              >
                <Icon name="swap_vert" size={18} />
              </button>
            )}
            <button
              type="button"
              aria-label="Abrir mapa"
              onClick={() => setShowMap(true)}
              className="h-9 w-9 rounded-lg flex items-center justify-center text-[#1A1C40] hover:bg-muted/30 transition-all touch-manipulation"
            >
              <Icon name="map" size={18} />
            </button>
            <button
              type="button"
              aria-label="Trocar modo de visualização"
              onClick={() => setShowViewModeSheet(true)}
              className="h-9 w-9 rounded-lg flex items-center justify-center text-[#1A1C40] hover:bg-muted/30 transition-all touch-manipulation"
            >
              {compactView ? (
                <ListBulletIcon className="w-[18px] h-[18px]" />
              ) : (
                <Bars3BottomLeftIcon className="w-[18px] h-[18px]" />
              )}
            </button>
          </div>
        </div>
        </div>

        {/* All Days Timeline */}
        {effectiveDaysData.map((dayItem, dayIdx) => {
          const dayActs = getAllActivities(dayItem.day);
          const dayTrans = getAllTransports(dayItem.day);
          const weekday = format(dayItem.date, 'EEEE', { locale: ptBR });
          const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
          const shortDate = format(dayItem.date, 'dd/MM', { locale: ptBR });

          return (
            <div
              key={dayItem.day}
              ref={el => { daySectionRefs.current[dayItem.day] = el; }}
              data-day={dayItem.day}
              className="mb-6"
              style={{ scrollMarginTop: stickyTabsHeight + 16 }}
            >
              {/* White divider line between days */}
              {dayIdx > 0 && (
                <div className="-mx-4 h-2 bg-white" />
              )}

              {/* Sticky Day Header — bigger, bolder title */}
              <div
                className="sticky z-10 pt-4 pb-2 -mx-4 px-4"
                style={{ backgroundColor: 'hsl(var(--divider))', top: stickyTabsHeight }}
              >
                <div className="flex items-baseline gap-2">
                  <h3 className="text-[22px] font-extrabold text-foreground tracking-tight">
                    {capitalizedWeekday.slice(0, 3)} {shortDate}
                  </h3>
                  <span className="text-[13px] text-muted-foreground">· Dia {dayItem.day}</span>
                </div>

                {/* Quick inline actions — contextual */}
                {(dayActs.length === 0 || dayActs.length >= 2) && !aiLoadingDays.has(dayItem.day) && (
                  <div className="flex items-center gap-4 mt-1.5">
                    {dayActs.length === 0 && (
                      <button
                        type="button"
                        onClick={async () => {
                          const day = dayItem.day;
                          setSelectedDay(day);
                          setAiLoadingDays((prev) => { const n = new Set(prev); n.add(day); return n; });

                          // 1) Esperar sugestões do dia carregarem (até 6s),
                          //    lendo das refs para evitar closure presa.
                          const getPoolForDay = () => {
                            if (itineraryDataset?.suggestions) {
                              return (suggestionsData as ItinerarySuggestion[]) ?? [];
                            }
                            return (
                              dynamicSuggestionsByDayRef.current?.[day]
                              ?? suggestionsByDayRef.current?.[day]
                              ?? []
                            );
                          };
                          const waitStart = Date.now();
                          let pool = getPoolForDay();
                          while (pool.length === 0 && Date.now() - waitStart < 6000) {
                            const fetched = Boolean(hasFetchedByDayRef.current?.[day]);
                            if (fetched) break;
                            await new Promise((r) => setTimeout(r, 250));
                            pool = getPoolForDay();
                          }
                          // Última leitura após o wait
                          pool = getPoolForDay();

                          // 2) Filtrar lugares já presentes em qualquer dia (anti-duplicata global)
                          const used = new Set<string>();
                          Object.values(dayActivitiesRef.current ?? {}).forEach((acts) => {
                            (acts as Activity[] | undefined)?.forEach((a) => {
                              if (a?.name) used.add(a.name.trim().toLowerCase());
                            });
                          });
                          const filtered = pool.filter(
                            (s) => !used.has(s.name.trim().toLowerCase())
                          );

                          // 3) Caso vazio: NÃO mostrar sucesso, dar feedback claro
                          if (filtered.length === 0) {
                            setAiLoadingDays((prev) => { const n = new Set(prev); n.delete(day); return n; });
                            const destName = (
                              itineraryData.destinations?.length
                                ? getDestinationForDay(itineraryData.destinations, day, tripDays).split(',')[0]
                                : ''
                            ) || 'esse dia';
                            toast.error(`Não encontrei sugestões para ${destName}. Tente adicionar manualmente.`);
                            return;
                          }

                          // 4) Montar agenda lógica por horário, respeitando funcionamento
                          const parseHHMM = (s: string): number | null => {
                            const m = /(\d{1,2}):(\d{2})/.exec(s || '');
                            if (!m) return null;
                            return Math.min(23, parseInt(m[1], 10)) * 60 + Math.min(59, parseInt(m[2], 10));
                          };
                          const parseHoursRange = (raw: string): { open: number; close: number } | null => {
                            if (!raw) return null;
                            const txt = raw.trim().toLowerCase();
                            if (txt === '24h' || txt.includes('24 h') || txt.includes('aberto 24')) {
                              return { open: 0, close: 24 * 60 };
                            }
                            const parts = txt.split(/\s*(?:às|-|–|to|until|a)\s*/i);
                            if (parts.length < 2) return null;
                            const o = parseHHMM(parts[0]);
                            const c = parseHHMM(parts[1]);
                            if (o == null || c == null) return null;
                            return { open: o, close: c <= o ? c + 24 * 60 : c };
                          };
                          const isOpenAt = (raw: string, minutes: number): boolean => {
                            const r = parseHoursRange(raw);
                            if (!r) return true; // sem info → não bloquear
                            const m1 = minutes;
                            const m2 = minutes + 24 * 60;
                            return (m1 >= r.open && m1 <= r.close) || (m2 >= r.open && m2 <= r.close);
                          };
                          const inferBucket = (it: any): 'restaurants'|'experiences'|'attractions'|'nightlife'|'events' => {
                            const explicit = it?.bucket as string | undefined;
                            if (explicit) return explicit as any;
                            const cat = (it?.category || '').toLowerCase();
                            if (cat.includes('restaurante')) return 'restaurants';
                            if (cat.includes('noturna') || cat.includes('bar') || cat.includes('balada')) return 'nightlife';
                            if (cat.includes('experiência') || cat.includes('experiencia')) return 'experiences';
                            if (cat.includes('evento')) return 'events';
                            return 'attractions';
                          };
                          type Slot = { start: string; duration: number; prefer: string[]; matchSlot: string };
                          const slots: Slot[] = [
                            { start: '09:30', duration: 90, prefer: ['attractions','experiences'], matchSlot: 'morning' },
                            { start: '12:30', duration: 75, prefer: ['restaurants'], matchSlot: 'lunch' },
                            { start: '15:00', duration: 90, prefer: ['experiences','attractions'], matchSlot: 'afternoon' },
                            { start: '19:30', duration: 90, prefer: ['restaurants','events'], matchSlot: 'dinner' },
                            { start: '22:00', duration: 120, prefer: ['nightlife','events'], matchSlot: 'night' },
                          ];
                          const remaining = [...filtered];
                          const picks: typeof filtered = [];
                          const pickOne = (slot: Slot): any | null => {
                            const startMin = parseHHMM(slot.start) ?? 9 * 60;
                            // Tier 1: bucket preferido + slot sugerido bate + aberto
                            const tiers = [
                              (it: any) => slot.prefer.includes(inferBucket(it)) && (it.suggestedTimeSlot === slot.matchSlot) && isOpenAt(it.openHours || '', startMin),
                              (it: any) => slot.prefer.includes(inferBucket(it)) && isOpenAt(it.openHours || '', startMin),
                              (it: any) => (it.suggestedTimeSlot === slot.matchSlot) && isOpenAt(it.openHours || '', startMin),
                              (it: any) => isOpenAt(it.openHours || '', startMin) && inferBucket(it) !== 'nightlife',
                            ];
                            for (const test of tiers) {
                              const idx = remaining.findIndex(test);
                              if (idx !== -1) {
                                const [item] = remaining.splice(idx, 1);
                                return item;
                              }
                            }
                            return null;
                          };
                          for (const slot of slots) {
                            const item = pickOne(slot);
                            if (!item) continue;
                            picks.push(Object.assign({}, item, { __slot: slot }));
                            if (picks.length >= 5) break;
                          }
                          // Garantir mínimo de 3 itens — preencher slots vazios com qualquer coisa restante
                          if (picks.length < 3) {
                            const fallbackSlots = slots.filter((s) => !picks.some((p: any) => p.__slot?.start === s.start));
                            for (const slot of fallbackSlots) {
                              if (picks.length >= 3) break;
                              if (remaining.length === 0) break;
                              const item = remaining.shift();
                              picks.push(Object.assign({}, item, { __slot: slot }));
                            }
                          }
                          // Ordenar por horário de início
                          picks.sort((a: any, b: any) => (parseHHMM(a.__slot.start)! - parseHHMM(b.__slot.start)!));

                          const generated: Activity[] = picks.map((item: any, idx) => {
                            const slot: Slot = item.__slot;
                            const duration = (item as any).duration || slot.duration;
                            const start = slot.start;
                            const end = addMinutes(start, duration);
                            return {
                              id: Date.now() + idx,
                              type: 'activity',
                              name: item.name,
                              startTime: start,
                              endTime: end,
                              category: item.category || '',
                              categoryColor: item.categoryColor || '#10B981',
                              image: item.image,
                              openHours: (item as any).openHours || '',
                              rating: (item as any).rating || 0,
                              price: (item as any).price || estimatedPriceFor(item.name, (item as any).city),
                              lat: (item as any).lat,
                              lng: (item as any).lng,
                            };
                          });
                          setDayActivities((prev) => ({ ...prev, [day]: generated }));
                          // Build transports between generated activities
                          const needed = Math.max(0, generated.length - 1);
                          const newTransports: TransportBetween[] = await Promise.all(
                            Array.from({ length: needed }, async (_, i) => {
                              const fromAct = generated[i];
                              const toAct = generated[i + 1];
                              if (fromAct.lat && fromAct.lng && toAct.lat && toAct.lng) {
                                return getRouteInfo(fromAct.lat, fromAct.lng, toAct.lat, toAct.lng);
                              }
                              return { type: 'walk' as const, duration: '0 min' };
                            })
                          );
                          setDayTransports((prev) => ({ ...prev, [day]: newTransports }));
                          setAiLoadingDays((prev) => { const n = new Set(prev); n.delete(day); return n; });
                          toast.success(`Roteiro gerado com IA · ${generated.length} ${generated.length === 1 ? 'lugar' : 'lugares'}`);
                        }}
                        className="flex items-center gap-1 text-[13px] font-semibold text-[#7C3AED] active:opacity-70 transition-opacity"
                      >
                        <Icon name="auto_awesome" size={14} className="text-[#7C3AED]" />
                        Preencher com IA
                      </button>
                    )}
                    {dayActs.length >= 2 && (
                      <button
                        type="button"
                        disabled={optimizingDays.has(dayItem.day)}
                        onClick={() => setConfirmOptimizeDay(dayItem.day)}
                        className="flex items-center gap-1 text-[13px] font-semibold text-[#2563EB] active:opacity-70 transition-opacity disabled:opacity-60"
                      >
                        {optimizingDays.has(dayItem.day) ? (
                          <>
                            <Icon name="autorenew" size={14} className="animate-spin text-[#2563EB]" />
                            Otimizando…
                          </>
                        ) : (
                          <>
                            <Icon name="route" size={14} className="text-[#2563EB]" />
                            Otimizar rota
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Add a place input — only when day is empty */}
              {dayActs.length === 0 && !aiLoadingDays.has(dayItem.day) && (
                <button
                  type="button"
                  onClick={() => { setSelectedDay(dayItem.day); setShowAddPlace(true); }}
                  className="w-full h-11 mb-3 mt-2 px-3.5 rounded-xl bg-card border border-border flex items-center gap-2 text-left active:scale-[0.99] transition-transform"
                  style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
                >
                  <Icon name="location_on" size={16} className="text-muted-foreground" />
                  <span className="text-[13px] text-muted-foreground">Adicionar um lugar</span>
                </button>
              )}

              {dayActs.length > 0 && optimizingDays.has(dayItem.day) ? (
                <div className="space-y-3 mb-4 animate-fade-in" aria-busy="true" aria-live="polite">
                  <div className="flex items-center gap-2 text-[12px] font-semibold text-[#2563EB]">
                    <Icon name="autorenew" size={14} className="animate-spin text-[#2563EB]" />
                    Otimizando rota…
                  </div>
                  {Array.from({ length: Math.max(3, dayActs.length) }).map((_, i) => (
                    <div key={i}>
                      <div
                        className="rounded-xl bg-card p-3 flex gap-3"
                        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
                      >
                        <div className="w-16 h-16 rounded-lg bg-muted animate-pulse" />
                        <div className="flex-1 space-y-2 py-1">
                          <div className="h-3 rounded bg-muted animate-pulse w-3/4" />
                          <div className="h-3 rounded bg-muted animate-pulse w-1/2" />
                          <div className="h-3 rounded bg-muted animate-pulse w-2/5" />
                        </div>
                      </div>
                      {i < Math.max(3, dayActs.length) - 1 && (
                        <div className="flex items-center gap-2 pl-4 py-2">
                          <div className="w-px h-4 border-l border-dashed border-border" />
                          <div className="h-2 w-20 rounded bg-muted animate-pulse" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : dayActs.length > 0 ? (
                <div
                  key={`day-${dayItem.day}-${recalculateTimes ? dayActs.map(a => a.id).join('-') : ''}`}
                  className={`transition-all duration-300 ${optimizedFlash.has(dayItem.day) ? 'animate-fade-in' : ''}`}
                >
                <DraggableActivityList
                  compactView={compactView}
                  activities={dayActs}
                  transports={dayTrans}
                  dayTabsRef={tabsRef}
                  daysData={effectiveDaysData}
                  selectedDay={dayItem.day}
                  onReorder={async (reordered) => {
                    const recalculated = recalculateTimes(reordered);
                    setDayActivities((prev) => ({ ...prev, [dayItem.day]: recalculated }));
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
                    setDayTransports((prev) => ({ ...prev, [dayItem.day]: newTransports }));
                  }}
                  onDelete={(activity) => handleDeleteActivity(activity, dayItem.day)}
                  onMoveToDay={(activity, targetDay) => handleMoveToDay(activity, targetDay, dayItem.day)}
                  onActivityClick={(activity) => {
                    setSelectedDay(dayItem.day);
                      setSelectedActivityDay(dayItem.day);
                    setActivityActionTarget(activity);
                  }}
                  getTransportIcon={getTransportIcon}
                  places={itineraryDataset?.places?.map(p => ({ name: p.name, lat: p.lat, lng: p.lng })) ?? []}
                  repeatedNames={repeatedActivityNames}
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
                </div>
              ) : aiLoadingDays.has(dayItem.day) ? (
                <div className="space-y-3 mb-4 animate-fade-in">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="rounded-xl bg-card p-3 flex gap-3" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                      <div className="w-16 h-16 rounded-lg bg-muted animate-pulse" />
                      <div className="flex-1 space-y-2 py-1">
                        <div className="h-3 w-2/3 rounded bg-muted animate-pulse" />
                        <div className="h-3 w-1/3 rounded bg-muted animate-pulse" />
                        <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {/* Per-Day Recommendations */}
              {(() => {
                const daySuggestions = itineraryDataset?.suggestions
                  ? suggestionsData
                  : (dynamicSuggestionsByDay[dayItem.day] ?? suggestionsByDay[dayItem.day] ?? []);
                const dayActivityNames = dayActs.map(a => a.name.toLowerCase());
                const filteredSuggestions = daySuggestions.filter((item) => !dayActivityNames.includes(item.name.toLowerCase()));
                const hasSuggestions = daySuggestions.length > 0;
                const allSuggestionsAlreadyAdded = hasSuggestions && filteredSuggestions.length === 0;
                const isSearchingSuggestions = Boolean(isLoadingByDay[dayItem.day]) && !hasSuggestions;
                const suggestionsFetched = Boolean(hasFetchedByDay[dayItem.day]);
                const dayDestinationName = getDestinationForDay(itineraryData.destinations, dayItem.day, tripDays).split(',')[0];
                const dayDestination = itineraryData.destinations.length > 1 ? dayDestinationName : null;
                const bucketOf = (cat: string): RecCategory => {
                  const c = (cat || '').toLowerCase();
                  if (c.includes('restaurante') || c.includes('cafeteria') || c.includes('mercado')) return 'food';
                  if (c.includes('experiência') || c.includes('experiencia')) return 'experience';
                  if (c.includes('vida noturna') || c.includes('bar') || c.includes('pub') || c.includes('balada')) return 'night';
                  if (c.includes('evento')) return 'event';
                  return 'attraction';
                };
                // Quando há filtro de categoria ativo, busca no pool completo
                // da cidade (não na fatia rotativa por dia) para garantir que
                // restaurantes/experiências/vida noturna apareçam mesmo quando
                // o slice diário só trouxe atrações.
                // Filtro de categoria opera sobre a fatia do dia para manter
                // recomendações diferentes em cada dia, inclusive por bucket.
                const recFilter: RecCategory = recFilterByDay[dayItem.day] ?? 'all';
                const categoryFiltered = recFilter === 'all'
                  ? filteredSuggestions
                  : filteredSuggestions.filter((s) => bucketOf(s.category || '') === recFilter);
                const chips: { key: RecCategory; label: string }[] = [
                  { key: 'all', label: 'Tudo' },
                  { key: 'attraction', label: 'Atrações' },
                  { key: 'food', label: 'Restaurantes' },
                  { key: 'experience', label: 'Experiências' },
                  { key: 'night', label: 'Vida noturna' },
                  { key: 'event', label: 'Eventos' },
                ];
                return (
                  <div className="mt-3">
                    <h4 className="text-[13px] font-semibold text-foreground mb-2">
                      {dayDestination ? `Recomendações em ${dayDestination}` : 'Recomendações pra esse dia'}
                    </h4>
                    {filteredSuggestions.length > 0 && (
                      <div className="flex overflow-x-auto scrollbar-hide gap-1.5 mb-2.5 -mr-5 pr-5" style={{ overscrollBehaviorX: 'contain' }}>
                        {chips.map((chip) => {
                          const active = recFilter === chip.key;
                          return (
                            <button
                              key={chip.key}
                              onClick={() => setRecFilterByDay((prev) => ({ ...prev, [dayItem.day]: chip.key }))}
                              className="px-3 py-1 rounded-full text-[12px] font-medium flex-shrink-0 transition-colors"
                              style={{
                                background: active ? '#1A1C40' : '#FFFFFF',
                                color: active ? '#FFFFFF' : '#1A1C40',
                                border: active ? '1px solid #1A1C40' : '1px solid hsl(var(--border))',
                              }}
                            >
                              {chip.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {categoryFiltered.length > 0 ? (
                      <div className="flex overflow-x-auto scrollbar-hide gap-3 -mr-5 pr-5" style={{ overscrollBehaviorX: 'contain' }} onWheel={(e) => {if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {const el = e.currentTarget; el.style.overflowX = 'hidden'; requestAnimationFrame(() => { if (el) el.style.overflowX = 'auto'; });}}}>
                        {categoryFiltered.map((item) =>
                          <div
                            key={item.id}
                            className="flex items-center gap-3 p-2.5 rounded-xl border border-dashed border-border bg-card flex-shrink-0"
                            style={{ width: 'calc((100% - 12px) / 1.6)' }}>
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-[72px] h-[72px] rounded-lg object-cover flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <h4 className="text-[13px] font-semibold text-foreground line-clamp-2 leading-tight">{item.name}</h4>
                              </div>
                              <button
                                onClick={() => {
                                  const duration = item.duration || 90;
                                  const { start, end } = suggestNextTime(dayItem.day, duration);
                                  const itemLat = (item as any).lat as number | undefined;
                                  const itemLng = (item as any).lng as number | undefined;
                                  const newActivity: Activity = {
                                    id: Date.now() + item.id,
                                    type: 'activity',
                                    name: item.name,
                                    startTime: start,
                                    endTime: end,
                                    category: item.category || '',
                                    categoryColor: item.categoryColor || '#10B981',
                                    image: item.image,
                                    openHours: '',
                                    rating: item.rating || 0,
                                    price: (item as any).price || estimatedPriceFor(item.name, (item as any).city),
                                    lat: itemLat,
                                    lng: itemLng
                                  };
                                  addDefaultTransport(dayItem.day, item.name, itemLat, itemLng);
                                  setDayActivities((prev) => ({
                                    ...prev,
                                    [dayItem.day]: [...getAllActivities(dayItem.day), newActivity]
                                  }));
                                  toast(`${item.name} adicionado ao Dia ${dayItem.day}`);
                                }}
                                className="w-8 h-8 rounded-full border border-border bg-card flex items-center justify-center flex-shrink-0">
                                  <Icon name="add" size={20} className="text-muted-foreground" />
                              </button>
                          </div>
                        )}
                      </div>
                    ) : recFilter !== 'all' && filteredSuggestions.length > 0 ? (
                      <div className="flex items-center gap-2 py-3 px-3 rounded-xl bg-muted/40">
                        <Icon name="filter_alt_off" size={16} className="text-muted-foreground flex-shrink-0" />
                        <p className="text-[12px] font-medium text-muted-foreground">
                          Nenhuma sugestão nessa categoria
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 py-3 px-3 rounded-xl bg-muted/40">
                        {isSearchingSuggestions ? (
                          <Icon name="autorenew" size={16} className="text-muted-foreground flex-shrink-0 animate-spin" />
                        ) : allSuggestionsAlreadyAdded ? (
                          <Icon name="check_circle" size={16} filled className="text-primary flex-shrink-0" />
                        ) : (
                          <Icon name="travel_explore" size={16} className="text-muted-foreground flex-shrink-0" />
                        )}
                        <p className="text-[12px] font-medium text-muted-foreground">
                          {isSearchingSuggestions
                            ? `Buscando sugestões em ${dayDestinationName || 'seu destino'}...`
                            : allSuggestionsAlreadyAdded
                              ? 'Todas as sugestões já estão neste dia'
                              : suggestionsFetched
                                ? `Ainda não encontramos sugestões para ${dayDestinationName || 'esse destino'}`
                                : `Buscando sugestões em ${dayDestinationName || 'seu destino'}...`}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>

      {isOpeningDuplicate &&
      <div className="fixed inset-0 z-[210] bg-background/90 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          <p className="text-[14px] font-semibold text-foreground">Abrindo cópia do roteiro...</p>
        </div>
      }

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
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                    opt.active ? 'border-primary' : 'border-muted-foreground/40'
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
          className="fixed left-0 right-0 z-50 mx-auto w-full max-w-[430px] px-4 pt-3 bg-white border-t border-border"
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
        onShare={isUuidId ? () => setShowShareSheet(true) : undefined}
        onDuplicate={() => setDuplicateToast(true)}
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
        onDownloadPdf={() => {
          const title =
            itineraryData.tripName?.trim() ||
            itineraryDataset?.title ||
            (itineraryData.destinations.length > 0
              ? `${itineraryData.destinations[0].split(',')[0]} trip`
              : 'Roteiro');
          downloadItineraryPdf({
            title,
            destinations: itineraryData.destinations,
            startDate: itineraryData.startDate
              ? format(itineraryData.startDate, "d 'de' MMM yyyy", { locale: ptBR })
              : undefined,
            endDate: itineraryData.endDate
              ? format(itineraryData.endDate, "d 'de' MMM yyyy", { locale: ptBR })
              : undefined,
            days: Array.from({ length: tripDays }, (_, i) => {
              const dayNum = i + 1;
              const dayDate = itineraryData.startDate
                ? format(addDays(itineraryData.startDate, i), "EEE, d 'de' MMM", { locale: ptBR })
                : undefined;
              return {
                dayNumber: dayNum,
                date: dayDate,
                activities: getAllActivities(dayNum).map((a) => ({
                  time: a.startTime && a.endTime ? `${a.startTime}–${a.endTime}` : a.startTime,
                  name: a.type === 'note' ? (a.noteText || 'Tempo livre') : a.name,
                  location: a.category,
                  notes: a.observation,
                })),
              };
            }),
          });
        }} />

      {isUuidId && typeof itineraryId === 'string' && session?.user?.id && (
        <ShareItinerarySheet
          open={showShareSheet}
          onClose={() => setShowShareSheet(false)}
          itineraryId={itineraryId}
          ownerId={session.user.id}
          tripName={itineraryData.tripName?.trim() || (itineraryData.destinations[0] ?? 'Roteiro')}
        />
      )}
      {isUuidId && typeof itineraryId === 'string' && (
        <ParticipantsSheet
          open={showParticipantsSheet}
          onClose={() => setShowParticipantsSheet(false)}
          itineraryId={itineraryId}
          currentUserId={session?.user?.id}
          onInvite={() => setShowShareSheet(true)}
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
        initialMainTag={publishedMainTag}
        onPublished={(result) => {
          const extras = {
            priceCents: Math.round((result.price || 0) * 100),
            description: result.description,
            tags: result.tags,
            mainTag: result.mainTag,
          };
          if (isItineraryPublic) {
            // Já é o roteiro público — apenas atualiza dados de venda dele.
            persistPublishState(true, extras);
          } else {
            // Privado → cria uma cópia independente como público.
            void handlePublishAsCopy(extras);
          }
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
        isVisible={duplicateToast}
        onClose={() => setDuplicateToast(false)}
        title="Roteiro duplicado!"
        description="Uma cópia do roteiro foi criada com sucesso"
        actionLabel="Abrir roteiro"
        onAction={() => {
          setDuplicateToast(false);
          setIsOpeningDuplicate(true);

          setTimeout(() => {
            setSelectedDay(1);
            setReservas([]);
            setExpenses([]);
            setTransportes([]);
            setDayTitles({});
            setSelectedActivity(null);
            setItineraryData((prev) => {
              const firstDestination = prev.destinations[0] ?? 'Paris, França';
              const [city, ...rest] = firstDestination.split(',');
              const duplicatedFirst = `Cópia de ${city.trim()}${rest.length ? `,${rest.join(',')}` : ''}`;

              return {
                ...prev,
                destinations: prev.destinations.length > 0 ?
                [duplicatedFirst, ...prev.destinations.slice(1)] :
                ['Cópia de Paris, França']
              };
            });
            setIsOpeningDuplicate(false);
          }, 700);
        }} />
      
      <AddPlaceSheet
        open={showAddPlace}
        onClose={() => setShowAddPlace(false)}
        onSelect={handleAddPlace}
        onAddManually={() => { setShowAddPlace(false); setShowManualActivity(true); }}
        dayNumber={selectedDay}
        totalDays={tripDays}
        startDate={itineraryData.startDate}
        destinations={itineraryData.destinations}
        existingActivityNames={Object.values(dayActivities).flat().map(a => a.name.toLowerCase())} />
      
      <AddNoteSheet
        open={showAddNote}
        onClose={() => setShowAddNote(false)}
        onSave={handleAddNote}
        dayNumber={selectedDay}
        totalDays={tripDays}
        startDate={itineraryData.startDate} />
      
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
      
      <AddReservaSheet
        isOpen={showAddReservation}
        onClose={() => setShowAddReservation(false)}
        onAdd={(reserva) => {
          setReservas(prev => [...prev, reserva]);
          toast.success('Reserva adicionada');
        }}
      />
      
      <AddManualActivitySheet
        open={showManualActivity}
        onClose={() => setShowManualActivity(false)}
        onSave={handleAddManualActivity}
        dayNumber={selectedDay}
        totalDays={tripDays}
        startDate={itineraryData.startDate} />
      
      <EditTripInfoSheet
        open={showEditTripInfo}
        onClose={() => setShowEditTripInfo(false)}
        destinations={itineraryData.destinations}
        startDate={itineraryData.startDate}
        endDate={itineraryData.endDate}
        onSave={(data) => {
          setItineraryData((prev) => ({
            ...prev,
            destinations: data.destinations,
            startDate: data.startDate,
            endDate: data.endDate
          }));
        }} />
      
      {/* Activity Action Sheet */}
      {activityActionTarget && !selectedActivity &&
      <div className="fixed inset-0 z-[210]" onClick={() => {setActivityActionTarget(null);setActivityEditMode(false);setShowMapOptions(false);}}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
          <div
          className="absolute bottom-0 left-0 right-0 bg-card rounded-t-2xl max-h-[85vh] overflow-y-auto scrollbar-hide"
          onClick={(e) => e.stopPropagation()}>
          
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-9 h-1 rounded-full bg-muted" />
            </div>
            <div className="px-5 pb-4 pt-2 flex items-center justify-between">
              <h3 className="text-[18px] font-bold text-foreground">Editar</h3>
            </div>

            {!activityEditMode ? (
          /* Menu options */
          <div className="px-5 pb-6 space-y-1">
                <button
              onClick={() => {
                const start = activityActionTarget.startTime || '09:00';
                const end = activityActionTarget.endTime || '10:00';
                const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
                setEditStartTime(start);
                setEditEndTime(end);
                setEditOriginalDuration(Math.max(0, toMin(end) - toMin(start)));
                setEditPrice(activityActionTarget.price || '');
                setEditObservation(activityActionTarget.observation || '');
                setActivityEditMode(true);
              }}
              className="w-full flex items-center gap-3.5 py-3 px-1 rounded-xl hover:bg-muted/50 transition-colors">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#F2F2F2' }}>
                    <Icon name="edit" size={18} className="text-foreground" />
                  </div>
                  <span className="text-[14px] font-medium text-foreground flex-1 text-left">Editar</span>
                  <Icon name="chevron_right" size={18} className="text-muted-foreground" />
                </button>
                {activityActionTarget.type !== 'note' && (
                <button
              onClick={() => {
                      setSelectedActivityDay(selectedDay);
                setSelectedActivity(activityActionTarget);
                setActivityActionTarget(null);
              }}
              className="w-full flex items-center gap-3.5 py-3 px-1 rounded-xl hover:bg-muted/50 transition-colors">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#F2F2F2' }}>
                    <Icon name="visibility" size={18} className="text-foreground" />
                  </div>
                  <span className="text-[14px] font-medium text-foreground flex-1 text-left">Ver detalhes</span>
                  <Icon name="chevron_right" size={18} className="text-muted-foreground" />
                </button>
                )}
                {activityActionTarget.type !== 'note' && (
                  <button
                    onClick={() => {
                      const q = encodeURIComponent(activityActionTarget.name);
                      const geoUri = `geo:0,0?q=${q}`;
                      const fallback = `https://www.google.com/maps/search/?api=1&query=${q}`;
                      const link = document.createElement('a');
                      link.href = geoUri;
                      link.click();
                      setTimeout(() => {
                        if (document.hasFocus()) {
                          window.open(fallback, '_blank');
                        }
                      }, 500);
                    }}
                    className="w-full flex items-center gap-3.5 py-3 px-1 rounded-xl hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#F2F2F2' }}>
                      <Icon name="map" size={18} className="text-foreground" />
                    </div>
                    <span className="text-[14px] font-medium text-foreground flex-1 text-left">Abrir no mapa</span>
                    <Icon name="chevron_right" size={18} className="text-muted-foreground" />
                  </button>
                )}
                <button
              onClick={() => {
                setMoveToDayTarget(activityActionTarget);
                setActivityActionTarget(null);
              }}
              className="w-full flex items-center gap-3.5 py-3 px-1 rounded-xl hover:bg-muted/50 transition-colors">
              
                  <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#F2F2F2' }}>
                    <Icon name="swap_horiz" size={18} className="text-foreground" />
                  </div>
                  <span className="text-[14px] font-medium text-foreground flex-1 text-left">Mover para outro dia</span>
                  <Icon name="chevron_right" size={18} className="text-muted-foreground" />
                </button>
                <button
              onClick={() => {
                const target = activityActionTarget;
                const dayToUse = selectedActivityDay ?? selectedDay;
                setActivityActionTarget(null);
                if (target && dayToUse !== null && dayToUse !== undefined) {
                  handleDeleteActivity(target, dayToUse);
                }
              }}
              className="w-full flex items-center gap-3.5 py-3 px-1 rounded-xl hover:bg-muted/50 transition-colors">
              
                  <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#FEE2E2' }}>
                    <Icon name="delete" size={18} className="text-destructive" />
                  </div>
                  <span className="text-[14px] font-medium text-destructive flex-1 text-left">Excluir</span>
                </button>
              </div>) : (

          /* Inline edit fields */
          <div className="px-5 pb-6">
                {/* Time steppers */}
                <div className="py-3.5 border-b border-border/40">
                  <span className="text-[11px] text-muted-foreground block mb-2">Horário</span>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-[#F2F2F2] rounded-xl px-1.5 h-9 flex-1">
                      <button
                    onClick={() => {
                      const [h, m] = (editStartTime || '09:00').split(':').map(Number);
                      const total = Math.max(0, h * 60 + m - 15);
                      const newStart = `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
                      setEditStartTime(newStart);
                      const newEndTotal = total + editOriginalDuration;
                      setEditEndTime(`${String(Math.floor(newEndTotal / 60)).padStart(2, '0')}:${String(newEndTotal % 60).padStart(2, '0')}`);
                    }}
                    className="w-7 h-7 rounded-full flex items-center justify-center">
                    
                        <Icon name="remove" size={16} className="text-foreground" />
                      </button>
                      <span className="text-[14px] font-semibold text-foreground flex-1 text-center">{editStartTime || '--:--'}</span>
                      <button
                    onClick={() => {
                      const [h, m] = (editStartTime || '09:00').split(':').map(Number);
                      const total = Math.min(1439, h * 60 + m + 15);
                      const newStart = `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
                      setEditStartTime(newStart);
                      const newEndTotal = total + editOriginalDuration;
                      setEditEndTime(`${String(Math.floor(newEndTotal / 60)).padStart(2, '0')}:${String(newEndTotal % 60).padStart(2, '0')}`);
                    }}
                    className="w-7 h-7 rounded-full flex items-center justify-center">
                    
                        <Icon name="add" size={16} className="text-foreground" />
                      </button>
                    </div>
                    <span className="text-[13px] text-muted-foreground">–</span>
                    <div className="flex items-center gap-1 bg-[#F2F2F2] rounded-xl px-1.5 h-9 flex-1">
                      <button
                    onClick={() => {
                      const [h, m] = (editEndTime || '11:00').split(':').map(Number);
                      const total = Math.max(0, h * 60 + m - 15);
                      setEditEndTime(`${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`);
                    }}
                    className="w-7 h-7 rounded-full flex items-center justify-center">
                    
                        <Icon name="remove" size={16} className="text-foreground" />
                      </button>
                      <span className="text-[14px] font-semibold text-foreground flex-1 text-center">{editEndTime || '--:--'}</span>
                      <button
                    onClick={() => {
                      const [h, m] = (editEndTime || '11:00').split(':').map(Number);
                      const total = Math.min(1439, h * 60 + m + 15);
                      setEditEndTime(`${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`);
                    }}
                    className="w-7 h-7 rounded-full flex items-center justify-center">
                    
                        <Icon name="add" size={16} className="text-foreground" />
                      </button>
                    </div>
                  </div>
                  {/* Overlap info removed — auto-adjusted on save */}
                </div>

                <div className="py-3.5 border-b border-border/40">
                  <span className="text-[11px] text-muted-foreground block mb-2">Valor</span>
                  <div className="w-full bg-[#F2F2F2] rounded-xl px-3 h-9 flex items-center gap-1">
                    <span className="text-[14px] font-medium text-muted-foreground">R$</span>
                    <input
                      value={editPrice}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
                        if (!digits) { setEditPrice(''); return; }
                        const n = parseInt(digits, 10) / 100;
                        setEditPrice(n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
                      }}
                      placeholder="0,00"
                      inputMode="numeric"
                      className="flex-1 text-[14px] font-medium text-foreground bg-transparent outline-none"
                    />
                  </div>
                </div>

                {/* Observation field */}
                <div className="py-3.5 border-b border-border/40">
                  <span className="text-[11px] text-muted-foreground block mb-2">Observação</span>
                  <input
                    value={editObservation}
                    onChange={(e) => setEditObservation(e.target.value)}
                    placeholder="Ex: chegar 15min antes"
                    maxLength={80}
                    className="w-full text-[14px] font-medium text-foreground bg-[#F2F2F2] rounded-xl px-3 h-9 outline-none"
                  />
                </div>

                {/* Save button */}
                <button
              onClick={() => {
                const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
                const toTime = (m: number) => { const h = Math.floor(m / 60) % 24; const mm = m % 60; return `${String(h).padStart(2,'0')}:${String(mm).padStart(2,'0')}`; };
                const GAP = 15;

                const allCurrent = getAllActivities(selectedDay);
                // Apply edit to target activity
                let updated = allCurrent.map((a) =>
                  a.id === activityActionTarget.id
                    ? { ...a, startTime: editStartTime, endTime: editEndTime, price: editPrice, observation: editObservation || undefined }
                    : a
                );

                // Sort by startTime
                updated.sort((a, b) => toMin(a.startTime || '00:00') - toMin(b.startTime || '00:00'));

                // Cascade: push subsequent activities forward if overlapping
                let adjusted = false;
                for (let i = 0; i < updated.length - 1; i++) {
                  const endCurrent = toMin(updated[i].endTime || '00:00');
                  const startNext = toMin(updated[i + 1].startTime || '00:00');
                  if (endCurrent + GAP > startNext) {
                    const nextStart = toMin(updated[i + 1].startTime || '00:00');
                    const nextEnd = toMin(updated[i + 1].endTime || '00:00');
                    const duration = Math.max(nextEnd - nextStart, 0);
                    const newStart = endCurrent + GAP;
                    updated[i + 1] = { ...updated[i + 1], startTime: toTime(newStart), endTime: toTime(newStart + duration) };
                    adjusted = true;
                  }
                }

                setDayActivities((prev) => ({
                  ...prev,
                  [selectedDay]: updated
                }));
                setActivityEditMode(false);
                setActivityActionTarget(null);
                toast(adjusted ? 'Horários ajustados automaticamente' : 'Atividade atualizada');
              }}
              className="w-full h-[41px] rounded-[16px] bg-primary text-primary-foreground font-semibold text-[14px] flex items-center justify-center mt-5">
              
                  Salvar
                </button>
              </div>)
          }
          </div>
        </div>
      }
      <ActivityDetailSheet
        activity={selectedActivity}
        onClose={() => {
          setSelectedActivity(null);
          setSelectedActivityDay(null);
        }} />
      <AddBudgetExpenseSheet
        open={showAddExpense}
        onClose={() => setShowAddExpense(false)}
        onSave={(expense) => {
          setExpenses(prev => [...prev, expense]);
          toast.success('Gasto adicionado');
        }}
        people={[
          { id: '1', initials: 'AS', name: 'Ana', color: '#3B82F6' },
          { id: '2', initials: 'BC', name: 'Bruno', color: '#10B981' },
          { id: '3', initials: 'CD', name: 'Carla', color: '#F59E0B' },
          { id: '4', initials: 'DL', name: 'Daniel', color: '#8B5CF6' },
        ]}
      />

      {/* Move to Day Sheet */}
      {moveToDayTarget && (
        <>
          <div className="fixed inset-0 z-[220] bg-black/40 backdrop-blur-[2px]" onClick={() => setMoveToDayTarget(null)} />
          <div className="fixed bottom-0 left-0 right-0 z-[230] flex justify-center" onClick={() => setMoveToDayTarget(null)}>
            <div className="bg-card rounded-t-2xl w-full max-w-[430px] animate-in slide-in-from-bottom duration-300" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-9 h-1 rounded-full bg-muted" />
              </div>
              <div className="relative flex items-center justify-start px-5 py-3">
                <h2 className="text-[17px] font-bold text-foreground">Mover para outro dia</h2>
                <button onClick={() => setMoveToDayTarget(null)} className="absolute right-5 w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted/60 transition-colors">
                  <Icon name="close" size={20} className="text-muted-foreground" />
                </button>
              </div>
              <p className="text-[13px] font-medium text-left px-5 text-muted-foreground">
                Selecione o dia para "{moveToDayTarget.name}"
              </p>
              <div className="px-5 pt-4" style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom, 20px))' }}>
                <div className="flex flex-col gap-1 pb-2 max-h-[60vh] overflow-y-auto hide-scrollbar">
                  {effectiveDaysData.filter(d => d.day !== selectedDay).map((dayItem) => {
                    const weekday = format(dayItem.date, 'EEE', { locale: ptBR });
                    const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
                    const dayOfMonth = format(dayItem.date, 'd');
                    const activitiesCount = getAllActivities(dayItem.day).length;
                    return (
                      <button
                        key={dayItem.day}
                        onClick={() => {
                          handleMoveToDay(moveToDayTarget, dayItem.day);
                          setMoveToDayTarget(null);
                        }}
                        className="w-full flex items-center gap-4 py-3.5 px-2 rounded-xl active:bg-muted/30 transition-colors"
                      >
                        <div className="flex-1 text-left">
                          <span className="block text-[15px] font-semibold text-foreground">
                            {capitalizedWeekday}, {format(dayItem.date, "d 'de' MMMM", { locale: ptBR })}
                          </span>
                          <span className="block text-[12px] font-medium text-muted-foreground">
                            {activitiesCount} {activitiesCount === 1 ? 'atividade' : 'atividades'}
                          </span>
                        </div>
                        <Icon name="chevron_right" size={18} className="text-muted-foreground" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
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
        />
      </div>
    )}

    {showBudget && (
      <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
        <BudgetScreen
          onBack={() => { setShowBudget(false); setBudgetAutoAdd(false); }}
          expenses={expenses}
          onExpensesChange={setExpenses}
          autoOpenAdd={budgetAutoAdd}
          participants={budgetParticipants}
          extraPeople={budgetExtraPeople}
          onExtraPeopleChange={setBudgetExtraPeople}
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
        />
      </div>
    )}

    {showChecklist && (
      <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
        <TripChecklistScreen
          onBack={() => setShowChecklist(false)}
          destination={subScreenDestination}
          onChecklistChange={(checked, total) => { setChecklistChecked(checked); setChecklistTotal(total); }}
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
    </>);

}