import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PlaceCard, PlaceCardData } from '@/components/travel/PlaceCard';
import { BackButton } from '@/components/ui/BackButton';

interface AddVideoByLinkScreenProps {
  onBack: () => void;
  onSubmit: (link: string) => void;
}

const mockExtractedPlaces: PlaceCardData[] = [
  { id: 1, name: 'Torre Eiffel', image: 'https://images.unsplash.com/photo-1511739001486-6bfe10ce65f4?w=400', category: 'Monumento', rating: 4.8, location: 'Paris, França' },
  { id: 2, name: 'Museu do Louvre', image: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=400', category: 'Museu', rating: 4.7, location: 'Paris, França' },
  { id: 3, name: 'Sacré-Cœur', image: 'https://images.unsplash.com/photo-1550340499-a6c60fc8287c?w=400', category: 'Igreja', rating: 4.6, location: 'Paris, França' },
  { id: 4, name: 'Café de Flore', image: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400', category: 'Restaurante', rating: 4.5, location: 'Paris, França' },
  { id: 5, name: 'Jardim de Luxemburgo', image: 'https://images.unsplash.com/photo-1555776078-95b0894f1a6d?w=400', category: 'Parque', rating: 4.4, location: 'Paris, França' },
];

export function AddVideoByLinkScreen({ onBack, onSubmit }: AddVideoByLinkScreenProps) {
  const [link, setLink] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedPlaces, setExtractedPlaces] = useState<PlaceCardData[]>([]);
  const [selectedPlaces, setSelectedPlaces] = useState<Set<number>>(new Set());

  const isValidLink = link.trim().length > 0 && (
    link.includes('youtube.com') || 
    link.includes('youtu.be') || 
    link.includes('instagram.com') || 
    link.includes('tiktok.com')
  );

  const handleExtract = () => {
    if (!isValidLink) return;
    setIsProcessing(true);
    setTimeout(() => {
      setExtractedPlaces(mockExtractedPlaces);
      setSelectedPlaces(new Set(mockExtractedPlaces.map(p => p.id)));
      setIsProcessing(false);
    }, 2000);
  };

  const togglePlace = (id: number) => {
    setSelectedPlaces(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleConfirm = () => {
    onSubmit(link);
  };

  return (
    <div 
      className="min-h-screen bg-background flex flex-col"
      style={{ fontFamily: 'var(--font-family-primary)' }}
    >
      {/* Header */}
      <div className="px-6 pt-14 pb-6">
        <BackButton onClick={onBack} />
        <h1 className="text-2xl font-bold text-foreground">Adicionar por link</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Cole o link de um vídeo do YouTube, Instagram ou TikTok
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 overflow-y-auto pb-32">
        {/* Link Input */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground">Link do vídeo</label>
          <div className="relative">
            <Input
              type="url"
              placeholder="https://youtube.com/watch?v=..."
              value={link}
              onChange={(e) => setLink(e.target.value)}
              className="h-14 pl-12 pr-4 text-base rounded-2xl border-border bg-muted/30"
            />
            <Icon name="link" size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>

        {/* Supported Platforms */}
        {extractedPlaces.length === 0 && !isProcessing && (
          <div className="mt-6 p-4 bg-muted/30 rounded-2xl">
            <p className="text-xs font-medium text-muted-foreground mb-3">Plataformas suportadas</p>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <Icon name="play_arrow" size={18} className="text-red-500" />
                </div>
                <span className="text-xs text-foreground">YouTube</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center">
                  <Icon name="photo_camera" size={18} className="text-pink-500" />
                </div>
                <span className="text-xs text-foreground">Instagram</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-foreground/10 flex items-center justify-center">
                  <Icon name="music_note" size={18} className="text-foreground" />
                </div>
                <span className="text-xs text-foreground">TikTok</span>
              </div>
            </div>
          </div>
        )}

        {/* Processing State */}
        {isProcessing && (
          <div className="mt-8 flex flex-col items-center justify-center py-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 animate-pulse">
              <Icon name="video_library" size={32} className="text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground">Processando vídeo...</p>
            <p className="text-xs text-muted-foreground mt-1">Identificando lugares mencionados</p>
          </div>
        )}

        {/* Extracted Places */}
        {extractedPlaces.length > 0 && !isProcessing && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-foreground">
                {extractedPlaces.length} lugares encontrados
              </h2>
              <span className="text-xs text-muted-foreground">
                {selectedPlaces.size} selecionados
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {extractedPlaces.map(place => (
                <div key={place.id} className="relative">
                  <PlaceCard place={place} className="w-full" />
                  <button
                    onClick={() => togglePlace(place.id)}
                    className={`absolute top-2 left-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                      selectedPlaces.has(place.id)
                        ? 'bg-primary border-primary'
                        : 'bg-background/80 border-muted-foreground/40'
                    }`}
                  >
                    {selectedPlaces.has(place.id) && (
                      <Icon name="check" size={14} className="text-primary-foreground" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 px-6 pb-8 pt-4 bg-background border-t border-border">
        {extractedPlaces.length === 0 ? (
          <Button
            onClick={handleExtract}
            disabled={!isValidLink || isProcessing}
            className="w-full h-14 rounded-2xl text-base font-semibold"
          >
            {isProcessing ? 'Processando...' : 'Extrair lugares do vídeo'}
          </Button>
        ) : (
          <Button
            onClick={handleConfirm}
            disabled={selectedPlaces.size === 0}
            className="w-full h-14 rounded-2xl text-base font-semibold"
          >
            Adicionar {selectedPlaces.size} {selectedPlaces.size === 1 ? 'lugar' : 'lugares'}
          </Button>
        )}
      </div>
    </div>
  );
}
