import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Camera, ChevronDown } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import { resolveNextRange } from '@/lib/dateRangeSelection';
import { BackButton } from '@/components/ui/BackButton';

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

interface EditItineraryDataScreenProps {
  onBack: () => void;
  tripName: string;
  coverImage?: string;
  isAutoCover?: boolean;
  startDate?: Date;
  endDate?: Date;
  currency?: string;
  description?: string;
  onSave: (data: {
    tripName: string;
    coverImage?: string;
    startDate?: Date;
    endDate?: Date;
    currency?: string;
    description?: string;
  }) => void;
}

const defaultCover = 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600';

export function EditItineraryDataScreen({
  onBack,
  tripName: initialName,
  coverImage: initialCover,
  isAutoCover = false,
  startDate: initialStart,
  endDate: initialEnd,
  currency: initialCurrency = 'BRL',
  description: initialDescription = '',
  onSave,
}: EditItineraryDataScreenProps) {
  const [tripName, setTripName] = useState(initialName);
  const [coverImage, setCoverImage] = useState(initialCover || defaultCover);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(
    initialStart ? { from: initialStart, to: initialEnd } : undefined
  );
  const [currency, setCurrency] = useState(initialCurrency);
  const [description, setDescription] = useState(initialDescription);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

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
    });
    onBack();
  };

  const selectedCurrency = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0];

  return (
    <div className="min-h-screen pb-28 bg-background" style={{ fontFamily: 'var(--font-family-primary)' }}>
      {/* Header */}
      <div className="px-4 pt-5 pb-4 flex items-center gap-3">
        <BackButton onClick={onBack} />
        <h1 className="text-[20px] font-bold text-foreground flex-1">Editar dados</h1>
      </div>

      {/* Cover image */}
      <div className="px-4 mb-6">
        <label className="text-[13px] font-medium text-foreground block mb-2">Capa do roteiro</label>
        <label className="relative rounded-2xl overflow-hidden h-[180px] block cursor-pointer active:scale-[0.98] transition-transform">
          <img src={coverPreview || coverImage} alt="Capa" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-white/80 flex items-center justify-center">
              <Camera size={22} className="text-foreground" />
            </div>
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>
        {isAutoCover && !coverPreview && (
          <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
            Capa selecionada automaticamente
          </p>
        )}
        {(!isAutoCover || coverPreview) && (
          <p className="text-[12px] text-muted-foreground mt-2">Toque para selecionar uma imagem da galeria</p>
        )}
      </div>

      {/* Trip name */}
      <div className="px-4 mb-6">
        <label className="text-[13px] font-medium text-foreground block mb-1.5">Nome do roteiro</label>
        <input
          type="text"
          value={tripName}
          onChange={e => setTripName(e.target.value)}
          placeholder="Ex: Férias em Paris"
          className="w-full px-4 py-3 rounded-xl border border-border bg-background text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Description */}
      <div className="px-4 mb-6">
        <label className="text-[13px] font-medium text-foreground block mb-1.5">Descrição</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Descreva brevemente sua viagem..."
          rows={3}
          className="w-full px-4 py-3 rounded-xl border border-border bg-background text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
        />
      </div>

      {/* Dates */}
      <div className="px-4 mb-6">
        <label className="text-[13px] font-medium text-foreground block mb-1.5">Datas da viagem</label>
        <Popover>
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
                const { range: next } = resolveNextRange(dateRange, range, day);
                setDateRange(next);
              }}
              locale={ptBR}
              scrollable
              className={cn("pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Currency */}
      <div className="px-4 mb-6">
        <label className="text-[13px] font-medium text-foreground block mb-1.5">Moeda padrão</label>
        <button
          onClick={() => setShowCurrencyPicker(true)}
          className="w-full px-4 py-3 rounded-xl border border-border bg-background text-[14px] text-left flex items-center justify-between"
        >
          <span className="text-foreground">{selectedCurrency.label}</span>
          <ChevronDown size={18} className="text-muted-foreground" />
        </button>
      </div>

      {/* Currency picker bottom sheet */}
      {showCurrencyPicker && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center" onClick={() => setShowCurrencyPicker(false)}>
          <div className="absolute inset-0 bg-black/40" style={{ animation: 'fadeIn 0.3s ease-out' }} />
          <div
            className="relative w-full max-w-[430px] bg-background rounded-t-2xl max-h-[60vh] flex flex-col"
            style={{ animation: 'slideUpSheet 0.35s cubic-bezier(0.32, 0.72, 0, 1)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-[#E0E0E0]" />
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
                  {currency === c.code && (
                    <Icon name="check" size={20} style={{ color: '#0A0E59' }} />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Fixed footer save button */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-background border-t border-border px-4 py-4 z-50">
        <button
          onClick={handleSave}
          className="w-full h-[41px] rounded-[16px] bg-primary text-primary-foreground font-semibold text-[14px] flex items-center justify-center gap-2 active:scale-[0.96] transition-transform"
        >
          Salvar
          
        </button>
      </div>
    </div>
  );
}
