/**
 * Itinerary Documents persistence (reservas + transportes-documento) no
 * Lovable Cloud, mesmo padrão do `plannerApi`:
 *
 *   - bulk replace por roteiro
 *   - tipos batem 1:1 com `Reserva` (AddReservaSheet) e `Transporte`
 *     (AddTransporteSheet) usados na UI
 *   - anexos (PDF/imagem) ficam no bucket privado `itinerary-documents`
 *     organizados por pasta `{userId}/...`. Acesso via signed URL sob demanda.
 */

import { supabase } from '@/integrations/supabase/client';
import type { Reserva } from '@/components/travel/AddReservaSheet';
import type { Transporte } from '@/components/travel/AddTransporteSheet';

export interface ItineraryDocsData {
  reservas: Reserva[];
  transportes: Transporte[];
}

const BUCKET = 'itinerary-documents';

function isUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

// ── helpers de data ──
function combineDateAndTime(date: Date | undefined, hh?: string, mm?: string): string | null {
  if (!date) return null;
  const d = new Date(date);
  d.setHours(Number(hh ?? '0'));
  d.setMinutes(Number(mm ?? '0'));
  d.setSeconds(0);
  d.setMilliseconds(0);
  return d.toISOString();
}

function dateFromIso(iso: string | null | undefined): Date | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

// ── row → object ──
function reservaFromRow(row: any): Reserva {
  const tipo = (row.tipo as 'hospedagem' | 'atividade') ?? 'hospedagem';
  const base: Reserva = {
    id: row.client_id ?? row.id,
    tipo,
    nome: row.nome ?? '',
    localizacao: row.localizacao ?? '',
    codigo: row.codigo ?? undefined,
    valor: row.valor ?? undefined,
  };
  if (tipo === 'hospedagem') {
    base.checkInDate = dateFromIso(row.check_in_at);
    base.checkInHora = row.check_in_hora ?? undefined;
    base.checkInMinuto = row.check_in_minuto ?? undefined;
    base.checkOutDate = dateFromIso(row.check_out_at);
    base.checkOutHora = row.check_out_hora ?? undefined;
    base.checkOutMinuto = row.check_out_minuto ?? undefined;
  } else {
    base.atividadeDate = dateFromIso(row.atividade_at);
    base.atividadeHora = row.atividade_hora ?? undefined;
    base.atividadeMinuto = row.atividade_minuto ?? undefined;
  }
  // attachments → propriedades opcionais expostas no objeto
  (base as any).attachmentPath = row.attachment_path ?? undefined;
  (base as any).attachmentName = row.attachment_name ?? undefined;
  return base;
}

function transporteFromRow(row: any): Transporte {
  const t: Transporte = {
    id: row.client_id ?? row.id,
    tipo: (row.tipo as Transporte['tipo']) ?? 'voo',
    nome: row.nome ?? '',
    origem: row.origem ?? '',
    destino: row.destino ?? '',
    partidaDate: dateFromIso(row.partida_at),
    partidaHora: row.partida_hora ?? undefined,
    partidaMinuto: row.partida_minuto ?? undefined,
    chegadaDate: dateFromIso(row.chegada_at),
    chegadaHora: row.chegada_hora ?? undefined,
    chegadaMinuto: row.chegada_minuto ?? undefined,
    codigo: row.codigo ?? undefined,
    valor: row.valor ?? undefined,
  };
  (t as any).attachmentPath = row.attachment_path ?? undefined;
  (t as any).attachmentName = row.attachment_name ?? undefined;
  return t;
}

/**
 * Carrega reservas + doc-transports de um roteiro.
 */
export async function loadItineraryDocs(
  itineraryId: string,
): Promise<ItineraryDocsData | null> {
  if (!isUuid(itineraryId)) return null;

  const [resvRes, transRes] = await Promise.all([
    supabase
      .from('itinerary_reservations')
      .select('*')
      .eq('itinerary_id', itineraryId)
      .order('position', { ascending: true }),
    supabase
      .from('itinerary_doc_transports')
      .select('*')
      .eq('itinerary_id', itineraryId)
      .order('position', { ascending: true }),
  ]);

  if (resvRes.error) console.error('[itineraryDocsApi] load reservas failed', resvRes.error);
  if (transRes.error) console.error('[itineraryDocsApi] load doc transports failed', transRes.error);

  return {
    reservas: (resvRes.data ?? []).map(reservaFromRow),
    transportes: (transRes.data ?? []).map(transporteFromRow),
  };
}

/**
 * Bulk replace: sobrescreve todas as reservas + doc-transports do roteiro.
 * Faz upload de qualquer `_pendingFile` antes de salvar e mantém o resultado
 * (`attachmentPath`/`attachmentName`) no estado do consumidor via callback.
 */
export async function saveItineraryDocs(
  itineraryId: string,
  data: ItineraryDocsData,
): Promise<ItineraryDocsData | null> {
  if (!isUuid(itineraryId)) return null;

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return null;

  // 1) Upload de anexos pendentes (substitui _pendingFile por attachmentPath/Name)
  const reservas: Reserva[] = [];
  for (const r of data.reservas) {
    const pending = (r as any)._pendingFile as File | undefined;
    if (pending) {
      const uploaded = await uploadDocumentAttachment(pending, userId);
      const { _pendingFile, ...rest } = r as any;
      reservas.push({ ...(rest as Reserva), ...(uploaded ?? {}) } as Reserva);
    } else {
      reservas.push(r);
    }
  }

  const transportes: Transporte[] = [];
  for (const t of data.transportes) {
    const pending = (t as any)._pendingFile as File | undefined;
    if (pending) {
      const uploaded = await uploadDocumentAttachment(pending, userId);
      const { _pendingFile, ...rest } = t as any;
      transportes.push({ ...(rest as Transporte), ...(uploaded ?? {}) } as Transporte);
    } else {
      transportes.push(t);
    }
  }

  // 2) Monta as rows
  const reservaRows = reservas.map((r, position) => ({
    itinerary_id: itineraryId,
    user_id: userId,
    client_id: String(r.id),
    tipo: r.tipo,
    nome: r.nome ?? '',
    localizacao: r.localizacao ?? '',
    check_in_at: r.tipo === 'hospedagem' ? combineDateAndTime(r.checkInDate, r.checkInHora, r.checkInMinuto) : null,
    check_in_hora: r.tipo === 'hospedagem' ? r.checkInHora ?? null : null,
    check_in_minuto: r.tipo === 'hospedagem' ? r.checkInMinuto ?? null : null,
    check_out_at: r.tipo === 'hospedagem' ? combineDateAndTime(r.checkOutDate, r.checkOutHora, r.checkOutMinuto) : null,
    check_out_hora: r.tipo === 'hospedagem' ? r.checkOutHora ?? null : null,
    check_out_minuto: r.tipo === 'hospedagem' ? r.checkOutMinuto ?? null : null,
    atividade_at: r.tipo === 'atividade' ? combineDateAndTime(r.atividadeDate, r.atividadeHora, r.atividadeMinuto) : null,
    atividade_hora: r.tipo === 'atividade' ? r.atividadeHora ?? null : null,
    atividade_minuto: r.tipo === 'atividade' ? r.atividadeMinuto ?? null : null,
    codigo: r.codigo ?? null,
    valor: r.valor ?? null,
    attachment_path: (r as any).attachmentPath ?? null,
    attachment_name: (r as any).attachmentName ?? null,
    position,
  }));

  const transportRows = transportes.map((t, position) => ({
    itinerary_id: itineraryId,
    user_id: userId,
    client_id: String(t.id),
    tipo: t.tipo,
    nome: t.nome ?? '',
    origem: t.origem ?? '',
    destino: t.destino ?? '',
    partida_at: combineDateAndTime(t.partidaDate, t.partidaHora, t.partidaMinuto),
    partida_hora: t.partidaHora ?? null,
    partida_minuto: t.partidaMinuto ?? null,
    chegada_at: combineDateAndTime(t.chegadaDate, t.chegadaHora, t.chegadaMinuto),
    chegada_hora: t.chegadaHora ?? null,
    chegada_minuto: t.chegadaMinuto ?? null,
    codigo: t.codigo ?? null,
    valor: t.valor ?? null,
    attachment_path: (t as any).attachmentPath ?? null,
    attachment_name: (t as any).attachmentName ?? null,
    position,
  }));

  // 3) Delete + insert
  const [delResv, delTrans] = await Promise.all([
    supabase.from('itinerary_reservations').delete().eq('itinerary_id', itineraryId),
    supabase.from('itinerary_doc_transports').delete().eq('itinerary_id', itineraryId),
  ]);
  if (delResv.error) console.error('[itineraryDocsApi] delete reservas failed', delResv.error);
  if (delTrans.error) console.error('[itineraryDocsApi] delete doc transports failed', delTrans.error);

  if (reservaRows.length > 0) {
    const { error } = await supabase.from('itinerary_reservations').insert(reservaRows);
    if (error) console.error('[itineraryDocsApi] insert reservas failed', error);
  }
  if (transportRows.length > 0) {
    const { error } = await supabase.from('itinerary_doc_transports').insert(transportRows);
    if (error) console.error('[itineraryDocsApi] insert doc transports failed', error);
  }

  return { reservas, transportes };
}

// ─── Anexos ───────────────────────────────────────────────────────────────

/**
 * Faz upload de um arquivo (PDF/imagem) ao bucket privado, sob a pasta
 * `{userId}/...`. Retorna `attachmentPath`/`attachmentName` para serem
 * persistidos junto da reserva/transporte.
 */
export async function uploadDocumentAttachment(
  file: File,
  userId?: string,
): Promise<{ attachmentPath: string; attachmentName: string } | null> {
  let uid = userId;
  if (!uid) {
    const { data } = await supabase.auth.getUser();
    uid = data.user?.id;
  }
  if (!uid) return null;

  const safeName = file.name.replace(/[^\w.\-]+/g, '_');
  const path = `${uid}/${crypto.randomUUID()}-${safeName}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false });

  if (error) {
    console.error('[itineraryDocsApi] upload failed', error);
    return null;
  }
  return { attachmentPath: path, attachmentName: file.name };
}

/**
 * Gera signed URL temporária para visualizar/baixar o anexo.
 */
export async function getDocumentAttachmentUrl(path: string, expiresInSec = 3600): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresInSec);
  if (error) {
    console.error('[itineraryDocsApi] signed url failed', error);
    return null;
  }
  return data?.signedUrl ?? null;
}

/**
 * Remove arquivo órfão do bucket (best-effort). Sem bloquear UX.
 */
export async function deleteDocumentAttachment(path: string): Promise<void> {
  if (!path) return;
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) console.error('[itineraryDocsApi] delete attachment failed', error);
}
