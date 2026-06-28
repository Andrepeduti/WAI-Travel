# Wai Travel — Resumo Técnico do Projeto

> Documento gerado para auxiliar uma análise externa (ex.: ChatGPT) sobre o estado atual do app, decisões já tomadas e pontos a evoluir.
> Não é uma transcrição literal dos chats; é um resumo curado a partir das memórias do projeto + código atual.

---

## 1. Visão geral

**Wai Travel** é um app mobile-first (max-width 430px, layout 100dvh) de planejamento e marketplace de viagens, construído em:

- **Frontend**: React 18 + Vite 5 + TypeScript 5 + Tailwind CSS v3
- **Backend**: Lovable Cloud (Supabase gerenciado) — Postgres + Auth + Storage + Edge Functions + Realtime
- **Mapas**: Leaflet + OpenRouteService (rotas) + Nominatim/Photon/Overpass (busca de lugares)
- **Animações**: Framer Motion (reordenação, transições)
- **Moeda**: Exclusivamente BRL (`formatBRL`)
- **Idioma**: PT-BR

### Identidade visual
- Primária: `#9DCC36` (verde lima)
- Secundária: `#1A1C40` (azul-marinho escuro)
- Background: `#F2F2F2`
- Inputs: mínimo 16px (anti-zoom iOS)
- Bottom sheets: `max-h-85vh`, com handle no topo e botão "X"
- Empty states padronizados (ícone 14x14 centralizado)

---

## 2. Funcionalidades principais

### 2.1 Roteiros (Itineraries)
Núcleo do app. Cada roteiro tem:
- **Modos**: Marketplace (à venda) vs Planner (privado/compartilhado) vs Comprado
- **Atividades** por dia (`itinerary_activities`) com horário, preço, fotos, categoria, notas
- **Transportes intra-dia** (`itinerary_transports`) com cálculo automático de deslocamento via OpenRouteService
- **Reservas** (`itinerary_reservations`) — hospedagem com check-in/check-out
- **Documentos de transporte** (`itinerary_doc_transports`) — voos, ônibus, etc., com anexos PDF/imagem em Storage
- **Orçamento** (`itinerary_expenses`) — despesas compartilhadas em BRL
- **Notas pessoais**, **checklist de bagagem**, **mapa**, **PDF export**
- **Recomendações automáticas** por destino com auto-remoção quando adicionadas

### 2.2 Colaboração em tempo real
- **Convites**: `itinerary_invites` com status pending/accepted; aparecem em "Pessoas com acesso" e podem ser cancelados
- **Membros**: `itinerary_members`
- **Realtime**: Supabase Realtime com `REPLICA IDENTITY FULL` em todas as tabelas relevantes
- Hook centralizado: `src/hooks/use-itinerary-realtime.ts` (um canal por roteiro)
- **Anti-eco**: refs `skipNextRemote*` em `PlannerItineraryScreen` evitam que o próprio update sobrescreva edição em andamento
- Tudo sincroniza: título, datas, capa, atividades, transportes, reservas, orçamento, membros

### 2.3 Marketplace
- Compra de roteiros prontos com taxa de serviço de **10%**
- Carrinho persistente em localStorage
- Pagamento via Pix, cartão (com gestão de cartões salvos)
- Tela de sucesso minimalista
- Pós-compra: overlay para ajustar datas
- Limites de compartilhamento por roteiro
- Política de reembolso e regras de saque definidas

### 2.4 Social
- Perfis públicos (`/user/:username`)
- Follow/unfollow ("Seguir"/"Seguindo")
- Top Creators com ranking podium colorido
- "Viajantes com mesmo interesse" — matching por interesses compartilhados, com fallback de mocks (`src/lib/similarTravelers.ts`)
- Chat estilo Instagram (inbox + conversas)
- Find People centralizado

### 2.5 Coleções
- Pastas + lugares salvos (grid 4 colunas)
- Persistência local escopada por usuário (`wai-travel-collections:{userId}`) + sync com backend
- Compartilhamento de coleções

### 2.6 Perfil & Passaporte
- Passaporte digital com selos de países visitados (3D page flip)
- Retrospectiva estilo Spotify Wrapped
- Programa de criadores (acesso via settings)
- Edição de perfil com telefone, interesses editáveis
- Fluxo de exclusão de conta com retenção de 10 dias

### 2.7 IA
- Chat assistente (FAB com gradiente dentro do planner)
- Histórico de conversas (mockado)
- Lovable AI Gateway (sem API key necessária)

### 2.8 Onboarding
- 6 passos premium, mostrado **apenas após signup** (gated por localStorage)
- Auth: email/senha + Google

---

## 3. Arquitetura

### 3.1 Estrutura de pastas
```
src/
├── components/
│   ├── screens/        # Telas completas
│   ├── travel/         # Componentes de domínio (sheets, cards)
│   ├── ui/             # Primitivos shadcn/ui
│   └── auth/           # Onboarding + Auth
├── contexts/           # Auth, Cart, Favorites
├── hooks/              # use-current-user, use-my-itineraries, use-itinerary-realtime, etc.
├── lib/                # APIs, helpers (itinerariesApi, plannerApi, budgetApi, etc.)
├── data/               # Datasets estáticos (countries, airports, recommendations)
├── pages/              # Roteamento React Router
└── integrations/supabase/  # Cliente + types (auto-gerados)

supabase/
├── functions/          # extract-video-places, get-route
└── migrations/         # SQL versionadas
```

### 3.2 Persistência
- **Backend (Lovable Cloud)**: tudo que precisa ser compartilhado/sincronizado — roteiros, atividades, orçamento, membros, perfis
- **LocalStorage**: cache stale-while-revalidate, coleções pessoais (escopadas por user_id), preferências de UI, carrinho
- **Storage buckets**: capas de roteiros, anexos de documentos, fotos de países

### 3.3 RLS
- Todas as tabelas com RLS ativo
- Roles em tabela separada (`user_roles`) com função `has_role()` SECURITY DEFINER (anti-recursão)

---

## 4. Padrões de código & convenções

- **BackButton padronizado**: componente único `<BackButton>` (círculo branco + chevron_left) em todos headers
- **ItineraryCard canônico**: moldura branca + tag de tema, usado em Home e perfis
- **Carrosséis full-bleed à direita** com scroll-snap
- **FAB**: 16px acima de `safe-area-inset-bottom`
- **Section headers**: título inline + chevron, gap 8-12px
- **Currency**: SEMPRE `formatBRL(num)` → "R$ 1.234,56"
- **Heroicons ausentes**: retornam `null` (nunca quebram)
- **Sentence case** em labels, currency explícita ("Valor (R$)")

---

## 5. Pontos a melhorar / evoluir

Sugestões priorizadas para análise externa:

### Funcionalidade
1. **Histórico de chat IA**: hoje é mockado (`mockHistory` em `AIHistoryScreen.tsx`). Precisa persistir conversas reais por usuário no backend.
2. **Notificações push**: estrutura de `use-notifications` existe mas não há push real (web push / FCM).
3. **Pagamentos reais**: fluxo Pix/cartão é simulado. Falta integração com gateway (Stripe/Pagar.me/Mercado Pago).
4. **Exportação de dados**: PDF do roteiro existe; falta export do passaporte e da retrospectiva.
5. **Modo offline**: cache stale-while-revalidate ajuda mas não cobre criação offline com sync posterior.

### Performance
6. **Bundle size**: muitos sheets carregados eager. Avaliar code-splitting por rota.
7. **Imagens**: Unsplash on-demand sem CDN próprio nem srcset/lazy consistente.
8. **Realtime**: um canal por roteiro está OK, mas quando user tem muitos roteiros abertos pode escalar mal.

### UX
9. **Conflitos de edição simultânea**: anti-eco resolve só o "echo" próprio; falta CRDT/last-write-wins explícito quando 2 users editam mesmo campo ao mesmo tempo.
10. **Empty states**: padronizados, mas alguns ainda divergem (verificar `TripsScreen`, `ExploreScreen`).
11. **Acessibilidade**: faltam revisões de contraste em estados desabilitados e ARIA labels em sheets customizados.

### Backend / Dados
12. **Migrations**: muitas migrations incrementais — vale consolidar um snapshot.
13. **Seeds**: dados mockados (`syntheticMarketplaceDataset`) misturados com reais. Separar ambiente seed/prod.
14. **Tipos**: `src/integrations/supabase/types.ts` é auto-gerado mas alguns helpers em `lib/` redefinem tipos manualmente — risco de drift.

### Marketplace
15. **Reviews/avaliações** de roteiros comprados (não vi implementado).
16. **Withdraw flow** para criadores precisa hardening (KYC, validação de chave Pix).
17. **Refund flow** definido em política mas sem UI clara.

### IA
18. **Geração de roteiros via IA** a partir de prompt (existe assistente mas não fluxo guiado de "crie meu roteiro").
19. **Extração de lugares de vídeo** (`extract-video-places` edge function) — testar robustez com mais plataformas.

---

## 6. Tabelas principais (Postgres)

```
profiles (id, username, name, avatar, location, interests[], following, followers, ...)
user_roles (user_id, role)
itineraries (id, owner_id, title, destinations[], dates, cover, is_public, price, ...)
itinerary_activities (id, itinerary_id, day_index, time, title, price, photos[], ...)
itinerary_transports (id, itinerary_id, day_index, from, to, mode, duration, ...)
itinerary_reservations (id, itinerary_id, type, check_in, check_out, ...)
itinerary_doc_transports (id, itinerary_id, type, attachments[], ...)
itinerary_expenses (id, itinerary_id, paid_by, amount_brl, category, ...)
itinerary_members (itinerary_id, user_id, role)
itinerary_invites (id, itinerary_id, invitee_id, status, ...)
purchases (id, buyer_id, itinerary_id, amount, fee, ...)
favorites (user_id, target_id, target_type)
```

Todas com RLS + REPLICA IDENTITY FULL para Realtime.

---

## 7. Edge Functions

- `extract-video-places`: recebe URL de vídeo (Instagram/TikTok), extrai lugares mencionados
- `get-route`: proxy para OpenRouteService (rotas e durações entre pontos)

---

## 8. Como navegar no código

Pontos de entrada para o ChatGPT:
- `src/App.tsx` → roteamento
- `src/pages/Index.tsx` → shell principal
- `src/components/screens/PlannerItineraryScreen.tsx` → tela mais complexa, vale leitura
- `src/hooks/use-itinerary-realtime.ts` → padrão de realtime
- `src/lib/itinerariesApi.ts`, `plannerApi.ts`, `budgetApi.ts` → camada de dados
- `supabase/migrations/` → schema completo em SQL

---

## 9. Como rodar localmente

```bash
bun install
bun run dev
```

Variáveis de ambiente em `.env` (Supabase URL + anon key) já vêm preenchidas pelo Lovable Cloud.

---

## 10. Perguntas sugeridas pro ChatGPT

1. Como melhorar o conflict resolution na colaboração realtime (CRDT vs OT vs LWW)?
2. Quais code-splits priorizar olhando o bundle atual?
3. Estratégia de migração das migrations incrementais para um snapshot consolidado?
4. Padrão recomendado para persistir histórico de IA com tokens otimizados?
5. Como estruturar reviews de marketplace sem inflar custos de leitura?
6. Análise de segurança das RLS policies (ver `supabase/migrations/`).
7. Roadmap de acessibilidade (WCAG 2.1 AA) para um app mobile-first em React.
