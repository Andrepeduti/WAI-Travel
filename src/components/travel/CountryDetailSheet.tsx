import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { CountryVisit } from '@/data/visitedCountries';
import { CountryAlbum } from './CountryAlbum';
import { Trash2 } from 'lucide-react';

interface CountryDetailSheetProps {
  country: CountryVisit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdatePhotos?: (countryCode: string, photos: string[]) => void;
  /** Quando fornecido, exibe a ação secundária de remover o país do passaporte. */
  onDeleteCountry?: (countryCode: string) => void;
}

export function CountryDetailSheet({ country, open, onOpenChange, onUpdatePhotos, onDeleteCountry }: CountryDetailSheetProps) {
  if (!country) return null;

  const handleAddPhoto = (url: string) => {
    onUpdatePhotos?.(country.code, [...country.photos, url]);
  };

  const handleRemovePhoto = (index: number) => {
    const updated = country.photos.filter((_, i) => i !== index);
    onUpdatePhotos?.(country.code, updated);
  };

  const handleReplacePhoto = (index: number, url: string) => {
    const updated = country.photos.map((photo, i) => (i === index ? url : photo));
    onUpdatePhotos?.(country.code, updated);
  };

  const handleDelete = () => {
    onDeleteCountry?.(country.code);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl px-5 pb-8 pt-3 max-h-[85vh] overflow-y-auto [&>button.absolute]:hidden">
        <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: 'hsl(var(--muted))' }} />

        <SheetHeader className="text-left mb-4">
          <div className="flex items-center gap-3">
            <span style={{ fontSize: '40px' }}>{country.flag}</span>
            <div>
              <SheetTitle className="text-left" style={{ fontSize: 'var(--text-xl)' }}>
                {country.name}
              </SheetTitle>
              <SheetDescription className="text-left">
                {country.dateRange}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Ação — excluir país do passaporte */}
        {onDeleteCountry && (
          <button
            type="button"
            onClick={handleDelete}
            className="mt-2 w-full flex items-center justify-center gap-2 py-3 rounded-full text-[14px] font-semibold active:scale-[0.99] transition-transform"
            style={{
              color: 'hsl(var(--destructive))',
              background: 'transparent',
              border: '1px solid hsl(var(--destructive) / 0.25)',
            }}
          >
            <Trash2 size={16} />
            Excluir
          </button>
        )}
      </SheetContent>
    </Sheet>
  );
}
