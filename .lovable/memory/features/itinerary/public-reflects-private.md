---
name: Public itinerary reflects private planner
description: Ao publicar/visualizar roteiro próprio no marketplace, days/places são hidratados com as atividades persistidas no localStorage do Planner privado
type: feature
---

Quando um roteiro próprio é aberto na visualização pública do marketplace (`handleUserPublicItineraryClick` em `src/pages/Index.tsx`), o `injectedMarketplaceDataset` é construído mesclando:

- **Datas reancoradas** ao intervalo escolhido pelo usuário.
- **`days[].activities`**: lidos de `localStorage` via `loadPlannerActivities(userItinerary.id)` (`src/lib/plannerActivitiesStore.ts`, chave `wai-travel-planner-activities`). Se houver qualquer atividade persistida, sobrescreve as do `baseDataset` (catálogo) ou popula o esqueleto sintético de roteiros criados do zero. Caso contrário, mantém os days do catálogo (para roteiros comprados/repassados).
- **`days[].transports`**: lidos via `loadPlannerTransports` (`wai-travel-planner-transports`).
- **`places`**: derivados das atividades reais (filtra `type === 'note'`, deduplica por nome, mapeia para `ItineraryPlace` com `lat/lng = 0` e `day` correto). Só é re-derivado quando há atividades persistidas; senão preserva `baseDataset.places`.

Isso garante que **tornar público** um roteiro reflete exatamente o que o usuário planejou no privado, tanto para roteiros criados do zero quanto para os que vieram do marketplace e foram editados.

Helpers ficam isolados em `src/lib/plannerActivitiesStore.ts` (read-only) — a escrita continua sendo responsabilidade do `PlannerItineraryScreen`.
