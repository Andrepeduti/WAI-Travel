import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/skeleton';
import { TravelRetrospective } from '@/components/travel/TravelRetrospective';
import { PassportStamps } from '@/components/travel/PassportStamps';
import { CountryDetailSheet } from '@/components/travel/CountryDetailSheet';
import { visitedCountries, getUniqueCountinents, CountryVisit } from '@/data/visitedCountries';
import { ContactUsSheet } from '@/components/travel/ContactUsSheet';
import { BackButton } from '@/components/ui/BackButton';

interface ProfileScreenProps {
  onBack?: () => void;
  onEditProfile: () => void;
  onViewAchievements: () => void;
  onViewSales: () => void;
  onNavigateToSetting?: (setting: string) => void;
}

const mockUser = {
  name: 'Alessandra Rabelo',
  username: '@alessandrarabelo',
  location: 'Uberlândia, Brazil',
  avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300',
  following: 348,
  followers: '1.2K',
};

const settingsItems = [
  { icon: 'person', label: 'Informações pessoais', key: 'personal-info' },
  { icon: 'flag', label: 'Objetivos no WAI', key: 'goals' },
  { icon: 'lock', label: 'Login e Segurança', key: 'login-security' },
  { icon: 'credit_card', label: 'Pagamentos', key: 'payment-settings' },
  { icon: 'notifications', label: 'Notificações', key: 'notification-settings' },
  { icon: 'language', label: 'Idioma', key: 'language' },
];

const supportItems = [
  { icon: 'info', label: 'Central de ajuda', key: 'help-center' },
  { icon: 'chat_bubble_outline', label: 'Fale conosco', key: 'contact-us' },
];



export function ProfileScreen({
  onBack,
  onEditProfile,
  onViewAchievements,
  onViewSales,
  onNavigateToSetting,
}: ProfileScreenProps) {
  const [countries, setCountries] = useState<CountryVisit[]>(visitedCountries);
  const [selectedCountry, setSelectedCountry] = useState<CountryVisit | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [retroOpen, setRetroOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 700);
    return () => clearTimeout(t);
  }, []);

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

  const handleCountryClick = (country: CountryVisit) => {
    setSelectedCountry(country);
    setSheetOpen(true);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Top Navigation */}
      <div className="flex items-center gap-3 px-4 pb-2" style={{ paddingTop: 'max(16px, env(safe-area-inset-top))' }}>
        <BackButton onClick={onBack} />
        <h1
          className="text-foreground"
          style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-weight-bold)' }}
        >
          Perfil
        </h1>
      </div>

      {/* Main Profile Card */}
      <div className="px-5 mt-3 mb-4">
        <div className="card-base p-5">
          {loading ? (
            <>
              <div className="flex items-center gap-4 mb-3">
                <Skeleton className="w-16 h-16 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
              <Skeleton className="h-9 w-full rounded-xl" />
            </>
          ) : (
            <>
              <div className="flex items-center gap-4 mb-3">
                <img
                  src={mockUser.avatar}
                  alt={mockUser.name}
                  className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h2
                      className="text-foreground"
                      style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-weight-bold)' }}
                    >
                      {mockUser.name}
                    </h2>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="flex-shrink-0" style={{ marginTop: '1px' }}>
                      <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="12" cy="12" r="10" fill="#1D9BF0"/>
                      <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Icon name="location_on" size={12} className="text-muted-foreground" />
                    <span className="text-muted-foreground" style={{ fontSize: 'var(--text-xs)' }}>
                      {mockUser.location}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-foreground" style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-semibold)' }}>{mockUser.following}</span>
                    <span className="text-muted-foreground" style={{ fontSize: 'var(--text-sm)' }}>seguindo</span>
                    <span className="text-muted-foreground" style={{ fontSize: 'var(--text-sm)' }}>·</span>
                    <span className="text-foreground" style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-semibold)' }}>{mockUser.followers}</span>
                    <span className="text-muted-foreground" style={{ fontSize: 'var(--text-sm)' }}>seguidores</span>
                  </div>
                </div>
              </div>
              <button
                onClick={onEditProfile}
                className="btn-outline w-full"
                style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-semibold)', padding: '8px 14px' }}
              >
                Editar perfil
              </button>
            </>
          )}
        </div>
      </div>

      {/* Torne-se um criador */}
      <div className="px-5 mb-4">
        {loading ? (
          <div className="card-base p-4 flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-44" />
            </div>
          </div>
        ) : (
          <button
            onClick={onViewSales}
            className="card-base p-4 w-full flex items-center gap-3 text-left"
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'hsl(var(--primary-light))' }}
            >
              <Icon name="map" size={20} className="text-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <span
                className="text-foreground block"
                style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)' }}
              >
                Torne-se um criador
              </span>
              <span className="text-muted-foreground block" style={{ fontSize: 'var(--text-xs)' }}>
                Crie roteiros e ganhe renda extra.
              </span>
            </div>
            <Icon name="chevron_right" size={20} className="text-muted-foreground flex-shrink-0" />
          </button>
        )}
      </div>

      {/* Países Visitados — Interactive Section */}
      <div className="px-5 mb-4">
        <div className="card-base p-4 overflow-hidden">
          {loading ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-44" />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-xl" />
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2
                    className="text-foreground"
                    style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-bold)' }}
                  >
                    Países visitados
                  </h2>
                  <span className="text-muted-foreground" style={{ fontSize: 'var(--text-xs)' }}>
                    {countries.length} países · {continents.length} continentes
                  </span>
                </div>
              </div>
              <PassportStamps countries={countries} onCountryClick={handleCountryClick} />
            </>
          )}
        </div>
      </div>

      {/* Retrospectiva de Viagem */}
      <div className="px-5 mb-5">
        {loading ? (
          <div className="card-base p-4 flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
          </div>
        ) : (
          <button
            onClick={() => setRetroOpen(true)}
            className="card-base p-4 w-full flex items-center gap-3 text-left overflow-hidden relative"
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: 'linear-gradient(135deg, hsl(var(--primary) / 0.08) 0%, hsl(var(--violet-normal) / 0.06) 100%)' }}
            />
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 relative"
              style={{ background: 'linear-gradient(135deg, hsl(74 66% 51%), hsl(204 95% 54%))' }}
            >
              <Icon name="flight" size={16} style={{ color: 'white', position: 'absolute', top: '6px', right: '8px' }} />
              <Icon name="public" size={18} style={{ color: 'white', opacity: 0.9 }} />
            </div>
            <div className="flex-1 min-w-0 relative">
              <span
                className="text-foreground block"
                style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)' }}
              >
                Minha Retrospectiva 2024
              </span>
              <span className="text-muted-foreground block" style={{ fontSize: 'var(--text-xs)' }}>
                Reviva seus melhores momentos de viagem
              </span>
            </div>
            <Icon name="chevron_right" size={20} className="text-muted-foreground flex-shrink-0 relative" />
          </button>
        )}
      </div>

      {/* Divider */}
      <div className="h-2" style={{ background: 'hsl(var(--divider))' }} />

      {/* Settings */}
      {[
        { title: 'Conta', items: settingsItems },
        { title: 'Suporte', items: supportItems },
      ].map((section) => (
        <div key={section.title} className="px-5 mt-5">
          <h2
            className="text-foreground mb-2"
            style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-bold)' }}
          >
            {section.title}
          </h2>
          {section.items.map((item: any, idx: number) => (
            <button
              key={item.label}
              onClick={() => {
                if (item.key === 'contact-us') {
                  setContactOpen(true);
                } else if (onNavigateToSetting) {
                  onNavigateToSetting(item.key);
                }
              }}
              className="w-full flex items-center justify-between py-3 text-left"
              style={{
                borderBottom:
                  idx < section.items.length - 1 ? '1px solid hsl(var(--divider))' : 'none',
              }}
            >
              <div className="flex items-center gap-3">
                <Icon name={item.icon} size={20} className="text-muted-foreground" />
                <span
                  className="text-foreground"
                  style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-medium)' }}
                >
                  {item.label}
                </span>
              </div>
              <Icon name="chevron_right" size={18} className="text-muted-foreground" />
            </button>
          ))}
        </div>
      ))}

      {/* Country Detail Sheet */}
      <CountryDetailSheet
        country={selectedCountry}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onUpdatePhotos={handleUpdatePhotos}
        onDeleteCountry={handleDeleteCountry}
      />

      <TravelRetrospective
        countries={countries}
        open={retroOpen}
        onClose={() => setRetroOpen(false)}
      />

      <ContactUsSheet isOpen={contactOpen} onClose={() => setContactOpen(false)} />
    </div>
  );
}
