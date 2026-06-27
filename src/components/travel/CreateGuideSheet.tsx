import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { BackButton } from '@/components/ui/BackButton';

interface CreateGuideSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { title: string; destination: string }) => void;
}

export function CreateGuideSheet({ isOpen, onClose, onSubmit }: CreateGuideSheetProps) {
  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');

  const isValid = title.trim().length > 0 && destination.trim().length > 0;

  const handleSubmit = () => {
    if (!isValid) return;
    onSubmit({ title, destination });
    setTitle('');
    setDestination('');
    onClose();
  };

  const handleClose = () => {
    setTitle('');
    setDestination('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 z-40 transition-opacity"
        onClick={handleClose}
      />
      
      {/* Bottom Sheet */}
      <div 
        className="fixed bottom-0 left-0 right-0 z-50 flex justify-center"
        style={{ fontFamily: 'var(--font-family-primary)' }}
      >
        <div className="bg-background rounded-t-3xl w-full max-w-[430px] pb-8 animate-in slide-in-from-bottom duration-300">
          {/* Handle */}
          <div className="flex justify-center py-3">
            <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
          </div>
          
          {/* Header */}
          <div className="px-6 pb-6">
            <BackButton onClick={handleClose} />
            <h2 className="text-xl font-bold text-foreground my-0 mt-[24px]">Novo Guia</h2>
          </div>

          {/* Content */}
          <div className="px-6 space-y-4">
            {/* Title Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Título do guia
              </label>
              <Input
                type="text"
                placeholder="Ex: 7 dias em Paris"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-14 px-4 text-base rounded-2xl border-border bg-muted/30"
              />
            </div>

            {/* Location Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Local
              </label>
              <div className="relative">
                <Icon 
                  name="location_on" 
                  size={20} 
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" 
                />
                <Input
                  type="text"
                  placeholder="Sobre qual lugar é o guia?"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="h-14 pl-12 pr-4 text-base rounded-2xl border-border bg-muted/30"
                />
              </div>
            </div>
          </div>

          {/* Bottom Action */}
          <div className="px-6 pt-6">
            <Button
              onClick={handleSubmit}
              disabled={!isValid}
              className="w-full h-14 rounded-2xl text-base font-semibold"
              style={{
                background: isValid ? '#9DCC36' : '#D1D5DB',
                color: isValid ? '#1A1C40' : '#FFFFFF',
              }}
            >
              Criar Guia
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
