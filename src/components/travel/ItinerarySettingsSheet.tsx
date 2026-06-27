import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Share2, Copy, Trash2, Pencil, Download, LogOut, DollarSign } from 'lucide-react';
import { shareItinerary } from '@/lib/shareItinerary';

interface ItinerarySettingsSheetProps {
  open: boolean;
  onClose: () => void;
  tripName?: string;
  onManageItinerary?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  isPublic?: boolean;
  isLocked?: boolean;
  onTogglePublic?: (val: boolean) => void;
  onToggleLocked?: (val: boolean) => void;
  /** When true, hides the "Make public" option (purchased itineraries cannot be republished) */
  isPurchased?: boolean;
  /** Called when user wants to start publishing flow (only when not yet public) */
  onPublish?: () => void;
  /** Called when user wants to edit existing publication (price, description, tags) */
  onEditPublish?: () => void;
  /** Called when the user wants to download the itinerary as a PDF */
  onDownloadPdf?: () => void;
  /** Called when the user wants to open the share-with-people sheet */
  onShare?: () => void;
  /** When true, hides delete and shows "Sair do roteiro" with leave confirmation */
  isParticipant?: boolean;
  /** Called when participant confirms leaving the itinerary */
  onLeave?: () => void;
}

export function ItinerarySettingsSheet({
  open,
  onClose,
  tripName,
  onManageItinerary,
  onDuplicate,
  onDelete,
  isPublic: isPublicProp = false,
  isLocked: isLockedProp = false,
  onTogglePublic,
  onToggleLocked,
  isPurchased = false,
  onPublish,
  onEditPublish,
  onDownloadPdf,
  onShare,
  isParticipant = false,
  onLeave
}: ItinerarySettingsSheetProps) {
  const [isPublic, setIsPublic] = useState(isPublicProp);
  const [isLocked, setIsLocked] = useState(isLockedProp);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  if (!open) return null;

  const handleTogglePublic = () => {
    // If turning ON and we have a publish flow, delegate to it instead of just flipping the toggle
    if (!isPublic && onPublish) {
      onClose();
      onPublish();
      return;
    }
    const next = !isPublic;
    setIsPublic(next);
    onTogglePublic?.(next);
  };

  const handleToggleLocked = () => {
    const next = !isLocked;
    setIsLocked(next);
    onToggleLocked?.(next);
  };

  const handleCloseAll = () => {
    setShowDeleteConfirm(false);
    setShowLeaveConfirm(false);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-end justify-center" onClick={handleCloseAll}>
        <div
          className="absolute inset-0 bg-black/40"
          style={{ animation: 'fadeIn 0.3s ease-out' }} />
        
        <div
          className="relative w-full max-w-[430px] bg-background rounded-t-2xl"
          style={{ animation: 'slideUpSheet 0.35s cubic-bezier(0.32, 0.72, 0, 1)' }}
          onClick={(e) => e.stopPropagation()}>
          
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-[#E0E0E0]" />
          </div>

          {/* Header */}
          <div className="px-5 pb-4 pt-2">
            <h3 className="text-[18px] font-bold text-foreground">Configurações</h3>
          </div>

          {/* Options */}
          <div className="px-5 pb-6 space-y-1">
            {/* Gerenciar roteiro */}
            <button
              onClick={() => {onClose();onManageItinerary?.();}}
              className="w-full flex items-center gap-3.5 py-3 px-1 rounded-xl hover:bg-muted/50 transition-colors">
              
               <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#F2F2F2' }}>
                <Pencil size={18} className="text-foreground" />
              </div>
              <span className="text-[14px] font-medium text-foreground flex-1 text-left">Gerenciar roteiro</span>
              <Icon name="chevron_right" size={18} className="text-muted-foreground" />
            </button>

            {/* Compartilhar roteiro */}
            <button
              onClick={async () => {
                if (onShare) { onClose(); onShare(); return; }
                await shareItinerary({ title: tripName });
                onClose();
              }}
              className="w-full flex items-center gap-3.5 py-3 px-1 rounded-xl hover:bg-muted/50 transition-colors">
              
               <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#F2F2F2' }}>
                <Share2 size={18} className="text-foreground" />
              </div>
              <span className="text-[14px] font-medium text-foreground flex-1 text-left">Compartilhar roteiro</span>
              <Icon name="chevron_right" size={18} className="text-muted-foreground" />
            </button>

            {/* Duplicar roteiro */}
            <button
              onClick={() => {onClose();onDuplicate?.();}}
              className="w-full flex items-center gap-3.5 py-3 px-1 rounded-xl hover:bg-muted/50 transition-colors">
              
               <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#F2F2F2' }}>
                <Copy size={18} className="text-foreground" />
              </div>
              <span className="text-[14px] font-medium text-foreground flex-1 text-left">Duplicar roteiro</span>
              <Icon name="chevron_right" size={18} className="text-muted-foreground" />
            </button>

            {/* Baixar em PDF */}
            <button
              onClick={() => {onClose();onDownloadPdf?.();}}
              className="w-full flex items-center gap-3.5 py-3 px-1 rounded-xl hover:bg-muted/50 transition-colors">
              
               <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#F2F2F2' }}>
                <Download size={18} className="text-foreground" />
              </div>
              <span className="text-[14px] font-medium text-foreground flex-1 text-left">Baixar em PDF</span>
              <Icon name="chevron_right" size={18} className="text-muted-foreground" />
            </button>

            {/* Colocar à venda - hidden for purchased itineraries */}
            {!isPurchased && (
              <button
                onClick={handleTogglePublic}
                className="w-full flex items-center gap-3.5 py-3 px-1 rounded-xl hover:bg-muted/50 transition-colors">
                
                 <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#F2F2F2' }}>
                  <DollarSign size={18} className="text-foreground" />
                </div>
                <span className="text-[14px] font-medium text-foreground flex-1 text-left">
                  {isPublic ? 'Roteiro público' : 'Colocar à venda'}
                </span>
                {isPublic ? (
                  <div className="w-11 h-6 rounded-full relative bg-primary transition-colors">
                    <div className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm translate-x-[22px]" />
                  </div>
                ) : (
                  <Icon name="chevron_right" size={18} className="text-muted-foreground" />
                )}
              </button>
            )}

            {/* Editar publicação - only when published */}
            {!isPurchased && isPublic && onEditPublish && (
              <button
                onClick={() => { onClose(); onEditPublish(); }}
                className="w-full flex items-center gap-3.5 py-3 px-1 rounded-xl hover:bg-muted/50 transition-colors">
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#F2F2F2' }}>
                  <Pencil size={18} className="text-foreground" />
                </div>
                <span className="text-[14px] font-medium text-foreground flex-1 text-left">Editar publicação</span>
                <Icon name="chevron_right" size={18} className="text-muted-foreground" />
              </button>
            )}
            {/* Bloquear edição - Toggle */}
            










            

            {/* Danger zone */}
            <div className="pt-3 mt-2 border-t border-border">
              <button
                onClick={() => isParticipant ? setShowLeaveConfirm(true) : setShowDeleteConfirm(true)}
                className="w-full flex items-center gap-3.5 py-3 px-1 rounded-xl hover:bg-destructive/10 transition-colors">

                <div className="w-9 h-9 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                  {isParticipant ? (
                    <LogOut size={18} className="text-destructive" />
                  ) : (
                    <Trash2 size={18} className="text-destructive" />
                  )}
                </div>
                <span className="text-[14px] font-medium text-destructive">
                  {isParticipant ? 'Sair do roteiro' : 'Excluir roteiro'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirmation bottom sheet */}
      {showDeleteConfirm &&
      <div className="fixed inset-0 z-[110] flex items-end justify-center" onClick={() => setShowDeleteConfirm(false)}>
          <div
          className="absolute inset-0 bg-black/20"
          style={{ animation: 'fadeIn 0.2s ease-out' }} />
        
          <div
          className="relative w-full max-w-[430px] bg-background rounded-t-2xl"
          style={{ animation: 'slideUpSheet 0.35s cubic-bezier(0.32, 0.72, 0, 1)' }}
          onClick={(e) => e.stopPropagation()}>
          
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-[#E0E0E0]" />
            </div>

            <div className="px-5 pt-4 pb-8 text-center">
              <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <Trash2 size={26} className="text-destructive" />
              </div>
              <h3 className="text-[18px] font-bold text-foreground mb-1">Excluir roteiro?</h3>
              <p className="text-[13px] text-muted-foreground mb-6 leading-relaxed">
                {tripName ?
              `"${tripName}" será excluído permanentemente. Esta ação não pode ser desfeita.` :
              'Este roteiro será excluído permanentemente. Esta ação não pode ser desfeita.'}
              </p>
              <div className="flex gap-3">
                <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3.5 rounded-xl border border-border text-[14px] font-semibold text-foreground bg-card active:scale-[0.98] transition-transform">
                
                  Cancelar
                </button>
                <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  onClose();
                  onDelete?.();
                }}
                className="flex-1 py-3.5 rounded-xl bg-destructive text-destructive-foreground text-[14px] font-semibold active:scale-[0.98] transition-transform">
                
                  Sim, excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      }

      {/* Leave confirmation bottom sheet (participant only) */}
      {showLeaveConfirm &&
      <div className="fixed inset-0 z-[110] flex items-end justify-center" onClick={() => setShowLeaveConfirm(false)}>
          <div
          className="absolute inset-0 bg-black/20"
          style={{ animation: 'fadeIn 0.2s ease-out' }} />

          <div
          className="relative w-full max-w-[430px] bg-background rounded-t-2xl"
          style={{ animation: 'slideUpSheet 0.35s cubic-bezier(0.32, 0.72, 0, 1)' }}
          onClick={(e) => e.stopPropagation()}>

            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-[#E0E0E0]" />
            </div>

            <div className="px-5 pt-4 pb-8 text-center">
              <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <LogOut size={26} className="text-destructive" />
              </div>
              <h3 className="text-[18px] font-bold text-foreground mb-1">Sair deste roteiro?</h3>
              <p className="text-[13px] text-muted-foreground mb-6 leading-relaxed">
                Você deixará de participar deste roteiro e perderá acesso às futuras atualizações feitas pelo organizador. Essa ação não excluirá o roteiro para os demais participantes.
              </p>
              <div className="flex gap-3">
                <button
                onClick={() => setShowLeaveConfirm(false)}
                className="flex-1 py-3.5 rounded-xl border border-border text-[14px] font-semibold text-foreground bg-card active:scale-[0.98] transition-transform">
                  Cancelar
                </button>
                <button
                onClick={() => {
                  setShowLeaveConfirm(false);
                  onClose();
                  onLeave?.();
                }}
                className="flex-1 py-3.5 rounded-xl bg-destructive text-destructive-foreground text-[14px] font-semibold active:scale-[0.98] transition-transform">
                  Sair do roteiro
                </button>
              </div>
            </div>
          </div>
        </div>
      }
    </>);

}