---
name: Onboarding Flow
description: Premium 9-step onboarding shown once after signup with localStorage gate
type: feature
---

Fluxo de onboarding premium do app, mostrado APENAS após signup (não no login).

**Componentes:**
- `src/components/auth/OnboardingFlow.tsx` — fluxo completo
- Integrado em `AuthFlow.tsx` via `mode === 'onboarding'` após `handleSignupSubmit`

**Persistência:**
- Chave localStorage: `wai-travel-onboarding-completed` (boolean)
- Dados coletados em: `wai-travel-onboarding-data` (JSON com `name` e `interests`)
- Login NUNCA exibe onboarding

**Estrutura (9 telas — TOTAL_STEPS=9):**
0. Hero (#CDE3F3 azul) — "Drop anything..." scanner + extração de lugares
1. TripOverview (#EBE1C5 areia) — "Crie roteiros..." mapa + cards marquee
2. Partners (#D3ECCD verde claro) — "Encontre parceiros de viagem" carrossel 3 fotos
3. AIItinerary — "Otimizar rota" com IA + skeleton loading
4. Monetize (#D9D9D9 cinza) — "Faça renda extra..." carteira + notificações
5. Name — input "Como gostaria de ser chamado?" (placeholder "Alessandra", autoCapitalize words)
6. City — input com autocomplete de cidades brasileiras (lista CITIES estática, dropdown ao digitar)
7. Birthdate — input com máscara DD/MM/AAAA, validação de data real, inputMode numeric
8. Interesses — chips selecionáveis com emoji (🏛️ História, 🎨 Arte, 🎧 Nightclub, etc.)

**Fases do header:**
- Phase 1: steps 0-4 (5 dots) — botão "Pular" pula para step 5
- Phase 2: steps 5-8 (4 dots Name/City/Birthdate/Interests) — botão back

**Padrões UX:**
- Header sticky com indicador de progresso (barra ativa 20px, demais 6px)
- Telas 0-4: card colorido + FAB circular verde #9DCC36 + back outline (exceto step 0)
- Telas 5-8 (perguntas): bg #F1F3E7, conteúdo posicionado na **metade inferior** (thumb zone) via `<QuestionLayout>` com `flex-1` no topo. Botão "Próximo" full-width verde #9DCC36 fixo no rodapé via `<FooterPrimary>` (gradient from #F1F3E7).
- Cor primária: #9DCC36
- Títulos perguntas: 28px font-weight 800, tracking -0.02em
- Subtítulos: #6B6B6B 13px
- Inputs perguntas: bg-white rounded-2xl h-56px font-size 16px (anti-zoom iOS)
- Tags de interesse: pills com emoji, ativo bg #1A1C40 + texto branco; inativo bg-white border

**Componentes compartilhados (perguntas):**
- `QuestionLayout` — wrapper bg #F1F3E7 com flex-1 no topo
- `QuestionHeader` — título + subtítulo padronizados
- `FooterPrimary` — botão fixo full-width verde com gradient

**Validações:**
- Name: trim().length > 0
- City: trim().length > 0
- Birthdate: regex DD/MM/AAAA + validação Date real (mês 1-12, dia válido, ano 1900-atual)
- Interests: pelo menos 1 selecionado

**Assets:**
- `src/assets/onboarding-people-1.png`, `-2.png`, `-3.png` — fotos do carrossel Partners
- `src/assets/onboarding-wallet.png`, `onboarding-notification.png` — Monetize
- `src/assets/onboarding-scan-image.png`, `onboarding-map.png` — Hero/TripOverview
