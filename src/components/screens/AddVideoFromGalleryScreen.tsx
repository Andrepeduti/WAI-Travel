import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/button';
import { BackButton } from '@/components/ui/BackButton';

interface AddVideoFromGalleryScreenProps {
  onBack: () => void;
  onSubmit: (file: File | null) => void;
}

export function AddVideoFromGalleryScreen({ onBack, onSubmit }: AddVideoFromGalleryScreenProps) {
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      setSelectedVideo(file);
      const url = URL.createObjectURL(file);
      setVideoPreview(url);
    }
  };

  const handleRemoveVideo = () => {
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
    }
    setSelectedVideo(null);
    setVideoPreview(null);
  };

  const handleSubmit = () => {
    if (!selectedVideo) return;
    setIsProcessing(true);
    // Simulate processing
    setTimeout(() => {
      onSubmit(selectedVideo);
    }, 2000);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div 
      className="min-h-screen bg-background flex flex-col"
      style={{ fontFamily: 'var(--font-family-primary)' }}
    >
      {/* Header */}
      <div className="px-6 pt-14 pb-6">
        <BackButton onClick={onBack} />
        <h1 className="text-2xl font-bold text-foreground">Escolher da galeria</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Selecione um vídeo da sua galeria para extrair os lugares
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 px-6">
        {!selectedVideo ? (
          /* Upload Area */
          <label className="block">
            <input
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="border-2 border-dashed border-border rounded-3xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors min-h-[280px]">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                <Icon name="video_library" size={40} className="text-muted-foreground" />
              </div>
              <p className="text-base font-semibold text-foreground mb-1">
                Toque para selecionar
              </p>
              <p className="text-sm text-muted-foreground text-center">
                Formatos suportados: MP4, MOV, AVI
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Tamanho máximo: 500MB
              </p>
            </div>
          </label>
        ) : (
          /* Video Preview */
          <div className="space-y-4">
            <div className="relative rounded-3xl overflow-hidden bg-muted aspect-video">
              {videoPreview && (
                <video 
                  src={videoPreview}
                  className="w-full h-full object-cover"
                  controls
                />
              )}
              {!isProcessing && (
                <button
                  onClick={handleRemoveVideo}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center"
                >
                  <Icon name="close" size={18} className="text-white" />
                </button>
              )}
            </div>

            {/* File Info */}
            <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-2xl">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Icon name="movie" size={24} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {selectedVideo.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(selectedVideo.size)}
                </p>
              </div>
              <Icon name="check_circle" size={24} className="text-green-500" filled />
            </div>

            {/* Processing State */}
            {isProcessing && (
              <div className="flex flex-col items-center justify-center py-6">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 animate-pulse">
                  <Icon name="auto_awesome" size={32} className="text-primary" />
                </div>
                <p className="text-sm font-medium text-foreground">Analisando vídeo...</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Identificando lugares e pontos de interesse
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tips */}
        {!selectedVideo && (
          <div className="mt-6 space-y-3">
            <p className="text-xs font-medium text-muted-foreground">Dicas</p>
            <div className="space-y-2">
              <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-xl">
                <Icon name="lightbulb" size={18} className="text-amber-500 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  Vídeos com narração ou legendas funcionam melhor para identificar lugares
                </p>
              </div>
              <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-xl">
                <Icon name="schedule" size={18} className="text-primary mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  Vídeos mais curtos são processados mais rapidamente
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action */}
      <div className="px-6 pb-8 pt-4">
        <Button
          onClick={handleSubmit}
          disabled={!selectedVideo || isProcessing}
          className="w-full h-14 rounded-2xl text-base font-semibold"
        >
          {isProcessing ? 'Processando...' : 'Extrair lugares do vídeo'}
        </Button>
      </div>
    </div>
  );
}
