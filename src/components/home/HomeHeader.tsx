import { useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/skeleton';
import { addRecentSearch, getRecentSearches, removeRecentSearch } from '@/lib/recentSearches';
import { RecentSearchesList } from './RecentSearchesList';

interface HomeHeaderProps {
  firstName: string;
  loading: boolean;
  hasUnreadNotifications: boolean;
  onNotificationsClick?: () => void;
  /** Chamado ao confirmar a busca (Enter ou toque numa busca recente). */
  onSearchSubmit?: (query: string) => void;
}

const iconButtonClass = 'w-12 h-12 rounded-full bg-white flex items-center justify-center active:scale-95 transition-transform';

export function HomeHeader({ firstName, loading, hasUnreadNotifications, onNotificationsClick, onSearchSubmit }: HomeHeaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);

  const typed = query.trim().toLowerCase();
  const suggestions = typed ? recent.filter((t) => t.toLowerCase().includes(typed)) : recent;
  const showDropdown = focused && suggestions.length > 0;

  const submit = (term: string) => {
    const clean = term.trim();
    if (!clean) return;
    addRecentSearch(clean);
    inputRef.current?.blur();
    setQuery('');
    onSearchSubmit?.(clean);
  };

  return (
    <header className="flex flex-col gap-6 px-4 pb-6" style={{ paddingTop: 'max(32px, env(safe-area-inset-top))' }}>
      <div className="flex items-center justify-between">
        {loading ? (
          <Skeleton className="h-7 w-40 rounded" />
        ) : (
          <h1 className="text-[24px] font-semibold text-[#141530]">Olá, {firstName}!</h1>
        )}
        <div className="flex items-center gap-4">
          {/* Favoritos: sem ação até a tela de Favoritos existir */}
          <button type="button" className={iconButtonClass} aria-label="Favoritos">
            <Icon name="favorite" size={24} className="text-[#141530]" />
          </button>
          <button type="button" onClick={onNotificationsClick} className={iconButtonClass} aria-label="Notificações">
            <span className="relative inline-flex">
              <Icon name="notifications" size={24} className="text-[#141530]" />
              {hasUnreadNotifications && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-destructive rounded-full border-[1.5px] border-white" />
              )}
            </span>
          </button>
        </div>
      </div>

      <div className="relative" data-tour-id="home-search">
        <div className="w-full h-[42px] px-3 rounded-[12px] bg-white flex items-center gap-2">
          <Icon name="search" size={16} className="text-[#949494] flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => { setRecent(getRecentSearches()); setFocused(true); }}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                submit(query);
              }
            }}
            placeholder="Qual é o seu próximo destino?"
            enterKeyHint="search"
            className="flex-1 min-w-0 !bg-transparent text-[14px] font-medium text-[#141530] placeholder:text-[#949494] focus:outline-none"
          />
        </div>

        {showDropdown && (
          // mouseDown não pode tirar o foco do input, senão o dropdown some antes do clique.
          <div
            onMouseDown={(e) => e.preventDefault()}
            className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 px-4 bg-white rounded-[12px] shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
          >
            <RecentSearchesList
              terms={suggestions}
              onSelect={submit}
              onRemove={(term) => setRecent(removeRecentSearch(term))}
            />
          </div>
        )}
      </div>
    </header>
  );
}
