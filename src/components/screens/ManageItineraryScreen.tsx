import { useState, useEffect, useRef } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Camera, ChevronDown, UserPlus, MoreHorizontal, Pencil, Trash2, X, Crown, Eye, Copy } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import { resolveNextRange } from '@/lib/dateRangeSelection';
import { SuccessToast } from '@/components/travel/SuccessToast';
import { BackButton } from '@/components/ui/BackButton';
import { searchGooglePlacesAutocomplete } from '@/lib/googlePlacesApi';

// ─── Constants ───────────────────────────────────────────────────────────────

const CURRENCIES = [
  { code: 'BRL', label: 'Real (R$)', symbol: 'R$' },
  { code: 'USD', label: 'Dólar (US$)', symbol: 'US$' },
  { code: 'EUR', label: 'Euro (€)', symbol: '€' },
  { code: 'GBP', label: 'Libra (£)', symbol: '£' },
  { code: 'CZK', label: 'Coroa Tcheca (Kč)', symbol: 'Kč' },
  { code: 'HUF', label: 'Florim Húngaro (Ft)', symbol: 'Ft' },
  { code: 'PLN', label: 'Zloty Polonês (zł)', symbol: 'zł' },
  { code: 'ARS', label: 'Peso Argentino ($)', symbol: 'ARS$' },
  { code: 'CLP', label: 'Peso Chileno ($)', symbol: 'CLP$' },
  { code: 'JPY', label: 'Iene (¥)', symbol: '¥' },
];

interface Member {
  id: string;
  name: string;
  email: string;
  initials: string;
  color: string;
  role: 'owner' | 'editor' | 'viewer';
  avatar?: string;
}

const roleConfig = {
  owner: { label: 'Proprietário', icon: Crown, color: '#4A6B1A', bg: '#E8F5CC' },
  editor: { label: 'Editor', icon: Pencil, color: '#1E40AF', bg: '#DBEAFE' },
  viewer: { label: 'Visualizador', icon: Eye, color: '#374151', bg: '#F3F4F6' },
};

const memberColors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#EC4899', '#14B8A6', '#F97316'];

const getInitials = (name: string) => {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

// Members are now initialized dynamically from invitedFriends prop

// ─── Props ───────────────────────────────────────────────────────────────────

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
  invitedFriends?: InvitedFriend[];
  onSave: (data: {
    tripName: string;
    coverImage?: string;
    startDate?: Date;
    endDate?: Date;
    currency?: string;
    description?: string;
    destinations?: string[];
  }) => void;
}

const defaultCover = 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600';

// ─── City autocomplete (Google Places) ───────────────────────────────────────────

interface CitySuggestion {
  display_name: string;
}

function useCitySearch(query: string) {
  const [results, setResults] = useState<CitySuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    clearTimeout(timerRef.current);
    let active = true;
    timerRef.current = setTimeout(async () => {
      try {
        const predictions = await searchGooglePlacesAutocomplete(query, ['(cities)']);
        const mapped: CitySuggestion[] = predictions.map(p => ({
            display_name: p.location ? `${p.name}, ${p.location}` : p.name,
        }));
        if (active) setResults(mapped);
      } catch {
        if (active) setResults([]);
      } finally {
        if (active) setLoading(false);
      }
    }, 350);
    return () => {
      active = false;
      clearTimeout(timerRef.current);
    };
  }, [query]);

  return { results, loading };
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ManageItineraryScreen({
  onBack,
  tripName: initialName,
  coverImage: initialCover,
  isAutoCover = false,
  startDate: initialStart,
  endDate: initialEnd,
  currency: initialCurrency = 'BRL',
  description: initialDescription = '',
  destinations: initialDestinations = [],
  invitedFriends = [],
  onSave,
}: ManageItineraryScreenProps) {
  // ── Itinerary data state ──
  const [tripName, setTripName] = useState(initialName);
  const [coverImage, setCoverImage] = useState(initialCover || defaultCover);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(
    initialStart ? { from: initialStart, to: initialEnd } : undefined
  );
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [currency, setCurrency] = useState(initialCurrency);
  const [description, setDescription] = useState(initialDescription);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [destinations, setDestinations] = useState<string[]>(initialDestinations);
  const [newDestination, setNewDestination] = useState('');
  const [destinationFocused, setDestinationFocused] = useState(false);
  const { results: citySuggestions, loading: searchingCities } = useCitySearch(newDestination);

  // ── Members state ──
  const [members, setMembers] = useState<Member[]>(() => {
    const membersFromFriends = invitedFriends.map((f, i) => ({
      id: f.id,
      name: f.name,
      email: f.email,
      initials: getInitials(f.name),
      color: memberColors[(i + 1) % memberColors.length],
      role: 'editor' as const,
      avatar: f.avatar,
    }));
    return [
      { id: 'owner', name: 'Você', email: '', initials: 'VC', color: '#3B82F6', role: 'owner' as const },
      ...membersFromFriends,
    ];
  });
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [sheetRole, setSheetRole] = useState<'editor' | 'viewer'>('editor');
  const [showAddMember, setShowAddMember] = useState(false);
  const [showInviteSheet, setShowInviteSheet] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'editor' | 'viewer'>('editor');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState({ title: '', description: '' });

  const selectedCurrency = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0];

  const showToast = (title: string, desc: string) => {
    setToastMessage({ title, description: desc });
    setToastVisible(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setCoverPreview(url);
    setCoverImage(url);
  };

  const handleSave = () => {
    onSave({
      tripName,
      coverImage: coverPreview || coverImage,
      startDate: dateRange?.from,
      endDate: dateRange?.to,
      currency,
      description,
      destinations,
    });
    onBack();
  };

  const handleAddDestination = (value?: string) => {
    const v = (value ?? newDestination).trim();
    if (!v) return;
    if (destinations.includes(v)) {
      setNewDestination('');
      return;
    }
    setDestinations(prev => [...prev, v]);
    setNewDestination('');
    setDestinationFocused(false);
  };

  const handleRemoveDestination = (index: number) => {
    setDestinations(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddMember = () => {
    if (!newMemberName.trim()) return;
    const member: Member = {
      id: Date.now().toString(),
      name: newMemberName.trim(),
      email: newMemberEmail.trim(),
      initials: getInitials(newMemberName),
      color: memberColors[members.length % memberColors.length],
      role: newMemberRole,
    };
    setMembers(prev => [...prev, member]);
    setNewMemberName('');
    setNewMemberEmail('');
    setNewMemberRole('editor');
    setShowAddMember(false);
    showToast('Membro adicionado!', `${member.name} agora faz parte do roteiro`);
  };

  const handleDeleteMember = (id: string) => {
    const member = members.find(m => m.id === id);
    setMembers(prev => prev.filter(m => m.id !== id));
    setMenuOpen(null);
    showToast('Membro removido!', `${member?.name || 'Membro'} foi removido do roteiro`);
  };

  return (
    <div className="min-h-screen pb-28 bg-background" style={{ fontFamily: 'var(--font-family-primary)' }}>
      {/* Header */}
      <div className="sticky z-20 bg-background px-4 pb-4 flex items-center gap-3" style={{ paddingTop: 'calc(max(16px, env(safe-area-inset-top)) + 12px)' }}>
        <BackButton onClick={onBack} />
        <h1 className="text-[20px] font-bold text-foreground flex-1">Gerenciar roteiro</h1>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SECTION 1: INFORMAÇÕES DO ROTEIRO */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="px-4 mb-2">
        <h2 className="text-[16px] font-bold text-foreground">Informações</h2>
      </div>

      {/* Cover image */}
      <div className="px-4 mb-5">
        <label className="text-[13px] font-medium text-muted-foreground block mb-2">Capa do roteiro</label>
        <label className="relative rounded-2xl overflow-hidden h-[160px] block cursor-pointer active:scale-[0.98] transition-transform">
          <img src={coverPreview || coverImage} alt="Capa" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-white/80 flex items-center justify-center">
              <Camera size={22} className="text-foreground" />
            </div>
          </div>
          <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
        </label>
        {isAutoCover && !coverPreview && (
          <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
            Capa selecionada automaticamente
          </p>
        )}
      </div>

      {/* Trip name */}
      <div className="px-4 mb-5">
        <label className="text-[13px] font-medium text-muted-foreground block mb-1.5">Nome do roteiro</label>
        <input
          type="text"
          value={tripName}
          onChange={e => setTripName(e.target.value)}
          placeholder="Ex: Férias em Paris"
          className="w-full px-4 py-3 rounded-xl border border-border bg-background text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Description — hidden */}

      {/* Dates */}
      <div className="px-4 mb-5">
        <label className="text-[13px] font-medium text-muted-foreground block mb-1.5">Datas da viagem</label>
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <button className="w-full px-4 py-3 rounded-xl border border-border bg-background text-[14px] text-left flex items-center justify-between">
              <span className={dateRange?.from ? 'text-foreground' : 'text-muted-foreground'}>
                {dateRange?.from
                  ? `${format(dateRange.from, "dd MMM", { locale: ptBR })}${dateRange.to ? ` — ${format(dateRange.to, "dd MMM yyyy", { locale: ptBR })}` : ''}`
                  : 'Selecione as datas'}
              </span>
              <Icon name="calendar_today" size={18} className="text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="center">
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={(range, day) => {
                const { range: next, isComplete } = resolveNextRange(dateRange, range, day);
                setDateRange(next);
                if (isComplete) setIsCalendarOpen(false);
              }}
              locale={ptBR}
              scrollable
              className={cn("pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Currency */}
      <div className="px-4 mb-5">
        <label className="text-[13px] font-medium text-muted-foreground block mb-1.5">Moeda padrão</label>
        <button
          onClick={() => setShowCurrencyPicker(true)}
          className="w-full px-4 py-3 rounded-xl border border-border bg-background text-[14px] text-left flex items-center justify-between"
        >
          <span className="text-foreground">{selectedCurrency.label}</span>
          <ChevronDown size={18} className="text-muted-foreground" />
        </button>
      </div>

      {/* Fixed footer save button */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full w-full bg-background border-t border-border px-4 py-4 z-50">
        <button
          onClick={handleSave}
          className="w-full h-[41px] rounded-[16px] font-semibold text-[14px] flex items-center justify-center gap-2 active:scale-[0.96] transition-transform"
          style={{ background: '#9DCC36', color: '#1A1C40' }}
        >
          Salvar
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SHEETS / OVERLAYS */}
      {/* ═══════════════════════════════════════════════════════════════════ */}

      {/* Currency picker */}
      {showCurrencyPicker && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center" onClick={() => setShowCurrencyPicker(false)}>
          <div className="absolute inset-0 bg-black/40" style={{ animation: 'fadeIn 0.3s ease-out' }} />
          <div
            className="relative w-full w-full bg-background rounded-t-2xl max-h-[60vh] flex flex-col"
            style={{ animation: 'slideUpSheet 0.35s cubic-bezier(0.32, 0.72, 0, 1)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted" />
            </div>
            <div className="px-5 pb-3 pt-2">
              <h3 className="text-[18px] font-bold text-foreground">Selecionar moeda</h3>
            </div>
            <div className="overflow-y-auto px-5 pb-8">
              {CURRENCIES.map(c => (
                <button
                  key={c.code}
                  onClick={() => { setCurrency(c.code); setShowCurrencyPicker(false); }}
                  className={cn(
                    "w-full flex items-center gap-3 py-3.5 px-3 rounded-xl transition-colors",
                    currency === c.code ? "bg-primary/10" : "hover:bg-muted/50"
                  )}
                >
                  <span className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-[14px] font-bold text-foreground">
                    {c.symbol}
                  </span>
                  <span className={cn(
                    "text-[14px] flex-1 text-left",
                    currency === c.code ? "font-semibold text-foreground" : "font-medium text-foreground"
                  )}>
                    {c.label}
                  </span>
                  {currency === c.code && <Icon name="check" size={20} style={{ color: '#0A0E59' }} />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Member permission sheet */}
      {menuOpen && (() => {
        const member = members.find(m => m.id === menuOpen);
        if (!member) return null;
        return (
          <>
            <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setMenuOpen(null)} />
            <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center">
              <div className="bg-card rounded-t-3xl w-full w-full px-5 pt-3 animate-in slide-in-from-bottom duration-300 flex flex-col">
                <div className="flex justify-center mb-2">
                  <div className="w-10 h-1 rounded-full bg-muted" />
                </div>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[17px] font-bold text-foreground">Editar permissão</p>
                  <button onClick={() => setMenuOpen(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted/60 transition-colors">
                    <X size={20} className="text-muted-foreground" />
                  </button>
                </div>
                <div className="flex gap-2 mb-5">
                  <button
                    onClick={() => setSheetRole('editor')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold transition-colors"
                    style={sheetRole === 'editor' ? { background: '#1A1C40', color: '#fff' } : { background: '#F2F2F2', color: '#555' }}
                  >
                    <Pencil size={14} />
                    Editor
                  </button>
                  <button
                    onClick={() => setSheetRole('viewer')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold transition-colors"
                    style={sheetRole === 'viewer' ? { background: '#1A1C40', color: '#fff' } : { background: '#F2F2F2', color: '#555' }}
                  >
                    <Eye size={14} />
                    Visualizador
                  </button>
                </div>
                <button
                  onClick={() => { handleDeleteMember(member.id); setMenuOpen(null); }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-[14px] font-medium text-destructive active:bg-destructive/10 transition-colors"
                >
                  <Trash2 size={18} />
                  Remover participante
                </button>
                <div className="px-0 pt-4" style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom, 20px))' }}>
                  <button
                    onClick={() => {
                      setMembers(prev => prev.map(m => m.id === member.id ? { ...m, role: sheetRole } : m));
                      setMenuOpen(null);
                      showToast('Permissão alterada', `${member.name} agora é ${sheetRole === 'editor' ? 'Editor' : 'Visualizador'}`);
                    }}
                    className="w-full h-[41px] rounded-[16px] flex items-center justify-center font-semibold text-[15px] transition-colors active:opacity-90"
                    style={{ background: '#9DCC36', color: '#141530' }}
                  >
                    Salvar
                  </button>
                </div>
              </div>
            </div>
          </>
        );
      })()}

      {/* Add member sheet */}
      {showAddMember && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowAddMember(false)} />
          <div
            className="relative w-full w-full bg-card rounded-t-3xl p-6 pb-8"
            style={{ animation: 'slideUpSheet 0.35s cubic-bezier(0.32, 0.72, 0, 1)' }}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[18px] font-bold text-foreground">Convidar membro</h2>
              <button onClick={() => setShowAddMember(false)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <X size={18} className="text-foreground" />
              </button>
            </div>
            <div className="mb-4">
              <label className="text-[13px] font-medium text-foreground block mb-1.5">Nome</label>
              <input
                type="text"
                value={newMemberName}
                onChange={e => setNewMemberName(e.target.value)}
                placeholder="Ex: Maria Silva"
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="mb-4">
              <label className="text-[13px] font-medium text-foreground block mb-1.5">E-mail</label>
              <input
                type="email"
                value={newMemberEmail}
                onChange={e => setNewMemberEmail(e.target.value)}
                placeholder="Ex: maria@email.com"
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="mb-6">
              <label className="text-[13px] font-medium text-foreground block mb-2">Permissão</label>
              <div className="flex gap-2">
                {(['editor', 'viewer'] as const).map(role => {
                  const config = roleConfig[role];
                  const RIcon = config.icon;
                  return (
                    <button
                      key={role}
                      onClick={() => setNewMemberRole(role)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] font-medium transition-colors ${
                        newMemberRole === role ? 'bg-foreground text-background' : 'bg-muted text-foreground'
                      }`}
                    >
                      <RIcon size={14} />
                      {config.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <button
              onClick={handleAddMember}
              disabled={!newMemberName.trim()}
              className="w-full py-4 rounded-2xl font-semibold text-[15px] disabled:opacity-40 active:scale-[0.98] transition-transform"
              style={{ background: '#9DCC36', color: '#1A1C40' }}
            >
              Convidar
            </button>
          </div>
        </div>
      )}

      {/* Invite sheet */}
      {showInviteSheet && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowInviteSheet(false)} />
          <div
            className="relative w-full w-full bg-card rounded-t-3xl p-6 pb-8"
            style={{ animation: 'slideUpSheet 0.35s cubic-bezier(0.32, 0.72, 0, 1)' }}
          >
            <div className="flex justify-center pt-0 pb-3">
              <div className="w-10 h-1 rounded-full bg-muted" />
            </div>
            <h2 className="text-[18px] font-bold text-foreground mb-1">Convidar pessoas</h2>
            <p className="text-[13px] text-muted-foreground mb-5">Escolha como quer convidar</p>
            <div className="space-y-2 mb-5">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/invite/edit-abc123`);
                  setShowInviteSheet(false);
                  showToast('Link copiado!', 'Link de edição copiado para a área de transferência');
                }}
                className="w-full flex items-center gap-3.5 p-4 rounded-xl bg-muted/50 border border-border hover:bg-muted transition-colors"
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#EEF2FF' }}>
                  <Pencil size={18} style={{ color: '#3B82F6' }} />
                </div>
                <div className="flex-1 text-left">
                  <span className="text-[14px] font-semibold text-foreground block">Link de edição</span>
                  <span className="text-[12px] text-muted-foreground">Quem acessar poderá editar o roteiro</span>
                </div>
                <Copy size={16} className="text-muted-foreground flex-shrink-0" />
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/invite/view-abc123`);
                  setShowInviteSheet(false);
                  showToast('Link copiado!', 'Link de visualização copiado para a área de transferência');
                }}
                className="w-full flex items-center gap-3.5 p-4 rounded-xl bg-muted/50 border border-border hover:bg-muted transition-colors"
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#F3F4F6' }}>
                  <Eye size={18} style={{ color: '#6B7280' }} />
                </div>
                <div className="flex-1 text-left">
                  <span className="text-[14px] font-semibold text-foreground block">Link de visualização</span>
                  <span className="text-[12px] text-muted-foreground">Quem acessar poderá apenas ver</span>
                </div>
                <Copy size={16} className="text-muted-foreground flex-shrink-0" />
              </button>
            </div>
            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[12px] text-muted-foreground">ou</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <button
              onClick={() => {
                setShowInviteSheet(false);
                setNewMemberName('');
                setNewMemberEmail('');
                setNewMemberRole('editor');
                setShowAddMember(true);
              }}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-dashed border-border text-[14px] font-medium text-foreground hover:bg-muted/30 transition-colors"
            >
              <UserPlus size={18} />
              Adicionar manualmente
            </button>
          </div>
        </div>
      )}

      <SuccessToast
        isVisible={toastVisible}
        onClose={() => setToastVisible(false)}
        title={toastMessage.title}
        description={toastMessage.description}
      />
    </div>
  );
}
