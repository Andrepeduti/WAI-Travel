import { useEffect, useMemo, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export interface Interest {
  label: string;
  icon: string;
}

export const INTEREST_CATALOG: Interest[] = [
  // Regiões
  { label: 'Europa', icon: 'public' },
  { label: 'Ásia', icon: 'public' },
  { label: 'América Latina', icon: 'public' },
  { label: 'América do Norte', icon: 'public' },
  { label: 'África', icon: 'public' },
  { label: 'Oceania', icon: 'public' },
  { label: 'Oriente Médio', icon: 'public' },
  
  // Cultura e História
  { label: 'Cultura', icon: 'auto_stories' },
  { label: 'História', icon: 'history_edu' },
  { label: 'Museus', icon: 'museum' },
  { label: 'Arte', icon: 'palette' },
  { label: 'Arquitetura', icon: 'apartment' },
  { label: 'Religião', icon: 'church' },
  { label: 'Festivais', icon: 'celebration' },
  { label: 'Teatro', icon: 'theater_comedy' },
  
  // Gastronomia
  { label: 'Gastronomia', icon: 'restaurant' },
  { label: 'Culinária Local', icon: 'set_meal' },
  { label: 'Café', icon: 'local_cafe' },
  { label: 'Vinhos', icon: 'local_bar' },
  { label: 'Cervejarias', icon: 'sports_bar' },
  { label: 'Bares', icon: 'liquor' },
  { label: 'Street Food', icon: 'lunch_dining' },
  
  // Natureza e Aventura
  { label: 'Aventura', icon: 'explore' },
  { label: 'Natureza', icon: 'park' },
  { label: 'Praia', icon: 'beach_access' },
  { label: 'Montanha', icon: 'landscape' },
  { label: 'Trilhas', icon: 'hiking' },
  { label: 'Surf', icon: 'surfing' },
  { label: 'Mergulho', icon: 'scuba_diving' },
  { label: 'Esqui', icon: 'downhill_skiing' },
  { label: 'Neve', icon: 'ac_unit' },
  { label: 'Escalada', icon: 'terrain' },
  { label: 'Camping', icon: 'tent' },
  { label: 'Safari', icon: 'pets' },
  { label: 'Ecoturismo', icon: 'eco' },
  
  // Estilo de Viagem e Outros
  { label: 'Música', icon: 'music_note' },
  { label: 'Vida noturna', icon: 'nightlife' },
  { label: 'Bem-estar', icon: 'spa' },
  { label: 'Compras', icon: 'shopping_bag' },
  { label: 'Mochilão', icon: 'backpack' },
  { label: 'Luxo', icon: 'diamond' },
  { label: 'Cruzeiros', icon: 'directions_boat' },
  { label: 'Roadtrip', icon: 'directions_car' },
  { label: 'Fotografia', icon: 'photo_camera' },
  { label: 'Viagem Solo', icon: 'person' },
  { label: 'Nômade Digital', icon: 'laptop_mac' },
];

interface EditInterestsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selected: Interest[];
  onSave: (next: Interest[]) => void;
  maxItems?: number;
}

export function EditInterestsSheet({
  open,
  onOpenChange,
  selected,
  onSave,
  maxItems = 12,
}: EditInterestsSheetProps) {
  const [draft, setDraft] = useState<Interest[]>(selected);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (open) {
      setDraft(selected);
      setSearch('');
    }
  }, [open, selected]);

  const draftLabels = useMemo(() => new Set(draft.map(d => d.label.toLowerCase())), [draft]);

  const filteredCatalog = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return INTEREST_CATALOG;
    return INTEREST_CATALOG.filter(i => i.label.toLowerCase().includes(q));
  }, [search]);

  const toggle = (interest: Interest) => {
    const isOn = draftLabels.has(interest.label.toLowerCase());
    if (isOn) {
      setDraft(draft.filter(d => d.label.toLowerCase() !== interest.label.toLowerCase()));
    } else {
      if (draft.length >= maxItems) {
        toast.error(`Máximo de ${maxItems} interesses.`);
        return;
      }
      setDraft([...draft, interest]);
    }
  };


  const handleSave = () => {
    onSave(draft);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="p-0 rounded-t-3xl border-0 max-h-[85vh] flex flex-col"
        style={{ background: '#FFFFFF' }}
      >
        <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: '#E5E5EA' }} />
        </div>

        <SheetHeader className="px-5 pb-3 flex-shrink-0">
          <div className="flex items-center justify-between w-full">
            <div className="flex flex-col items-start">
              <SheetTitle
                className="text-left"
                style={{ fontSize: 16, fontWeight: 700, color: '#1A1C40' }}
              >
                Editar interesses
              </SheetTitle>
              <p className="text-left text-xs mt-1" style={{ color: '#8E8E93' }}>
                {draft.length}/{maxItems} selecionados
              </p>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="inline-flex items-center justify-center w-8 h-8 rounded-full active:opacity-70"
              style={{ background: '#F2F2F7' }}
              aria-label="Fechar"
            >
              <Icon name="close" size={18} style={{ color: '#1A1C40' }} />
            </button>
          </div>
        </SheetHeader>

        <div className="px-5 pb-3 flex-shrink-0">
          <div className="relative">
            <Icon
              name="search"
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: '#8E8E93' }}
            />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar interesse"
              className="pl-9 pr-4 h-11 rounded-xl border-0"
              style={{ background: '#F2F2F7', fontSize: 14, color: '#1A1C40' }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-4">
          <div className="flex flex-wrap gap-2">
            {filteredCatalog.map(interest => {
              const active = draftLabels.has(interest.label.toLowerCase());
              return (
                <button
                  key={interest.label}
                  onClick={() => toggle(interest)}
                  className="inline-flex items-center gap-1.5 h-9 rounded-2xl px-3.5 transition-colors"
                  style={{
                    background: active ? '#1A1C40' : '#F2F2F7',
                    color: active ? '#FFFFFF' : '#1A1C40',
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  <Icon
                    name={interest.icon}
                    size={15}
                    style={{ color: active ? '#FFFFFF' : '#1A1C40' }}
                  />
                  {interest.label}
                  
                </button>
              );
            })}
            {filteredCatalog.length === 0 && (
              <p className="text-sm w-full text-center py-6" style={{ color: '#8E8E93' }}>
                Nenhum resultado encontrado.
              </p>
            )}
          </div>
        </div>

        <div
          className="px-5 pt-3 pb-5 flex-shrink-0 border-t"
          style={{ borderColor: '#F2F2F7' }}
        >
          <button
            onClick={handleSave}
            className="w-full h-12 rounded-xl"
            style={{ background: '#9DCC36', color: '#1A1C40', fontSize: 15, fontWeight: 700 }}
          >
            Salvar
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
