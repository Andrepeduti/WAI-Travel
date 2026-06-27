import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import { BackButton } from '@/components/ui/BackButton';

export interface CreatorProfileData {
  name: string;
  username: string;
  image: string;
  coverImage: string;
  following: number;
  followers: number;
  likes: number;
  bio?: string;
  specialty?: string;
  itineraries: {
    id: number;
    title: string;
    subtitle: string;
    image: string;
    photoCount?: number;
    viewCount?: number;
    commentCount?: number;
    likeCount?: number;
  }[];
}

interface CreatorProfileScreenProps {
  creator: CreatorProfileData;
  onBack: () => void;
  onItineraryClick?: (id: number) => void;
}

type TabKey = 'journeys' | 'itineraries' | 'articles' | 'about';

const tabs: { key: TabKey; label: string }[] = [
  { key: 'journeys', label: 'Journeys' },
  { key: 'itineraries', label: 'Itineraries' },
  { key: 'articles', label: 'Articles' },
  { key: 'about', label: 'About' },
];

export function CreatorProfileScreen({ creator, onBack, onItineraryClick }: CreatorProfileScreenProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('journeys');

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header with cover */}
      <div className="relative">
        {/* Back button */}
        <BackButton onClick={onBack} />

        <div className="text-center absolute top-4 left-0 right-0 z-20">
          <p className="text-sm font-semibold text-white drop-shadow-md">Profile</p>
        </div>

        {/* Cover photos grid */}
        <div className="h-[180px] w-full overflow-hidden">
          <img
            src={creator.coverImage}
            alt="Cover"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Profile photo */}
        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 z-10">
          <div className="w-24 h-24 rounded-full border-4 border-background overflow-hidden">
            <img
              src={creator.image}
              alt={creator.name}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>

      {/* Name */}
      <div className="pt-14 pb-2 text-center px-5">
        <h1 className="text-lg font-semibold">{creator.name}</h1>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-center gap-8 pb-4">
        <div className="text-center">
          <p className="text-base font-semibold">{creator.following}</p>
          <p className="text-xs text-muted-foreground">Following</p>
        </div>
        <div className="text-center">
          <p className="text-base font-semibold">{creator.followers}</p>
          <p className="text-xs text-muted-foreground">Followers</p>
        </div>
        <div className="text-center">
          <p className="text-base font-semibold">{creator.likes}</p>
          <p className="text-xs text-muted-foreground">Likes</p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-center gap-3 px-5 pb-5">
        <button className="flex-1 h-[41px] rounded-[16px] font-semibold text-sm border border-secondary text-secondary flex items-center justify-center">
          Follow
        </button>
        <button className="flex-1 h-[41px] rounded-[16px] font-semibold text-sm border border-secondary text-secondary flex items-center justify-center">
          Message
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-border px-5">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex-1 py-3 text-sm font-medium text-center transition-colors relative',
                activeTab === tab.key
                  ? 'text-primary'
                  : 'text-muted-foreground'
              )}
            >
              {tab.label}
              {activeTab === tab.key && (
                <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 px-5 py-5 overflow-y-auto">
        {activeTab === 'journeys' && (
          <div className="space-y-6">
            {creator.itineraries.map((item) => (
              <button
                key={item.id}
                onClick={() => onItineraryClick?.(item.id)}
                className="w-full text-left"
              >
                {/* Photo grid 2x2 */}
                <div className="grid grid-cols-3 gap-1 rounded-xl overflow-hidden mb-2 aspect-[16/10]">
                  <div className="col-span-2 row-span-2">
                    <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="bg-muted">
                    <img
                      src={`${item.image}&w=200&h=200&fit=crop`}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="bg-muted">
                    <img
                      src={`${item.image}&w=200&h=200&fit=crop&q=80`}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                <h3 className="text-base font-semibold mb-0.5">{item.title}</h3>
                <p className="text-xs text-muted-foreground mb-2">{item.subtitle}</p>

                {/* Engagement stats */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {item.photoCount !== undefined && (
                    <span className="flex items-center gap-1">
                      <Icon name="photo_library" size={14} /> {item.photoCount}
                    </span>
                  )}
                  {item.viewCount !== undefined && (
                    <span className="flex items-center gap-1">
                      <Icon name="visibility" size={14} /> {item.viewCount}
                    </span>
                  )}
                  {item.commentCount !== undefined && (
                    <span className="flex items-center gap-1">
                      <Icon name="chat_bubble" size={14} /> {item.commentCount}
                    </span>
                  )}
                  {item.likeCount !== undefined && (
                    <span className="flex items-center gap-1">
                      <Icon name="favorite" size={14} /> {item.likeCount}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {activeTab === 'itineraries' && (
          <div className="space-y-4">
            {creator.itineraries.map((item) => (
              <button
                key={item.id}
                onClick={() => onItineraryClick?.(item.id)}
                className="w-full flex gap-3 text-left"
              >
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0 py-1">
                  <h4 className="text-sm font-semibold truncate">{item.title}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.subtitle}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {activeTab === 'articles' && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Icon name="article" size={40} className="text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum artigo publicado ainda</p>
          </div>
        )}

        {activeTab === 'about' && (
          <div className="space-y-4">
            {creator.bio && (
              <div>
                <h3 className="text-sm font-semibold mb-1">Sobre</h3>
                <p className="text-sm text-muted-foreground">{creator.bio}</p>
              </div>
            )}
            {creator.specialty && (
              <div>
                <h3 className="text-sm font-semibold mb-1">Especialidade</h3>
                <p className="text-sm text-muted-foreground">{creator.specialty}</p>
              </div>
            )}
            {!creator.bio && !creator.specialty && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Icon name="info" size={40} className="text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">Sem informações adicionais</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
