/**
 * Checklist persistence (categorias + itens com relacionamento 1:N)
 * Padrão nativo do app com Supabase e cache local estritamente isolado por roteiro.
 */

import { supabase } from '@/integrations/supabase/client';
import { touchItinerary } from '@/lib/itinerariesApi';

export interface ChecklistItem {
  id: string | number;
  label: string;
  checked: boolean;
}

export interface ChecklistCategory {
  id: string;
  title: string;
  icon?: string;
  iconBg?: string;
  iconColor?: string;
  items: ChecklistItem[];
}

export function isUuid(id?: string | number): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id));
}

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Gera um checklist padrão completo, rico e com IDs únicos para um novo roteiro.
 */
export function generateDefaultChecklist(): ChecklistCategory[] {
  return [
    {
      id: generateUUID(),
      title: 'Documentos & Financeiro',
      icon: 'description',
      iconBg: 'hsl(210 100% 52% / 0.12)',
      iconColor: 'text-blue-500',
      items: [
        { id: generateUUID(), label: 'Passaporte válido (mín. 6 meses de validade)', checked: false },
        { id: generateUUID(), label: 'Visto / Autorização de viagem (ESTA, ETIAS, etc.)', checked: false },
        { id: generateUUID(), label: 'Seguro viagem com apólice salva no celular', checked: false },
        { id: generateUUID(), label: 'Passagens aéreas e comprovantes de hospedagem', checked: false },
        { id: generateUUID(), label: 'Cartões habilitados para uso internacional / Cartão global', checked: false },
        { id: generateUUID(), label: 'Dinheiro em espécie na moeda local (reserva de emergência)', checked: false },
        { id: generateUUID(), label: 'CNH e Permissão Internacional para Dirigir (PID)', checked: false },
      ],
    },
    {
      id: generateUUID(),
      title: 'Roupas & Acessórios',
      icon: 'shopping_bag',
      iconBg: 'hsl(262 83% 58% / 0.12)',
      iconColor: 'text-violet-500',
      items: [
        { id: generateUUID(), label: 'Roupas adequadas ao clima do destino', checked: false },
        { id: generateUUID(), label: 'Calçados confortáveis para caminhada', checked: false },
        { id: generateUUID(), label: 'Casaco / Jaqueta impermeável corta-vento', checked: false },
        { id: generateUUID(), label: 'Roupas íntimas e meias para todos os dias (+ reserva)', checked: false },
        { id: generateUUID(), label: 'Óculos de sol e boné/chapéu', checked: false },
        { id: generateUUID(), label: 'Pijama e roupas confortáveis para descanso', checked: false },
      ],
    },
    {
      id: generateUUID(),
      title: 'Higiene & Farmácia',
      icon: 'medical_services',
      iconBg: 'hsl(340 75% 54% / 0.12)',
      iconColor: 'text-rose-500',
      items: [
        { id: generateUUID(), label: 'Medicamentos de uso contínuo + receitas médicas', checked: false },
        { id: generateUUID(), label: 'Kit primeiros socorros (analgésico, antitérmico, curativos)', checked: false },
        { id: generateUUID(), label: 'Escova, pasta e fio dental', checked: false },
        { id: generateUUID(), label: 'Protetor solar e hidratante labial', checked: false },
        { id: generateUUID(), label: 'Desodorante e itens de higiene pessoal (frascos até 100ml)', checked: false },
      ],
    },
    {
      id: generateUUID(),
      title: 'Eletrônicos & Conectividade',
      icon: 'lightbulb',
      iconBg: 'hsl(142 71% 45% / 0.12)',
      iconColor: 'text-emerald-500',
      items: [
        { id: generateUUID(), label: 'Adaptador universal de tomadas', checked: false },
        { id: generateUUID(), label: 'Carregador portátil (Powerbank) com cabo', checked: false },
        { id: generateUUID(), label: 'Cabos e carregadores para todos os aparelhos', checked: false },
        { id: generateUUID(), label: 'Fones de ouvido com cancelamento de ruído', checked: false },
        { id: generateUUID(), label: 'eSIM / Chip de internet internacional ativado', checked: false },
      ],
    },
  ];
}

export const defaultInitialCategories: ChecklistCategory[] = generateDefaultChecklist();

const CHECKLIST_STORAGE_PREFIX = 'wai-travel-checklist-';

/**
 * Lê do localStorage - ESTRITAMENTE isolado por ID de roteiro
 */
export function getLocalChecklist(itineraryId?: string): ChecklistCategory[] | null {
  if (!itineraryId) return null;
  try {
    const key = `${CHECKLIST_STORAGE_PREFIX}${itineraryId}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.error('[checklistApi] getLocalChecklist error', err);
    return null;
  }
}

/**
 * Salva no localStorage - ESTRITAMENTE isolado por ID de roteiro
 */
export function setLocalChecklist(itineraryId: string | undefined, categories: ChecklistCategory[]): void {
  if (!itineraryId) return;
  try {
    const key = `${CHECKLIST_STORAGE_PREFIX}${itineraryId}`;
    localStorage.setItem(key, JSON.stringify(categories));
  } catch (err) {
    console.error('[checklistApi] setLocalChecklist error', err);
  }
}

/**
 * Inicializa o checklist padrão para um roteiro recém-criado ou sem checklist.
 */
export async function initItineraryChecklist(itineraryId: string): Promise<ChecklistCategory[]> {
  if (!itineraryId) return generateDefaultChecklist();

  // Se já tiver dados locais para este roteiro específico, mantém
  const existingLocal = getLocalChecklist(itineraryId);
  if (existingLocal && existingLocal.length > 0) {
    return existingLocal;
  }

  const defaultCategories = generateDefaultChecklist();
  setLocalChecklist(itineraryId, defaultCategories);

  if (isUuid(itineraryId)) {
    try {
      await saveChecklist(itineraryId, defaultCategories);
    } catch (err) {
      console.error('[checklistApi] initItineraryChecklist saveChecklist error', err);
    }
  }

  return defaultCategories;
}

/**
 * Carrega as categorias e seus itens do backend Supabase.
 * Se o roteiro não possuir checklist, inicializa automaticamente com o padrão.
 */
export async function loadChecklist(itineraryId?: string): Promise<ChecklistCategory[] | null> {
  if (!itineraryId) {
    return null;
  }

  // Se não for UUID válido, usa cache local ou inicializa default isolado
  if (!isUuid(itineraryId)) {
    const local = getLocalChecklist(itineraryId);
    if (local && local.length > 0) return local;
    const initial = generateDefaultChecklist();
    setLocalChecklist(itineraryId, initial);
    return initial;
  }

  try {
    const [catsRes, itemsRes] = await Promise.all([
      (supabase as any)
        .from('itinerary_checklist_categories')
        .select('*')
        .eq('itinerary_id', itineraryId)
        .order('position', { ascending: true }),
      (supabase as any)
        .from('itinerary_checklist_items')
        .select('*')
        .eq('itinerary_id', itineraryId)
        .order('position', { ascending: true }),
    ]);

    if (catsRes.error || itemsRes.error) {
      console.warn('[checklistApi] loadChecklist remote query error, fallback to local', catsRes.error || itemsRes.error);
      const local = getLocalChecklist(itineraryId);
      if (local && local.length > 0) return local;
      return await initItineraryChecklist(itineraryId);
    }

    const catRows = catsRes.data || [];
    const itemRows = itemsRes.data || [];

    // Se não há categorias salvas no banco para este roteiro, inicializa com o padrão
    if (catRows.length === 0) {
      const local = getLocalChecklist(itineraryId);
      if (local && local.length > 0) {
        void saveChecklist(itineraryId, local);
        return local;
      }
      return await initItineraryChecklist(itineraryId);
    }

    // Mapear itens para suas respectivas categorias
    const itemsByCatId = new Map<string, ChecklistItem[]>();
    for (const item of itemRows) {
      const catId = item.category_id;
      if (!itemsByCatId.has(catId)) {
        itemsByCatId.set(catId, []);
      }
      itemsByCatId.get(catId)!.push({
        id: item.id,
        label: item.label,
        checked: Boolean(item.checked),
      });
    }

    const categories: ChecklistCategory[] = catRows.map((c: any) => ({
      id: c.id,
      title: c.title,
      icon: c.icon || 'category',
      iconBg: c.icon_bg || 'hsl(210 100% 52% / 0.12)',
      iconColor: c.icon_color || 'text-blue-500',
      items: itemsByCatId.get(c.id) || [],
    }));

    // Atualiza cache local estritamente para este roteiro
    setLocalChecklist(itineraryId, categories);
    return categories;
  } catch (err) {
    console.error('[checklistApi] loadChecklist unexpected error', err);
    const local = getLocalChecklist(itineraryId);
    if (local && local.length > 0) return local;
    return await initItineraryChecklist(itineraryId);
  }
}

/**
 * Salva as categorias e itens no Supabase (bulk replace sincronizado)
 * ESTRITAMENTE restrito ao itinerary_id.
 */
export async function saveChecklist(itineraryId: string | undefined, categories: ChecklistCategory[]): Promise<void> {
  if (!itineraryId) return;

  // Salva no localStorage imediatamente
  setLocalChecklist(itineraryId, categories);

  if (!isUuid(itineraryId)) return;

  try {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id;
    if (!userId) return;

    // Se estiver vazio, deleta todas as categorias deste roteiro (cascade apaga itens)
    if (categories.length === 0) {
      await (supabase as any)
        .from('itinerary_checklist_categories')
        .delete()
        .eq('itinerary_id', itineraryId);
      await touchItinerary(itineraryId);
      return;
    }

    // Remove categorias existentes deste roteiro específico para recriação limpa
    await (supabase as any)
      .from('itinerary_checklist_categories')
      .delete()
      .eq('itinerary_id', itineraryId);

    const categoryRows = categories.map((cat, idx) => ({
      id: isUuid(String(cat.id)) ? String(cat.id) : generateUUID(),
      itinerary_id: itineraryId,
      user_id: userId,
      title: cat.title,
      position: idx,
      icon: cat.icon || 'category',
      icon_bg: cat.iconBg || 'hsl(210 100% 52% / 0.12)',
      icon_color: cat.iconColor || 'text-blue-500',
    }));

    const { data: insertedCats, error: catError } = await (supabase as any)
      .from('itinerary_checklist_categories')
      .insert(categoryRows)
      .select();

    if (catError) {
      console.error('[checklistApi] insert categories failed', catError);
      return;
    }

    // Mapear os itens para as categorias inseridas
    const itemRows: any[] = [];
    (insertedCats || []).forEach((insertedCat: any, idx: number) => {
      const originalCat = categories[idx];
      if (!originalCat || !originalCat.items) return;

      originalCat.items.forEach((item, itemIdx) => {
        itemRows.push({
          id: isUuid(String(item.id)) ? String(item.id) : generateUUID(),
          category_id: insertedCat.id,
          itinerary_id: itineraryId,
          user_id: userId,
          label: item.label,
          checked: Boolean(item.checked),
          position: itemIdx,
        });
      });
    });

    if (itemRows.length > 0) {
      const { error: itemsError } = await (supabase as any)
        .from('itinerary_checklist_items')
        .insert(itemRows);

      if (itemsError) {
        console.error('[checklistApi] insert items failed', itemsError);
      }
    }

    await touchItinerary(itineraryId);
  } catch (err) {
    console.error('[checklistApi] saveChecklist error', err);
  }
}
