---
name: Profile screens unification
description: FriendProfileScreen é o perfil oficial. variant 'self' (rota /user) mostra Editar + ⚙️ no header; variant 'other' (rota /profile) mostra Chat + Seguir + ⋯ (Reportar/Bloquear). Resto do layout é igual.
type: feature
---
- Tela única: `src/components/screens/FriendProfileScreen.tsx` aceita prop `variant: 'self' | 'other'` (default `'other'`).
- `variant="self"` → header com ícone Configurações (abre painel interno de Carteira/Conta/Suporte), botão único "Editar perfil" no card. Usa `onEditProfile`.
- `variant="other"` → header com botão `more_horiz` que abre menu com "Reportar usuário" e "Bloquear usuário"; card mostra botões Chat + Seguir/Seguindo. Usa `onChat`.
- Rotas: `/user` (self) usa `UserPage` com mock `currentUser`; `/profile` (other) usa `FriendProfilePage`. `/creator` mantida separadamente (dashboard de criador).
- A antiga `UserProfileScreen` não é mais usada por `/user`, mas o arquivo permanece (ainda referenciado por `Index.tsx`).
