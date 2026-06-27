---
name: Itinerary Collaboration
description: Compartilhamento de roteiro com convites (link/usuário), papéis editor/viewer, gating de UI no Planner e listagem de roteiros compartilhados em "Minhas viagens"
type: feature
---

- Tabelas: `itinerary_members` e `itinerary_invites`. Trigger gera notificação `itinerary_invite` automaticamente ao inserir convite com `invitee_user_id`.
- RLS via `get_user_itinerary_role`, `can_view_itinerary`, `can_edit_itinerary`, `is_itinerary_owner`. Owner mantém todos os direitos; editor pode INSERT/UPDATE/DELETE em activities/transports/reservations/doc_transports; viewer só SELECT.
- API em `src/lib/itineraryMembersApi.ts`: `inviteUserToItinerary`, `createShareLink`, `acceptInvite`, `acceptInviteByToken`, `declineInvite`, `listItineraryMembers`, `removeMember`, `updateMemberRole`, `getMyRole`, `listSharedItineraries`.
- Página `/convite/:token` (InvitePage) aceita link.
- Notificações de convite com botões Aceitar/Recusar em `NotificationsScreen`.
- Planner detecta `myRole`: se `viewer`, oculta FAB de adicionar, botão de reordenar, edição do card de info da viagem, e mostra pílula "Modo visualização" no topo.
- Membros aceitos do roteiro são automaticamente fundidos em `budgetParticipants` (orçamento por pessoa e divisão de despesas em documentos).
- `useMyItineraries` (e `listMyItineraries`) retorna roteiros do usuário **+** roteiros nos quais é membro, deduplicados. Realtime escuta inserts/updates/deletes em `itineraries` e `itinerary_members` filtrados por `user_id`.
