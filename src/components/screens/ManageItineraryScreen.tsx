import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Camera, MoreHorizontal, UserPlus, ChevronRight, Trash2, Star, Check, X, Search, Clock, Target, ChevronDown } from 'lucide-react';
import { BackButton } from '@/components/ui/BackButton';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CURRENCIES } from '@/lib/currencyUtils';
import { cn } from '@/lib/utils';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ShareItinerarySheet } from '@/components/travel/ShareItinerarySheet';
import { SuccessToast } from '@/components/travel/SuccessToast';
import { Calendar } from '@/components/ui/calendar';
import { searchGooglePlacesAutocomplete } from '@/lib/googlePlacesApi';
import { 
  getItineraryOwnerProfile, 
  listItineraryMembers, 
  removeMember, 
  updateMemberRole, 
  getCachedOwnerProfile, 
  getCachedItineraryMembers, 
  type ItineraryMember,
  listPendingInvitesForItinerary,
  getCachedPendingInvites,
  cancelInvite
} from '@/lib/itineraryMembersApi';
import { leaveItinerary } from '@/lib/itinerariesApi';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { useItineraryRealtime } from '@/hooks/use-itinerary-realtime';

interface InvitedFriend {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  status: 'pending' | 'accepted';
}

interface ManageItineraryScreenProps {
  onBack: () => void;
  tripName: string;
  coverImage?: string;
  isAutoCover?: boolean;
  startDate?: Date;
  endDate?: Date;
  currency?: string;
  description?: string;
  destinations?: string[];
  isFlexible?: boolean;
  durationDays?: number;
  onPublish?: () => void;
  onDelete?: () => void;
  onSave?: (data: any) => void;
  itineraryId?: string;
  currentUserId?: string;
  initialOwner?: { userId: string; name: string; avatar?: string; username?: string } | null;
  initialMembers?: ItineraryMember[];
}

export function ManageItineraryScreen({
  onBack,
  tripName: initialTripName,
  coverImage: initialCoverImage,
  startDate: initialStartDate,
  endDate: initialEndDate,
  currency: initialCurrency = 'BRL',
  destinations: initialDestinations = [],
  isFlexible = false,
  durationDays: initialDurationDays,
  onPublish,
  onDelete,
  onSave,
  itineraryId = 'default',
  currentUserId = '',
  initialOwner = null,
  initialMembers = [],
  isAutoCover = false,
}: ManageItineraryScreenProps) {
  const defaultCover = 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600';
  
  // Local state for edits
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [tripName, setTripName] = useState(initialTripName);
  const [currency, setCurrency] = useState(initialCurrency);
  const [startDate, setStartDate] = useState<Date | undefined>(initialStartDate);
  const [endDate, setEndDate] = useState<Date | undefined>(initialEndDate);
  const [destinations, setDestinations] = useState<string[]>(initialDestinations);
  const [dateMode, setDateMode] = useState<'specific' | 'flexible'>(isFlexible ? 'flexible' : 'specific');
  const [durationDays, setDurationDays] = useState<number | ''>(
    isFlexible && initialDurationDays ? initialDurationDays : (initialStartDate && initialEndDate ? differenceInDays(initialEndDate, initialStartDate) + 1 : 7)
  );

  // UI States
  const [showTitlePicker, setShowTitlePicker] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showPeriodPicker, setShowPeriodPicker] = useState(false);
  const [showDestinationsPicker, setShowDestinationsPicker] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<ItineraryMember | null>(null);
  const [memberToLeave, setMemberToLeave] = useState<ItineraryMember | null>(null);

  // Internal State for Pickers
  const [tempTripName, setTempTripName] = useState(initialTripName);
  const [tempCurrency, setTempCurrency] = useState(initialCurrency);
  const [showCalendarInSheet, setShowCalendarInSheet] = useState(false);
  const [tempStartDate, setTempStartDate] = useState<Date | undefined>(startDate);
  const [tempEndDate, setTempEndDate] = useState<Date | undefined>(endDate);
  const [tempDuration, setTempDuration] = useState<number | ''>(durationDays);
  const [tempDateMode, setTempDateMode] = useState<'specific' | 'flexible'>(dateMode);

  // Destinations Picker Internal State
  const [destinationInput, setDestinationInput] = useState('');
  const [remoteResults, setRemoteResults] = useState<{ label: string; sub: string; full: string; emoji: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tempDestinations, setTempDestinations] = useState<string[]>([]);
  
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Has changes logic
  const hasChanges = useMemo(() => {
    return (
      coverPreview !== null ||
      tripName !== initialTripName ||
      currency !== initialCurrency ||
      JSON.stringify(destinations) !== JSON.stringify(initialDestinations) ||
      startDate?.getTime() !== initialStartDate?.getTime() ||
      endDate?.getTime() !== initialEndDate?.getTime()
    );
  }, [tripName, currency, destinations, startDate, endDate, initialTripName, initialCurrency, initialDestinations, initialStartDate, initialEndDate, coverPreview]);

  // Effects
  const [owner, setOwner] = useState<{ userId: string; name: string; avatar?: string; username?: string } | null>(() => initialOwner || getCachedOwnerProfile(itineraryId));
  const [members, setMembers] = useState<ItineraryMember[]>(() => initialMembers.length > 0 ? initialMembers : (getCachedItineraryMembers(itineraryId) || []));
  const [pendingInvites, setPendingInvites] = useState<ItineraryInvite[]>(() => getCachedPendingInvites(itineraryId) || []);
  // A tela sempre inicia em loading para evitar que os dados "pipocarem" depois.
  // Assim garantimos que ela só será exibida (sem skeleton) quando o fetch de convites pendentes terminar.
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [actionMember, setActionMember] = useState<ItineraryMember | null>(null);
  const [pendingRole, setPendingRole] = useState<'editor' | 'viewer'>('viewer');
  const [savingRole, setSavingRole] = useState(false);
  
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const isOwner = !!owner && !!currentUserId && owner.userId === currentUserId;
  const currentUserMember = members.find((m) => m.userId === currentUserId);
  const currentUserRole = currentUserMember?.role || 'viewer';
  const canEdit = isOwner || currentUserRole === 'editor';

  useItineraryRealtime(itineraryId !== 'default' ? itineraryId : null, {
    onMembersChange: () => {
      if (itineraryId && itineraryId !== 'default') {
        listItineraryMembers(itineraryId).then(setMembers).catch(console.error);
      }
    },
    onInvitesChange: () => {
      if (itineraryId && itineraryId !== 'default') {
        listPendingInvitesForItinerary(itineraryId).then(setPendingInvites).catch(console.error);
      }
    }
  });

  useEffect(() => {
    if (!itineraryId || itineraryId === 'default') {
      setLoadingMembers(false);
      return;
    }
    let cancelled = false;
    
    const fetchData = async () => {
      try {
        const [o, m, p] = await Promise.all([
          getItineraryOwnerProfile(itineraryId),
          listItineraryMembers(itineraryId),
          listPendingInvitesForItinerary(itineraryId),
        ]);
        if (cancelled) return;
        setOwner(o);
        setMembers(m);
        setPendingInvites(p);
      } catch (err) {
        console.error('Error fetching members/invites:', err);
      } finally {
        if (!cancelled) setLoadingMembers(false);
      }
    };

    fetchData();

    // Refetch on window focus to catch any realtime events missed while tab was in background
    const handleFocus = () => {
      if (!document.hidden) {
        fetchData();
      }
    };
    
    window.addEventListener('focus', handleFocus);
    window.addEventListener('visibilitychange', handleFocus);

    return () => { 
      cancelled = true; 
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('visibilitychange', handleFocus);
    };
  }, [itineraryId, currentUserId, initialOwner, initialMembers]);

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    const term = destinationInput.trim();
    if (term.length < 3) {
      setRemoteResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await searchGooglePlacesAutocomplete(term, ['(cities)']);
        const mapped = results.map((r) => {
          const rawDescription = r.description || r.fullText || (r.location ? `${r.name}, ${r.location}` : r.name) || '';
          const parts = rawDescription.split(',');
          const label = r.name || parts[0]?.trim() || term;
          const sub = r.location || parts.slice(1).join(',').trim();
          return { label, sub, full: rawDescription || label, emoji: '📍' };
        });
        setRemoteResults(mapped);
      } catch (err) {
        console.error('Failed to autocomplete destination:', err);
        setRemoteResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [destinationInput]);

  // Handlers
  const handleBack = () => {
    onBack();
  };

  const handleSave = () => {
    if (onSave) {
      onSave({
        tripName,
        coverImage: coverPreview || initialCoverImage,
        currency,
        startDate: dateMode === 'specific' ? startDate : undefined,
        endDate: dateMode === 'specific' ? endDate : undefined,
        destinations,
        isFlexible: dateMode === 'flexible',
        durationDays: dateMode === 'flexible' ? durationDays : undefined,
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      if (!dataUrl) return;
      setCoverPreview(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (!tripName.trim()) {
      setTripName(initialTripName);
    }
  };

  const handleAddTempDestination = (dest: string) => {
    const cityName = dest.split(',')[0].trim();
    if (!tempDestinations.includes(cityName)) {
      setTempDestinations((prev) => [...prev, cityName]);
    }
    setDestinationInput('');
    setRemoteResults([]);
  };

  const handleRemoveTempDestination = (dest: string) => {
    setTempDestinations((prev) => prev.filter((d) => d !== dest));
  };

  const handleSaveRole = async () => {
    if (!actionMember) return;
    setSavingRole(true);
    try {
      await updateMemberRole(actionMember.id, pendingRole);
      setMembers((prev) => prev.map((m) => (m.id === actionMember.id ? { ...m, role: pendingRole } : m)));
      setToastMessage('Permissão alterada com sucesso.');
      setToastVisible(true);
      setActionMember(null);
    } catch {
      toast.error('Erro ao alterar permissão');
    } finally {
      setSavingRole(false);
    }
  };

  const handleRemoveMember = async (member: ItineraryMember) => {
    try {
      await removeMember(member.id);
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
      setActionMember(null);
      setToastMessage('Participante removido.');
      setToastVisible(true);
    } catch {
      toast.error('Erro ao remover participante');
    }
  };

  const handleLeaveItinerary = async (member: ItineraryMember) => {
    try {
      if (itineraryId !== 'default') {
        await leaveItinerary(itineraryId);
        setToastMessage('Você saiu do roteiro.');
        setToastVisible(true);
        onBack();
      }
    } catch {
      toast.error('Erro ao sair do roteiro');
    }
  };

  // Render variables
  const selectedCurrency = CURRENCIES.find(c => c.code === currency) || { symbol: currency, label: currency };
  const formattedDate = dateMode === 'flexible'
    ? (durationDays ? `${durationDays} ${durationDays === 1 ? 'dia' : 'dias'}` : 'Duração indefinida')
    : (startDate 
      ? `${format(startDate, "dd 'de' MMM.", { locale: ptBR })} - ${endDate ? format(endDate, "dd 'de' MMM.", { locale: ptBR }) : ''}`
      : 'Selecione as datas');

  return (
    <div className="min-h-[100dvh] bg-[#F3F3F3]" style={{ fontFamily: 'var(--font-family-primary)' }}>
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#F3F3F3] px-4 pb-6 flex items-center justify-between" style={{ paddingTop: 'calc(max(16px, env(safe-area-inset-top)) + 12px)' }}>
        <div className="flex items-center gap-4">
          <BackButton onClick={handleBack} className="shadow-none border-none bg-transparent w-auto h-auto p-2 -ml-2" />
          <h1 className="text-[20px] font-bold text-[#171F2C]">Gerenciar roteiro</h1>
        </div>
      </div>

      {loadingMembers ? (
        <div className="px-4 pb-6 flex flex-col gap-4">
          {/* Shimmer Capa */}
          <div className="bg-white rounded-[16px] p-4 flex flex-col gap-4">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-[141px] w-full rounded-[16px]" />
          </div>
          
          {/* Shimmer Dados do roteiro */}
          <div className="bg-white rounded-[16px] p-4 flex flex-col gap-6">
            <Skeleton className="h-5 w-32" />
            <div className="flex flex-col gap-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          
          {/* Shimmer Participantes */}
          <div className="bg-white rounded-[16px] p-4 flex flex-col gap-6">
            <Skeleton className="h-5 w-24" />
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 w-full">
                <Skeleton className="w-7 h-7 rounded-full shrink-0" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="w-16 h-6 rounded-[9px] shrink-0" />
              </div>
              <div className="h-px bg-[#F2F2F2] w-full" />
              <div className="flex items-center gap-3 w-full">
                <Skeleton className="w-7 h-7 rounded-full shrink-0" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="w-16 h-6 rounded-[9px] shrink-0" />
              </div>
            </div>
          </div>

          {/* Shimmer Ferramentas */}
          <div className="bg-white rounded-[16px] p-4 flex flex-col gap-6">
            <Skeleton className="h-5 w-28" />
            <div className="flex flex-col gap-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </div>
      ) : (
        <div className="px-4 pb-6 flex flex-col gap-4">
        
        {/* Capa Block */}
        <div className="bg-white rounded-[16px] p-4 flex flex-col gap-4">
          <h3 className="font-semibold text-[16px] text-[#171F2C]">Capa</h3>
          <label className={cn("relative rounded-[16px] overflow-hidden h-[141px] block", canEdit ? "cursor-pointer active:scale-[0.98] transition-transform" : "")}>
            <img src={coverPreview || initialCoverImage || defaultCover} alt="Capa" className="w-full h-full object-cover" />
            {canEdit && (
              <>
                <div className="absolute inset-0 m-auto w-10 h-10 bg-[#FEFEFE] rounded-full shadow-[0px_4px_20px_rgba(0,0,0,0.1)] flex items-center justify-center">
                  <Camera size={20} className="text-[#141530]" />
                </div>
                <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
              </>
            )}
          </label>
          {isAutoCover && !coverPreview && (
            <p className="text-[11px] text-[#7F7F7F] flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#141530]" />
              Capa selecionada automaticamente
            </p>
          )}
        </div>

        {/* Dados do roteiro Block */}
        <div className="bg-white rounded-[16px] p-4 flex flex-col gap-6">
          <h3 className="font-semibold text-[16px] text-[#171F2C]">Dados do roteiro</h3>
          <div className="flex flex-col gap-6">
            
            {/* Título */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between group">
                <div className="flex items-center gap-3 flex-1" onClick={() => { if (canEdit) { setTempTripName(tripName); setShowTitlePicker(true); } }}>
                  <div className="w-6 h-6 flex items-center justify-center relative shrink-0">
                      <div className="absolute inset-0 rounded-full border-[1.5px] border-[#141530]"></div>
                      <div className="w-3 h-3 rounded-full border-[1.5px] border-[#141530]"></div>
                  </div>
                  <div className="flex flex-col text-left flex-1 gap-[2px]">
                    <span className="font-semibold text-[16px] text-[#141530]">Titulo</span>
                    <span className="font-medium text-[14px] text-[#7F7F7F]">{tripName || 'Sem título'}</span>
                  </div>
                </div>
                {canEdit && (
                  <button onClick={() => { setTempTripName(tripName); setShowTitlePicker(true); }} className="p-2 shrink-0">
                    <ChevronRight size={20} className="text-[#7F7F7F]" />
                  </button>
                )}
              </div>
              <div className="h-px bg-[#F2F2F2] w-full" />
            </div>

            {/* Moeda */}
            <div className="flex flex-col gap-4">
              <button onClick={() => { if (canEdit) { setTempCurrency(currency); setShowCurrencyPicker(true); } }} className="flex items-center justify-between group w-full">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 flex items-center justify-center relative shrink-0">
                      <div className="absolute inset-0 rounded-full border-[1.5px] border-[#141530]"></div>
                      <div className="w-3 h-3 rounded-full border-[1.5px] border-[#141530]"></div>
                  </div>
                  <div className="flex flex-col text-left gap-[2px]">
                    <span className="font-semibold text-[16px] text-[#141530]">Moeda</span>
                    <span className="font-medium text-[14px] text-[#7F7F7F]">{`${selectedCurrency.symbol} - ${selectedCurrency.label}`}</span>
                  </div>
                </div>
                {canEdit && <ChevronRight size={20} className="text-[#7F7F7F]" />}
              </button>
              <div className="h-px bg-[#F2F2F2] w-full" />
            </div>

            {/* Período */}
            <div className="flex flex-col gap-4">
              <button onClick={() => {
                if (canEdit) {
                  setTempStartDate(startDate);
                  setTempEndDate(endDate);
                  setTempDuration(durationDays);
                  setTempDateMode(dateMode);
                  setShowPeriodPicker(true);
                }
              }} className="flex items-center justify-between group w-full">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 flex items-center justify-center relative shrink-0">
                      <div className="absolute inset-0 rounded-full border-[1.5px] border-[#141530]"></div>
                      <div className="w-3 h-3 rounded-full border-[1.5px] border-[#141530]"></div>
                  </div>
                  <div className="flex flex-col text-left gap-[2px]">
                    <span className="font-semibold text-[16px] text-[#141530]">Período da viagem</span>
                    <span className="font-medium text-[14px] text-[#7F7F7F]">{formattedDate}</span>
                  </div>
                </div>
                {canEdit && <ChevronRight size={20} className="text-[#7F7F7F]" />}
              </button>
              <div className="h-px bg-[#F2F2F2] w-full" />
            </div>

            {/* Destinos */}
            <div className="flex flex-col gap-4">
              <button onClick={() => {
                if (canEdit) {
                  setTempDestinations(destinations);
                  setShowDestinationsPicker(true);
                }
              }} className="flex items-center justify-between group w-full">
                <div className="flex items-center gap-3 w-full">
                  <div className="w-6 h-6 flex items-center justify-center relative shrink-0">
                      <div className="absolute inset-0 rounded-full border-[1.5px] border-[#141530]"></div>
                      <div className="w-3 h-3 rounded-full border-[1.5px] border-[#141530]"></div>
                  </div>
                  <div className="flex flex-col text-left flex-1 w-full overflow-hidden gap-[2px]">
                    <span className="font-semibold text-[16px] text-[#141530]">Destinos</span>
                    <span className="font-medium text-[14px] text-[#7F7F7F] truncate w-full pr-4">
                      {destinations.length > 0 ? destinations.join(' | ') : 'Nenhum destino'}
                    </span>
                  </div>
                </div>
                {canEdit && <ChevronRight size={20} className="text-[#7F7F7F] shrink-0" />}
              </button>
            </div>

          </div>
        </div>

        {/* Participantes Block */}
        <div className="bg-white rounded-[16px] p-4 flex flex-col gap-6">
          <h3 className="font-semibold text-[16px] text-[#171F2C]">Participantes</h3>
          <div className="flex flex-col gap-4">
                {/* Admin Row */}
                {owner && (
                  <div className="flex flex-row justify-between items-center w-full">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center text-[12px] font-bold text-slate-600">
                        {owner.avatar ? (
                          <img src={owner.avatar} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          owner.name.substring(0, 2).toUpperCase()
                        )}
                      </div>
                      <span className="font-medium text-[14px] text-[#171F2C]">{owner.name}</span>
                    </div>
                    <div className="flex flex-row items-center gap-4 flex-shrink-0">
                      <div className="box-border flex flex-row items-center justify-center px-3 py-1 gap-1 h-6 border border-[#141530] rounded-[9px]">
                        <span className="text-[12px] font-medium text-[#141530] font-['Urbanist'] leading-none">
                          Admin
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Members Row */}
                {members.map((member) => (
                  <React.Fragment key={member.id}>
                    <div className="h-px bg-[#F2F2F2] w-full" />
                    <div className="flex flex-row justify-between items-center w-full">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center text-[12px] font-bold text-slate-600">
                          {member.avatar ? (
                            <img src={member.avatar} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            member.name.substring(0, 2).toUpperCase()
                          )}
                        </div>
                        <span className="font-medium text-[14px] text-[#171F2C]">{member.name}</span>
                      </div>
                      <div className="flex flex-row items-center gap-4 flex-shrink-0">
                        <div className="box-border flex flex-row items-center justify-center px-3 py-1 gap-1 h-6 border border-[#141530] rounded-[9px]">
                          <span className="text-[12px] font-medium text-[#141530] font-['Urbanist'] leading-none">
                            {member.role === 'editor' ? 'Editor' : 'Visualizador'}
                          </span>
                        </div>
                        {(isOwner || member.userId === currentUserId) && (
                          <button 
                            onClick={() => {
                              setActionMember(member);
                              setPendingRole(member.role);
                            }}
                            className="flex items-center justify-center text-[#141530] active:scale-95 transition-transform"
                          >
                            <MoreHorizontal size={16} strokeWidth={2.5} />
                          </button>
                        )}
                      </div>
                    </div>
                  </React.Fragment>
                ))}

                {/* Pending Invites Row */}
                {pendingInvites.map((invite) => (
                  <React.Fragment key={invite.id}>
                    <div className="h-px bg-[#F2F2F2] w-full" />
                    <div className="flex flex-row justify-between items-center w-full">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full border border-dashed border-[#9E9E9E] bg-white overflow-hidden flex items-center justify-center text-[12px] font-bold text-[#9E9E9E]">
                          {invite.inviterAvatar ? (
                            <img src={invite.inviterAvatar} alt="Avatar" className="w-full h-full object-cover opacity-50" />
                          ) : (
                            invite.inviterName?.substring(0, 2).toUpperCase() || '?'
                          )}
                        </div>
                        <div className="flex flex-col items-start gap-1">
                          <span className="font-medium text-[14px] text-[#9E9E9E] leading-none">{invite.inviterName}</span>
                          <span className="text-[12px] text-[#9E9E9E] font-medium leading-none">Aguardando aceite</span>
                        </div>
                      </div>
                      <div className="flex flex-row items-center gap-4 flex-shrink-0">
                        <div className="box-border flex flex-row items-center justify-center px-3 py-1 gap-1 h-6 border border-[#9E9E9E] rounded-[9px]">
                          <span className="text-[12px] font-medium text-[#9E9E9E] font-['Urbanist'] leading-none">
                            {invite.role === 'editor' ? 'Editor' : 'Visualizador'}
                          </span>
                        </div>
                        {(isOwner || invite.inviterId === currentUserId) && (
                          <button 
                            onClick={async () => {
                              try {
                                await cancelInvite(invite.id);
                                setPendingInvites(prev => prev.filter(i => i.id !== invite.id));
                                setToastMessage('Convite cancelado.');
                                setToastVisible(true);
                              } catch {
                                toast.error('Erro ao cancelar convite');
                              }
                            }}
                            className="flex items-center justify-center text-[#D00004] active:scale-95 transition-transform"
                          >
                            <X size={20} strokeWidth={2.5} />
                          </button>
                        )}
                      </div>
                    </div>
                  </React.Fragment>
                ))}

            {canEdit && (
              <>
                <div className="h-px bg-[#F2F2F2] w-full mt-2" />

                <button onClick={() => setShowShareSheet(true)} className="flex items-center gap-2 w-fit active:opacity-70 transition-opacity">
                  <UserPlus size={16} className="text-[#141530]" />
                  <span className="font-bold text-[14px] text-[#141530]">Convidar viajante</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Ferramentas Block */}
        <div className="bg-white rounded-[16px] p-4 flex flex-col gap-6">
          <h3 className="font-semibold text-[16px] text-[#171F2C]">Ferramentas</h3>
          <div className="flex flex-col gap-6">
            
            {canEdit && (
              <div className="flex flex-col gap-4">
                <button onClick={onPublish} className="flex items-center justify-between group text-left">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 flex items-center justify-center relative shrink-0">
                        <div className="absolute inset-0 rounded-full border-[1.5px] border-[#141530]"></div>
                        <div className="w-3 h-3 rounded-full border-[1.5px] border-[#141530]"></div>
                    </div>
                    <div className="flex flex-col text-left gap-[2px]">
                      <span className="font-semibold text-[16px] text-[#141530]">Publicar na loja WAI</span>
                      <span className="font-medium text-[14px] text-[#7F7F7F]">Venda seu roteiro para outros viajantes</span>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-[#7F7F7F]" />
                </button>
                <div className="h-px bg-[#F2F2F2] w-full" />
              </div>
            )}



            {canEdit && (
              <div className="flex flex-col gap-4">
                <button className="flex items-center justify-between group text-left">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 flex items-center justify-center relative shrink-0">
                        <div className="absolute inset-0 rounded-full border-[1.5px] border-[#141530]"></div>
                        <div className="w-3 h-3 rounded-full border-[1.5px] border-[#141530]"></div>
                    </div>
                    <div className="flex flex-col text-left gap-[2px]">
                      <span className="font-semibold text-[16px] text-[#141530]">Preencher deslocamentos</span>
                      <span className="font-medium text-[14px] text-[#7F7F7F]">A WAI sugere os trajetos</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                      <span className="bg-[#141530] text-white text-[12px] font-medium px-3 py-1 rounded-[9px] flex items-center justify-center">
                          <Star size={12} className="fill-white mr-1" /> Pro
                      </span>
                      <ChevronRight size={20} className="text-[#7F7F7F]" />
                  </div>
                </button>
                <div className="h-px bg-[#F2F2F2] w-full" />
              </div>
            )}

            <div className="flex flex-col gap-4">
              <button className="flex items-center justify-between group text-left">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 flex items-center justify-center relative shrink-0">
                      <div className="absolute inset-0 rounded-full border-[1.5px] border-[#141530]"></div>
                      <div className="w-3 h-3 rounded-full border-[1.5px] border-[#141530]"></div>
                  </div>
                  <div className="flex flex-col text-left gap-[2px]">
                    <span className="font-semibold text-[16px] text-[#141530]">Exportar pro Google Maps</span>
                    <span className="font-medium text-[14px] text-[#7F7F7F]">Veja seus destinos no mapa</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                    <span className="bg-[#141530] text-white text-[12px] font-medium px-3 py-1 rounded-[9px] flex items-center justify-center">
                        <Star size={12} className="fill-white mr-1" /> Pro
                    </span>
                    <ChevronRight size={20} className="text-[#7F7F7F]" />
                </div>
              </button>
            </div>

          </div>
        </div>

        {/* Excluir Block */}
        {isOwner && (
          <button onClick={() => setShowDeleteConfirm(true)} className="bg-white rounded-[16px] p-4 flex items-center justify-between group active:scale-[0.98] transition-transform">
            <div className="flex items-center gap-3">
              <Trash2 size={20} className="text-[#D00004]" />
              <span className="font-medium text-[16px] text-[#D00004]">Excluir roteiro</span>
            </div>
            <ChevronRight size={20} className="text-[#D00004]" />
          </button>
        )}

      </div>
      )}

      {/* Title Sheet */}
      <BottomSheet open={showTitlePicker} onClose={() => setShowTitlePicker(false)} bodyClassName="p-0">
        <div className="flex flex-col items-start px-4 pb-[34px] pt-4 gap-[24px] w-full bg-[#FFFFFF]">
          <h3 className="font-semibold text-[24px] leading-[28px] text-[#141530]">Alterar título</h3>
          
          <div className="flex flex-row items-center p-3 gap-3 w-full h-[60px] bg-field border border-transparent focus-within:border-primary transition-colors rounded-[12px]">
            <div className="flex flex-col justify-center gap-[2px] w-full">
              <span className="font-medium text-[12px] leading-[16px] text-[#949494]">Titulo da publicação</span>
              <input 
                type="text"
                value={tempTripName}
                onChange={(e) => setTempTripName(e.target.value)}
                className="font-medium text-[14px] leading-[16px] text-[#141530] bg-transparent focus:outline-none w-full"
              />
            </div>
          </div>

          <button 
            onClick={() => {
              setTripName(tempTripName);
              setShowTitlePicker(false);
              if (onSave) onSave({ tripName: tempTripName, coverImage: coverPreview || initialCoverImage, currency, startDate, endDate, destinations });
            }}
            disabled={tempTripName === tripName}
            className={cn(
              "w-full flex justify-center items-center py-3 px-4 h-[48px] rounded-[16px] font-bold text-[16px] leading-[19px]",
              tempTripName === tripName ? "bg-[#E5E5E5] text-[#949494] cursor-not-allowed" : "bg-[#9DCC36] text-[#141530]"
            )}
          >
            Salvar
          </button>
        </div>
      </BottomSheet>

      {/* Currency Sheet */}
      <BottomSheet open={showCurrencyPicker} onClose={() => setShowCurrencyPicker(false)} bodyClassName="p-0">
        <div className="flex flex-col items-start px-4 pb-[34px] pt-4 gap-[24px] w-full bg-[#FFFFFF]">
          <h3 className="font-semibold text-[24px] leading-[28px] text-[#141530]">Alterar moeda</h3>
          
          <div className="relative w-full">
            <div className="flex flex-row justify-center items-center p-3 gap-3 w-full h-[60px] bg-field rounded-[12px]">
              <Target size={16} className="text-[#141530] shrink-0" />
              <div className="flex flex-col justify-center items-start gap-[2px] flex-1">
                <span className="font-medium text-[12px] leading-[16px] text-[#949494]">Moeda</span>
                <span className="font-medium text-[14px] leading-[16px] text-[#141530]">
                  {CURRENCIES.find(c => c.code === tempCurrency)?.symbol} - {CURRENCIES.find(c => c.code === tempCurrency)?.label}
                </span>
              </div>
              <ChevronDown size={16} className="text-[#141530] shrink-0" />
            </div>
            <select
              value={tempCurrency}
              onChange={(e) => setTempCurrency(e.target.value)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            >
              {CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>{c.symbol} - {c.label}</option>
              ))}
            </select>
          </div>

          <button 
            onClick={() => {
              setCurrency(tempCurrency);
              setShowCurrencyPicker(false);
              if (onSave) onSave({ tripName, coverImage: coverPreview || initialCoverImage, currency: tempCurrency, startDate, endDate, destinations });
            }}
            disabled={tempCurrency === currency}
            className={cn(
              "w-full shrink-0 flex justify-center items-center py-3 px-4 h-[48px] rounded-[16px] font-bold text-[16px] leading-[19px]",
              tempCurrency === currency ? "bg-[#E5E5E5] text-[#949494] cursor-not-allowed" : "bg-[#9DCC36] text-[#141530]"
            )}
          >
            Salvar
          </button>
        </div>
      </BottomSheet>

      {/* Period Sheet */}
      <BottomSheet open={showPeriodPicker} onClose={() => setShowPeriodPicker(false)} bodyClassName="p-0">
        <div className="flex flex-col items-start px-4 pb-[34px] pt-4 gap-[24px] w-full bg-[#FFFFFF]">
          <h3 className="font-semibold text-[24px] leading-[28px] text-[#141530]">Alterar período da viagem</h3>
          <div className="flex flex-col gap-4 w-full">
            <div className="flex gap-2 p-1 bg-[#EEEEEE] rounded-[20px]">
              <button
                onClick={() => setTempDateMode('specific')}
                className={cn(
                  "flex-1 py-2 text-[14px] font-semibold rounded-[16px] transition-all",
                  tempDateMode === 'specific' ? "bg-[#141530] text-[#FEFEFE]" : "text-[#141530]"
                )}
              >
                Data específica
              </button>
              <button
                onClick={() => setTempDateMode('flexible')}
                className={cn(
                  "flex-1 py-2 text-[14px] font-semibold rounded-[16px] transition-all",
                  tempDateMode === 'flexible' ? "bg-[#141530] text-[#FEFEFE]" : "text-[#141530]"
                )}
              >
                Data flexível
              </button>
            </div>
            {tempDateMode === 'specific' ? (
              <div className="flex flex-col gap-4">
                {showCalendarInSheet && (
                  <div className="flex justify-center border border-[#EEEEEE] rounded-[12px] p-2 bg-white">
                    <Calendar
                      mode="range"
                      selected={{
                        from: tempStartDate,
                        to: tempEndDate
                      }}
                      onSelect={(range) => {
                        setTempStartDate(range?.from);
                        setTempEndDate(range?.to);
                      }}
                      disabled={(date) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        return date < today;
                      }}
                      initialFocus
                      locale={ptBR}
                    />
                  </div>
                )}
                <button 
                  onClick={() => setShowCalendarInSheet(!showCalendarInSheet)}
                  className="flex items-center justify-between p-3 w-full h-[60px] bg-field rounded-[12px]"
                >
                  <div className="flex items-center gap-3">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#141530]"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                    <div className="flex flex-col text-left gap-[2px]">
                      <span className="font-medium text-[12px] leading-[16px] text-[#949494]">Data da viagem</span>
                      <span className="font-medium text-[14px] leading-[16px] text-[#141530]">
                        {tempStartDate 
                          ? `${format(tempStartDate, "dd MMM yyyy", { locale: ptBR })} - ${tempEndDate ? format(tempEndDate, "dd MMM yyyy", { locale: ptBR }) : ''}`
                          : 'Selecionar'}
                      </span>
                    </div>
                  </div>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cn("text-[#141530] transition-transform duration-200", showCalendarInSheet && "rotate-180")}><path d="m6 9 6 6 6-6"/></svg>
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between p-3 w-full h-[60px] bg-field rounded-[12px]">
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-[#141530]" />
                    <span className="font-medium text-[14px] leading-[16px] text-[#141530]">Duração</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      value={tempDuration}
                      onChange={(e) => setTempDuration(e.target.value === '' ? '' : parseInt(e.target.value))}
                      className="w-16 text-center bg-white border border-[#EEEEEE] rounded-[8px] py-1 text-[14px] focus:outline-none"
                    />
                    <span className="font-medium text-[14px] leading-[16px] text-[#949494]">dias</span>
                  </div>
                </div>
              </div>
            )}
            <button
              onClick={() => {
                setStartDate(tempStartDate);
                setEndDate(tempEndDate);
                setDurationDays(tempDuration);
                setDateMode(tempDateMode);
                setShowPeriodPicker(false);
                if (onSave) onSave({ tripName, coverImage: coverPreview || initialCoverImage, currency, startDate: tempStartDate, endDate: tempEndDate, destinations, isFlexible: tempDateMode === 'flexible', durationDays: tempDuration });
              }}
              disabled={
                tempStartDate?.getTime() === startDate?.getTime() && 
                tempEndDate?.getTime() === endDate?.getTime() && 
                tempDuration === durationDays && 
                tempDateMode === dateMode
              }
              className={cn(
                "w-full flex justify-center items-center py-3 px-4 h-[48px] rounded-[16px] font-bold text-[16px] leading-[19px] mt-2",
                (tempStartDate?.getTime() === startDate?.getTime() && tempEndDate?.getTime() === endDate?.getTime() && tempDuration === durationDays && tempDateMode === dateMode)
                  ? "bg-[#E5E5E5] text-[#949494] cursor-not-allowed"
                  : "bg-[#9DCC36] text-[#141530]"
              )}
            >
              Salvar
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* Destinations Sheet */}
      <BottomSheet open={showDestinationsPicker} onClose={() => setShowDestinationsPicker(false)} bodyClassName="p-0">
        <div className="flex flex-col items-start px-4 pb-[34px] pt-4 gap-[24px] w-full bg-[#FFFFFF] h-[70vh]">
          <h3 className="font-semibold text-[24px] leading-[28px] text-[#141530]">Alterar destinos</h3>
          
          <div className="flex flex-col gap-4 overflow-y-auto w-full flex-1">
            <div className="flex flex-col p-3 gap-2 w-full bg-field rounded-[12px] min-h-[60px]">
              <div className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#949494]"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                <span className="font-medium text-[12px] leading-[16px] text-[#949494]">Destinos</span>
              </div>
              {tempDestinations.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-1">
                  {tempDestinations.map((d) => (
                    <span key={d} className="bg-transparent border border-[#141530] flex items-center justify-center gap-1 px-3 py-1 rounded-[16px] font-medium text-[14px] leading-[16px] text-[#141530]">
                      {d}
                      <button onClick={() => handleRemoveTempDestination(d)} className="text-[#141530]">
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#949494]" />
              <input
                type="text"
                value={destinationInput}
                onChange={(e) => setDestinationInput(e.target.value)}
                placeholder="Buscar cidade..."
                className="w-full bg-[#EEEEEE] border-none rounded-[12px] pl-10 pr-4 py-3 h-[48px] text-[14px] font-medium text-[#141530] focus:outline-none"
              />
            </div>
            
            <div className="flex flex-col gap-2 mt-2">
              {remoteResults.map((r, i) => (
                <button
                  key={i}
                  onClick={() => handleAddTempDestination(r.full)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-[#DEDEDE] rounded-[12px] transition-colors text-left"
                >
                  <span className="text-xl">{r.emoji}</span>
                  <div className="flex flex-col">
                    <span className="font-semibold text-[#141530] text-[14px] leading-[16px]">{r.label}</span>
                    <span className="text-[#949494] text-[12px] leading-[16px]">{r.sub}</span>
                  </div>
                </button>
              ))}
              {isSearching && (
                <div className="text-center text-[14px] text-[#949494] py-4">
                  Buscando...
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => {
              setDestinations(tempDestinations);
              setShowDestinationsPicker(false);
              if (onSave) onSave({ tripName, coverImage: coverPreview || initialCoverImage, currency, startDate, endDate, destinations: tempDestinations });
            }}
            disabled={JSON.stringify(tempDestinations) === JSON.stringify(destinations)}
            className={cn(
              "w-full flex justify-center items-center py-3 px-4 h-[48px] rounded-[16px] font-bold text-[16px] leading-[19px] shrink-0",
              JSON.stringify(tempDestinations) === JSON.stringify(destinations) ? "bg-[#E5E5E5] text-[#949494] cursor-not-allowed" : "bg-[#9DCC36] text-[#141530]"
            )}
          >
            Salvar
          </button>
        </div>
      </BottomSheet>

      {/* Share Itinerary Sheet */}
      {showShareSheet && (
        <ShareItinerarySheet 
          open={true} 
          itineraryId={itineraryId} 
          ownerId={currentUserId} 
          onClose={async () => {
            setShowShareSheet(false);
            const p = await listPendingInvitesForItinerary(itineraryId);
            setPendingInvites(p);
          }} 
        />
      )}

      {/* Delete Confirmation Sheet */}
      <BottomSheet open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} bodyClassName="p-0">
        <div className="flex flex-col items-start px-4 pb-[34px] pt-4 gap-10 w-full">
          <div className="flex flex-col justify-center items-start gap-6 w-full">
            <img src="/confirm.png" alt="Confirmar exclusão" className="w-[114px] h-[118px] object-contain" />
            
            <div className="flex flex-col items-start gap-2 w-full">
              <h3 className="font-semibold text-[22px] leading-[26px] text-[#171F2C] text-left">
                Tem certeza que deseja excluir este roteiro?
              </h3>
              <p className="font-medium text-[14px] leading-[20px] text-[#7F7F7F] text-left">
                Ao excluir, você não poderá mais acessar ou editar este roteiro. Essa ação não pode ser desfeita.
              </p>
            </div>
          </div>

          <div className="flex flex-row items-start gap-4 w-full">
            <button 
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1 flex justify-center items-center h-12 rounded-[16px] border border-[#141530] font-bold text-[16px] leading-[19px] text-[#141530]"
            >
              Cancelar
            </button>
            <button 
              onClick={() => {
                setShowDeleteConfirm(false);
                onDelete?.();
              }}
              className="flex-1 flex justify-center items-center h-12 rounded-[16px] bg-[#9DCC36] font-bold text-[16px] leading-[19px] text-[#141530]"
            >
              Excluir
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* Gerenciar participante Sheet */}
      <BottomSheet open={!!actionMember} onClose={() => setActionMember(null)} bodyClassName="p-0">
        <div className="flex flex-col pb-[34px] px-[16px] gap-[24px]">
          <div className="flex items-center justify-between pt-[16px]">
            <h3 className="text-[24px] font-semibold text-[#171F2C] leading-[29px]">Gerenciar participante</h3>
          </div>
          
          {actionMember && (
            <>
              {/* User Info */}
              <div className="flex items-center gap-[8px]">
                <div className="w-[65px] h-[65px] rounded-full bg-slate-200 overflow-hidden flex items-center justify-center text-[20px] font-bold text-slate-600 shrink-0">
                  {actionMember.avatar ? (
                    <img src={actionMember.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    actionMember.name.substring(0, 2).toUpperCase()
                  )}
                </div>
                <div className="flex flex-col justify-center gap-[8px]">
                  <span className="font-semibold text-[18px] text-[#171F2C] leading-[22px]">{actionMember.name}</span>
                  <span className="font-medium text-[16px] text-[#646464] leading-[19px]">@{actionMember.username || actionMember.name.toLowerCase().replace(/\s/g, '')}</span>
                </div>
              </div>

              {isOwner ? (
                /* Admin View */
                <>
                  <div className="flex gap-[12px]">
                    <button 
                      onClick={() => setPendingRole('editor')}
                      className={cn("flex items-center justify-center px-[16px] py-[8px] h-[33px] rounded-[16px] border text-[14px] leading-[17px] font-medium transition-colors", 
                        pendingRole === 'editor' ? "bg-[#141530] border-[#141530] text-[#FEFEFE]" : "bg-white border-[#141530] text-[#141530]"
                      )}
                    >
                      Pode editar
                    </button>
                    <button 
                      onClick={() => setPendingRole('viewer')}
                      className={cn("flex items-center justify-center px-[16px] py-[8px] h-[33px] rounded-[16px] border text-[14px] leading-[17px] font-medium transition-colors", 
                        pendingRole === 'viewer' ? "bg-[#141530] border-[#141530] text-[#FEFEFE]" : "bg-white border-[#141530] text-[#141530]"
                      )}
                    >
                      Só visualizar
                    </button>
                  </div>

                  <div className="w-full h-[1px] bg-[#F2F2F2]" />

                  <button 
                    onClick={() => {
                      setActionMember(null);
                      setMemberToRemove(actionMember);
                    }}
                    className="flex items-center justify-between group active:scale-[0.98] transition-transform w-full h-[24px]"
                  >
                    <div className="flex items-center gap-[12px]">
                      <div className="w-[24px] h-[24px] flex items-center justify-center relative shrink-0">
                        <div className="absolute inset-0 rounded-full border-[1.5px] border-[#D00004]"></div>
                        <div className="w-3 h-3 rounded-full border-[1.5px] border-[#D00004]"></div>
                      </div>
                      <span className="font-semibold text-[16px] leading-[19px] text-[#D00004]">Remover participante</span>
                    </div>
                  </button>

                  <button 
                    onClick={handleSaveRole}
                    disabled={savingRole || actionMember.role === pendingRole}
                    className={cn("w-full flex items-center justify-center h-[48px] rounded-[16px] transition-colors mt-[8px]",
                      (savingRole || actionMember.role === pendingRole) 
                        ? "bg-[#B6B6B6] text-[#7F7F7F]" 
                        : "bg-[#141530] text-[#FEFEFE]"
                    )}
                  >
                    <span className="font-bold text-[16px] leading-[19px]">{savingRole ? 'Salvando...' : 'Salvar'}</span>
                  </button>
                </>
              ) : (
                /* Non-Admin View */
                <>
                  <div className="flex gap-[12px]">
                    <span className="flex items-center justify-center px-[16px] py-[8px] h-[33px] rounded-[16px] bg-[#141530] text-[#FEFEFE] text-[14px] leading-[17px] font-medium">
                      {actionMember.role === 'editor' ? 'Pode editar' : 'Só visualizar'}
                    </span>
                  </div>

                  <div className="w-full h-[1px] bg-[#F2F2F2]" />

                  <button 
                    onClick={() => {
                      setActionMember(null);
                      setMemberToLeave(actionMember);
                    }}
                    className="flex items-center justify-between group active:scale-[0.98] transition-transform w-full h-[24px]"
                  >
                    <div className="flex items-center gap-[12px]">
                      <div className="w-[24px] h-[24px] flex items-center justify-center relative shrink-0">
                        <div className="absolute inset-0 rounded-full border-[1.5px] border-[#D00004]"></div>
                        <div className="w-3 h-3 rounded-full border-[1.5px] border-[#D00004]"></div>
                      </div>
                      <span className="font-semibold text-[16px] leading-[19px] text-[#D00004]">Sair do roteiro</span>
                    </div>
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </BottomSheet>

      {/* Remove Participant Confirmation Sheet */}
      <BottomSheet open={!!memberToRemove} onClose={() => setMemberToRemove(null)} bodyClassName="p-0">
        <div className="flex flex-col items-start px-4 pb-[34px] pt-4 gap-10 w-full">
          <div className="flex flex-col justify-center items-start gap-6 w-full">
            <img src="/confirm.png" alt="Confirmar remoção" className="w-[114px] h-[118px] object-contain" />
            
            <div className="flex flex-col items-start gap-2 w-full">
              <h3 className="font-semibold text-[22px] leading-[26px] text-[#171F2C] text-left">
                Tem certeza que deseja remover este participante do roteiro?
              </h3>
              <p className="font-medium text-[14px] leading-[20px] text-[#7F7F7F] text-left">
                Essa pessoa perderá o acesso ao roteiro.
              </p>
            </div>
          </div>

          <div className="flex flex-row items-start gap-4 w-full">
            <button 
              onClick={() => setMemberToRemove(null)}
              className="flex-1 flex justify-center items-center h-12 rounded-[16px] border border-[#141530] font-bold text-[16px] leading-[19px] text-[#141530]"
            >
              Cancelar
            </button>
            <button 
              onClick={() => {
                const m = memberToRemove;
                setMemberToRemove(null);
                if (m) handleRemoveMember(m);
              }}
              className="flex-1 flex justify-center items-center h-12 rounded-[16px] bg-[#9DCC36] font-bold text-[16px] leading-[19px] text-[#141530]"
            >
              Remover
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* Leave Itinerary Confirmation Sheet */}
      <BottomSheet open={!!memberToLeave} onClose={() => setMemberToLeave(null)} bodyClassName="p-0">
        <div className="flex flex-col items-start px-4 pb-[34px] pt-4 gap-10 w-full">
          <div className="flex flex-col justify-center items-start gap-6 w-full">
            <img src="/confirm.png" alt="Confirmar saída" className="w-[114px] h-[118px] object-contain" />
            
            <div className="flex flex-col items-start gap-2 w-full">
              <h3 className="font-semibold text-[22px] leading-[26px] text-[#171F2C] text-left">
                Tem certeza que deseja sair deste roteiro?
              </h3>
              <p className="font-medium text-[14px] leading-[20px] text-[#7F7F7F] text-left">
                Você perderá o acesso ao roteiro, mas poderá ser convidado novamente.
              </p>
            </div>
          </div>

          <div className="flex flex-row items-start gap-4 w-full">
            <button 
              onClick={() => setMemberToLeave(null)}
              className="flex-1 flex justify-center items-center h-12 rounded-[16px] border border-[#141530] font-bold text-[16px] leading-[19px] text-[#141530]"
            >
              Cancelar
            </button>
            <button 
              onClick={() => {
                const m = memberToLeave;
                setMemberToLeave(null);
                if (m) handleLeaveItinerary(m);
              }}
              className="flex-1 flex justify-center items-center h-12 rounded-[16px] bg-[#9DCC36] font-bold text-[16px] leading-[19px] text-[#141530]"
            >
              Sair
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* Share Itinerary Sheet */}
      {itineraryId && itineraryId !== 'default' && (
        <ShareItinerarySheet
          open={showShareSheet}
          onClose={() => {
            setShowShareSheet(false);
            listPendingInvitesForItinerary(itineraryId).then(setPendingInvites).catch(console.error);
          }}
          onSuccess={(msg) => {
            setToastMessage(msg);
            setToastVisible(true);
            listPendingInvitesForItinerary(itineraryId).then(setPendingInvites).catch(console.error);
          }}
          itineraryId={itineraryId}
          ownerId={owner?.userId || currentUserId}
          tripName={tripName}
        />
      )}

      {/* Success Snackbar */}
      <SuccessToast
        isVisible={toastVisible}
        onClose={() => setToastVisible(false)}
        title={toastMessage}
        description=""
      />
    </div>
  );
}
