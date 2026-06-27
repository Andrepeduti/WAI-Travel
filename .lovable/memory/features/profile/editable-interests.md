---
name: Editable interests on self profile
description: No perfil próprio (variant 'self'), a seção 'Interesses' tem botão 'Editar' que abre EditInterestsSheet com catálogo + busca + criar custom; persistido em localStorage 'wai-travel-interests'. Outros perfis exibem a lista mas não editam.
type: feature
---
- Componente: `src/components/travel/EditInterestsSheet.tsx` (catálogo `INTEREST_CATALOG`, busca, criar custom, máx 12).
- Tela: `FriendProfileScreen` mantém estado `interests` + chave `INTERESTS_STORAGE_KEY = 'wai-travel-interests'`.
- Botão "Editar" aparece só com `isSelf`. Empty state convida a adicionar quando `isSelf`.
- Custom interests recebem ícone `tag`. Catálogo cobre ~30 temas de viagem.
