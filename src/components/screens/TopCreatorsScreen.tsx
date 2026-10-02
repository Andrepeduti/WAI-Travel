import { useMemo, useState, type ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';
import { BackButton } from '@/components/ui/BackButton';
import { Skeleton } from '@/components/ui/skeleton';
import { DEFAULT_AVATAR_URL } from '@/components/ui/UserAvatar';
import { useTopCreators, type TopCreator } from '@/hooks/use-top-creators';
import waiBalloon from '@/assets/home/wai-balloon.svg';

const MAX_FLAGS = 6;

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const plural = (n: number, singular: string, pluralForm: string) => `${n} ${n === 1 ? singular : pluralForm}`;

interface TopCreatorsScreenProps {
  onBack: () => void;
  onViewProfile?: (creator: TopCreator) => void;
}

export function TopCreatorsScreen({ onBack, onViewProfile }: TopCreatorsScreenProps) {
  const { creators, loading } = useTopCreators(50);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = norm(search.trim());
    if (!q) return creators;
    return creators.filter((c) => norm(c.name).includes(q) || norm(c.username).includes(q));
  }, [creators, search]);

  return (
    <div className="min-h-[100dvh] bg-[#F3F3F3] flex flex-col pb-8">
      <header
        className="sticky top-0 z-20 bg-[#F3F3F3] px-4 pb-6 flex flex-col gap-6"
        style={{ paddingTop: 'calc(max(16px, env(safe-area-inset-top)) + 12px)' }}
      >
        <div className="flex items-center gap-4">
          <BackButton onClick={onBack} className="bg-transparent shadow-none" />
          <h1 className="text-[20px] font-bold text-[#171F2C]">Criadores em alta</h1>
        </div>
        <label className="w-full flex items-center gap-2 p-4 rounded-[12px] bg-white border border-[#FEFEFE]">
          <Icon name="search" size={16} className="text-[#7F7F7F]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Busque por criadores"
            className="flex-1 min-w-0 !bg-transparent text-[14px] font-medium text-[#141530] placeholder:text-[#7F7F7F] outline-none"
          />
          {search && (
            <button type="button" onClick={() => setSearch('')} aria-label="Limpar busca">
              <Icon name="close" size={16} className="text-[#7F7F7F]" />
            </button>
          )}
        </label>
      </header>

      <main className="px-4 flex flex-col gap-6">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="w-full h-[220px] rounded-[16px]" />)
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Icon name="search" size={28} className="text-[#7F7F7F] mb-3" />
            <p className="text-[16px] font-semibold text-[#141530]">Nenhum criador encontrado</p>
            <p className="text-[14px] text-[#646464] mt-1">Tente buscar por outro nome.</p>
          </div>
        ) : (
          filtered.map((creator) => (
            <CreatorCard key={creator.userId} creator={creator} onViewProfile={() => onViewProfile?.(creator)} />
          ))
        )}
      </main>
    </div>
  );
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex-1 min-w-0 flex flex-col gap-0.5">
      <span className="text-[12px] font-medium text-[#646464]">{label}</span>
      <span className="text-[14px] font-semibold text-[#080B43] truncate">{children}</span>
    </div>
  );
}

function CreatorCard({ creator, onViewProfile }: { creator: TopCreator; onViewProfile: () => void }) {
  const flags = creator.countries.slice(0, MAX_FLAGS);
  const hiddenFlags = creator.countries.length - flags.length;

  return (
    <article className="w-full flex flex-col">
      <div className="relative bg-[#0A0E59] rounded-t-[16px] p-4 overflow-hidden">
        <img
          src={waiBalloon}
          alt=""
          width={102}
          height={102}
          className="absolute left-[-7px] top-[-2px] w-[102px] h-[102px] -rotate-[6.35deg] pointer-events-none"
        />
        <div className="relative flex items-center gap-3">
          <img
            src={creator.avatar || DEFAULT_AVATAR_URL}
            alt={creator.name}
            className="w-[60px] h-[60px] rounded-full object-cover flex-shrink-0 border-[3px] border-[#9DCC36] bg-[#E2EECE]"
          />
          <div className="flex-1 min-w-0 flex flex-col gap-2">
            <div className="flex flex-col gap-[3px] text-[#FEFEFE]">
              <p className="text-[16px] font-semibold truncate">{creator.name}</p>
              {creator.bio && <p className="text-[12px] line-clamp-2">{creator.bio}</p>}
            </div>
            {creator.badge && (
              <span className="self-start h-6 px-3 rounded-[9px] bg-[#2865B6] inline-flex items-center text-[12px] font-medium text-[#FEFEFE] whitespace-nowrap">
                {creator.badge}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-b-[16px] p-4 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Stat label="Países">{plural(creator.countries.length, 'país', 'países')}</Stat>
          <Stat label="Roteiros">{plural(creator.publishedCount, 'roteiro', 'roteiros')}</Stat>
          <Stat label="Avaliação">
            <span className="inline-flex items-center gap-1">
              <Icon name="star" filled size={17} className="text-[#F2B90C]" />
              <span className="text-[#141530]">{creator.rating > 0 ? creator.rating.toFixed(1).replace('.', ',') : '-'}</span>
            </span>
          </Stat>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 text-[18px] leading-none min-w-0">
            {flags.map((c) => (
              <span key={c.iso3} title={c.name}>{c.flag}</span>
            ))}
            {hiddenFlags > 0 && <span className="text-[12px] font-semibold text-[#646464] ml-1">+{hiddenFlags}</span>}
          </div>
          <button
            type="button"
            onClick={onViewProfile}
            className="flex items-center gap-2 py-2 pr-4 text-[14px] font-bold text-[#141530] flex-shrink-0 active:opacity-70 transition-opacity"
          >
            Conhecer
            <Icon name="chevron_right" size={16} className="text-[#141530]" />
          </button>
        </div>
      </div>
    </article>
  );
}
