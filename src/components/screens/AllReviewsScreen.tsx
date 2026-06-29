import { useMemo, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { BackButton } from '@/components/ui/BackButton';

export interface ReviewItem {
  user: string;
  text: string;
  avatar: string;
  itineraryTitle: string;
  itineraryId: number;
  rating?: number;
}

interface AllReviewsScreenProps {
  creatorName: string;
  reviews: ReviewItem[];
  averageRating: number;
  onBack: () => void;
}

type SortMode = 'recent' | 'best' | 'worst';

const SORT_OPTIONS: { key: SortMode; label: string }[] = [
  { key: 'recent', label: 'Mais recentes' },
  { key: 'best', label: 'Maiores notas' },
  { key: 'worst', label: 'Menores notas' },
];

export function AllReviewsScreen({ creatorName, reviews, averageRating, onBack }: AllReviewsScreenProps) {
  const [sort, setSort] = useState<SortMode>('recent');

  const sortedReviews = useMemo(() => {
    const list = [...reviews];
    if (sort === 'best') {
      return list.sort((a, b) => (b.rating ?? 5) - (a.rating ?? 5));
    }
    if (sort === 'worst') {
      return list.sort((a, b) => (a.rating ?? 5) - (b.rating ?? 5));
    }
    return list;
  }, [reviews, sort]);

  // AI-generated insight summarizing the reviews
  const aiInsight = useMemo(() => {
    if (reviews.length === 0) return null;

    const avg = averageRating;
    const total = reviews.length;

    // Extract recurring themes from review texts (simple keyword analysis)
    const allText = reviews.map(r => r.text.toLowerCase()).join(' ');
    const themes: string[] = [];
    const themeMap: { keywords: string[]; label: string }[] = [
      { keywords: ['organiz', 'detalh', 'planej'], label: 'organização impecável' },
      { keywords: ['dica', 'recomend', 'sugest'], label: 'dicas valiosas' },
      { keywords: ['atend', 'respons', 'atencios'], label: 'atendimento próximo' },
      { keywords: ['rote', 'experiênc', 'viag'], label: 'roteiros bem estruturados' },
      { keywords: ['foto', 'lugar', 'lindo', 'incrív'], label: 'lugares memoráveis' },
      { keywords: ['preç', 'custo', 'vale', 'barato'], label: 'ótimo custo-benefício' },
    ];
    themeMap.forEach(t => {
      if (t.keywords.some(k => allText.includes(k))) themes.push(t.label);
    });

    let tone = 'positivas';
    if (avg >= 4.7) tone = 'altamente positivas';
    else if (avg >= 4.0) tone = 'positivas';
    else if (avg >= 3.0) tone = 'mistas';
    else tone = 'críticas';

    const topThemes = themes.slice(0, 3);
    const themesText = topThemes.length > 0
      ? ` Os viajantes destacam ${topThemes.length === 1 ? topThemes[0] : topThemes.slice(0, -1).join(', ') + ' e ' + topThemes[topThemes.length - 1]}.`
      : '';

    return `Com base em ${total} ${total === 1 ? 'avaliação' : 'avaliações'}, ${creatorName.split(' ')[0]} mantém uma média ${tone} de ${avg.toFixed(1)}.${themesText}`;
  }, [reviews, averageRating, creatorName]);

  return (
    <div className="min-h-screen bg-[#F2F2F2] pb-24">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-[#F2F2F2]">
        <div className="flex items-center gap-3 px-4 pb-3" style={{ paddingTop: 'calc(max(16px, env(safe-area-inset-top)) + 12px)' }}>
          <BackButton onClick={onBack} ariaLabel="Voltar" />
          <h1 className="text-foreground" style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-weight-bold)' }}>
            Avaliações
          </h1>
        </div>
      </div>

      {/* AI Insight Summary */}
      {reviews.length > 0 && (
        <div className="px-5 mb-4">
          <div
            className="card-base p-4"
            style={{ background: 'linear-gradient(135deg, #f3e8ff 0%, #e0f2fe 100%)' }}
          >
            {/* Header */}
            <div className="flex items-start gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs">✨</span>
              </div>
              <p className="text-[12px] font-bold text-purple-700">Resumo por IA</p>
            </div>

            {/* AI summary text */}
            <p className="text-[13px] text-gray-700 leading-relaxed mb-3">
              {aiInsight}
            </p>

            {/* Rating footer */}
            <div className="flex items-center gap-2 pt-3 border-t border-purple-200">
              <Icon name="star" size={14} filled style={{ color: '#F2B90C' }} />
              <span className="text-[12px] font-semibold text-purple-700">
                {averageRating.toFixed(1)} · {reviews.length} {reviews.length === 1 ? 'avaliação analisada' : 'avaliações analisadas'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Filter chips */}
      {reviews.length > 0 && (
        <div className="px-5 mb-3 overflow-x-auto no-scrollbar">
          <div className="inline-flex gap-2">
            {SORT_OPTIONS.map(opt => {
              const active = sort === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => setSort(opt.key)}
                  className="h-8 px-3.5 rounded-full whitespace-nowrap transition-colors"
                  style={{
                    background: active ? '#1A1C40' : '#FFFFFF',
                    color: active ? '#FFFFFF' : '#1A1C40',
                    fontSize: 12,
                    fontWeight: 600,
                    border: active ? '1.5px solid #1A1C40' : '1px solid #E5E7EB',
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* List */}
      <div className="px-5 flex flex-col gap-3">
        {sortedReviews.length === 0 ? (
          <div className="card-base p-6 flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: '#F2F2F2' }}>
              <Icon name="chat" size={22} className="text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-center" style={{ fontSize: 'var(--text-sm)' }}>
              Ainda não há avaliações
            </p>
          </div>
        ) : (
          sortedReviews.map((review, idx) => {
            const rating = review.rating ?? 5;
            return (
              <div key={idx} className="card-base p-4">
                <div className="flex items-start gap-3">
                  <img
                    src={review.avatar}
                    alt={review.user}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span
                        className="text-foreground"
                        style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-semibold)' }}
                      >
                        {review.user}
                      </span>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Icon
                            key={i}
                            name="star"
                            size={11}
                            filled
                            style={{ color: i < Math.round(rating) ? '#F2B90C' : '#E5E7EB' }}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-muted-foreground mb-1.5" style={{ fontSize: '11px' }}>
                      sobre <span className="text-foreground font-medium">{review.itineraryTitle}</span>
                    </p>
                    <p className="text-foreground" style={{ fontSize: 'var(--text-sm)', lineHeight: '1.45' }}>
                      "{review.text}"
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
