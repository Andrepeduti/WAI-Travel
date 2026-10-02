import { useState, type ReactNode } from 'react';
import { HorizontalCarousel } from '@/components/travel/HorizontalCarousel';
import { Icon } from '@/components/ui/Icon';
import type { MySalesListing } from '@/hooks/use-my-sales-listings';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

interface MySalesSectionProps {
  listings: MySalesListing[];
  onListingClick?: (itineraryId: string) => void;
  onSeeAll?: () => void;
  /** "Impulsionar venda": recebe o roteiro centralizado no carrossel. */
  onBoost?: (itineraryId: string) => void;
}

function Stat({ label, children, valueClassName = 'text-[#141530]' }: { label: string; children: ReactNode; valueClassName?: string }) {
  return (
    <div className="bg-white rounded-[12px] p-3 flex flex-col gap-1 min-w-0">
      <span className="text-[14px] text-[#646464]">{label}</span>
      <span className={`text-[16px] font-bold truncate ${valueClassName}`}>{children}</span>
    </div>
  );
}

/**
 * "Seus roteiros à venda" — módulo fixo logo abaixo dos voláteis.
 * Visualizações/Conversão ficam "—" até existir contagem de visualizações.
 */
export function MySalesSection({ listings, onListingClick, onSeeAll, onBoost }: MySalesSectionProps) {
  // Roteiro centralizado no carrossel — é ele que o "Impulsionar venda" usa.
  const [activeIndex, setActiveIndex] = useState(0);

  if (listings.length === 0) return null;

  const selected = listings[Math.min(activeIndex, listings.length - 1)];

  return (
    // O <main> da Home só tem padding esquerdo: mr-4 completa os 16px laterais.
    <section className="mr-4 bg-[#FEFEFE] rounded-[16px] shadow-[0_4px_20px_rgba(0,0,0,0.1)] py-4 flex flex-col gap-4 overflow-hidden">
      <button type="button" onClick={onSeeAll} className="self-start px-4 text-[16px] font-medium text-[#141530]">
        Seus roteiros à venda
      </button>

      <div className="pl-4">
        <HorizontalCarousel showDots={false} itemClassName="w-[320px]" onActiveIndexChange={setActiveIndex}>
          {listings.map((listing) => (
            <button
              key={listing.itineraryId}
              type="button"
              onClick={() => onListingClick?.(listing.itineraryId)}
              className="w-[320px] bg-[#F2F2F2] rounded-[16px] p-4 flex flex-col gap-3 text-left active:scale-[0.99] transition-transform"
            >
              <div className="flex items-center gap-3 min-w-0">
                <img src={listing.image} alt={listing.title} className="w-[52px] h-[52px] rounded-[12px] object-cover flex-shrink-0" />
                <div className="min-w-0 flex flex-col gap-1">
                  <span className="text-[16px] font-semibold text-[#141530] truncate">{listing.title}</span>
                  {listing.rating > 0 && (
                    <span className="inline-flex items-center gap-1 text-[14px] text-[#141530]">
                      <Icon name="star" filled size={18} className="text-[#FDAC2A]" />
                      {listing.rating.toFixed(1).replace('.', ',')}
                    </span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Stat label="Vendas">{listing.salesCount}</Stat>
                <Stat label="Faturamento" valueClassName="text-[#3F8F2F]">{brl.format(listing.revenueCents / 100)}</Stat>
                <Stat label="Visualizações">—</Stat>
                <Stat label="Conversão">—</Stat>
              </div>
            </button>
          ))}
        </HorizontalCarousel>
      </div>

      <div className="px-4">
        <button
          type="button"
          onClick={() => onBoost?.(selected.itineraryId)}
          className="w-full h-12 rounded-[16px] border border-[#141530] text-[16px] font-semibold text-[#141530]"
        >
          Impulsionar venda
        </button>
      </div>
    </section>
  );
}
