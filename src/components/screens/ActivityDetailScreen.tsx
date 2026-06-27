import { useState, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { BackButton } from '@/components/ui/BackButton';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchPlaceDetails, type PlaceDetails } from '@/lib/placeDetails';

interface ActivityData {
  id: number;
  name: string;
  image: string;
  category: string;
  rating: number;
  price: string;
  openHours: string;
  startTime: string;
  endTime: string;
  location?: string;
  lat?: number;
  lng?: number;
}

interface ActivityDetailScreenProps {
  activity: ActivityData;
  onBack: () => void;
}

// Mock detail data keyed by activity name (used as fallback when online lookup fails)
const detailData: Record<string, {
  description: string;
  tip: string;
  location: string;
  hours: string;
  price: string;
  tickets: { name: string; location: string; price: string; dates: string }[];
}> = {
  'Museu do Louvre': {
    description: 'Uma experiência imperdível em Paris. O maior museu de arte do mundo, com obras-primas como a Mona Lisa e a Vênus de Milo, perfeito para quem busca cultura e história.',
    tip: 'Chegue cedo para evitar filas. Recomendamos reservar com antecedência.',
    location: '1er Arrondissement, Paris',
    hours: '09am - 06pm',
    price: '€ 17',
    tickets: [
      { name: 'Museu do Louvre', location: 'Paris, France', price: '€ 17', dates: '14/06/25 - 28/06/25' },
      { name: 'Museu do Louvre', location: 'Paris, France', price: '€ 17', dates: '14/06/25 - 28/06/25' },
      { name: 'Museu do Louvre', location: 'Paris, France', price: '€ 17', dates: '14/06/25 - 28/06/25' },
    ],
  },
  'Café de Flore': {
    description: 'Café histórico no coração de Saint-Germain-des-Prés. Frequentado por artistas e escritores lendários, oferece uma atmosfera parisiense autêntica.',
    tip: 'Peça o chocolate quente, é famoso! Evite horários de pico ao meio-dia.',
    location: 'Saint-Germain-des-Prés, Paris',
    hours: '07am - 01am',
    price: '€€',
    tickets: [],
  },
  'Torre Eiffel': {
    description: 'O monumento mais icônico de Paris e do mundo. Suba ao topo para vistas panorâmicas deslumbrantes da Cidade Luz.',
    tip: 'Compre ingressos online para evitar filas de até 2 horas. O pôr do sol é mágico.',
    location: 'Champ de Mars, Paris',
    hours: '09am - 12:45am',
    price: '€ 26',
    tickets: [
      { name: 'Torre Eiffel - Topo', location: 'Paris, France', price: '€ 26', dates: '14/06/25 - 28/06/25' },
      { name: 'Torre Eiffel - 2º andar', location: 'Paris, France', price: '€ 17', dates: '14/06/25 - 28/06/25' },
    ],
  },
};

const defaultDetail = {
  description: '',
  tip: 'Chegue cedo para evitar filas. Recomendamos reservar com antecedência.',
  location: '',
  hours: '08am - 09pm',
  price: '€ 10',
  tickets: [] as { name: string; location: string; price: string; dates: string }[],
};

export function ActivityDetailScreen({ activity, onBack }: ActivityDetailScreenProps) {
  const [isFavorited, setIsFavorited] = useState(false);
  const [remoteDetails, setRemoteDetails] = useState<PlaceDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setRemoteDetails(null);
    fetchPlaceDetails(activity.name, {
      location: activity.location,
      lat: activity.lat,
      lng: activity.lng,
    })
      .then((data) => {
        if (!cancelled) setRemoteDetails(data);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activity.name, activity.location, activity.lat, activity.lng]);

  const fallback = detailData[activity.name] || defaultDetail;
  const detail = {
    description: remoteDetails?.description || fallback.description,
    tip: fallback.tip,
    location: remoteDetails?.location || fallback.location || activity.location || '',
    hours: fallback.hours,
    price: fallback.price,
    tickets: fallback.tickets,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Image */}
      <div className="relative w-full h-[300px]">
        <img
          src={activity.image}
          alt={activity.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />

        {/* Back button */}
        <div className="absolute top-12 left-4">
          <BackButton onClick={onBack} />
        </div>

        {/* Hero bottom content */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-5">
          <span className="inline-flex items-center px-3 py-1 bg-white/70 backdrop-blur-sm rounded-full text-[12px] font-medium text-foreground mb-2">
            {activity.category}
          </span>
          <div className="flex items-center gap-2">
            <h1 className="text-[24px] font-bold text-white leading-tight tracking-tight">
              {activity.name}
            </h1>
            <div className="flex items-center gap-1 ml-1">
              <Icon name="star" size={16} filled className="text-white" />
              <span className="text-[14px] font-semibold text-white">{activity.rating}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-10">
        {/* Sobre */}
        <div className="pt-5 pb-4">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-[16px] font-semibold text-foreground">Sobre</h2>
            {remoteDetails?.source === 'wikipedia' && (
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">· Wikipedia</span>
            )}
          </div>
          {isLoading && !detail.description ? (
            <div className="space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-11/12" />
              <Skeleton className="h-3 w-9/12" />
            </div>
          ) : (
            <p className="text-[14px] text-muted-foreground leading-relaxed">
              {detail.description || 'Descrição indisponível para este local.'}
            </p>
          )}
        </div>

        {/* Tip card */}
        <div className="flex items-start gap-3 p-4 rounded-2xl mb-6" style={{ backgroundColor: '#F5F5F7' }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#E8E8EC' }}>
            <Icon name="lightbulb" size={18} className="text-foreground" />
          </div>
          <p className="text-[13px] text-foreground leading-relaxed font-medium">
            {detail.tip}
          </p>
        </div>

        {/* Info rows */}
        <div className="space-y-0">
          {/* Location */}
          <div className="flex items-center justify-between py-4 border-b border-border/50 gap-3">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <Icon name="location_on" size={20} className="text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="text-[12px] text-muted-foreground block">Localização</span>
                {isLoading && !detail.location ? (
                  <Skeleton className="h-4 w-40 mt-1" />
                ) : (
                  <span className="text-[14px] font-medium text-foreground line-clamp-2">{detail.location || '—'}</span>
                )}
              </div>
            </div>
            <button className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#F5F5F7' }}>
              <Icon name="map" size={18} className="text-foreground" />
            </button>
          </div>

          {/* Hours */}
          <div className="flex items-center justify-between py-4 border-b border-border/50">
            <div className="flex items-start gap-3">
              <Icon name="schedule" size={20} className="text-muted-foreground mt-0.5" />
              <div>
                <span className="text-[12px] text-muted-foreground block">Horário</span>
                <span className="text-[14px] font-medium text-foreground">{detail.hours}</span>
              </div>
            </div>
          </div>

          {/* Price */}
          <div className="flex items-center justify-between py-4">
            <div className="flex items-start gap-3">
              <Icon name="attach_money" size={20} className="text-muted-foreground mt-0.5" />
              <div>
                <span className="text-[12px] text-muted-foreground block">Preço</span>
                <span className="text-[14px] font-medium text-foreground">{detail.price}</span>
              </div>
            </div>
            <button className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#F5F5F7' }}>
              <Icon name="edit" size={18} className="text-foreground" />
            </button>
          </div>
        </div>

        {/* Tickets section */}
        {detail.tickets.length > 0 && (
          <div className="mt-8">
            <h2 className="text-[16px] font-semibold text-foreground mb-4">Compre ingresso</h2>
            <div className="space-y-3">
              {detail.tickets.map((ticket, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3.5 bg-card rounded-xl border border-border/50"
                  style={{ boxShadow: '0 2px 16px rgba(0, 0, 0, 0.07)' }}
                >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#F0F0F4' }}>
                    <Icon name="perm_media" size={20} className="text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[14px] font-semibold text-foreground">{ticket.name}</h4>
                    <p className="text-[12px] text-muted-foreground">{ticket.location}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Icon name="attach_money" size={13} className="text-[#3587F2]" />
                      <span className="text-[12px] font-semibold" style={{ color: '#1A1C40' }}>{ticket.price}</span>
                      <span className="text-[12px] text-muted-foreground">·</span>
                      <span className="text-[12px] text-muted-foreground">{ticket.dates}</span>
                    </div>
                  </div>
                  <button className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#F0F0F4' }}>
                    <Icon name="open_in_new" size={16} className="text-foreground" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
