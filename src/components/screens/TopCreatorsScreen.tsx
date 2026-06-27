import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { RankBadge } from '@/components/travel/RankBadge';
import { BackButton } from '@/components/ui/BackButton';

interface Creator {
  id: number;
  name: string;
  username: string;
  avatar: string;
  soldItineraries: number;
  rating: number;
  bio: string;
}

const topCreators: Creator[] = [
  { id: 1, name: 'Camila Ribeiro', username: '@camilaribeiro', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300', soldItineraries: 1842, rating: 4.9, bio: 'Roteiros pelo Japão e Sudeste Asiático' },
  { id: 2, name: 'Lucas Mendonça', username: '@lucasmendonca', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300', soldItineraries: 1356, rating: 4.8, bio: 'Praias paradisíacas pelo mundo' },
  { id: 3, name: 'Rafael Duarte', username: '@rafaelduarte', avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=300', soldItineraries: 1120, rating: 4.8, bio: 'Especialista em viagens de aventura' },
  { id: 4, name: 'Beatriz Almeida', username: '@biaalmeida', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300', soldItineraries: 890, rating: 4.7, bio: 'Viagens urbanas e culturais' },
  { id: 5, name: 'Maria Vieira', username: '@mariavieira', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300', soldItineraries: 764, rating: 4.9, bio: 'Roteiros históricos pela Europa' },
  { id: 6, name: 'Marina Costa', username: '@marinacosta', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300', soldItineraries: 651, rating: 4.9, bio: 'Paris e cidades românticas' },
  { id: 7, name: 'Laura Fernandes', username: '@laurafernandes', avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=300', soldItineraries: 523, rating: 4.8, bio: 'Mercados de Natal e Leste Europeu' },
  { id: 8, name: 'Pedro Santos', username: '@pedrosantos', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300', soldItineraries: 412, rating: 4.7, bio: 'Mochilão pela América do Sul' },
  { id: 9, name: 'Juliana Melo', username: '@julianamelo', avatar: 'https://images.unsplash.com/photo-1521252659862-eec69941b071?w=300', soldItineraries: 387, rating: 4.9, bio: 'Roteiros gastronômicos' },
  { id: 10, name: 'Thiago Lima', username: '@thiagolima', avatar: 'https://images.unsplash.com/photo-1545996124-0501ebae84d0?w=300', soldItineraries: 298, rating: 4.5, bio: 'Trilhas e ecoturismo' },
];

const trendingCreators: Creator[] = [
  { id: 11, name: 'Diego Ferreira', username: '@diegoferr', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=300', soldItineraries: 89, rating: 4.9, bio: 'Roteiros virais pelo Nordeste' },
  { id: 12, name: 'Isabela Rocha', username: '@isabelarocha', avatar: 'https://images.unsplash.com/photo-1524638431109-93d95c968f03?w=300', soldItineraries: 156, rating: 4.8, bio: 'Experiências únicas na Patagônia' },
  { id: 13, name: 'Gabriel Souza', username: '@gabrielsouza', avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=300', soldItineraries: 203, rating: 4.7, bio: 'Viagens radicais e esportes' },
];

const newCreators: Creator[] = [
  { id: 14, name: 'Fernanda Dias', username: '@fernandadias', avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=300', soldItineraries: 12, rating: 4.9, bio: 'Novos roteiros pela Europa Oriental' },
  { id: 15, name: 'Marcos Vieira', username: '@marcosvieira', avatar: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=300', soldItineraries: 8, rating: 5.0, bio: 'Primeiros guias do Japão em português' },
  { id: 16, name: 'Larissa Campos', username: '@larissacampos', avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=300', soldItineraries: 15, rating: 4.8, bio: 'Viagens veganas e sustentáveis' },
];

interface TopCreatorsScreenProps {
  onBack: () => void;
  onViewProfile?: (creator: Creator) => void;
}

export function TopCreatorsScreen({ onBack, onViewProfile }: TopCreatorsScreenProps) {
  const [search, setSearch] = useState('');
  const [followedIds, setFollowedIds] = useState<Set<number>>(new Set());

  const toggleFollow = (id: number) => {
    setFollowedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const allCreators = [...topCreators, ...trendingCreators, ...newCreators];

  const filtered = search.trim()
    ? allCreators.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.username.toLowerCase().includes(search.toLowerCase())
      )
    : null;

  const sections = [
    { title: 'Top 10 Criadores', icon: 'emoji_events', items: topCreators, showRank: true },
    { title: 'Em alta', icon: 'trending_up', items: trendingCreators, showRank: false },
    { title: 'Novos criadores', icon: 'auto_awesome', items: newCreators, showRank: false },
  ];

  const getTagForCreator = (creator: Creator, rank?: number) => {
    if (rank !== undefined && rank <= 10) {
      return { label: `#${rank} · ${creator.soldItineraries} vendidos`, bg: 'rgba(26, 28, 64, 0.08)', color: '#1A1C40' };
    }
    if (creator.soldItineraries < 50) {
      return { label: `Novo criador · ★ ${creator.rating}`, bg: 'rgba(88, 86, 214, 0.1)', color: '#5856D6' };
    }
    return { label: `${creator.soldItineraries} vendidos · ★ ${creator.rating}`, bg: 'rgba(255, 149, 0, 0.1)', color: '#FF9500' };
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-8">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background px-4 pt-4 pb-3">
        <div className="flex items-center gap-3 mb-3">
          <BackButton onClick={onBack} />
          <h1 className="text-foreground" style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-weight-bold)' }}>
            Top Criadores
          </h1>
        </div>
        <div className="relative">
          <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar criador..."
            className="w-full h-11 pl-10 pr-4 rounded-xl bg-muted/30 border border-[hsl(var(--divider))] text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/40 transition-colors"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <Icon name="close" size={16} className="text-muted-foreground" />
            </button>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1">
        {filtered && filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-14 h-14 rounded-full bg-muted/40 flex items-center justify-center mb-4">
              <Icon name="search" size={24} className="text-muted-foreground" />
            </div>
            <p className="text-foreground mb-1" style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)' }}>
              Nenhum resultado
            </p>
            <p className="text-muted-foreground" style={{ fontSize: 'var(--text-sm)' }}>
              Tente buscar por outro nome ou username.
            </p>
          </div>
        ) : filtered ? (
          <div className="divide-y divide-[hsl(var(--divider))]">
            {filtered.map(creator => {
              const tag = getTagForCreator(creator);
              return (
                <CreatorRow
                  key={creator.id}
                  creator={creator}
                  isFollowing={followedIds.has(creator.id)}
                  onToggleFollow={() => toggleFollow(creator.id)}
                  onViewProfile={() => onViewProfile?.(creator)}
                  tag={tag}
                />
              );
            })}
          </div>
        ) : (
          sections.map((section, sIdx) => (
            <div key={section.title}>
              {sIdx > 0 && <div className="h-2 bg-muted/20" />}
              <div className="px-5 pt-5 pb-2 flex items-center gap-2">
                <Icon name={section.icon} size={18} className="text-foreground" />
                <span className="text-foreground" style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-bold)' }}>
                  {section.title}
                </span>
              </div>
              <div className="divide-y divide-[hsl(var(--divider))]">
                {section.items.map((creator, idx) => {
                  const rank = section.showRank ? idx + 1 : undefined;
                  const tag = getTagForCreator(creator, rank);
                  return (
                    <CreatorRow
                      key={creator.id}
                      creator={creator}
                      rank={rank}
                      isFollowing={followedIds.has(creator.id)}
                      onToggleFollow={() => toggleFollow(creator.id)}
                      onViewProfile={() => onViewProfile?.(creator)}
                      tag={tag}
                    />
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function CreatorRow({ creator, rank, isFollowing, onToggleFollow, onViewProfile, tag }: {
  creator: Creator;
  rank?: number;
  isFollowing: boolean;
  onToggleFollow: () => void;
  onViewProfile: () => void;
  tag: { label: string; bg: string; color: string };
}) {
  const getRankColor = (r: number) => {
    if (r === 1) return '#B68B09';
    if (r === 2) return '#848484';
    if (r === 3) return '#CD7F32';
    return undefined;
  };

  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      <button onClick={onViewProfile} className="flex-shrink-0 active:scale-95 transition-transform relative">
        <img src={creator.avatar} alt={creator.name} className="w-12 h-12 rounded-full object-cover" />
        {rank && rank <= 3 && (
          <div
            className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
            style={{ background: getRankColor(rank) }}
          >
            {rank}
          </div>
        )}
        {rank && rank > 3 && (
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-foreground border border-background">
            {rank}
          </div>
        )}
      </button>
      <button onClick={onViewProfile} className="flex-1 min-w-0 text-left active:opacity-70 transition-opacity">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-foreground truncate text-[15px] font-semibold">
            {creator.name}
          </span>
        </div>
        <p className="text-muted-foreground truncate text-xs">
          {creator.username}
        </p>
        <div className="flex items-center gap-1.5 mt-1">
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-full"
            style={{ fontSize: '10px', fontWeight: 600, background: tag.bg, color: tag.color }}
          >
            {tag.label}
          </span>
        </div>
      </button>
      <button
        onClick={onToggleFollow}
        className="flex-shrink-0 h-[34px] px-4 rounded-xl text-[13px] font-semibold transition-all active:scale-95"
        style={
          isFollowing
            ? { background: '#F2F2F2', color: '#1A1C40' }
            : { background: '#1A1C40', color: '#FFFFFF' }
        }
      >
        {isFollowing ? 'Seguindo' : 'Seguir'}
      </button>
    </div>
  );
}
