import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { UserAvatar } from '@/components/ui/UserAvatar';

interface DestinationLite {
  name: string;
  flag: string;
}

interface VibeCheckSheetProps {
  isOpen: boolean;
  onClose: () => void;
  friendName: string;
  friendAvatar: string;
  myAvatar?: string;
  myName?: string;
  /** Interesses do usuário logado (labels do onboarding, ex.: 'Praia', 'Gastronomia'). */
  myInterests?: string[];
  /** Interesses do amigo (labels do onboarding). */
  friendInterests?: string[];
  /** Países que o usuário logado já visitou. */
  myVisited?: DestinationLite[];
  /** Países que o amigo já visitou. */
  friendVisited?: DestinationLite[];
  /** Lista de "quero conhecer" do usuário logado. */
  myWishlist?: DestinationLite[];
  /** Lista de "quero conhecer" do amigo. */
  friendWishlist?: DestinationLite[];
}

/* Ícones por interesse (mesmos labels do onboarding). */
const INTEREST_EMOJI: Record<string, string> = {
  'História': '🏛️',
  'Arte': '🎨',
  'Balada': '🪩',
  'Shopping': '🛍️',
  'Andar': '🚶',
  'Montanhas': '⛰️',
  'Escalada': '🧗',
  'Bares': '🍻',
  'Música': '🎵',
  'Ar livre': '🌳',
  'Agitado': '🎉',
  'Praia': '🏖️',
  'Gastronomia': '🍝',
};

/* Buckets temáticos para escolher título + corpo da "vibe". */
const CATEGORY_OF: Record<string, 'food' | 'culture' | 'nature' | 'nightlife' | 'shopping'> = {
  'Gastronomia': 'food',
  'Bares': 'food',
  'História': 'culture',
  'Arte': 'culture',
  'Música': 'culture',
  'Montanhas': 'nature',
  'Escalada': 'nature',
  'Ar livre': 'nature',
  'Praia': 'nature',
  'Andar': 'nature',
  'Balada': 'nightlife',
  'Agitado': 'nightlife',
  'Shopping': 'shopping',
};

type Category = 'food' | 'culture' | 'nature' | 'nightlife' | 'shopping' | 'default';

const VIBE_BY_CATEGORY: Record<
  Category,
  { emoji: string; title: string; body: (b: string) => string }
> = {
  food: {
    emoji: '🍷',
    title: 'Slow Food Believers',
    body: (b) =>
      `Você e ${b} curtem o mesmo jeito de viajar pela mesa — gastronomia local, bares com história, mercados de bairro. Vocês escolhem destino pelo cardápio.`,
  },
  culture: {
    emoji: '🏛️',
    title: 'Quiet Culture Curators',
    body: (b) =>
      `Vocês têm sintonia clara com cultura — museus, livrarias, bairros antigos. ${b} valoriza destinos com camadas, e você responde a isso.`,
  },
  nature: {
    emoji: '🏞️',
    title: 'Open Air Souls',
    body: (b) =>
      `Você e ${b} respiram melhor longe do concreto — trilhas, praia, montanha e o cheiro de mato. Vocês escolhem destinos pelo céu aberto.`,
  },
  nightlife: {
    emoji: '🪩',
    title: 'After Dark Twins',
    body: (b) =>
      `Você e ${b} viajam pela noite — bar escondido, rooftop, festa que vira o dia. Vocês conhecem a cidade pelo som, não pelo mapa.`,
  },
  shopping: {
    emoji: '🛍️',
    title: 'City Hunters',
    body: (b) =>
      `Você e ${b} sabem garimpar uma cidade — lojinhas independentes, brechós e bairros bons de andar. Roteiro com tempo pra explorar é sagrado.`,
  },
  default: {
    emoji: '✈️',
    title: 'Travel Souls',
    body: (b) =>
      `Você e ${b} ainda estão se conhecendo como dupla de viagem — preencham mais interesses no perfil para a gente cruzar melhor o que combina entre vocês.`,
  },
};

function normalize(s: string) {
  return s.trim().toLowerCase();
}

function intersectStrings(a: string[], b: string[]): string[] {
  const setB = new Set(b.map(normalize));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of a) {
    const key = normalize(item);
    if (setB.has(key) && !seen.has(key)) {
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

function intersectDestinations(a: DestinationLite[], b: DestinationLite[]): DestinationLite[] {
  const setB = new Set(b.map((d) => normalize(d.name)));
  const seen = new Set<string>();
  const out: DestinationLite[] = [];
  for (const d of a) {
    const key = normalize(d.name);
    if (setB.has(key) && !seen.has(key)) {
      seen.add(key);
      out.push(d);
    }
  }
  return out;
}

function unionCount(a: string[], b: string[]): number {
  const u = new Set<string>();
  a.forEach((x) => u.add(normalize(x)));
  b.forEach((x) => u.add(normalize(x)));
  return u.size;
}

function pickCategory(shared: string[]): Category {
  if (shared.length === 0) return 'default';
  const counts: Record<string, number> = {};
  for (const tag of shared) {
    const cat = CATEGORY_OF[tag];
    if (!cat) continue;
    counts[cat] = (counts[cat] || 0) + 1;
  }
  const entries = Object.entries(counts);
  if (entries.length === 0) return 'default';
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0] as Category;
}

export function VibeCheckSheet({
  isOpen,
  onClose,
  friendName,
  friendAvatar,
  myAvatar,
  myName,
  myInterests = [],
  friendInterests = [],
  myVisited = [],
  friendVisited = [],
  myWishlist = [],
  friendWishlist = [],
}: VibeCheckSheetProps) {
  const [analyzing, setAnalyzing] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setAnalyzing(true);
      const t = setTimeout(() => setAnalyzing(false), 1400);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  const match = useMemo(() => {
    const sharedInterests = intersectStrings(myInterests, friendInterests);
    const visitedTogether = intersectDestinations(myVisited, friendVisited);
    const wishlistTogether = intersectDestinations(myWishlist, friendWishlist);

    // Score ponderado: interesses (60%) + wishlist em comum (25%) + países em comum (15%).
    const interestsUnion = unionCount(myInterests, friendInterests);
    const wishlistUnion = unionCount(
      myWishlist.map((d) => d.name),
      friendWishlist.map((d) => d.name),
    );
    const visitedUnion = unionCount(
      myVisited.map((d) => d.name),
      friendVisited.map((d) => d.name),
    );

    const interestsPct = interestsUnion > 0 ? sharedInterests.length / interestsUnion : 0;
    const wishlistPct = wishlistUnion > 0 ? wishlistTogether.length / wishlistUnion : 0;
    const visitedPct = visitedUnion > 0 ? visitedTogether.length / visitedUnion : 0;

    const rawScore = interestsPct * 0.6 + wishlistPct * 0.25 + visitedPct * 0.15;
    // Sem nenhum sinal, mostramos 0 sinceramente.
    const score =
      sharedInterests.length === 0 && visitedTogether.length === 0 && wishlistTogether.length === 0
        ? 0
        : Math.max(15, Math.min(99, Math.round(rawScore * 100)));

    const category = pickCategory(sharedInterests);
    const vibe = VIBE_BY_CATEGORY[category];

    return { sharedInterests, visitedTogether, wishlistTogether, score, vibe };
  }, [myInterests, friendInterests, myVisited, friendVisited, myWishlist, friendWishlist]);

  if (!isOpen) return null;

  const firstName = friendName.split(' ')[0];

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/45 animate-in fade-in duration-200"
        onClick={onClose}
      />
      {/* Sheet */}
      <div
        className="relative w-full max-w-[430px] bg-background rounded-t-[28px] animate-in slide-in-from-bottom duration-300 pb-7 flex flex-col"
        style={{ boxShadow: '0 -8px 32px rgba(0,0,0,0.12)', maxHeight: '88vh' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-[#E0E0E0]" />
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-4 w-8 h-8 rounded-full flex items-center justify-center active:bg-secondary/60 z-10"
          aria-label="Fechar"
        >
          <Icon name="close" size={18} className="text-foreground" />
        </button>

        <div className="px-6 pt-3 pb-2 overflow-y-auto scrollbar-hide">
          {/* AI badge */}
          <div className="flex justify-center mb-5">
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{
                background:
                  'linear-gradient(90deg, rgba(157,204,54,0.10) 0%, rgba(124,58,237,0.14) 100%)',
                border: '1px solid rgba(124,58,237,0.20)',
              }}
            >
              <Icon name="auto_awesome" size={11} filled style={{ color: '#7C3AED' }} />
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color: '#7C3AED',
                  letterSpacing: '0.04em',
                }}
              >
                AI VIBE CHECK
              </span>
            </div>
          </div>

          {/* Avatars */}
          <div className="flex justify-center mb-5">
            <div className="flex items-center">
              <UserAvatar
                src={myAvatar}
                alt={myName || 'Você'}
                size={68}
                className="border-[3px] border-background"
              />
              <div className="-ml-4">
                <UserAvatar
                  src={friendAvatar}
                  alt={friendName}
                  size={68}
                  className="border-[3px] border-background"
                />
              </div>
            </div>
          </div>

          {/* Loading or content */}
          {analyzing ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center gap-2 text-muted-foreground">
                <div className="w-4 h-4 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
                <span style={{ fontSize: '13px', fontWeight: 500 }}>
                  Cruzando interesses com {firstName}...
                </span>
              </div>
            </div>
          ) : (
            <>
              <h2
                className="text-center mb-2"
                style={{
                  fontSize: '22px',
                  fontWeight: 800,
                  color: '#1A1C40',
                  letterSpacing: '-0.01em',
                }}
              >
                {match.vibe.title} {match.vibe.emoji}
              </h2>

              {/* Compatibility score */}
              <div className="flex justify-center mb-4">
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#7C3AED',
                    background: 'rgba(124,58,237,0.10)',
                    padding: '4px 10px',
                    borderRadius: '999px',
                  }}
                >
                  {match.score}% de compatibilidade
                </span>
              </div>

              <p
                className="text-center px-1 mb-5"
                style={{ fontSize: '14px', lineHeight: 1.55, color: '#3D3D5C' }}
              >
                {match.vibe.body(firstName)}
              </p>

              {/* Destinos em comum — só renderiza quando há algo real. */}
              {(match.visitedTogether.length > 0 || match.wishlistTogether.length > 0) && (
                <section className="mb-5">
                  <div className="flex items-center gap-1.5 mb-3">
                    <Icon name="location_on" size={14} style={{ color: '#1A1C40' }} />
                    <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#1A1C40' }}>
                      Destinos em comum
                    </h3>
                  </div>

                  {match.visitedTogether.length > 0 && (
                    <div className="mb-3">
                      <div className="mb-2">
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            color: '#8E8E93',
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                          }}
                        >
                          Já visitaram
                        </span>
                      </div>
                      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
                        {match.visitedTogether.map((d) => (
                          <div
                            key={`v-${d.name}`}
                            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full"
                            style={{ background: '#F2F2F2' }}
                          >
                            <span style={{ fontSize: '16px', lineHeight: 1 }}>{d.flag}</span>
                            <span
                              style={{ fontSize: '12px', fontWeight: 600, color: '#1A1C40' }}
                            >
                              {d.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {match.wishlistTogether.length > 0 && (
                    <div>
                      <div className="mb-2">
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            color: '#8E8E93',
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                          }}
                        >
                          Querem conhecer
                        </span>
                      </div>
                      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
                        {match.wishlistTogether.map((d) => (
                          <div
                            key={`w-${d.name}`}
                            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full"
                            style={{ background: '#F2F2F2' }}
                          >
                            <span style={{ fontSize: '16px', lineHeight: 1 }}>{d.flag}</span>
                            <span
                              style={{ fontSize: '12px', fontWeight: 600, color: '#1A1C40' }}
                            >
                              {d.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              )}

              {/* Interesses em comum */}
              <section className="mb-2">
                <div className="flex items-center gap-1.5 mb-2.5">
                  <Icon name="favorite" size={14} style={{ color: '#1A1C40' }} />
                  <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#1A1C40' }}>
                    Interesses em comum
                  </h3>
                </div>

                {match.sharedInterests.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {match.sharedInterests.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full"
                        style={{
                          fontSize: '12px',
                          fontWeight: 500,
                          color: '#1A1C40',
                          background: '#F2F2F2',
                        }}
                      >
                        <span style={{ fontSize: '13px', lineHeight: 1 }}>
                          {INTEREST_EMOJI[tag] || '✨'}
                        </span>
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '12px', color: '#8E8E93', lineHeight: 1.5 }}>
                    Vocês ainda não têm interesses em comum cadastrados. Quanto mais cada um
                    preencher no perfil, melhor fica esse match.
                  </p>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
