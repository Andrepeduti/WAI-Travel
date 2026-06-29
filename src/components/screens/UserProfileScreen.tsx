import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PassportStamps } from '@/components/travel/PassportStamps';
import { CountryDetailSheet } from '@/components/travel/CountryDetailSheet';
import { TravelRetrospective } from '@/components/travel/TravelRetrospective';
import { CountryVisit, getUniqueCountinents } from '@/data/visitedCountries';
import { ContactUsSheet } from '@/components/travel/ContactUsSheet';
import { BackButton } from '@/components/ui/BackButton';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useMyItineraries } from '@/hooks/use-my-itineraries';
import { resolveTripThumbnailImages, GENERIC_TRAVEL_PLACEHOLDER } from '@/lib/coverImageResolver';
import type { UserItinerary } from '@/lib/itinerariesApi';

interface UserProfileScreenProps {
  onBack: () => void;
  onEditProfile: () => void;
  onViewCreatorProgram: () => void;
  onSettings?: () => void;
  onFindPeople?: () => void;
  onNavigateToSetting?: (setting: string) => void;
  onChatClick: () => void;
  onPublicItineraryClick?: (itinerary: UserItinerary) => void;
}

const walletItems = [
  { icon: 'workspace_premium', label: 'Assinatura', key: 'subscription' },
  { icon: 'shopping_bag', label: 'Compras', key: 'purchases' },
  { icon: 'credit_card', label: 'Forma de recebimento', key: 'payment-settings' },
];

const accountItems = [
  { icon: 'lock', label: 'Login e segurança', key: 'login-security' },
  { icon: 'notifications', label: 'Notificações', key: 'notification-settings' },
  { icon: 'dark_mode', label: 'Tema', key: 'theme', isToggle: true },
];

const supportItems = [
  { icon: 'info', label: 'Central de ajuda (FAQ)', key: 'help-center' },
  { icon: 'chat_bubble_outline', label: 'Fale conosco', key: 'contact-us' },
];

export function UserProfileScreen({
  onBack,
  onEditProfile,
  onViewCreatorProgram,
  onFindPeople,
  onNavigateToSetting,
  onChatClick,
  onPublicItineraryClick,
}: UserProfileScreenProps) {
  const { user, refresh, loading } = useCurrentUser();
  // Garante que o card sempre exibe os dados mais recentes ao voltar de outra tela
  useEffect(() => { refresh(); }, [refresh]);
  const { itineraries } = useMyItineraries();
  const publicItineraries = itineraries.filter((it) => it.isPublic);
  const [countries, setCountries] = useState<CountryVisit[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<CountryVisit | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [retroOpen, setRetroOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState('itineraries');

  const displayName = user.name || 'Seu nome';
  const displayUsername = user.username ? `@${user.username}` : '';
  const displayLocation = user.location || 'Adicione sua cidade';

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

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-safe-top pb-2">
        <div className="flex items-center gap-3">
          <BackButton onClick={onBack} />
          <h1 className="text-foreground" style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-weight-bold)' }}>
            Perfil
          </h1>
        </div>
        <button onClick={onChatClick} className="btn-icon relative">
          <Icon name="chat_bubble_left" size={20} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full border-[1.5px] border-white" />
        </button>
      </div>

      {/* Profile Card */}
      <div className="px-5 mt-3 mb-4">
        {loading ? (
          <div className="card-base p-5 animate-pulse bg-white border border-[#0A0A0A]/5">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-16 h-16 bg-[#0A0A0A]/10 rounded-full flex-shrink-0" />
              <div className="flex-1 min-w-0 space-y-2.5">
                <div className="h-4 bg-[#0A0A0A]/10 rounded w-2/3" />
                <div className="h-3 bg-[#0A0A0A]/10 rounded w-1/3" />
                <div className="h-3 bg-[#0A0A0A]/10 rounded w-1/2" />
                <div className="h-3 bg-[#0A0A0A]/10 rounded w-3/4" />
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              <div className="h-5 bg-[#0A0A0A]/10 rounded-full w-14" />
              <div className="h-5 bg-[#0A0A0A]/10 rounded-full w-16" />
              <div className="h-5 bg-[#0A0A0A]/10 rounded-full w-12" />
            </div>
            <div className="h-9 bg-[#0A0A0A]/10 rounded-xl w-full" />
          </div>
        ) : (
          <div className="card-base p-5">
            <div className="flex items-center gap-4 mb-3">
              <UserAvatar src={user.avatar} alt={displayName} size={64} className="flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h2 className="text-foreground" style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-weight-bold)' }}>
                  {displayName}
                </h2>
                {displayUsername && (
                  <p className="text-muted-foreground text-xs" style={{ fontSize: 'var(--text-xs)' }}>{displayUsername}</p>
                )}
                <div className="flex items-center gap-1 mt-0.5">
                  <Icon name="location_on" size={12} className="text-muted-foreground text-xs" />
                  <span className="text-muted-foreground text-xs" style={{ fontSize: 'var(--text-xs)' }}>{displayLocation}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-foreground" style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-semibold)' }}>{user.following}</span>
                  <span className="text-muted-foreground text-xs" style={{ fontSize: 'var(--text-sm)' }}>seguindo</span>
                  <span className="text-muted-foreground text-xs" style={{ fontSize: 'var(--text-sm)' }}>·</span>
                  <span className="text-foreground" style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-semibold)' }}>{user.followers}</span>
                  <span className="text-muted-foreground text-xs" style={{ fontSize: 'var(--text-sm)' }}>seguidores</span>
                </div>
              </div>
            </div>
            {user.interests.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {user.interests.slice(0, 6).map((interest) => (
                  <span
                    key={interest}
                    className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#F2F2F2] text-foreground"
                    style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-medium)' }}
                  >
                    {interest}
                  </span>
                ))}
              </div>
            )}
            <button onClick={onEditProfile} className="btn-outline w-full" style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-semibold)', padding: '8px 14px' }}>
              Editar perfil
            </button>
          </div>
        )}
      </div>



      {/* Tabs */}
      <div className="px-5">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full bg-transparent p-0 h-auto border-b border-border/50 rounded-none gap-0">
            {[
              { value: 'itineraries', label: 'Roteiros à venda' },
              { value: 'passport', label: 'Seu passaporte' },
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
            {countries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'hsl(var(--primary-light))' }}>
                  <Icon name="public" size={28} className="text-primary" />
                </div>
                <h3 className="text-foreground mb-2" style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-weight-bold)' }}>
                  Seu passaporte está vazio
                </h3>
                <p className="text-muted-foreground text-xs" style={{ fontSize: 'var(--text-sm)' }}>
                  À medida que você visita novos países, eles aparecem aqui como selos do seu passaporte digital.
                </p>
              </div>
            ) : (
              <>
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

                {/* Retrospectiva */}
                <button
                  onClick={() => setRetroOpen(true)}
                  className="card-base p-4 w-full flex items-center gap-3 text-left overflow-hidden relative"
                >
                  <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(135deg, hsl(var(--primary) / 0.08) 0%, hsl(var(--violet-normal) / 0.06) 100%)' }} />
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 relative" style={{ background: '#9DCC36' }}>
                    <Icon name="flight" size={16} style={{ color: '#1A1C40', position: 'absolute', top: '6px', right: '8px' }} />
                    <Icon name="public" size={18} style={{ color: '#1A1C40', opacity: 0.9 }} />
                  </div>
                  <div className="flex-1 min-w-0 relative">
                    <span className="text-foreground block" style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)' }}>
                      Minha Retrospectiva 2024
                    </span>
                    <span className="text-muted-foreground block" style={{ fontSize: 'var(--text-xs)' }}>
                      Reviva seus melhores momentos de viagem
                    </span>
                  </div>
                  <Icon name="chevron_right" size={20} className="text-muted-foreground flex-shrink-0 relative" />
                </button>
              </>
            )}
          </TabsContent>

          {/* Roteiros Tab */}
          <TabsContent value="itineraries" className="mt-4">
            {publicItineraries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'hsl(var(--primary-light))' }}>
                  <Icon name="map" size={28} className="text-primary" />
                </div>
                <h3 className="text-foreground mb-2" style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-weight-bold)' }}>
                  Você ainda não publicou roteiros
                </h3>
                <p className="text-muted-foreground mb-6" style={{ fontSize: 'var(--text-sm)' }}>
                  Compartilhe suas experiências de viagem e ganhe uma renda extra vendendo seus roteiros.
                </p>
                <button onClick={onViewCreatorProgram} className="btn-primary" style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-semibold)', padding: '10px 24px' }}>
                  Começar a criar e vender
                  <Icon name="arrow_forward" size={16} />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {publicItineraries.map((it) => {
                  const customCover = it.images?.find((image) => image && !image.startsWith('blob:'));
                  const cover = resolveTripThumbnailImages(it.destinations || [], customCover)[0] || GENERIC_TRAVEL_PLACEHOLDER;
                  const destinationLabel = it.destinations?.[0] || '';
                  return (
                    <button
                      key={it.id}
                      onClick={() => onPublicItineraryClick?.(it)}
                      className="text-left bg-white rounded-2xl overflow-hidden border border-border/40"
                    >
                      <div className="aspect-square w-full overflow-hidden">
                        <img src={cover} alt={it.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="p-2.5">
                        <h3 className="text-foreground line-clamp-2" style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-semibold)' }}>
                          {it.title || 'Roteiro sem título'}
                        </h3>
                        {destinationLabel && (
                          <p className="text-muted-foreground mt-0.5 truncate" style={{ fontSize: 'var(--text-xs)' }}>
                            {destinationLabel}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Settings below tabs */}
      <div className="mt-6">
        <div className="h-2" style={{ background: 'hsl(var(--divider))' }} />
        {[
          { title: 'Carteira', items: walletItems },
          { title: 'Conta', items: accountItems },
          { title: 'Suporte', items: supportItems },
        ].map((section) => (
          <div key={section.title} className="px-5 mt-5">
            <h2 className="text-foreground mb-2" style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-bold)' }}>
              {section.title}
            </h2>
            {section.items.map((item, idx) => (
              <button
                key={item.label}
                onClick={() => {
                  if ((item as any).isToggle) return;
                  if (item.key === 'contact-us') {
                    setContactOpen(true);
                  } else if (onNavigateToSetting) {
                    onNavigateToSetting(item.key);
                  }
                }}
                className="w-full flex items-center justify-between py-3 text-left"
                style={{ borderBottom: idx < section.items.length - 1 ? '1px solid hsl(var(--divider))' : 'none' }}
              >
                <div className="flex items-center gap-3">
                  <Icon name={item.icon} size={20} className="text-muted-foreground text-xs" />
                  <span className="text-foreground" style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-medium)' }}>
                    {item.label}
                  </span>
                </div>
                {(item as any).isToggle ? (
                  <div
                    onClick={(e) => { e.stopPropagation(); setDarkMode(!darkMode); }}
                    className="relative w-11 h-6 rounded-full cursor-pointer transition-colors"
                    style={{ background: darkMode ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground) / 0.25)' }}
                  >
                    <div
                      className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
                      style={{ transform: darkMode ? 'translateX(22px)' : 'translateX(2px)' }}
                    />
                  </div>
                ) : (
                  <Icon name="chevron_right" size={18} className="text-muted-foreground text-xs" />
                )}
              </button>
            ))}
          </div>
        ))}
      </div>

      <CountryDetailSheet country={selectedCountry} open={sheetOpen} onOpenChange={setSheetOpen} onUpdatePhotos={handleUpdatePhotos} onDeleteCountry={handleDeleteCountry} />
      <TravelRetrospective countries={countries} open={retroOpen} onClose={() => setRetroOpen(false)} />
      <ContactUsSheet isOpen={contactOpen} onClose={() => setContactOpen(false)} />
    </div>
  );
}
