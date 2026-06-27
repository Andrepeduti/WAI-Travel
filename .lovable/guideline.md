# Guideline do Projeto

## Visão Geral

Aplicativo mobile-first de viagens, focado em roteiros, experiências e criadores de conteúdo.

## Design System

### Tipografia

- Pesos: usar `font-medium` como padrão para textos de cards, e `font-semibold` para títulos e preços
- Não alterar tamanhos de fonte sem necessidade

### Cores

- Usar tokens semânticos do Tailwind definidos em `index.css` e `tailwind.config.ts`
- Nunca usar cores hardcoded diretamente nos componentes
- Todas as cores devem ser em HSL

### Cards

- Sem sombra (`shadow`) — usar bordas sutis (`border border-border/50`)
- Fundo branco sobre background da tela
- Estilo minimalista e clean

### Espaçamento e Layout

- Container principal: `w-full max-w-[430px]` com `overflow-x-hidden`
- Padding lateral: `16px` mínimo, respeitando safe areas do iOS
- Nunca usar `width: 100vw` — sempre `width: 100%`
- Carrosséis devem respeitar o padding lateral da página
- Nenhum componente deve ultrapassar a largura do viewport

### Safe Area (Mobile)

- Viewport meta com `viewport-fit=cover`
- Usar `env(safe-area-inset-*)` para paddings laterais e inferiores
- Testar em Safari iOS e Chrome Android

## Navegação

- Bottom navigation com 5 abas: Home, Explore, Create, Trips, Profile
- Sub-telas navegam via estado interno (não rotas)
- Hierarquia: Tab → Sub-tela → Detalhe

## Componentes

- Componentes de tela ficam em `src/components/screens/`
- Componentes reutilizáveis de viagem em `src/components/travel/`
- Componentes UI base em `src/components/ui/`

## Boas Práticas

- Não alterar funcionalidade ao fazer ajustes visuais
- Manter consistência entre as abas
- Testar em dispositivos reais quando possível
- Preferir `lov-line-replace` para edições pontuais

## Buttons

Sistema oficial de botões do produto.
Nunca criar variações fora deste padrão.

---

# 1. Filled Buttons (Primary e Dark)

Botões com container visual.
Usados para ações principais e de destaque.

### Estrutura Base

- Altura fixa: `h-[41px]`
- Border radius: `rounded-[16px]`
- Padding horizontal: `px-4`
- Layout: `flex items-center justify-center`
- Gap texto ↔ ícone: `gap-2`
- Ícone: 16px (Arrow_Forward)
- Ícone sempre à direita
- Texto: `font-semibold`
- Sentence case

---

### Cores (Tokens)

- Primária: `#9DCC36`
- Secundária: `#141530`
- Disabled background: `#E7E7EE`
- Disabled text/icon: `#CACAD0`

- Nunca usar cores hardcoded
- Converter para tokens
- Todas as cores devem estar em HSL

---

### Primary (Filled Green)

- Background: primária
- Texto: secundária
- Ícone: secundária
- Sem borda

Uso:

- Ação principal da seção
- Apenas 1 Primary por seção

Disabled:

- Background: disabled background
- Texto/ícone: disabled text

---

### Dark (Filled Secondary)

- Background: secundária
- Texto: primária
- Ícone: primária
- Sem borda

Uso:

- Ação de destaque secundário

Disabled:

- Background: disabled background
- Texto/ícone: disabled text

---

# 2. Outline Button

Botão com borda e sem preenchimento.

### Estrutura

- Mesmo padrão estrutural do Filled
- Background transparente
- `border border-secondary`

### Cores

- Texto: secundária
- Ícone: secundária

Disabled:

- Border: disabled background
- Texto/ícone: disabled text

Uso:

- Ação secundária
- Nunca como ação principal

---

# 3. Tertiary Buttons (Text Buttons)

Botões sem container visual.
Nunca competem com Filled.

### Estrutura Base

- `flex items-center`
- `gap-2`
- Altura automática
- Sem background
- Sem borda
- Texto `font-medium`
- Sentence case

---

### Tipos Permitidos

#### Action (Ícone à esquerda)

- Ícone 16px–18px à esquerda
- Texto à direita

Uso:

- Ações dentro de listas ou cards

---

#### Directional (Ícone à direita)

- Texto à esquerda
- Ícone 16px–18px à direita

Uso:

- Navegação
- “Ver mais”
- Levar para detalhe

---

### Cores Permitidas

Default:

- Texto: secundária
- Ícone: secundária

Highlight:

- Texto: primária
- Ícone: primária

Disabled:

- Texto/ícone: disabled text

Regras:

- Nunca adicionar background
- Nunca adicionar borda
- Nunca transformar em botão filled

---

# 4. Icon Button (Header)

Botão circular usado em headers.

---

### Tamanhos Permitidos

Default (Header principal):

- `w-12 h-12` (48px)
- Ícone 24px
- `rounded-full`

Small (Inline / Pós título):

- `w-8 h-8` (32px)
- Ícone 16px–18px
- `rounded-full`

---

### Cores

- Background: `neutral-celeste-light`
- Ícone: secundária

Disabled:

- Background: disabled background
- Ícone: disabled text

---

### Regras

- Nunca alterar formato (sempre circular)
- Nunca adicionar texto
- Nunca inverter cores
- Nunca criar nova variação
- Usar apenas os tamanhos definidos

---

# Regras Globais

- Nunca criar novos estilos de botão
- Nunca alterar border radius
- Nunca usar cores fora dos tokens
- Sempre respeitar hierarquia:
  1. Primary
  2. Dark
  3. Outline
  4. Tertiary
  5. Icon Button
- Estados disabled devem sempre usar os tokens oficiais
