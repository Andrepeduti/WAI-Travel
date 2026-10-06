import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import { submitTripFeedback } from '@/lib/homeModulesApi';

const MAX_COMMENT = 500;

interface TripFeedbackSheetProps {
  open: boolean;
  itineraryId: string | null;
  /** Escolha feita no card antes de abrir o sheet. */
  initialLiked: boolean | null;
  onClose: () => void;
}

/** Bottom sheet "Como foi sua experiência?" da viagem concluída (roteiro comprado). */
export function TripFeedbackSheet({ open, itineraryId, initialLiked, onClose }: TripFeedbackSheetProps) {
  const [liked, setLiked] = useState<boolean | null>(initialLiked);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) {
      setLiked(initialLiked);
      setComment('');
    }
  }, [open, initialLiked]);

  const handleSubmit = async () => {
    if (!itineraryId || liked === null || sending) return;
    setSending(true);
    const ok = await submitTripFeedback(itineraryId, liked, comment);
    setSending(false);
    if (ok) {
      toast.success('Obrigado pela sua avaliação!');
      onClose();
    } else {
      toast.error('Não foi possível enviar sua avaliação. Tente novamente.');
    }
  };

  const choiceButton = (value: boolean, label: string, icon: string) => {
    const active = liked === value;
    return (
      <button
        type="button"
        onClick={() => setLiked(value)}
        className={cn(
          'flex-1 h-12 rounded-[16px] inline-flex items-center justify-center gap-2 text-[16px] font-bold transition-colors',
          active ? 'bg-[#141530] text-[#9DCC36]' : 'border border-[#141530] text-[#141530]',
        )}
      >
        {label}
        <Icon name={icon} size={24} className={active ? 'text-[#9DCC36]' : 'text-[#141530]'} />
      </button>
    );
  };

  return (
    <Sheet open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <SheetContent side="bottom" className="p-0 pb-0 gap-0 border-0 bg-white rounded-t-[24px] max-h-[90dvh] flex flex-col">
        <div className="px-4 pt-6 pb-3 flex justify-end">
          <button type="button" onClick={onClose} aria-label="Fechar">
            <Icon name="close" size={18} className="text-black" />
          </button>
        </div>

        <div className="px-4 pt-4 pb-[42px] flex flex-col gap-8 overflow-y-auto">
          <div className="flex flex-col gap-2">
            <SheetTitle className="text-[22px] leading-[26px] font-semibold text-[#171F2C]">Como foi sua experiência?</SheetTitle>
            <SheetDescription className="text-[14px] leading-5 font-medium text-[#7F7F7F]">
              Sua avaliação ajuda a melhorar a qualidade dos roteiros para todos os viajantes.
            </SheetDescription>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex gap-4">
              {choiceButton(false, 'Não gostei', 'thumb_down')}
              {choiceButton(true, 'Gostei', 'thumb_up')}
            </div>

            <div className="flex flex-col gap-2">
              <label className="h-[181px] rounded-[16px] bg-[#F6F6F6] p-4 flex flex-col gap-1">
                <span className="text-[12px] leading-4 font-medium text-[#949494]">
                  {liked ? 'O que você mais gostou? (Opcional)' : 'O que podemos melhorar? (Opcional)'}
                </span>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value.slice(0, MAX_COMMENT))}
                  maxLength={MAX_COMMENT}
                  placeholder={liked ? 'Conte pra gente o que fez a viagem valer a pena.' : 'Conte pra gente o que não funcionou como esperado.'}
                  className="flex-1 w-full resize-none !bg-transparent border-0 outline-none text-[14px] leading-4 font-medium text-[#141530] placeholder:text-[#7F7F7F]"
                />
              </label>
              <span className="text-[12px] leading-4 font-medium text-[#676767]">{comment.length}/{MAX_COMMENT}</span>
            </div>
          </div>
        </div>

        <div className="px-4 pt-4 pb-[34px] border-t border-[#B6B6B6] bg-white">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={liked === null || sending}
            className="w-full h-12 rounded-[16px] bg-[#9DCC36] text-[16px] font-bold text-[#141530] disabled:opacity-50 transition-opacity"
          >
            {sending ? 'Enviando…' : 'Enviar avaliação'}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
