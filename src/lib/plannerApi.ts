/**
 * Planner data persistence (atividades + transportes) no Lovable Cloud.
 *
 * Estratégia: bulk replace por roteiro.
 * - Cada save sobrescreve TODOS os registros (activities/transports) do roteiro
 *   numa única transação lógica (delete + insert). Essa abordagem casa com o
 *   modelo atual do `PlannerItineraryScreen`, que mantém o estado completo do
 *   roteiro em memória e persiste o objeto inteiro a cada mudança.
 * - As funções públicas usam debounce no consumidor (não aqui) — o
 *   `PlannerItineraryScreen` chama `savePlannerData` via debounce/blur.
 *
 * O `localStorage` continua sendo usado pelos componentes como cache de
 * leitura imediata (stale-while-revalidate) — ver `PlannerItineraryScreen`.
 */

import { supabase } from '@/integrations/supabase/client';

export interface PlannerActivity {
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

export interface PlannerTransport {
  type: 'walk' | 'bus' | 'metro' | 'car';
  duration: string;
  cost?: string;
  distance?: string;
}

export interface PlannerData {
  activities: Record<number, PlannerActivity[]>;
  transports: Record<number, PlannerTransport[]>;
}

function isUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

function activityRowToObject(row: any): PlannerActivity {
  return {
    id: typeof row.metadata?.legacyId === 'number' ? row.metadata.legacyId : Date.now() + Math.random(),
    type: (row.type as 'activity' | 'note') ?? 'activity',
    startTime: row.start_time ?? '',
    endTime: row.end_time ?? '',
    category: row.category ?? '',
    categoryColor: row.category_color ?? '',
    name: row.name ?? '',
    image: row.image ?? '',
    openHours: row.open_hours ?? '',
    rating: Number(row.rating ?? 0),
    price: row.price ?? '',
    noteText: row.note_text ?? undefined,
    observation: row.observation ?? undefined,
    lat: row.lat ?? undefined,
    lng: row.lng ?? undefined,
  };
}

function transportRowToObject(row: any): PlannerTransport {
  return {
    type: (row.mode as PlannerTransport['type']) ?? 'walk',
    duration: row.duration ?? '',
    cost: row.cost ?? undefined,
    distance: row.distance ?? undefined,
  };
}

/**
 * Carrega activities + transports do backend para um roteiro.
 * Retorna `null` quando o id não é um uuid válido (ainda não salvo no backend).
 */
export async function loadPlannerData(itineraryId: string): Promise<PlannerData | null> {
  if (!isUuid(itineraryId)) return null;

  const [activitiesRes, transportsRes] = await Promise.all([
    supabase
      .from('itinerary_activities')
      .select('*')
      .eq('itinerary_id', itineraryId)
      .order('day', { ascending: true })
      .order('position', { ascending: true }),
    supabase
      .from('itinerary_transports')
      .select('*')
      .eq('itinerary_id', itineraryId)
      .order('day', { ascending: true })
      .order('position', { ascending: true }),
  ]);

  if (activitiesRes.error) {
    console.error('[plannerApi] loadPlannerData activities failed', activitiesRes.error);
  }
  if (transportsRes.error) {
    console.error('[plannerApi] loadPlannerData transports failed', transportsRes.error);
  }

  const activities: Record<number, PlannerActivity[]> = {};
  for (const row of activitiesRes.data ?? []) {
    const day = (row as any).day as number;
    if (!activities[day]) activities[day] = [];
    activities[day].push(activityRowToObject(row));
  }

  const transports: Record<number, PlannerTransport[]> = {};
  for (const row of transportsRes.data ?? []) {
    const day = (row as any).day as number;
    if (!transports[day]) transports[day] = [];
    transports[day].push(transportRowToObject(row));
  }

  return { activities, transports };
}

/**
 * Bulk replace: substitui todas as activities + transports do roteiro pelos
 * dados fornecidos. Idempotente — pode ser chamado a cada salve.
 */
export async function savePlannerData(
  itineraryId: string,
  data: PlannerData,
): Promise<void> {
  if (!isUuid(itineraryId)) return;

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return;

  const activityRows: any[] = [];
  for (const [dayStr, list] of Object.entries(data.activities)) {
    const day = Number(dayStr);
    list.forEach((a, position) => {
      activityRows.push({
        itinerary_id: itineraryId,
        user_id: userId,
        day,
        position,
        type: a.type ?? 'activity',
        name: a.name ?? '',
        category: a.category ?? '',
        category_color: a.categoryColor ?? '',
        image: a.image ?? '',
        open_hours: a.openHours ?? '',
        price: a.price ?? '',
        start_time: a.startTime ?? '',
        end_time: a.endTime ?? '',
        rating: a.rating ?? 0,
        lat: a.lat ?? null,
        lng: a.lng ?? null,
        note_text: a.noteText ?? null,
        observation: a.observation ?? null,
        metadata: { legacyId: a.id },
      });
    });
  }

  const transportRows: any[] = [];
  for (const [dayStr, list] of Object.entries(data.transports)) {
    const day = Number(dayStr);
    list.forEach((t, position) => {
      transportRows.push({
        itinerary_id: itineraryId,
        user_id: userId,
        day,
        position,
        mode: t.type,
        duration: t.duration ?? null,
        cost: t.cost ?? null,
        distance: t.distance ?? null,
      });
    });
  }

  // Delete tudo do roteiro e re-insere — simples e correto.
  const [delAct, delTrans] = await Promise.all([
    supabase.from('itinerary_activities').delete().eq('itinerary_id', itineraryId),
    supabase.from('itinerary_transports').delete().eq('itinerary_id', itineraryId),
  ]);
  if (delAct.error) console.error('[plannerApi] delete activities failed', delAct.error);
  if (delTrans.error) console.error('[plannerApi] delete transports failed', delTrans.error);

  if (activityRows.length > 0) {
    const { error } = await supabase.from('itinerary_activities').insert(activityRows);
    if (error) console.error('[plannerApi] insert activities failed', error);
  }
  if (transportRows.length > 0) {
    const { error } = await supabase.from('itinerary_transports').insert(transportRows);
    if (error) console.error('[plannerApi] insert transports failed', error);
  }
}

/**
 * Append a batch of activities to a specific day of an itinerary, preserving
 * existing activities/transports. Returns the number of activities added.
 * Activities are stacked sequentially in 1h slots starting at 09:00.
 */
export async function appendActivitiesToDay(
  itineraryId: string,
  day: number,
  newActivities: Array<Partial<PlannerActivity> & { name: string }>,
): Promise<number> {
  if (!isUuid(itineraryId) || newActivities.length === 0) return 0;
  const current = (await loadPlannerData(itineraryId)) ?? { activities: {}, transports: {} };
  const dayList = current.activities[day] ?? [];

  const parseHM = (t: string): number | null => {
    const m = /^(\d{1,2}):(\d{2})/.exec(t || '');
    if (!m) return null;
    return Number(m[1]) * 60 + Number(m[2]);
  };
  const fmtHM = (mins: number) => {
    const h = Math.floor(mins / 60) % 24;
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };
  let cursor = 9 * 60;
  for (const a of dayList) {
    const end = parseHM(a.endTime ?? '');
    if (end !== null && end > cursor) cursor = end;
  }

  const baseTs = Date.now();
  const built: PlannerActivity[] = newActivities.map((a, idx) => {
    const start = cursor + idx * 60;
    const end = start + 60;
    return {
      id: a.id ?? baseTs + idx,
      type: a.type ?? 'activity',
      startTime: a.startTime ?? fmtHM(start),
      endTime: a.endTime ?? fmtHM(end),
      category: a.category ?? '',
      categoryColor: a.categoryColor ?? '#9DCC36',
      name: a.name,
      image: a.image ?? '',
      openHours: a.openHours ?? '',
      rating: a.rating ?? 0,
      price: a.price ?? '',
      noteText: a.noteText,
      observation: a.observation,
      lat: a.lat,
      lng: a.lng,
    };
  });

  const next: PlannerData = {
    activities: { ...current.activities, [day]: [...dayList, ...built] },
    transports: current.transports,
  };
  await savePlannerData(itineraryId, next);
  return built.length;
}

/**
 * Clona activities+transports do roteiro `sourceId` para `targetId` no servidor.
 * Usado em `publishItineraryAsCopy` — a cópia fica 100% independente.
 */
export async function cloneItineraryContent(
  sourceId: string,
  targetId: string,
): Promise<void> {
  if (!isUuid(sourceId) || !isUuid(targetId)) return;

  const data = await loadPlannerData(sourceId);
  if (!data) return;

  await savePlannerData(targetId, data);
}
