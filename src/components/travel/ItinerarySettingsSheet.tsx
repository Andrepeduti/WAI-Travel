import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Share2, Copy, Trash2, Pencil, LogOut, DollarSign } from 'lucide-react';
import { shareItinerary } from '@/lib/shareItinerary';
import { DeleteConfirmSheet } from './DeleteConfirmSheet';

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
  onShare,
  isParticipant = false,
  onLeave,
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
          className="relative w-full w-full bg-background rounded-t-2xl"
          style={{ animation: 'slideUpSheet 0.35s cubic-bezier(0.32, 0.72, 0, 1)' }}
          onClick={(e) => e.stopPropagation()}>
          
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-muted" />
          </div>

          {/* Header with Title and Close X */}
          <div className="px-5 pb-4 pt-0 flex flex-col">
            <div className="flex justify-end w-full mb-2">
              <button
                type="button"
                onClick={onClose}
                className="w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors -mr-2"
                aria-label="Fechar"
              >
                <Icon name="close" size={20} className="text-foreground" />
              </button>
            </div>
            <h3 className="text-[24px] font-bold text-foreground font-['Urbanist',sans-serif] leading-tight">Configurações do roteiro</h3>
          </div>

          {/* Options List matching Image 2 */}
          <div className="px-5 pb-6 divide-y divide-border/40 font-['Urbanist',sans-serif] flex flex-col w-full">
            {/* 1. Gerenciar */}
            <button
              onClick={() => {
                onClose();
                onManageItinerary?.();
              }}
              className="w-full flex items-center gap-3.5 py-4 px-1 text-foreground bg-transparent active:opacity-70 transition-all"
            >
              <div className="w-6 h-6 flex items-center justify-center text-foreground">
                <Icon name="map" size={20} className="text-foreground" />
              </div>
              <span className="text-[15px] font-medium text-foreground flex-1 text-left">Gerenciar</span>
              <Icon name="chevron_right" size={20} className="text-muted-foreground/80" />
            </button>

            {/* 2. Publicar na loja WAI */}
            <button
              onClick={() => {
                onClose();
                if (isPublic && onEditPublish) {
                  onEditPublish();
                } else if (onPublish) {
                  onPublish();
                } else {
                  handleTogglePublic();
                }
              }}
              className="w-full flex items-center gap-3.5 py-4 px-1 text-foreground bg-transparent active:opacity-70 transition-all"
            >
              <div className="w-6 h-6 flex items-center justify-center text-foreground">
                <Icon name="swap_horiz" size={20} className="text-foreground" />
              </div>
              <span className="text-[15px] font-medium text-foreground flex-1 text-left">Publicar na loja WAI</span>
              <Icon name="chevron_right" size={20} className="text-muted-foreground/80" />
            </button>

            {/* 3. Duplicar */}
            <button
              onClick={() => {
                onClose();
                onDuplicate?.();
              }}
              className="w-full flex items-center gap-3.5 py-4 px-1 text-foreground bg-transparent active:opacity-70 transition-all"
            >
              <div className="w-6 h-6 flex items-center justify-center text-foreground">
                <Icon name="swap_horiz" size={20} className="text-foreground" />
              </div>
              <span className="text-[15px] font-medium text-foreground flex-1 text-left">Duplicar</span>
              <Icon name="chevron_right" size={20} className="text-muted-foreground/80" />
            </button>
          </div>
        </div>
      </div>

      {/* Delete confirmation bottom sheet */}
      <DeleteConfirmSheet
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title={tripName}
        onConfirm={() => {
          setShowDeleteConfirm(false);
          onClose();
          onDelete?.();
        }}
      />

      {/* Leave confirmation bottom sheet (participant only) */}
      <DeleteConfirmSheet
        isOpen={showLeaveConfirm}
        onClose={() => setShowLeaveConfirm(false)}
        title={tripName}
        isShared={true}
        description="Você deixará de participar deste roteiro e perderá acesso às futuras atualizações feitas pelo organizador. Essa ação não excluirá o roteiro para os demais participantes."
        confirmText="Sair do roteiro"
        onConfirm={() => {
          setShowLeaveConfirm(false);
          onClose();
          onLeave?.();
        }}
      />
    </>
  );
}