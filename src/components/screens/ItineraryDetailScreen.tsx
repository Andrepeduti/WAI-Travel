import { Icon } from '@/components/ui/Icon';
import { useState, useCallback } from 'react';
import { useFavorites } from '@/contexts/FavoritesContext';
import { BackButton } from '@/components/ui/BackButton';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface DayItinerary {
  day: number;
  title: string;
  description: string;
  places: string[];
  estimatedTime: string;
}

interface Place {
  id: number;
  name: string;
  image: string;
  category: string;
  rating: number;
}

interface Review {
  id: number;
  userName: string;
  userImage: string;
  rating: number;
  date: string;
  comment: string;
}

// Mock data for the itinerary
const itineraryData = {
  id: 1,
  title: 'Leste Europeu no Natal',
  subtitle: '7 dias • 5 cidades',
  image: 'https://images.unsplash.com/photo-1519677100203-a0e668c92439?w=800',
  rating: 4.6,
  reviewCount: 234,
  price: 50,
  author: 'Laura Fernandes',
  authorImage: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
  duration: '7 dias',
  cities: 5,
  places: 45,
};

const mockDays: DayItinerary[] = [
  {
    day: 1,
    title: 'Chegada em Praga',
    description: 'Chegue pela manhã e explore o centro histórico. Visite a Praça da Cidade Velha e o famoso Relógio Astronômico.',
    places: ['Aeroporto de Praga', 'Praça da Cidade Velha', 'Relógio Astronômico', 'Ponte Carlos'],
    estimatedTime: '6 horas',
  },
  {
    day: 2,
    title: 'Castelo de Praga',
    description: 'Dia dedicado ao maior castelo antigo do mundo. Inclui a Catedral de São Vito e o Beco Dourado.',
    places: ['Castelo de Praga', 'Catedral de São Vito', 'Beco Dourado', 'Jardins Reais'],
    estimatedTime: '8 horas',
  },
  {
    day: 3,
    title: 'Viagem para Viena',
    description: 'Partida de trem para Viena. Tarde livre para explorar o centro da cidade.',
    places: ['Estação de Trem', 'Centro de Viena', 'Stephansplatz', 'Graben'],
    estimatedTime: '7 horas',
  },
];

const mockPlaces: Place[] = [
  { id: 1, name: 'Castelo de Praga', image: 'https://images.unsplash.com/photo-1541849546-216549ae216d?w=800', category: 'História', rating: 4.8 },
  { id: 2, name: 'Ponte Carlos', image: 'https://images.unsplash.com/photo-1574322092489-e5cb9e92aae0?w=800', category: 'Passeio', rating: 4.9 },
  { id: 3, name: 'Relógio Astronômico', image: 'https://images.unsplash.com/photo-1458150945447-7fb764c11a92?w=800', category: 'Monumento', rating: 4.7 },
  { id: 4, name: 'Praça da Cidade Velha', image: 'https://images.unsplash.com/photo-1592906209472-a36b1f3782ef?w=800', category: 'Praça', rating: 4.8 },
];

const mockReviews: Review[] = [
  {
    id: 1,
    userName: 'Carolina Silva',
    userImage: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    rating: 5,
    date: '15 Jan 2026',
    comment: 'Roteiro perfeito! Seguimos exatamente como indicado e foi incrível.',
  },
  {
    id: 2,
    userName: 'Pedro Oliveira',
    userImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    rating: 5,
    date: '10 Jan 2026',
    comment: 'Excelente custo-benefício! Economizamos muito tempo de pesquisa.',
  },
  {
    id: 3,
    userName: 'Marina Costa',
    userImage: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
    rating: 4,
    date: '5 Jan 2026',
    comment: 'Muito bom! Só achei o dia 3 um pouco corrido.',
  },
];

interface ItineraryDetailScreenProps {
  itineraryId: number;
  onBack: () => void;
  /** Abre o chat com o autor do roteiro (deep-link para a tela de Mensagens). */
  onOpenChat?: (author: string, authorImage: string) => void;
}

export function ItineraryDetailScreen({ itineraryId, onBack, onOpenChat }: ItineraryDetailScreenProps) {
  const { toggleFavorite, isFavorite } = useFavorites();
  const isFavorited = isFavorite(itineraryData.id);
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set([1]));
  const [savedPlaces, setSavedPlaces] = useState<Set<number>>(new Set());
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);

  const handleToggleFollow = useCallback(() => {
    setIsFollowing(prev => {
      const next = !prev;
      toast.success(next ? `Seguindo ${itineraryData.author}` : `Você deixou de seguir ${itineraryData.author}`);
      return next;
    });
  }, []);

  const handleOpenChat = useCallback(() => {
    if (onOpenChat) {
      onOpenChat(itineraryData.author, itineraryData.authorImage);
    } else {
      toast(`Abrindo conversa com ${itineraryData.author}…`);
    }
  }, [onOpenChat]);

  const toggleDay = (day: number) => {
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(day)) {
      newExpanded.delete(day);
    } else {
      newExpanded.add(day);
    }
    setExpandedDays(newExpanded);
  };

  const toggleSavePlace = (placeId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSaved = new Set(savedPlaces);
    if (newSaved.has(placeId)) {
      newSaved.delete(placeId);
    } else {
      newSaved.add(placeId);
    }
    setSavedPlaces(newSaved);
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Hero image */}
      <div className="relative h-[280px]">
        <img 
          src={itineraryData.image} 
          alt={itineraryData.title}
          className="w-full h-full object-cover"
        />
        
        {/* Navigation buttons */}
        <div className="absolute top-0 left-0 right-0 px-4 flex items-center justify-between z-10" style={{ paddingTop: 'calc(max(16px, env(safe-area-inset-top)) + 12px)' }}>
          <BackButton onClick={onBack} />
          <div className="flex gap-2">
            <button className="btn-icon bg-white shadow-md">
              <Icon name="share" size={20} />
            </button>
            <button 
              onClick={() => toggleFavorite({
                id: itineraryData.id,
                title: itineraryData.title,
                image: itineraryData.image,
                creator: itineraryData.author,
                creatorImage: itineraryData.authorImage,
                days: mockDays.length,
                places: itineraryData.places,
                price: itineraryData.price,
                rating: itineraryData.rating,
                reviews: itineraryData.reviewCount,
              })}
              className="btn-icon bg-white shadow-md"
            >
              <Icon 
                name="favorite" 
                size={20} 
                filled={isFavorited}
                className={isFavorited ? 'text-florida-normal' : ''}
              />
            </button>
          </div>
        </div>

        {/* Image counter */}
        <div className="absolute bottom-4 right-4 bg-white rounded-full px-3 py-1.5 shadow-md">
          <span className="text-[13px] font-semibold">1/{mockDays.length}</span>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 pt-6">
        {/* Title */}
        <h1 className="text-[24px] font-bold leading-tight mb-2">{itineraryData.title}</h1>

        {/* Metadata */}
        <div className="flex items-center flex-wrap gap-1.5 text-sm text-muted-foreground mb-4">
          <span>{itineraryData.places} locais</span>
          <span>•</span>
          <span>{mockDays.length} dias</span>
          <span>•</span>
          <span>{itineraryData.cities} cidades</span>
        </div>

        {/* Rating, reviews */}
        <div className="flex items-center gap-4 mb-5 flex-wrap">
          <div className="flex items-center gap-1">
            <Icon name="star" size={16} filled className="text-[#F2B90C]" />
            <span className="text-[15px] font-semibold">{itineraryData.rating}</span>
          </div>

          <div className="w-px h-4 bg-border" />

          <div className="flex items-center gap-1.5">
            <Icon name="chat_bubble" size={16} className="text-muted-foreground" />
            <span className="text-sm font-medium">{itineraryData.reviewCount} reviews</span>
          </div>

          <div className="w-px h-4 bg-border" />

          <div className="flex items-center gap-2">
            <div className="avatar-stack">
              {mockReviews.slice(0, 3).map((review) => (
                <img 
                  key={review.id}
                  src={review.userImage}
                  alt={review.userName}
                />
              ))}
            </div>
            <span className="text-sm text-muted-foreground">+ 1k salvaram</span>
          </div>
        </div>

        {/* Author section */}
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <img 
              src={itineraryData.authorImage}
              alt={itineraryData.author}
              className="w-11 h-11 rounded-full object-cover"
            />
            <div>
              <p className="text-[15px] font-semibold">{itineraryData.author}</p>
              <p className="text-xs text-muted-foreground">Criadora do roteiro</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleOpenChat}
              aria-label={`Conversar com ${itineraryData.author}`}
              className="btn-icon border border-border active:scale-95 transition-transform"
            >
              <Icon name="chat_bubble" size={20} />
            </button>
            <button
              onClick={handleToggleFollow}
              aria-pressed={isFollowing}
              className={cn(
                'px-5 py-2.5 rounded-full text-sm font-semibold active:scale-95 transition-all',
                isFollowing
                  ? 'bg-card text-foreground border border-border'
                  : 'text-white'
              )}
              style={isFollowing ? undefined : { background: '#1A1C40' }}
            >
              {isFollowing ? 'Seguindo' : 'Seguir'}
            </button>
          </div>
        </div>

        {/* Info badges */}
        <div className="flex gap-3 pb-6 mb-6 border-b border-border overflow-x-auto scrollbar-hide -mx-5 px-5">
          <div className="card-base p-3.5 flex items-center gap-3 flex-shrink-0 min-w-[240px]">
            <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
              <Icon name="language" size={16} className="text-accent" />
            </div>
            <p className="text-[13px] font-semibold">Experiente em roteiros europeus</p>
          </div>
          
          <div className="card-base p-3.5 flex items-center gap-3 flex-shrink-0 min-w-[240px]">
            <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
              <Icon name="group" size={16} className="text-accent" />
            </div>
            <p className="text-[13px] font-semibold">+500 viajantes usaram</p>
          </div>
        </div>

        {/* Description */}
        <section className="mb-10">
          <h2 className="section-title mb-3">Sobre este roteiro</h2>
          <p className="text-[14px] text-muted-foreground leading-relaxed mb-4">
            Explore o melhor do Leste Europeu durante a época natalina. Este roteiro inclui mercados de Natal, castelos medievais e experiências gastronômicas únicas.
          </p>
          
          <div className="flex flex-wrap gap-2">
            {['Cultura', 'Gastronomia', 'História', 'Inverno'].map((tag) => (
              <span key={tag} className="chip-outlined text-xs">{tag}</span>
            ))}
          </div>
        </section>

        {/* Day by day itinerary */}
        <section className="mb-10">
          <h2 className="section-title mb-4">Roteiro dia a dia</h2>
          <div className="space-y-3">
            {mockDays.map((day) => {
              const isLocked = day.day > 1;
              const isExpanded = expandedDays.has(day.day);
              
              return (
                <div key={day.day} className="card-base overflow-hidden">
                  <button
                    onClick={() => toggleDay(day.day)}
                    className="w-full p-4 flex items-center justify-between text-left"
                  >
                    <div className="flex-1">
                      <p className="text-[15px] font-bold">
                        Dia {day.day}: {day.title}
                      </p>
                      {!isExpanded && (
                        <p className="text-[12px] text-muted-foreground mt-1">
                          {day.places.length} locais • {day.estimatedTime}
                        </p>
                      )}
                    </div>
                    <Icon 
                      name={isExpanded ? 'chevron_up' : 'chevron_down'} 
                      size={20} 
                      className="text-muted-foreground flex-shrink-0 ml-2" 
                    />
                  </button>
                  
                  {isExpanded && (
                    <div className="relative px-4 pb-4 pt-2 border-t border-border">
                      {isLocked && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] flex items-center justify-center z-10">
                          <div className="flex items-center gap-2 bg-white rounded-full px-4 py-2.5 shadow-lg">
                            <p className="text-[13px] font-semibold">
                              {day.places.length} Locais - Compre para desbloquear
                            </p>
                            <Icon name="lock" size={16} className="text-muted-foreground flex-shrink-0" />
                          </div>
                        </div>
                      )}
                      <div className={isLocked ? 'blur-[2px]' : ''}>
                        <p className="text-[13px] text-muted-foreground mb-3 leading-relaxed">
                          {day.description}
                        </p>
                        <div className="space-y-2">
                          {day.places.map((place, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                              <span className="text-[13px]">{place}</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                          <Icon name="schedule" size={16} className="text-muted-foreground" />
                          <span className="text-[12px] text-muted-foreground">
                            Tempo estimado: {day.estimatedTime}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Places included */}
        <section className="mb-10">
          <h2 className="section-title mb-4">Locais incluídos</h2>
          <div className="grid grid-cols-2 gap-3">
            {mockPlaces.map((place) => (
              <div key={place.id} className="card-base overflow-hidden">
                <div className="relative h-28">
                  <img
                    src={place.image}
                    alt={place.name}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={(e) => toggleSavePlace(place.id, e)}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center"
                  >
                    <Icon
                      name="bookmark"
                      size={14}
                      filled={savedPlaces.has(place.id)}
                      className={savedPlaces.has(place.id) ? 'text-florida-normal' : ''}
                    />
                  </button>
                </div>
                <div className="p-3">
                  <h4 className="text-[13px] font-semibold mb-1">{place.name}</h4>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-accent font-medium">{place.category}</span>
                    <div className="flex items-center gap-1">
                      <Icon name="star" size={12} filled className="text-[#F2B90C]" />
                      <span className="text-[11px] font-semibold">{place.rating}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Reviews section */}
        <section className="mb-10">
          <h2 className="section-title mb-4">Avaliações</h2>
          
          {/* AI Summary */}
          <div className="card-base p-4 mb-4" style={{ background: 'linear-gradient(135deg, #f3e8ff 0%, #e0f2fe 100%)' }}>
            <div className="flex items-start gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs">✨</span>
              </div>
              <p className="text-[12px] font-bold text-purple-700">Resumo por IA</p>
            </div>
            <p className="text-[13px] text-gray-700 leading-relaxed mb-3">
              Este roteiro tem <strong>excelente avaliação</strong>. Destaques: 
              <strong> organização impecável</strong> e <strong>dicas práticas</strong>.
            </p>
            
            <div className="flex items-center gap-2 pt-3 border-t border-purple-200">
              <div className="avatar-stack">
                {mockReviews.slice(0, 4).map((review) => (
                  <img key={review.id} src={review.userImage} alt={review.userName} />
                ))}
              </div>
              <button
                onClick={() => setShowAllReviews(!showAllReviews)}
                className="text-[12px] font-semibold text-purple-700"
              >
                Ver todos os {mockReviews.length} reviews
              </button>
            </div>
          </div>
          
          {/* Individual reviews */}
          {showAllReviews && (
            <div className="space-y-3 animate-fade-in">
              {mockReviews.map((review) => (
                <div key={review.id} className="card-base p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <img 
                        src={review.userImage}
                        alt={review.userName}
                        className="w-9 h-9 rounded-full object-cover"
                      />
                      <div>
                        <p className="text-[14px] font-semibold">{review.userName}</p>
                        <p className="text-[11px] text-muted-foreground">{review.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Icon name="star" size={14} filled className="text-[#F2B90C]" />
                      <span className="text-[13px] font-semibold">{review.rating}</span>
                    </div>
                  </div>
                  <p className="text-[13px] text-muted-foreground leading-relaxed">{review.comment}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Fixed footer */}
      <div 
        className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-30"
        style={{ 
          boxShadow: 'var(--shadow-bottom-nav)',
          paddingBottom: 'max(12px, env(safe-area-inset-bottom))'
        }}
      >
        <div className="max-w-[430px] mx-auto px-5 pt-4 flex items-center justify-between gap-4">
          <div>
            <span className="text-xs text-muted-foreground">Preço total</span>
            <p className="text-[20px] font-bold text-primary">R$ {itineraryData.price.toFixed(2).replace('.', ',')}</p>
          </div>
          <button className="btn-primary px-8">
            Comprar roteiro
          </button>
        </div>
      </div>
    </div>
  );
}
