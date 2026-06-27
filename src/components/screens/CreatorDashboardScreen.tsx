import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PassportStamps } from '@/components/travel/PassportStamps';
import { CountryDetailSheet } from '@/components/travel/CountryDetailSheet';
import { TravelRetrospective } from '@/components/travel/TravelRetrospective';
import { visitedCountries, getUniqueCountinents, CountryVisit } from '@/data/visitedCountries';
import { BackButton } from '@/components/ui/BackButton';

interface CreatorDashboardScreenProps {
  onBack: () => void;
  onEditProfile: () => void;
  onViewSales: () => void;
}

const mockCreator = {
  name: 'Alessandra Rabelo',
  username: '@alessandrarabelo',
  location: 'Uberlândia, Brazil',
  avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300',
  following: 348,
  followers: '1.2K',
};

interface PublishedItinerary {
  id: number;
  title: string;
  destination: string;
  image: string;
  rating: number;
  reviewCount: number;
  salesCount: number;
  price: number;
  status: 'active' | 'paused';
}

const publishedItineraries: PublishedItinerary[] = [
  {
    id: 100,
    title: '7 Dias em Roma',
    destination: 'Roma, Itália',
    image: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=400',
    rating: 4.8,
    reviewCount: 42,
    salesCount: 87,
    price: 49.90,
    status: 'active',
  },
  {
    id: 101,
    title: 'Paris Essencial',
    destination: 'Paris, França',
    image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400',
    rating: 4.6,
    reviewCount: 28,
    salesCount: 53,
    price: 39.90,
    status: 'active',
  },
  {
    id: 102,
    title: 'Barcelona Cultural',
    destination: 'Barcelona, Espanha',
    image: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=400',
    rating: 4.9,
    reviewCount: 15,
    salesCount: 21,
    price: 44.90,
    status: 'paused',
  },
];

const settingsItems = [
  { icon: 'person', label: 'Informações pessoais' },
  { icon: 'lock', label: 'Login e Segurança' },
  { icon: 'credit_card', label: 'Pagamentos' },
  { icon: 'notifications', label: 'Notificações' },
  { icon: 'language', label: 'Idioma' },
  { icon: 'location_on', label: 'Cidade' },
];

const supportItems = [
  { icon: 'info', label: 'Central de ajuda' },
  { icon: 'chat_bubble_outline', label: 'Fale conosco' },
];

export function CreatorDashboardScreen({ onBack, onEditProfile, onViewSales }: CreatorDashboardScreenProps) {
  const [countries, setCountries] = useState<CountryVisit[]>(visitedCountries);
  const [selectedCountry, setSelectedCountry] = useState<CountryVisit | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [retroOpen, setRetroOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('passport');

  const handleUpdatePhotos = (countryCode: string, photos: string[]) => {
    setCountries(prev => prev.map(c => c.code === countryCode ? { ...c, photos } : c));
    if (selectedCountry?.code === countryCode) {
      setSelectedCountry(prev => prev ? { ...prev, photos } : null);
    }
  };

  const handleDeleteCountry = (countryCode: string) => {
    setCountries(prev => prev.filter(c => c.code !== countryCode));
    setSelectedCountry(null);
  };

  const continents = getUniqueCountinents(countries);

  const renderStars = (rating: number) => {
    const full = Math.floor(rating);
    const hasHalf = rating - full >= 0.5;
    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Icon
            key={i}
            name={i < full ? 'star' : (i === full && hasHalf ? 'star_half' : 'star_border')}
            size={14}
            style={{ color: 'hsl(var(--sun-normal))' }}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-3">
          <BackButton onClick={onBack} />
          <h1 className="text-foreground" style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-weight-bold)' }}>
            Perfil do Criador
          </h1>
        </div>
        <button className="btn-icon">
          <Icon name="settings" size={20} />
        </button>
      </div>

      {/* Profile Card */}
      <div className="px-5 mt-3 mb-4">
        <div className="card-base p-5">
          <div className="flex items-center gap-4 mb-3">
            <img src={mockCreator.avatar} alt={mockCreator.name} className="w-16 h-16 rounded-full object-cover flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h2 className="text-foreground" style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-weight-bold)' }}>
                {mockCreator.name}
              </h2>
              <div className="flex items-center gap-1 mt-0.5">
                <Icon name="location_on" size={12} className="text-muted-foreground text-xs" />
                <span className="text-muted-foreground text-xs" style={{ fontSize: 'var(--text-xs)' }}>{mockCreator.location}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-foreground" style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-semibold)' }}>{mockCreator.following}</span>
                <span className="text-muted-foreground text-xs" style={{ fontSize: 'var(--text-sm)' }}>seguindo</span>
                <span className="text-muted-foreground text-xs" style={{ fontSize: 'var(--text-sm)' }}>·</span>
                <span className="text-foreground" style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-semibold)' }}>{mockCreator.followers}</span>
                <span className="text-muted-foreground text-xs" style={{ fontSize: 'var(--text-sm)' }}>seguidores</span>
              </div>
            </div>
          </div>
          <button onClick={onEditProfile} className="btn-outline w-full" style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-semibold)', padding: '8px 14px' }}>
            Editar perfil
          </button>
        </div>
      </div>

      {/* Sales Summary Card — só aparece se houver pelo menos um roteiro à venda */}
      {publishedItineraries.length > 0 && (
        <div className="px-5 mb-4">
          <button onClick={onViewSales} className="card-base p-4 w-full flex items-center gap-3 text-left">
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'hsl(var(--primary-light))' }}>
              <Icon name="trending_up" size={20} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-foreground block" style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)' }}>
                Resumo de vendas
              </span>
              <span className="text-muted-foreground block" style={{ fontSize: 'var(--text-xs)' }}>
                {publishedItineraries.reduce((sum, it) => sum + it.salesCount, 0)} vendas nos últimos 30 dias
              </span>
            </div>
            <Icon name="chevron_right" size={20} className="text-muted-foreground flex-shrink-0" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="px-5">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full bg-transparent p-0 h-auto border-b border-border/50 rounded-none gap-0">
            {[
              { value: 'passport', label: 'Seu passaporte' },
              { value: 'itineraries', label: 'Roteiros à venda' },
            ].map(tab => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="flex-1 rounded-none border-b-2 border-transparent pb-3 pt-2 text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:bg-transparent"
                style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-semibold)' }}
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Passaporte Tab */}
          <TabsContent value="passport" className="mt-4">
            <div className="card-base p-4 overflow-hidden mb-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-foreground" style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-bold)' }}>
                    Países visitados
                  </h2>
                  <span className="text-muted-foreground text-xs" style={{ fontSize: 'var(--text-xs)' }}>
                    {countries.length} países · {continents.length} continentes
                  </span>
                </div>
              </div>
              <PassportStamps countries={countries} onCountryClick={(c) => { setSelectedCountry(c); setSheetOpen(true); }} />
            </div>
            <button
              onClick={() => setRetroOpen(true)}
              className="card-base p-4 w-full flex items-center gap-3 text-left overflow-hidden relative"
            >
              <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(135deg, hsl(var(--primary) / 0.08) 0%, hsl(var(--violet-normal) / 0.06) 100%)' }} />
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 relative" style={{ background: 'linear-gradient(135deg, hsl(74 66% 51%), hsl(204 95% 54%))' }}>
                <Icon name="flight" size={16} style={{ color: 'white', position: 'absolute', top: '6px', right: '8px' }} />
                <Icon name="public" size={18} style={{ color: 'white', opacity: 0.9 }} />
              </div>
              <div className="flex-1 min-w-0 relative">
                <span className="text-foreground block" style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)' }}>Minha Retrospectiva 2024</span>
                <span className="text-muted-foreground block" style={{ fontSize: 'var(--text-xs)' }}>Reviva seus melhores momentos de viagem</span>
              </div>
              <Icon name="chevron_right" size={20} className="text-muted-foreground flex-shrink-0 relative" />
            </button>
          </TabsContent>

          {/* Roteiros Tab - Published list */}
          <TabsContent value="itineraries" className="mt-4 space-y-3">
            {publishedItineraries.map(it => (
              <div key={it.id} className="card-base p-3 flex gap-3">
                <img src={it.image} alt={it.title} className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-foreground truncate" style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-semibold)' }}>
                      {it.title}
                    </h3>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full flex-shrink-0 ml-2"
                      style={{
                        background: it.status === 'active' ? 'hsl(var(--primary-light))' : 'hsl(var(--muted))',
                        color: it.status === 'active' ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                        fontWeight: 'var(--font-weight-medium)',
                      }}
                    >
                      {it.status === 'active' ? 'Ativo' : 'Pausado'}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-xs" style={{ fontSize: 'var(--text-xs)' }}>{it.destination}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {renderStars(it.rating)}
                    <span className="text-muted-foreground ml-1" style={{ fontSize: 'var(--text-xs)' }}>
                      {it.rating} ({it.reviewCount})
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-muted-foreground text-xs" style={{ fontSize: 'var(--text-xs)' }}>
                      <strong className="text-foreground">{it.salesCount}</strong> vendas
                    </span>
                    <span className="text-foreground" style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-semibold)' }}>
                      R$ {it.price.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </div>

      {/* Settings */}
      <div className="mt-6">
        <div className="h-2" style={{ background: 'hsl(var(--divider))' }} />
        {[
          { title: 'Conta', items: settingsItems },
          { title: 'Suporte', items: supportItems },
        ].map((section) => (
          <div key={section.title} className="px-5 mt-5">
            <h2 className="text-foreground mb-2" style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-bold)' }}>
              {section.title}
            </h2>
            {section.items.map((item, idx) => (
              <button
                key={item.label}
                className="w-full flex items-center justify-between py-3 text-left"
                style={{ borderBottom: idx < section.items.length - 1 ? '1px solid hsl(var(--divider))' : 'none' }}
              >
                <div className="flex items-center gap-3">
                  <Icon name={item.icon} size={20} className="text-muted-foreground text-xs" />
                  <span className="text-foreground" style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-medium)' }}>
                    {item.label}
                  </span>
                </div>
                <Icon name="chevron_right" size={18} className="text-muted-foreground text-xs" />
              </button>
            ))}
          </div>
        ))}
      </div>

      <CountryDetailSheet country={selectedCountry} open={sheetOpen} onOpenChange={setSheetOpen} onUpdatePhotos={handleUpdatePhotos} onDeleteCountry={handleDeleteCountry} />
      <TravelRetrospective countries={countries} open={retroOpen} onClose={() => setRetroOpen(false)} />
    </div>
  );
}
