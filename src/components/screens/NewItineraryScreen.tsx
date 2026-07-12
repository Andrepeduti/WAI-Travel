import { useState, useRef } from 'react';
import { SuccessToast } from '@/components/travel/SuccessToast';
import { ItinerarySettingsSheet } from '@/components/travel/ItinerarySettingsSheet';
import { downloadItineraryPdf } from '@/lib/itineraryPdf';
import { PublishItineraryFlow } from '@/components/travel/PublishItineraryFlow';
import { EditPublishSheet } from '@/components/travel/EditPublishSheet';
import { ManageItineraryScreen } from './ManageItineraryScreen';
import { resolveCoverImage } from '@/lib/coverImageResolver';
import { useDestinationCover } from '@/hooks/use-destination-cover';
import { Icon } from '@/components/ui/Icon';
import { TransportesScreen } from './TransportesScreen';
import { ReservasScreen } from './ReservasScreen';
import { BudgetScreen, Expense } from './BudgetScreen';
import { ActivityDetailScreen } from './ActivityDetailScreen';
import { Reserva } from '@/components/travel/AddReservaSheet';
import { Transporte } from '@/components/travel/AddTransporteSheet';
import { TicketCheck, Building2, Plane, Train, Bus, Car, MapPin } from 'lucide-react';
import { format, differenceInDays, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ItineraryFormData } from '@/components/travel/CreateItinerarySheet';
import { BackButton } from '@/components/ui/BackButton';
import { useAuth } from '@/contexts/AuthContext';
import { useMyItineraries } from '@/hooks/use-my-itineraries';
import { PlanLimitReachedSheet } from '@/components/travel/PlanLimitReachedSheet';

interface Activity {
  id: number;
  startTime: string;
  endTime: string;
  category: string;
  categoryColor: string;
  name: string;
  image: string;
  openHours: string;
  rating: number;
  price: string;
}

interface TransportBetween {
  type: 'walk' | 'bus' | 'metro' | 'car';
  duration: string;
  cost?: string;
}

interface DayData {
  day: number;
  title: string;
  date: Date;
  activities: Activity[];
  transports: TransportBetween[];
}

interface NewItineraryScreenProps {
  data: ItineraryFormData;
  onBack: () => void;
  onDelete?: () => void;
  onNavigateToSales?: () => void;
  onUpgrade?: () => void;
}

const activityColors = ['#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EF4444', '#EC4899'];

function generateEmptyDays(startDate: Date | undefined, endDate: Date | undefined): DayData[] {
  const numDays = startDate && endDate
    ? differenceInDays(endDate, startDate) + 1
    : 7;
  const base = startDate ?? new Date();
  return Array.from({ length: numDays }, (_, i) => ({
    day: i + 1,
    title: '',
    date: addDays(base, i),
    activities: [],
    transports: [],
  }));
}


function getTransportIcon(type: TransportBetween['type']) {
  switch (type) {
    case 'walk': return 'directions_walk';
    case 'bus': return 'directions_bus';
    case 'metro': return 'directions_subway';
    case 'car': return 'directions_car';
  }
}

export function NewItineraryScreen({ data, onBack, onDelete, onNavigateToSales, onUpgrade }: NewItineraryScreenProps) {
  const { session } = useAuth();
  const { itineraries: myItinerariesForLimit } = useMyItineraries();
  const FREE_PLAN_ITINERARY_LIMIT = 3;
  const ownCreatedCount = myItinerariesForLimit.filter(
    (it) => it.userId === session?.user?.id && it.sourceDatasetId == null
  ).length;

  const [selectedDay, setSelectedDay] = useState(1);
  const [showTransportes, setShowTransportes] = useState(false);
  const [showReservas, setShowReservas] = useState(false);
  const [showBudget, setShowBudget] = useState(false);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [transportes, setTransportes] = useState<Transporte[]>([]);
  const [dayTitles, setDayTitles] = useState<Record<number, string>>({});
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showPlanLimitSheet, setShowPlanLimitSheet] = useState(false);
  const [showPublishFlow, setShowPublishFlow] = useState(false);
  const [showEditPublish, setShowEditPublish] = useState(false);
  const [isItineraryPublic, setIsItineraryPublic] = useState(false);
  const [publishedPriceCents, setPublishedPriceCents] = useState<number | null>(null);
  const [publishedDescription, setPublishedDescription] = useState<string>('');
  const [publishedTags, setPublishedTags] = useState<string[]>([]);
  const [publishedMainTag, setPublishedMainTag] = useState<string>('');
  const [showManageItinerary, setShowManageItinerary] = useState(false);
  const [itineraryData, setItineraryData] = useState(data);
  const [manualCover, setManualCover] = useState<string | null>(null);
  const [duplicateToast, setDuplicateToast] = useState(false);
  const [isOpeningDuplicate, setIsOpeningDuplicate] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);

  const autoCover = useDestinationCover(itineraryData.destinations);
  const coverImage = manualCover || autoCover.url;
  const isAutoCover = !manualCover;

  const [days] = useState<DayData[]>(() => generateEmptyDays(data.startDate, data.endDate));

  const tripDays = days.length;

  const currentDayData = days.find(d => d.day === selectedDay);
  const currentTitle = dayTitles[selectedDay] ?? currentDayData?.title ?? '';

  const formatDateRange = () => {
    if (itineraryData.startDate && itineraryData.endDate) {
      const start = format(itineraryData.startDate, "d 'de' MMM.", { locale: ptBR });
      const end = format(itineraryData.endDate, "d 'de' MMM.", { locale: ptBR });
      return `${start} - ${end}`;
    }
    return '14 de jun. - 21 de jun.';
  };

  if (showTransportes) {
    return <TransportesScreen onBack={() => setShowTransportes(false)} transportes={transportes} onTransportesChange={setTransportes} />;
  }

  if (showReservas) {
    return <ReservasScreen onBack={() => setShowReservas(false)} reservas={reservas} onReservasChange={setReservas} />;
  }

  if (showManageItinerary) {
    return (
      <ManageItineraryScreen
        onBack={() => setShowManageItinerary(false)}
        tripName={itineraryData.destinations.length > 0 ? itineraryData.destinations[0].split(',')[0] : ''}
        coverImage={coverImage}
        isAutoCover={isAutoCover}
        startDate={itineraryData.startDate}
        endDate={itineraryData.endDate}
        destinations={itineraryData.destinations}
        onSave={(updated) => {
          if (updated.coverImage && updated.coverImage !== coverImage) {
            setManualCover(updated.coverImage);
          }
          setItineraryData(prev => ({
            ...prev,
            destinations: updated.destinations && updated.destinations.length > 0
              ? updated.destinations
              : updated.tripName ? [updated.tripName] : prev.destinations,
            startDate: updated.startDate,
            endDate: updated.endDate,
          }));
        }}
      />
    );
  }

  if (showBudget) {
    return <BudgetScreen onBack={() => setShowBudget(false)} expenses={expenses} onExpensesChange={setExpenses} />;
  }

  if (selectedActivity) {
    return (
      <ActivityDetailScreen
        activity={selectedActivity}
        onBack={() => setSelectedActivity(null)}
      />
    );
  }

  return (
    <div className="min-h-screen pb-8 relative" style={{ fontFamily: 'var(--font-family-primary)', background: '#F2F2F2' }}>
      {/* Floating FABs */}
      <div className="fixed inset-x-0 bottom-24 z-50 pointer-events-none">
        <div className="w-full mx-auto relative">
          <div className="absolute right-4 bottom-0 flex flex-col gap-3 pointer-events-auto">
            <button className="w-12 h-12 rounded-full shadow-lg flex items-center justify-center" style={{ background: '#1A1C40' }}>
              <Icon name="map" size={22} className="text-primary" />
            </button>
            <button className="w-12 h-12 rounded-full bg-primary shadow-lg flex items-center justify-center">
              <Icon name="add" size={24} className="text-primary-foreground" />
            </button>
          </div>
        </div>
      </div>

      {/* Hero Header */}
      <div
        className="relative bg-cover bg-center"
        style={{
          height: '22vh',
          minHeight: '160px',
          maxHeight: '220px',
          backgroundImage: `url(${coverImage})`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-black/50" />

        {/* Nav buttons */}
        <div className="absolute top-0 left-0 right-0 px-4 flex items-center justify-between z-10" style={{ paddingTop: 'calc(max(16px, env(safe-area-inset-top)) + 12px)' }}>
          <BackButton onClick={onBack} />
          <button onClick={() => setShowSettings(true)} className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm">
            <Icon name="more_vert" size={20} className="text-foreground" />
          </button>
        </div>

        {/* Title + Avatars on image */}
        <div className="absolute bottom-10 left-5 right-5 z-10">
          <div className="flex items-center justify-between mb-1.5">
            <h1 className="text-[26px] font-bold text-white leading-tight">
              {itineraryData.destinations.length > 0 ? `${itineraryData.destinations[0].split(',')[0]} trip` : 'Paris trip'}
            </h1>
            {/* Participant avatars - only show if friends were invited */}
            {itineraryData.invitedFriends && itineraryData.invitedFriends.length > 0 && (
              <div className="flex -space-x-2.5">
                {itineraryData.invitedFriends.slice(0, 4).map((friend, i) => (
                  <div key={friend.id || i} className="w-8 h-8 rounded-full border-2 border-white/30 overflow-hidden bg-muted flex items-center justify-center">
                    {friend.avatar ? (
                      <img src={friend.avatar} alt={friend.name} className="w-full h-full object-cover" />
                    ) : (
                      <Icon name="person" size={16} className="text-muted-foreground" />
                    )}
                  </div>
                ))}
                {itineraryData.invitedFriends.length > 4 && (
                  <div className="w-8 h-8 rounded-full border-2 border-white/30 bg-black/40 flex items-center justify-center">
                    <span className="text-white text-[10px] font-semibold">+{itineraryData.invitedFriends.length - 4}</span>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 text-white/80">
            <div className="flex items-center gap-1">
              <Icon name="location_on" size={14} className="text-white/80" />
              <span className="text-[12px] font-medium">45 locais</span>
            </div>
            <div className="flex items-center gap-1">
              <Icon name="schedule" size={14} className="text-white/80" />
              <span className="text-[12px] font-medium">{tripDays} dias</span>
            </div>
          </div>
        </div>
      </div>

      {/* Info Card - overlapping hero */}
      <div className="px-4 -mt-6 relative z-20 mb-5">
        <div className="bg-card rounded-2xl overflow-hidden px-4 py-3.5 flex items-center gap-3" style={{ boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)' }}>
          <div className="flex items-center gap-1.5 min-w-0 shrink">
            <Icon name="map" size={16} className="text-muted-foreground flex-shrink-0" />
            <span className="text-[14px] font-medium text-foreground truncate">
              {(() => {
                const destinations = (itineraryData.destinations.length > 0
                  ? itineraryData.destinations
                  : ['Paris', 'Londres']
                ).map(d => d.split(',')[0].trim());
                const maxVisible = 3;
                const visible = destinations.slice(0, maxVisible);
                const remaining = destinations.length - maxVisible;
                return visible.join(' · ') + (remaining > 0 ? ` +${remaining}` : '');
              })()}
            </span>
          </div>
          <div className="w-px h-4 bg-border flex-shrink-0" />
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Icon name="calendar_today" size={14} className="text-muted-foreground" />
            <span className="text-[14px] text-foreground font-medium whitespace-nowrap">{formatDateRange()}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4">
        {/* Management Cards Grid */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <button
            onClick={() => setShowTransportes(true)}
            className="w-full rounded-2xl bg-card px-4 py-5 text-left"
            style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
          >
            <span className="text-[14px] font-semibold text-foreground block">Transportes</span>
            {transportes.length > 0 ? (
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                {[
                  { count: transportes.filter(t => t.tipo === 'voo').length, Ic: Plane },
                  { count: transportes.filter(t => t.tipo === 'trem').length, Ic: Train },
                  { count: transportes.filter(t => t.tipo === 'onibus').length, Ic: Bus },
                  { count: transportes.filter(t => t.tipo === 'carro').length, Ic: Car },
                ].filter(i => i.count > 0).map(({ count, Ic }, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ backgroundColor: '#F3F3F3' }}>
                    <Ic size={16} strokeWidth={1.5} className="text-foreground" />
                    <span className="text-[13px] font-semibold text-foreground">{count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 flex items-center gap-1.5">
                <Icon name="add" size={20} className="text-foreground/80" />
                <span className="text-[14px] font-medium text-foreground">Adicionar</span>
              </div>
            )}
          </button>

          <button
            onClick={() => setShowReservas(true)}
            className="w-full rounded-2xl bg-card px-4 py-5 text-left"
            style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
          >
            <span className="text-[14px] font-semibold text-foreground block">Reservas</span>
            {reservas.length > 0 ? (
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                {[
                  { count: reservas.filter(r => r.tipo === 'hospedagem').length, Ic: Building2 },
                  { count: reservas.filter(r => r.tipo === 'atividade').length, Ic: TicketCheck },
                ].filter(i => i.count > 0).map(({ count, Ic }, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ backgroundColor: '#F3F3F3' }}>
                    <Ic size={16} strokeWidth={1.5} className="text-foreground" />
                    <span className="text-[13px] font-semibold text-foreground">{count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 flex items-center gap-1.5">
                <Icon name="add" size={20} className="text-foreground/80" />
                <span className="text-[14px] font-medium text-foreground">Adicionar</span>
              </div>
            )}
          </button>
        </div>

        {/* Budget - Wise style */}
        <button onClick={() => setShowBudget(true)} className="w-full p-4 bg-card rounded-2xl text-left mb-8" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
          <span className="text-[14px] font-semibold text-foreground block">Orçamento total</span>
          {expenses.length > 0 ? (
            <div className="mt-3 flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full overflow-hidden inline-flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 20 20" width="16" height="16">
                    <rect width="20" height="20" fill="#009739"/>
                    <polygon points="10,3 18,10 10,17 2,10" fill="#FEDD00"/>
                    <circle cx="10" cy="10" r="3.5" fill="#012169"/>
                  </svg>
                </span>
                <span className="text-[15px] font-medium text-foreground">
                  R$ {expenses.reduce((s, e) => s + e.amountBRL, 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full overflow-hidden inline-flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 20 20" width="16" height="16">
                    <rect width="20" height="20" fill="#003399"/>
                    <circle cx="10" cy="10" r="4" fill="none" stroke="#FFCC00" strokeWidth="2"/>
                  </svg>
                </span>
                <span className="text-[15px] font-medium text-foreground">
                  €{expenses.reduce((s, e) => s + e.amountEUR, 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex items-center gap-1.5">
              <Icon name="add" size={20} className="text-foreground/80" />
              <span className="text-[14px] font-medium text-foreground">Adicionar</span>
            </div>
          )}
        </button>

        {/* Tips - hidden for now */}
        {/* <button className="w-full p-4 bg-card rounded-2xl text-left mb-6" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[14px] font-semibold text-foreground">Dicas gerais da viagem</span>
            <Icon name="chevron_right" size={18} className="text-muted-foreground" />
          </div>
          <div className="flex items-center gap-1.5 text-primary">
            <Icon name="add" size={16} />
            <span className="text-[12px] font-medium">Adicionar</span>
          </div>
        </button> */}

        {/* Day Tabs - horizontal scroll */}
        <div ref={tabsRef} className="flex gap-0 mb-5 border-b border-border overflow-x-auto scrollbar-hide -mx-4 px-4">
          {days.map(tab => (
            <button
              key={tab.day}
              onClick={() => setSelectedDay(tab.day)}
              className={`pb-3 px-3 text-center transition-colors relative flex-shrink-0 min-w-fit ${
                selectedDay === tab.day ? 'text-foreground' : 'text-muted-foreground'
              }`}
            >
              <span className="text-[13px] font-semibold block whitespace-nowrap">
                Dia {tab.day}{tab.title ? ` - ${tab.title}` : ''}
              </span>
              <span className="text-[11px] text-muted-foreground block mt-0.5">
                {format(tab.date, "d 'de' MMM.", { locale: ptBR })}
              </span>
              {selectedDay === tab.day && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Day Section Title */}
        {currentTitle && (
          <div className="flex items-center gap-3 mb-5">
            <h2 className="text-[18px] font-bold text-foreground">{currentTitle}</h2>
            <button className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#F3F3F3' }}>
              <Icon name="edit" size={16} className="text-foreground" />
            </button>
          </div>
        )}

        {/* Activity Timeline */}
        {currentDayData && currentDayData.activities.length > 0 ? (
          <div className="mb-6 space-y-0">
            {currentDayData.activities.map((activity, index) => (
              <div key={activity.id}>
                {/* Activity Card */}
                <div className="bg-card rounded-2xl p-4 mb-1 cursor-pointer active:scale-[0.98] transition-transform" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }} onClick={() => setSelectedActivity(activity)}>
                  {/* Time + Category header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold border-2"
                        style={{ borderColor: '#141530', color: '#141530' }}
                      >
                        {index + 1}
                      </div>
                      <span className="text-[14px] font-semibold text-foreground">
                        {activity.startTime} - {activity.endTime}
                      </span>
                    </div>
                    <span className="h-7 inline-flex items-center text-[12px] font-medium text-muted-foreground px-3 rounded-2xl bg-[#F2F2F2]">
                      {activity.category}
                    </span>
                  </div>

                  {/* Experience Card */}
                  <div className="flex gap-3">
                    <img
                      src={activity.image}
                      alt={activity.name}
                      className="w-24 h-20 rounded-xl object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[14px] font-semibold text-foreground mb-1">{activity.name}</h4>
                      <p className="text-[12px] text-muted-foreground mb-2">{activity.openHours}</p>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <Icon name="star" size={14} filled className="text-[#F2B90C]" />
                          <span className="text-[13px] font-semibold text-foreground">{activity.rating}</span>
                        </div>
                        <span className="text-[13px] font-medium text-foreground">{activity.price}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Transport between activities */}
                {index < currentDayData.activities.length - 1 && currentDayData.transports[index] && (
                  <div className="flex items-center justify-between py-2.5 px-2 mb-1">
                    <div className="flex items-center gap-2 text-[#1A1C40]">
                      <Icon name={getTransportIcon(currentDayData.transports[index].type)} size={18} />
                      <span className="text-[12px] font-medium">{currentDayData.transports[index].duration}</span>
                      {currentDayData.transports[index].cost && (
                        <>
                          <span className="text-[12px]">·</span>
                          <span className="text-[12px] font-medium">{currentDayData.transports[index].cost}</span>
                        </>
                      )}
                    </div>
                    <button className="flex items-center gap-1 text-[#1A1C40]">
                      <Icon name="edit" size={16} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* Empty Day State */
          <div className="rounded-2xl p-6 text-center mb-6 bg-card" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
            <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center bg-muted/50">
              <Icon name="explore" size={28} className="text-primary" />
            </div>
            <h3 className="text-[15px] font-semibold text-foreground mb-2">Dia livre!</h3>
            <p className="text-[13px] text-muted-foreground mb-6">
              Como você quer planejar as atividades deste dia?
            </p>
            <div className="space-y-3">
              <button className="w-full py-3 px-4 rounded-xl text-[13px] font-semibold bg-secondary text-secondary-foreground flex items-center justify-center gap-2">
                <Icon name="auto_awesome" size={18} />
                Criar roteiro com IA
              </button>
              <button className="w-full py-3 px-4 rounded-xl text-[13px] font-semibold text-foreground border border-border flex items-center justify-center gap-2 bg-card">
                <Icon name="add" size={18} />
                Adicionar manualmente
              </button>
            </div>
          </div>
        )}


      </div>

      {isOpeningDuplicate && (
        <div className="fixed inset-0 z-[210] bg-background/90 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          <p className="text-[14px] font-semibold text-foreground">Abrindo cópia do roteiro...</p>
        </div>
      )}

      <ItinerarySettingsSheet
        open={showSettings}
        onClose={() => setShowSettings(false)}
        tripName={itineraryData.destinations.length > 0 ? `${itineraryData.destinations[0].split(',')[0]} trip` : 'Paris trip'}
        onManageItinerary={() => setShowManageItinerary(true)}
        onDuplicate={() => {
          if (ownCreatedCount >= FREE_PLAN_ITINERARY_LIMIT) {
            setShowPlanLimitSheet(true);
          } else {
            setDuplicateToast(true);
          }
        }}
        onDelete={onDelete ?? onBack}
        isPublic={isItineraryPublic}
        onTogglePublic={(v) => setIsItineraryPublic(v)}
        onEditPublish={() => setShowEditPublish(true)}
        onPublish={() => setShowPublishFlow(true)}
        onDownloadPdf={() => {
          const title = itineraryData.destinations.length > 0
            ? `${itineraryData.destinations[0].split(',')[0]} trip`
            : 'Roteiro';
          downloadItineraryPdf({
            title,
            destinations: itineraryData.destinations,
            startDate: itineraryData.startDate
              ? format(itineraryData.startDate, "d 'de' MMM yyyy", { locale: ptBR })
              : undefined,
            endDate: itineraryData.endDate
              ? format(itineraryData.endDate, "d 'de' MMM yyyy", { locale: ptBR })
              : undefined,
            days: days.map((d) => ({
              dayNumber: d.day,
              date: d.date ? format(d.date, "EEE, d 'de' MMM", { locale: ptBR }) : undefined,
              activities: d.activities.map((a: any) => ({
                time: a.startTime && a.endTime ? `${a.startTime}–${a.endTime}` : a.startTime,
                name: a.type === 'note' ? (a.noteText || 'Tempo livre') : a.name,
                location: a.category,
                notes: a.observation,
              })),
            })),
          });
        }}
      />
      <PublishItineraryFlow
        open={showPublishFlow}
        tripName={itineraryData.destinations.length > 0 ? `${itineraryData.destinations[0].split(',')[0]} trip` : 'Paris trip'}
        onClose={() => setShowPublishFlow(false)}
        initialDescription={publishedDescription}
        initialTags={publishedTags}
        initialMainTag={publishedMainTag}
        onPublished={(result) => {
          setIsItineraryPublic(true);
          setPublishedPriceCents(Math.round((result.price || 0) * 100));
          setPublishedDescription(result.description);
          setPublishedTags(result.tags);
          setPublishedMainTag(result.mainTag);
        }}
        onNavigateToSales={onNavigateToSales}
      />
      <EditPublishSheet
        open={showEditPublish}
        onClose={() => setShowEditPublish(false)}
        initialPriceCents={publishedPriceCents}
        initialDescription={publishedDescription}
        initialTags={publishedTags}
        initialMainTag={publishedMainTag}
        onSave={(patch) => {
          setPublishedPriceCents(patch.priceCents);
          setPublishedDescription(patch.description);
          setPublishedTags(patch.tags);
          setPublishedMainTag(patch.mainTag);
        }}
        onUnpublish={() => setIsItineraryPublic(false)}
      />
      <SuccessToast
        isVisible={duplicateToast}
        onClose={() => setDuplicateToast(false)}
        title="Roteiro duplicado!"
        description="Uma cópia do roteiro foi criada com sucesso"
        actionLabel="Abrir roteiro"
        onAction={() => {
          setDuplicateToast(false);
          setIsOpeningDuplicate(true);

          setTimeout(() => {
            setSelectedDay(1);
            setReservas([]);
            setExpenses([]);
            setTransportes([]);
            setDayTitles({});
            setSelectedActivity(null);
            setItineraryData(prev => {
              const firstDestination = prev.destinations[0] ?? 'Paris, França';
              const [city] = firstDestination.split(',');
              const newTitle = prev.tripName ? `Cópia de ${prev.tripName}` : `Cópia de ${city.trim()}`;

              return {
                ...prev,
                tripName: newTitle,
              };
            });
            setIsOpeningDuplicate(false);
          }, 700);
        }}
      />

      <PlanLimitReachedSheet
        isOpen={showPlanLimitSheet}
        onClose={() => setShowPlanLimitSheet(false)}
        onUpgrade={() => {
          setShowPlanLimitSheet(false);
          onUpgrade?.();
        }}
        currentCount={ownCreatedCount}
        limit={FREE_PLAN_ITINERARY_LIMIT}
      />
    </div>
  );
}
