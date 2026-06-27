import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { PostcardStack } from '@/components/travel/PostcardStack';
import { BackButton } from '@/components/ui/BackButton';

interface Place {
  id: number;
  name: string;
  subtitle: string;
  image: string;
  rating: number;
  description?: string;
  reviewCount?: number;
  avgTime?: string;
  hours?: string;
}

interface ExperienceDetailScreenProps {
  experienceId: number;
  onBack: () => void;
}

const experiencesData: Record<number, {
  title: string;
  location: string;
  image: string;
  category: string;
  rating: number;
  reviewCount: number;
  savedCount: number;
  description: string;
  places: Place[];
}> = {
  1: {
    title: 'Parques secretos',
    location: 'Londres',
    image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800',
    category: 'Natureza',
    rating: 4.8,
    reviewCount: 143,
    savedCount: 128,
    description: 'Descubra jardins escondidos e parques secretos espalhados por Londres. Refúgios verdes longe das multidões, perfeitos para uma tarde tranquila.',
    places: [
      { id: 1, name: 'Kyoto Garden', subtitle: 'Jardim Japonês', image: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=400', rating: 4.9, description: 'Um refúgio sereno com carpas koi, cascatas e paisagismo japonês autêntico no coração de Holland Park.', reviewCount: 87, avgTime: '45 min', hours: '7h–20h' },
      { id: 2, name: 'St Dunstan in the East', subtitle: 'Ruínas / Jardim', image: 'https://images.unsplash.com/photo-1590069261209-f8e9b8642343?w=400', rating: 4.8, description: 'Ruínas de uma igreja medieval transformadas em jardim público. Atmosfera única com trepadeiras e arcos góticos.', reviewCount: 124, avgTime: '30 min', hours: '8h–19h' },
      { id: 3, name: 'Hampstead Hill Garden', subtitle: 'Jardim Histórico', image: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=400', rating: 4.9, description: 'Jardim elevado com pérgola histórica e vistas panorâmicas de Londres. Um dos segredos mais bem guardados.', reviewCount: 56, avgTime: '1h', hours: '9h–17h' },
      { id: 4, name: 'Phoenix Garden', subtitle: 'Jardim Comunitário', image: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=400&q=80', rating: 4.7, description: 'Oásis verde escondido perto de Covent Garden. Perfeito para uma pausa entre compras e passeios.', reviewCount: 42, avgTime: '20 min', hours: '8h30–18h' },
    ],
  },
  2: {
    title: 'Melhores clubs',
    location: 'Amsterdam',
    image: 'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=800',
    category: 'Vida noturna',
    rating: 4.6,
    reviewCount: 98,
    savedCount: 87,
    description: 'Os clubs mais icônicos de Amsterdam, desde techno underground até festas ao ar livre. Uma seleção curada para noites inesquecíveis.',
    places: [
      { id: 1, name: 'Paradiso', subtitle: 'Club / Venue', image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400', rating: 4.8, description: 'Igreja convertida em venue lendária. Shows ao vivo e noites de dança em um espaço histórico único.', reviewCount: 203, avgTime: '3h', hours: '22h–5h' },
      { id: 2, name: 'De School', subtitle: 'Club Subterrâneo', image: 'https://images.unsplash.com/photo-1571266028243-3716f02d2d2e?w=400', rating: 4.7, description: 'Antiga escola transformada em complexo cultural underground com pista de dança, restaurante e galeria.', reviewCount: 156, avgTime: '4h', hours: '23h–8h' },
      { id: 3, name: 'Shelter', subtitle: 'Club Techno', image: 'https://images.unsplash.com/photo-1574391884720-bbc3740c59d1?w=400', rating: 4.5, description: 'Bunker subterrâneo sob a estação central. Techno puro com som Funktion-One impecável.', reviewCount: 98, avgTime: '3h', hours: '23h–7h' },
    ],
  },
};

export function ExperienceDetailScreen({ experienceId, onBack }: ExperienceDetailScreenProps) {
  const [savedPlaces, setSavedPlaces] = useState<Set<number>>(new Set());
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());
  const [isFavorited, setIsFavorited] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);

  const experience = experiencesData[experienceId] || experiencesData[1];

  const toggleSavePlace = (id: number) => {
    const next = new Set(savedPlaces);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSavedPlaces(next);
  };

  const toggleFlip = (id: number) => {
    const next = new Set(flippedCards);
    if (next.has(id)) next.delete(id); else next.add(id);
    setFlippedCards(next);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Image */}
      <div className="relative w-full h-[320px]">
        <img
          src={experience.image}
          alt={experience.title}
          className="w-full h-full object-cover"
        />
        {/* Stronger gradient for readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/10 to-black/60" />

        {/* Top navigation */}
        <div className="absolute top-12 left-4 right-4 flex items-center justify-between">
          <BackButton onClick={onBack} />
          <div className="flex items-center gap-2.5">
            <button className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center shadow-sm">
              <Icon name="share" size={20} className="text-foreground" />
            </button>
            <button
              onClick={() => setIsFavorited(!isFavorited)}
              className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center shadow-sm"
            >
              <Icon
                name="favorite"
                size={20}
                filled={isFavorited}
                className={isFavorited ? 'text-florida' : 'text-foreground'}
              />
            </button>
          </div>
        </div>

        {/* Hero bottom overlay content */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-5">
          <span className="inline-flex items-center px-3 py-1 bg-white/70 backdrop-blur-sm rounded-full text-[12px] font-medium text-foreground mb-2">
            {experience.category}
          </span>
          <h1 className="text-[26px] font-bold text-white leading-tight tracking-tight">
            {experience.title}
          </h1>
          <div className="flex items-center gap-1.5 mt-1.5">
            <Icon name="location_on" size={15} className="text-white/80" />
            <span className="text-[14px] text-white/90 font-medium">{experience.location}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 space-y-6 pb-10">
        {/* Stats row */}
        <div className="flex items-center gap-4 pt-5">
          <div className="flex items-center gap-1.5">
            <Icon name="star" size={18} filled className="text-sun" />
            <span className="text-[15px] font-semibold text-foreground">{experience.rating}</span>
            <span className="text-[13px] text-muted-foreground">({experience.reviewCount})</span>
          </div>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-1.5">
            <Icon name="favorite" size={16} filled className="text-florida" />
            <span className="text-[13px] text-muted-foreground font-medium">{experience.savedCount} salvaram</span>
          </div>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-1.5">
            <Icon name="place" size={16} className="text-muted-foreground" />
            <span className="text-[13px] text-muted-foreground font-medium">{experience.places.length} locais</span>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-border" />

        {/* Description section */}
        <div>
          <h2 className="text-[16px] font-semibold text-foreground mb-2">Sobre</h2>
          <p className="text-[14px] text-muted-foreground leading-relaxed">
            {experience.description}
          </p>
        </div>




        {/* Places Section */}
        <div className="space-y-6">
          <div>
            <h2 className="text-[16px] font-semibold text-foreground">Locais neste guia</h2>
          </div>

          {/* Postcard Stack */}
          <div className="-mx-4">
            <div className="px-4">
              <PostcardStack
                places={experience.places}
                savedPlaces={savedPlaces}
                flippedCards={flippedCards}
                onToggleSave={toggleSavePlace}
                onToggleFlip={toggleFlip}
              />
            </div>
          </div>

          {/* List below */}
          <div className="space-y-3 mt-6">
            {experience.places.map((place, index) => (
              <div
                key={place.id}
                className="flex items-center gap-3.5 p-3 bg-card rounded-lg border border-border/60"
              >
                <img src={place.image} alt={place.name} className="w-[52px] h-[52px] rounded-lg object-cover flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-[14px] font-semibold text-foreground truncate">{place.name}</h3>
                  <div className="flex items-center gap-1 mt-1">
                    <Icon name="star" size={12} filled className="text-sun" />
                    <span className="text-[11px] font-semibold text-foreground">{place.rating}</span>
                    <span className="text-[11px] text-muted-foreground ml-1">{place.subtitle}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => toggleSavePlace(place.id)}
                    className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"
                  >
                    <Icon name="bookmark" size={16} filled={savedPlaces.has(place.id)} className={savedPlaces.has(place.id) ? 'text-primary' : 'text-muted-foreground'} />
                  </button>
                  <button className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Icon name="add" size={16} className="text-primary" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>




        {/* Avaliações Section */}
        <div className="space-y-4">
          <h2 className="text-[16px] font-semibold text-foreground">Avaliações</h2>

          {/* Resumo das avaliações */}
          <div className="p-4 bg-[#F8F8FA] rounded-xl border border-border/30">
            <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">Resumo das avaliações</p>
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                <div className="flex items-center gap-1">
                  <Icon name="star" size={18} filled className="text-[#F2B90C]" />
                  <span className="text-[22px] font-bold text-foreground leading-none">{experience.rating}</span>
                </div>
                <span className="text-[11px] text-muted-foreground">{experience.reviewCount} avaliações</span>
              </div>
              <div className="w-px h-10 bg-border/60 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-muted-foreground leading-relaxed italic line-clamp-2">
                  "Guia incrível! Cada lugar é uma surpresa. Visitei todos e superou minhas expectativas."
                </p>
              </div>
            </div>
          </div>

          {/* Ver todas button */}
          <button
            onClick={() => setShowAllReviews(!showAllReviews)}
            className="text-[13px] font-semibold text-[#0A0E59]"
          >
            {showAllReviews ? 'Ocultar avaliações' : 'Ver todas as avaliações'}
          </button>

          {/* All reviews */}
          {showAllReviews && (
            <div className="space-y-4 animate-fade-in">
              {[
                { id: 1, name: 'Marina Costa', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', rating: 5, title: 'Experiência inesquecível!', description: 'Visitei todos os parques e cada um tem sua própria magia. O Kyoto Garden é de tirar o fôlego. Recomendo demais!' },
                { id: 2, name: 'Rafael Duarte', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', rating: 4, title: 'Ótimo guia, bem curado', description: 'Lugares muito bem escolhidos. Apenas senti falta de dicas sobre transporte entre eles. No mais, excelente.' },
                { id: 3, name: 'Camila Ribeiro', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150', rating: 5, title: 'Perfeito para fugir do óbvio', description: 'Se você quer conhecer Londres de verdade, longe dos pontos turísticos lotados, esse guia é perfeito. Amei cada indicação.' },
                { id: 4, name: 'Lucas Mendonça', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', rating: 4, title: 'Muito bom!', description: 'Jardins lindos e bem preservados. O St Dunstan é surreal. Vale cada visita.' },
              ].map((review) => (
                <div key={review.id} className="p-4 bg-card rounded-xl border border-border/50">
                  <div className="flex items-center gap-3 mb-2.5">
                    <img src={review.avatar} alt={review.name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[13px] font-semibold text-foreground">{review.name}</h4>
                      <div className="flex items-center gap-0.5 mt-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Icon key={i} name="star" size={12} filled={i < review.rating} className={i < review.rating ? 'text-[#F2B90C]' : 'text-muted-foreground/30'} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <h5 className="text-[13px] font-semibold text-foreground mb-1">{review.title}</h5>
                  <p className="text-[12px] text-muted-foreground leading-relaxed">{review.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
