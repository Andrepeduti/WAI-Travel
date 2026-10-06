import { Building2, Car, Flower2, Heart, Mountain, Trees, Users, type LucideIcon } from 'lucide-react';
import beachIcon from '@/assets/home/category-beach.svg';
import adventureIcon from '@/assets/home/category-adventure.svg';
import cultureIcon from '@/assets/home/category-culture.svg';
import foodIcon from '@/assets/home/category-food.svg';
import nightlifeIcon from '@/assets/home/category-nightlife.svg';

interface FeaturedCategory {
  tagId: string;
  label: string;
  /** Ícone do Figma (svg). */
  icon?: string;
  /** Ícone de traço no mesmo verde, para categorias sem svg do Figma. */
  Glyph?: LucideIcon;
}

/** Categorias em destaque na Home — ids das tags de publicação (`TAG_CATEGORIES`). */
const FEATURED_CATEGORIES: FeaturedCategory[] = [
  { tagId: 'praia', label: 'Praia', icon: beachIcon },
  { tagId: 'aventura', label: 'Aventura', icon: adventureIcon },
  { tagId: 'cultural', label: 'Cultura', icon: cultureIcon },
  { tagId: 'gastronomia', label: 'Gastrô', icon: foodIcon },
  { tagId: 'vida-noturna', label: 'Noturno', icon: nightlifeIcon },
  { tagId: 'montanha', label: 'Montanha', Glyph: Mountain },
  { tagId: 'natureza', label: 'Natureza', Glyph: Trees },
  { tagId: 'urbano', label: 'Urbano', Glyph: Building2 },
  { tagId: 'romance', label: 'Romance', Glyph: Heart },
  { tagId: 'relax', label: 'Relax', Glyph: Flower2 },
  { tagId: 'roadtrip', label: 'Roadtrip', Glyph: Car },
  { tagId: 'familia', label: 'Família', Glyph: Users },
];

interface HomeCategoriesProps {
  onCategoryClick?: (tagId: string) => void;
}

const tileClass = 'w-[65px] h-[65px] rounded-[8px] bg-white flex items-center justify-center';

export function HomeCategories({ onCategoryClick }: HomeCategoriesProps) {
  return (
    <section className="flex flex-col gap-4 pt-4 pb-10">
      <h2 className="px-4 text-[16px] font-semibold text-[#141530]">Explore pelas categorias</h2>
      <div className="flex gap-4 overflow-x-auto scrollbar-hide px-4">
        {FEATURED_CATEGORIES.map(({ tagId, label, icon, Glyph }) => (
          <button
            key={tagId}
            type="button"
            onClick={() => onCategoryClick?.(tagId)}
            className="flex flex-col items-center gap-2 flex-shrink-0 active:scale-95 transition-transform"
          >
            <span className={tileClass}>
              {icon ? (
                <img src={icon} alt="" width={32} height={32} />
              ) : Glyph ? (
                <Glyph size={32} strokeWidth={1.5} className="text-[#86B61F]" aria-hidden />
              ) : null}
            </span>
            <span className="text-[14px] font-medium text-[#141530]">{label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
