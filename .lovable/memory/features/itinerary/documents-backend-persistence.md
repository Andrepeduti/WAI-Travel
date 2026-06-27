---
name: Itinerary Documents Backend Persistence
description: Reservas e transportes-documento (com anexos PDF/imagem) persistem no Lovable Cloud com upload de arquivos sob demanda
type: feature
---

A aba **Documentos** do roteiro persiste no backend, mesma estratégia do planner:

- **Tabelas**: `itinerary_reservations` (hospedagem/atividade) e `itinerary_doc_transports` (voo/trem/ônibus/carro). Separadas de `itinerary_transports` (blocos de deslocamento entre atividades).
- **RLS**: dono tem CRUD; SELECT público quando `is_itinerary_public(itinerary_id)` for true.
- **Anexos**: bucket privado `itinerary-documents`, organizado por pasta `{user_id}/...`, RLS via `(storage.foldername(name))[1] = auth.uid()::text`. Visualização via `createSignedUrl` (1h).
- **Tipos**: `Reserva` e `Transporte` (em `AddReservaSheet`/`AddTransporteSheet`) têm `attachmentPath`, `attachmentName` e `_pendingFile?: File` (transitório, descartado após upload).
- **Sync**: `loadItineraryDocs` no mount com stale-while-revalidate; debounce 600ms para `saveItineraryDocs` que faz upload de qualquer `_pendingFile` antes do bulk replace, e devolve o estado já com `attachmentPath` resolvido para promoção no estado React.
- **Card click**: prioridade `attachmentPath > externalUrl` ao abrir.
- **Delete**: best-effort `deleteDocumentAttachment(path)` no `DocumentosScreen.handleDelete`.

Arquivos: `src/lib/itineraryDocsApi.ts`, `src/components/travel/AddReservaSheet.tsx`, `src/components/travel/AddTransporteSheet.tsx`, `src/components/screens/PlannerItineraryScreen.tsx`, `src/components/screens/DocumentosScreen.tsx`.
