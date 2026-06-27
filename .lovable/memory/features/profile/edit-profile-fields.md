---
name: Edit profile fields
description: Tela de editar perfil contém apenas campos essenciais (Nome, Username, Localização, Bio) + card de Verificação de identidade para o selo. Removidos Website, Instagram, Email e Telefone.
type: feature
---
- Tela: `src/components/screens/EditProfileScreen.tsx` segue padrão sub-page header (sticky branco + BackButton + título "Editar perfil").
- Campos persistidos via `useCurrentUser().update()` na tabela `profiles`: name, username, location, bio, avatar.
- Removidos da UI: website, instagram, email, phone (ainda existem no schema mas não são editáveis aqui).
- Bio limitada a 150 caracteres com contador inline.
- Card "Verificação de identidade" com 3 estados: `unverified` (CTA), `pending` (em análise), `verified` (selo conquistado). Estado salvo em localStorage `wai-travel-verification-status`.
- Bottom sheet de verificação explica os 3 passos: documento oficial, selfie ao vivo, análise em até 48h. Segue padrão `max-h-85vh` com handle e botão X.
- Toast de sucesso usa Sonner com ícone `check_circle` em verde primário.
