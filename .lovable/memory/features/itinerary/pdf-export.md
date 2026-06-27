---
name: Itinerary PDF Export
description: Itinerary settings sheet has "Baixar em PDF" option using jspdf via src/lib/itineraryPdf.ts
type: feature
---
- ItinerarySettingsSheet expõe prop opcional `onDownloadPdf` e renderiza o item "Baixar em PDF" entre Duplicar e Tornar público (sempre visível, inclusive em roteiros comprados).
- Geração via `downloadItineraryPdf()` em `src/lib/itineraryPdf.ts` usando `jspdf` (A4, helvetica). Inclui título, destinos, datas, dias com data formatada (`EEE, d 'de' MMM`) e atividades (horário, nome, categoria como location, observação como notes). Footer com numeração de páginas. Notas (`type: 'note'`) viram "Tempo livre".
- Implementado em PlannerItineraryScreen (usa `getAllActivities`) e NewItineraryScreen (usa `days` vazios). Nome do arquivo: slug do título.
