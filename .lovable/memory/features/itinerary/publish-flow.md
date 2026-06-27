---
name: Publish Itinerary Flow
description: Multi-step jornada (estilo onboarding) para publicar roteiro próprio no marketplace; oculto para roteiros comprados
type: feature
---
Roteiros próprios podem ser publicados no marketplace via `PublishItineraryFlow` (4 passos: intro "Torne-se criador", como funciona, definir preço, revisão). Estética idêntica ao `OnboardingFlow` (cards arredondados rounded-[30px], paleta #F1F3E7 / #9DCC36, FooterPrimary com botão verde, dots de progresso).

**Regras:**
- Roteiros comprados (`isPurchased=true` no `ItinerarySettingsSheet`): a opção "Tornar público" é totalmente OCULTA — usuários não podem republicar conteúdo de outros criadores.
- Roteiros próprios: clicar em "Tornar público" abre `PublishItineraryFlow` em vez de só ativar o toggle. Após publicar, o item passa a mostrar "Roteiro público" com toggle ON.
- Taxa de serviço fixa em 10% (consistente com platform-policies). Preço entre R$ 5,00 e R$ 999,00.
- Toast de sucesso via Sonner ao concluir.

**Integração:** `PlannerItineraryScreen` e `NewItineraryScreen` passam `isPurchased`, `isPublic`, `onTogglePublic`, `onPublish` para o `ItinerarySettingsSheet`.
