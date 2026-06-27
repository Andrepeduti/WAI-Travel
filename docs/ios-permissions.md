# Permissões iOS — waitravel

Guia oficial das permissões usadas pelo app e dos textos a serem inseridos no `Info.plist` após `npx cap add ios`. Todos os textos seguem as diretrizes da Apple (App Store Review Guideline 5.1.1): específicos, em PT-BR, explicando claramente o uso.

## Inventário de permissões

| Permissão | Onde é usada no app | Just-in-time? | Chave Info.plist |
|---|---|---|---|
| Galeria de Fotos (leitura) | Trocar avatar (EditProfile), capa de roteiro (EditItinerary, ManageItinerary, EditPublish), fotos de países visitados (CountryAlbum), capa de coleção (AddPlaceToCollection) | ✅ Sim — só ao tocar em "alterar foto" | `NSPhotoLibraryUsageDescription` |
| Galeria — Salvar | Salvar passaporte digital / retrospectiva em imagem (futuro) | ✅ Sim | `NSPhotoLibraryAddUsageDescription` |
| Câmera | Tirar foto para avatar / capa / país visitado | ✅ Sim — botão "Tirar foto" | `NSCameraUsageDescription` |
| Localização (When In Use) | Centralizar o mapa do roteiro e da coleção na posição do usuário; sugerir lugares próximos | ✅ Sim — só ao abrir mapa pela primeira vez | `NSLocationWhenInUseUsageDescription` |
| Notificações push | Avisar sobre convites para roteiros, mensagens no chat, atualizações de roteiros compartilhados | ✅ Sim — solicitada após o usuário ativar nas Configurações | (sem texto fixo; o prompt usa o nome do app) |
| Galeria de vídeos | Importar vídeo do TikTok/Reels salvo localmente para extrair lugares | ✅ Sim | Coberto por `NSPhotoLibraryUsageDescription` |

> ❌ **Não usadas e não devem ser declaradas:** Microfone, Contatos, Calendário, Lembretes, Bluetooth, HealthKit, Face ID, Apple Music, Motion, App Tracking Transparency (IDFA), Rede local.

## Snippet pronto para o `Info.plist`

Abra `ios/App/App/Info.plist` (após rodar `npx cap add ios`) e cole as chaves dentro do `<dict>` raiz:

```xml
<key>NSPhotoLibraryUsageDescription</key>
<string>Usamos sua galeria para você escolher fotos do seu perfil, capas de roteiros, coleções e registros das viagens.</string>

<key>NSPhotoLibraryAddUsageDescription</key>
<string>Permita salvar imagens geradas pelo waitravel (como seu passaporte digital e retrospectivas) direto na sua galeria.</string>

<key>NSCameraUsageDescription</key>
<string>Usamos a câmera para você tirar fotos e adicioná-las ao seu perfil, roteiros e coleções de viagem.</string>

<key>NSLocationWhenInUseUsageDescription</key>
<string>Usamos sua localização para centralizar o mapa onde você está e sugerir lugares próximos dentro dos seus roteiros e coleções.</string>
```

### Notificações push

As notificações no iOS não exigem texto no `Info.plist`. Para habilitar:

1. No Xcode: **Signing & Capabilities → + Capability → Push Notifications**.
2. Adicione também **Background Modes → Remote notifications** se quiser receber em segundo plano.
3. No primeiro uso, mostre a tela de pré-prompt do app (componente `PermissionPrePrompt`) antes de chamar `PushNotifications.requestPermissions()` — assim, se o usuário recusar, ainda podemos reapresentar de forma educada (a Apple só permite chamar o prompt nativo uma vez).

## Boas práticas aplicadas no código

- **Just-in-time:** nenhuma permissão é solicitada na abertura do app. Cada solicitação acontece em resposta direta a uma ação do usuário (toque em "alterar foto", "abrir mapa", "ativar notificações" etc.).
- **Pré-prompt explicativo:** antes de qualquer permissão sensível (Localização, Câmera, Notificações), o app exibe o componente `PermissionPrePrompt` com motivo claro. Só após "Continuar" o prompt nativo é disparado — evita negação acidental e atende à Guideline 5.1.1.
- **Sem permissões indiretas:** o projeto não usa Firebase Messaging, Mapbox, SDK de analytics com IDFA, Sentry com captura de dispositivo nem qualquer SDK que dispare permissões adicionais. O mapa usa Leaflet com tiles HTTP (sem GPS obrigatório).
- **Sem App Tracking Transparency:** o app não rastreia o usuário entre aplicativos de terceiros, portanto `NSUserTrackingUsageDescription` **não** deve ser adicionado (declarar sem usar é motivo de rejeição).

## Checklist antes de submeter

- [ ] `Info.plist` contém apenas as 4 chaves acima (mais Push, se aplicável).
- [ ] Cada pré-prompt do app foi testado: cenário "permitir" e "negar".
- [ ] Em caso de negação, o app mantém a função básica e mostra como reabilitar em Ajustes.
- [ ] App Privacy no App Store Connect declara: Fotos (vinculadas ao usuário), Localização (não vinculada, uso do app), Contato (e-mail/nome para conta).
