/**
 * Catálogo de tags que o criador escolhe ao colocar um roteiro à venda.
 * Fonte única usada na publicação, na edição da publicação e nas
 * categorias da Home.
 */

export interface ItineraryTag {
  id: string;
  label: string;
  emoji: string;
}

export interface ItineraryTagCategory {
  title: string;
  tags: ItineraryTag[];
}

export const TAG_CATEGORIES: ItineraryTagCategory[] = [
  {
    title: 'Ambiente',
    tags: [
      { id: 'praia', label: 'Praia', emoji: '🏖️' },
      { id: 'montanha', label: 'Montanha', emoji: '⛰️' },
      { id: 'urbano', label: 'Urbano', emoji: '🏙️' },
      { id: 'natureza', label: 'Natureza', emoji: '🌿' },
      { id: 'neve', label: 'Neve', emoji: '❄️' },
    ]
  },
  {
    title: 'Estilo da viagem',
    tags: [
      { id: 'cultural', label: 'Cultural', emoji: '🏛️' },
      { id: 'gastronomia', label: 'Gastronomia', emoji: '🍽️' },
      { id: 'aventura', label: 'Aventura', emoji: '🧗' },
      { id: 'vida-noturna', label: 'Vida noturna', emoji: '🌃' },
      { id: 'relax', label: 'Relax', emoji: '🧘' },
      { id: 'romance', label: 'Romance', emoji: '💕' },
      { id: 'roadtrip', label: 'Roadtrip', emoji: '🚗' },
      { id: 'compras', label: 'Compras', emoji: '🛍️' },
      { id: 'bem-estar', label: 'Bem-estar', emoji: '💆' },
      { id: 'vinhos', label: 'Vinhos', emoji: '🍷' },
      { id: 'cafes', label: 'Cafés', emoji: '☕' },
      { id: 'festivais', label: 'Festivais', emoji: '🎪' },
    ]
  },
  {
    title: 'Perfil do viajante',
    tags: [
      { id: 'familia', label: 'Família', emoji: '👨‍👩‍👧‍👦' },
      { id: 'amigos', label: 'Amigos', emoji: '🍻' },
      { id: 'solo', label: 'Solo', emoji: '🚶' },
      { id: 'mochilao', label: 'Mochilão', emoji: '🎒' },
      { id: 'economico', label: 'Econômico', emoji: '💸' },
      { id: 'luxo', label: 'Luxo', emoji: '💎' },
      { id: 'criancas', label: 'Crianças', emoji: '🧒' },
      { id: 'pet-friendly', label: 'Pet friendly', emoji: '🐾' },
      { id: 'acessivel', label: 'Acessível', emoji: '♿' },
      { id: 'trabalho-remoto', label: 'Trabalho remoto', emoji: '💻' },
    ]
  },
  {
    title: 'Experiências',
    tags: [
      { id: 'fotogenico', label: 'Fotogênico', emoji: '📸' },
      { id: 'arquitetura', label: 'Arquitetura', emoji: '🏢' },
      { id: 'arte', label: 'Arte', emoji: '🎨' },
      { id: 'trilhas', label: 'Trilhas', emoji: '🥾' },
      { id: 'cachoeiras', label: 'Cachoeiras', emoji: '🌊' },
      { id: 'parques-nacionais', label: 'Parques nacionais', emoji: '🏞️' },
      { id: 'ilhas', label: 'Ilhas', emoji: '🏝️' },
      { id: 'mergulho', label: 'Mergulho', emoji: '🤿' },
    ]
  }
];

export const TAG_LABEL_BY_ID: Record<string, string> = Object.fromEntries(
  TAG_CATEGORIES.flatMap((cat) => cat.tags.map((t) => [t.id, t.label])),
);
