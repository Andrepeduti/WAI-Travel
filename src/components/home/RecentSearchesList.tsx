import { Icon } from '@/components/ui/Icon';

interface RecentSearchesListProps {
  terms: string[];
  onSelect: (term: string) => void;
  onRemove: (term: string) => void;
}

/** Linhas de buscas recentes (dropdown da Home e estado vazio da busca). */
export function RecentSearchesList({ terms, onSelect, onRemove }: RecentSearchesListProps) {
  return (
    <ul>
      {terms.map((term) => (
        <li key={term} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSelect(term)}
            className="flex-1 min-w-0 flex items-center gap-3 py-3 text-left"
          >
            <Icon name="history" size={20} className="text-[#949494] flex-shrink-0" />
            <span className="text-[14px] text-[#141530] truncate">{term}</span>
          </button>
          <button
            type="button"
            onClick={() => onRemove(term)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#949494] flex-shrink-0"
            aria-label={`Remover "${term}"`}
          >
            <Icon name="close" size={18} />
          </button>
        </li>
      ))}
    </ul>
  );
}
