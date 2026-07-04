import { useState, useRef, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { format, addDays, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';
import { resolveNextRange } from '@/lib/dateRangeSelection';
import { BackButton } from '@/components/ui/BackButton';
import { supabase } from '@/integrations/supabase/client';
import { searchGooglePlacesAutocomplete } from '@/lib/googlePlacesApi';

export interface ItineraryFormData {
  destinations: string[];
  startDate: Date | undefined;
  endDate: Date | undefined;
  invitedFriends: InvitedFriend[];
  /** User-edited title (overrides auto-generated one) */
  tripName?: string;
  /** User-uploaded cover image URL */
  coverImage?: string;
  /** Whether this itinerary is published to the marketplace */
  isPublic?: boolean;
  /** Price in cents when published */
  priceCents?: number | null;
  /** Public marketplace description */
  description?: string;
  /** Up to 5 thematic tags */
  tags?: string[];
  /** Primary highlighted tag */
  mainTag?: string;
}

interface InvitedFriend {
  id: string;
  name: string;
  email: string;
  username?: string;
  avatar?: string;
  status: 'pending' | 'accepted';
}

interface FriendSuggestion {
  user_id: string;
  name: string;
  username: string | null;
  avatar_url: string;
  email: string;
}

interface CreateItinerarySheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ItineraryFormData) => void | Promise<void>;
  initialDestinations?: string[];
}

// List of popular destinations
const popularDestinations = [
  { city: 'Paris', country: 'França', emoji: '🇫🇷', altCity: 'Paris', altCountry: 'France' },
  { city: 'Londres', country: 'Reino Unido', emoji: '🇬🇧', altCity: 'London', altCountry: 'United Kingdom' },
  { city: 'Roma', country: 'Itália', emoji: '🇮🇹', altCity: 'Rome', altCountry: 'Italy' },
  { city: 'Barcelona', country: 'Espanha', emoji: '🇪🇸', altCity: 'Barcelona', altCountry: 'Spain' },
  { city: 'Amsterdam', country: 'Países Baixos', emoji: '🇳🇱', altCity: 'Amsterdam', altCountry: 'Netherlands' },
  { city: 'Berlim', country: 'Alemanha', emoji: '🇩🇪', altCity: 'Berlin', altCountry: 'Germany' },
  { city: 'Praga', country: 'República Tcheca', emoji: '🇨🇿', altCity: 'Prague', altCountry: 'Czech Republic' },
  { city: 'Viena', country: 'Áustria', emoji: '🇦🇹', altCity: 'Vienna', altCountry: 'Austria' },
  { city: 'Lisboa', country: 'Portugal', emoji: '🇵🇹', altCity: 'Lisbon', altCountry: 'Portugal' },
  { city: 'Budapeste', country: 'Hungria', emoji: '🇭🇺', altCity: 'Budapest', altCountry: 'Hungary' },
  { city: 'Tóquio', country: 'Japão', emoji: '🇯🇵', altCity: 'Tokyo', altCountry: 'Japan' },
  { city: 'Nova York', country: 'Estados Unidos', emoji: '🇺🇸', altCity: 'New York', altCountry: 'United States' },
  { city: 'Sydney', country: 'Austrália', emoji: '🇦🇺', altCity: 'Sydney', altCountry: 'Australia' },
  { city: 'Dubai', country: 'Emirados Árabes', emoji: '🇦🇪', altCity: 'Dubai', altCountry: 'United Arab Emirates' },
  { city: 'Bangkok', country: 'Tailândia', emoji: '🇹🇭', altCity: 'Bangkok', altCountry: 'Thailand' },
  { city: 'Singapura', country: 'Singapura', emoji: '🇸🇬', altCity: 'Singapore', altCountry: 'Singapore' },
  { city: 'São Paulo', country: 'Brasil', emoji: '🇧🇷', altCity: 'Sao Paulo', altCountry: 'Brazil' },
  { city: 'Rio de Janeiro', country: 'Brasil', emoji: '🇧🇷', altCity: 'Rio de Janeiro', altCountry: 'Brazil' },
  { city: 'Buenos Aires', country: 'Argentina', emoji: '🇦🇷', altCity: 'Buenos Aires', altCountry: 'Argentina' },
  { city: 'Cidade do México', country: 'México', emoji: '🇲🇽', altCity: 'Mexico City', altCountry: 'Mexico' },
  { city: 'Cairo', country: 'Egito', emoji: '🇪🇬', altCity: 'Cairo', altCountry: 'Egypt' },
  { city: 'Marrakech', country: 'Marrocos', emoji: '🇲🇦', altCity: 'Marrakech', altCountry: 'Morocco' },
  { city: 'Cape Town', country: 'África do Sul', emoji: '🇿🇦', altCity: 'Cape Town', altCountry: 'South Africa' },
  { city: 'Atenas', country: 'Grécia', emoji: '🇬🇷', altCity: 'Athens', altCountry: 'Greece' },
  { city: 'Istambul', country: 'Turquia', emoji: '🇹🇷', altCity: 'Istanbul', altCountry: 'Turkey' },
];

export function CreateItinerarySheet({ isOpen, onClose, onSubmit, initialDestinations }: CreateItinerarySheetProps) {
  const [destinations, setDestinations] = useState<string[]>(initialDestinations ?? []);
  const [destinationInput, setDestinationInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [remoteResults, setRemoteResults] = useState<{ label: string; sub: string; full: string; emoji: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [tripName, setTripName] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [friendInput, setFriendInput] = useState('');
  const [invitedFriends, setInvitedFriends] = useState<InvitedFriend[]>([]);
  const [friendSuggestions, setFriendSuggestions] = useState<FriendSuggestion[]>([]);
  const [isSearchingFriends, setIsSearchingFriends] = useState(false);
  const [showFriendSuggestions, setShowFriendSuggestions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const friendInputRef = useRef<HTMLInputElement>(null);
  const friendSuggestionsRef = useRef<HTMLDivElement>(null);

  // Filter destinations based on input
  const filteredDestinations = popularDestinations.filter(dest => {
    const search = destinationInput.toLowerCase();
    const fullName = `${dest.city}, ${dest.country}`;
    return (
      !destinations.includes(fullName) &&
      (dest.city.toLowerCase().includes(search) || 
       dest.country.toLowerCase().includes(search) ||
       dest.altCity.toLowerCase().includes(search) ||
       dest.altCountry.toLowerCase().includes(search))
    );
  });
  // Sync initial destinations when prop changes
  useEffect(() => {
    if (initialDestinations && initialDestinations.length > 0) {
      setDestinations(initialDestinations);
    }
  }, [initialDestinations]);


  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mapeia código de país (ISO 3166-1 alpha-2) -> emoji bandeira
  const countryCodeToEmoji = (code?: string) => {
    if (!code || code.length !== 2) return '🌍';
    const cc = code.toUpperCase();
    return String.fromCodePoint(...cc.split('').map(c => 0x1f1e6 - 65 + c.charCodeAt(0)));
  };

  // Busca cidades do mundo inteiro via Google Places com debounce
  useEffect(() => {
    const query = destinationInput.trim();
    if (query.length < 2) {
      setRemoteResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    let active = true;
    const timeout = setTimeout(async () => {
      try {
        const predictions = await searchGooglePlacesAutocomplete(query, ['(cities)']);
        
        const seen = new Set<string>();
        
        const mapped = predictions
          .map((p) => {
            const cityName = p.name;
            const sub = p.location || '';
            const full = sub ? `${cityName}, ${sub}` : cityName;
            return {
              label: cityName,
              sub: sub,
              full: full,
              emoji: '📍',
            };
          })
          .filter((r) => {
            if (destinations.includes(r.full)) return false;
            const key = r.full.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          })
          .slice(0, 8);
          
        if (active) setRemoteResults(mapped);
      } catch (err) {
        if (active) setRemoteResults([]);
      } finally {
        if (active) setIsSearching(false);
      }
    }, 1000);
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [destinationInput, destinations]);

  const handleAddDestination = (destination: string) => {
    if (!destinations.includes(destination)) {
      setDestinations([...destinations, destination]);
    }
    setDestinationInput('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && destinationInput.trim()) {
      e.preventDefault();
      // Apenas cidades: aceita sugestão remota (Google) ou item da lista popular.
      // Não aceita texto livre para evitar destinos genéricos (ex: "Japão").
      if (remoteResults.length > 0) {
        handleAddDestination(remoteResults[0].full);
      } else if (filteredDestinations.length > 0) {
        const first = filteredDestinations[0];
        handleAddDestination(`${first.city}, ${first.country}`);
      }
    }
  };

  const handleRemoveDestination = (dest: string) => {
    setDestinations(destinations.filter(d => d !== dest));
  };

  const handleSelectFriend = (s: FriendSuggestion) => {
    if (invitedFriends.some(f => f.id === s.user_id)) return;
    const newFriend: InvitedFriend = {
      id: s.user_id,
      name: s.name || s.username || 'Usuário',
      email: s.email || '',
      username: s.username || undefined,
      avatar: s.avatar_url || undefined,
      status: 'pending',
    };
    setInvitedFriends([...invitedFriends, newFriend]);
    setFriendInput('');
    setFriendSuggestions([]);
    setShowFriendSuggestions(false);
    friendInputRef.current?.focus();
  };

  const handleRemoveFriend = (id: string) => {
    setInvitedFriends(invitedFriends.filter(f => f.id !== id));
  };

  // Live search profiles by name or @username
  useEffect(() => {
    const raw = friendInput.trim();
    const query = raw.replace(/^@+/, '');
    if (query.length < 2) {
      setFriendSuggestions([]);
      setIsSearchingFriends(false);
      return;
    }
    
    setIsSearchingFriends(true);
    let active = true;
    
    const timeout = setTimeout(async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const meId = authData?.user?.id;
        
        // Fetch users similar to FindPeopleScreen, filtering locally to avoid .or() syntax errors with special chars
        const { data, error } = await supabase
          .from('profiles_public')
          .select('user_id, name, username, avatar_url')
          .limit(100);
          
        if (!active) return;
        
        if (error || !data) {
          console.error('Error fetching profiles:', error);
          setFriendSuggestions([]);
        } else {
          const q = query.toLowerCase();
          const filtered = data
            .filter((p: any) => {
              if (p.user_id === meId) return false;
              if (invitedFriends.some(f => f.id === p.user_id)) return false;
              
              const nameMatch = p.name && p.name.toLowerCase().includes(q);
              const userMatch = p.username && p.username.toLowerCase().includes(q);
              return nameMatch || userMatch;
            })
            .slice(0, 8);
            
          setFriendSuggestions(filtered as FriendSuggestion[]);
        }
      } catch (err) {
        console.error('Exception during friend search:', err);
        if (active) setFriendSuggestions([]);
      } finally {
        if (active) setIsSearchingFriends(false);
      }
    }, 250);
    
    return () => { 
      active = false; 
      clearTimeout(timeout); 
    };
  }, [friendInput, invitedFriends]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (
        friendSuggestionsRef.current && !friendSuggestionsRef.current.contains(e.target as Node) &&
        friendInputRef.current && !friendInputRef.current.contains(e.target as Node)
      ) {
        setShowFriendSuggestions(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);


  const handleDateSelect = (range: DateRange | undefined, day: Date) => {
    const currentRange: DateRange | undefined = startDate ? { from: startDate, to: endDate } : undefined;
    const { range: next, isComplete } = resolveNextRange(currentRange, range, day);
    setStartDate(next?.from);
    setEndDate(next?.to);
    if (isComplete) {
      setIsCalendarOpen(false);
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSubmit({
        destinations,
        startDate,
        endDate,
        invitedFriends,
        tripName: tripName.trim() || undefined,
      });
      setIsSubmitting(false);
    } catch {
      setIsSubmitting(false);
    }
  };

  const formatDateRange = () => {
    if (startDate && endDate) {
      return `${format(startDate, "d 'de' MMM.", { locale: ptBR })} - ${format(endDate, "d 'de' MMM.", { locale: ptBR })}`;
    }
    if (startDate) {
      return format(startDate, "d 'de' MMM.", { locale: ptBR });
    }
    return '';
  };

  const isFormValid =
    tripName.trim().length > 0 &&
    destinations.length > 0 &&
    !!startDate &&
    !!endDate;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 z-40 transition-opacity"
        onClick={onClose}
      />
      
      {/* Bottom Sheet */}
      <div 
        className="fixed bottom-0 left-0 right-0 z-50 flex justify-center"
        style={{ fontFamily: 'var(--font-family-primary)' }}
      >
        <div className="bg-background rounded-t-3xl w-full max-w-[430px] max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
          {/* Handle */}
          <div className="flex justify-center py-3 sticky top-0 bg-background z-10">
            <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
          </div>
          
          {/* Header with back button */}
          <div className="px-6 pb-4" style={{ paddingTop: 'calc(max(16px, env(safe-area-inset-top)) + 12px)' }}>
            <BackButton onClick={onClose} />
            <h2 className="text-xl font-bold text-foreground my-0 mt-[24px]">Criar Roteiro</h2>
          </div>
          
          {/* Content */}
          <div className="px-6 pb-8 space-y-6">
            {/* Trip name */}
            <div>
              <label className="text-sm font-semibold text-foreground mb-2 block">Nome do roteiro</label>
              <div className="flex items-center gap-2 px-4 py-3 border border-border rounded-2xl">
                <Icon name="edit" size={20} className="text-muted-foreground flex-shrink-0" />
                <input
                  type="text"
                  value={tripName}
                  onChange={(e) => setTripName(e.target.value.slice(0, 80))}
                  placeholder="Ex: Lua de mel em Paris"
                  maxLength={80}
                  className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
                />
              </div>
            </div>

            {/* Destinations */}
            <div className="relative">
              <label className="text-sm font-semibold text-foreground mb-2 block">Destinos</label>
              <div className="flex items-center gap-2 px-4 py-3 border border-border rounded-2xl">
                <Icon name="location_on" size={20} className="text-muted-foreground flex-shrink-0" />
                <div className="flex flex-wrap items-center gap-2 flex-1">
                  {destinations.map((dest) => (
                    <span 
                      key={dest}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-muted rounded-full text-sm"
                    >
                      {dest}
                      <button 
                        onClick={() => handleRemoveDestination(dest)}
                        className="hover:text-destructive"
                      >
                        <Icon name="close" size={14} />
                      </button>
                    </span>
                  ))}
                  <input
                    ref={inputRef}
                    type="text"
                    value={destinationInput}
                    onChange={(e) => {
                      setDestinationInput(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onKeyDown={handleKeyDown}
                    placeholder={destinations.length === 0 ? "Adicionar destino..." : ""}
                    className="flex-1 min-w-[120px] bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
                  />
                </div>
              </div>
              
              {/* Suggestions Dropdown */}
              {showSuggestions && (destinationInput.length > 0 || destinations.length === 0) && (
                <div 
                  ref={suggestionsRef}
                  className="absolute left-0 right-0 mt-2 bg-background border border-border rounded-xl shadow-lg z-50 max-h-[260px] overflow-y-auto"
                >
                  {/* Resultados globais via Google quando há texto */}
                  {destinationInput.trim().length >= 2 && remoteResults.length > 0 && (
                    remoteResults.map((dest, idx) => (
                      <button
                        key={`remote-${dest.full}-${idx}`}
                        onClick={() => handleAddDestination(dest.full)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left"
                      >
                        <span className="text-lg">{dest.emoji}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{dest.label}</p>
                          {dest.sub && <p className="text-xs text-muted-foreground truncate">{dest.sub}</p>}
                        </div>
                      </button>
                    ))
                  )}

                  {/* Lista popular como fallback inicial (sem texto) */}
                  {destinationInput.trim().length < 2 && filteredDestinations.length > 0 && (
                    filteredDestinations.slice(0, 8).map((dest) => (
                      <button
                        key={`${dest.city}-${dest.country}`}
                        onClick={() => handleAddDestination(`${dest.city}, ${dest.country}`)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left"
                      >
                        <span className="text-lg">{dest.emoji}</span>
                        <div>
                          <p className="text-sm font-medium text-foreground">{dest.city}</p>
                          <p className="text-xs text-muted-foreground">{dest.country}</p>
                        </div>
                      </button>
                    ))
                  )}

                  {/* Loading */}
                  {destinationInput.trim().length >= 2 && isSearching && remoteResults.length === 0 && (
                    <div className="px-4 py-3 text-xs text-muted-foreground">Buscando destinos...</div>
                  )}

                  {/* Nenhuma cidade encontrada */}
                  {destinationInput.trim().length >= 2 && !isSearching && remoteResults.length === 0 && (
                    <div className="px-4 py-3 text-xs text-muted-foreground">
                      Nenhuma cidade encontrada. Tente outro termo.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Date */}
            <div>
              <label className="text-sm font-semibold text-foreground mb-2 block">Data da viagem</label>
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <button className="w-full flex items-center gap-2 px-4 py-3 border border-border rounded-2xl text-left">
                    <Icon name="calendar_today" size={20} className="text-muted-foreground flex-shrink-0" />
                    <span className={cn(
                      "text-sm",
                      !startDate && "text-muted-foreground"
                    )}>
                      {formatDateRange() || "Ex: 14 de jun. - 21 de jun."}
                    </span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={{ from: startDate, to: endDate }}
                    onSelect={handleDateSelect}
                    disabled={(date) => date < new Date()}
                    initialFocus
                    scrollable
                    className={cn("pointer-events-auto")}
                  />
                  {startDate && !endDate && (
                    <p className="px-3 pb-3 text-xs text-muted-foreground">
                      Selecione a data de término
                    </p>
                  )}
                </PopoverContent>
              </Popover>
            </div>

            {/* Invite friends */}
            <div className="relative">
              <label className="text-sm font-semibold text-foreground mb-2 block">Convidar amigos</label>
              <div className="flex items-center gap-2 px-4 py-3 border border-border rounded-2xl">
                <Icon name="person_add" size={20} className="text-muted-foreground flex-shrink-0" />
                <input
                  ref={friendInputRef}
                  type="text"
                  value={friendInput}
                  onChange={(e) => { setFriendInput(e.target.value); setShowFriendSuggestions(true); }}
                  onFocus={() => setShowFriendSuggestions(true)}
                  placeholder="Buscar por nome ou @usuário"
                  className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
                />
              </div>

              {/* Suggestions dropdown */}
              {showFriendSuggestions && friendInput.trim().replace(/^@+/, '').length >= 2 && (
                <div
                  ref={friendSuggestionsRef}
                  className="absolute left-0 right-0 mt-2 bg-background border border-border rounded-xl shadow-lg z-50 max-h-[260px] overflow-y-auto"
                >
                  {isSearchingFriends && friendSuggestions.length === 0 && (
                    <div className="px-4 py-3 text-xs text-muted-foreground">Buscando pessoas...</div>
                  )}
                  {!isSearchingFriends && friendSuggestions.length === 0 && (
                    <div className="px-4 py-3 text-xs text-muted-foreground">Nenhuma pessoa encontrada</div>
                  )}
                  {friendSuggestions.map((s) => (
                    <button
                      key={s.user_id}
                      onClick={() => handleSelectFriend(s)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left"
                    >
                      <div className="w-9 h-9 rounded-full bg-muted overflow-hidden flex items-center justify-center flex-shrink-0">
                        {s.avatar_url ? (
                          <img src={s.avatar_url} alt={s.name} className="w-full h-full object-cover" />
                        ) : (
                          <Icon name="person" size={18} className="text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{s.name || s.username}</p>
                        {s.username && <p className="text-xs text-muted-foreground truncate">@{s.username}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Invited friends list */}
              {invitedFriends.length > 0 && (
                <div className="mt-3 space-y-2">
                  {invitedFriends.map((friend) => (
                    <div
                      key={friend.id}
                      className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl"
                    >
                      <div className="w-10 h-10 rounded-full bg-muted overflow-hidden flex items-center justify-center">
                        {friend.avatar ? (
                          <img src={friend.avatar} alt={friend.name} className="w-full h-full object-cover" />
                        ) : (
                          <Icon name="person" size={20} className="text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{friend.name}</p>
                        {friend.username && <p className="text-xs text-muted-foreground truncate">@{friend.username}</p>}
                      </div>
                      <button
                        onClick={() => handleRemoveFriend(friend.id)}
                        className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center flex-shrink-0"
                        aria-label="Remover"
                      >
                        <Icon name="close" size={16} className="text-muted-foreground" />
                      </button>
                    </div>
                  ))}
                </div>

              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 pb-8 sticky bottom-0 bg-background">
            <button
              onClick={handleSubmit}
              disabled={!isFormValid || isSubmitting}
              className="w-full py-4 rounded-2xl text-base font-semibold transition-colors flex items-center justify-center gap-2"
              style={{
                background: isFormValid ? '#9DCC36' : '#D1D5DB',
                color: isFormValid ? '#1A1C40' : '#FFFFFF',
              }}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Criando...
                </>
              ) : (
                'Criar Roteiro'
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
